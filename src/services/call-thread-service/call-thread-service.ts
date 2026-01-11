/**
 * CallThread Service - Business logic for call thread management
 * Handles grouping of primary and follow-up calls for a prospect
 */

import { prisma } from '@/lib/db';

export interface CallThreadSummary {
  id: string;
  prospectId: string;
  prospectName: string;
  totalCalls: number;
  lastCallDate: Date | null;
  nextScheduledCall: Date | null;
  lastMilestoneCompleted: number | null;
  unresolvedObjections: number;
  qualificationStatus: 'qualified' | 'unqualified' | 'pending';
  createdAt: Date;
}

export interface CallInThread {
  id: string;
  status: string;
  mode: string;
  language: string;
  startedAt: Date | null;
  endedAt: Date | null;
  agentName: string;
  milestonesCompleted: number;
  totalMilestones: number;
  outcome: string | null;
  unresolvedObjections: string[];
  createdAt: Date;
}

export interface CallThreadWithCalls {
  thread: CallThreadSummary;
  calls: CallInThread[];
}

export class CallThreadService {
  /**
   * Get all call threads for a prospect
   */
  async getThreadsForProspect(
    prospectId: string,
    organizationId: string
  ): Promise<CallThreadWithCalls[]> {
    const threads = await prisma.callThread.findMany({
      where: {
        prospectId,
        organizationId,
      },
      include: {
        prospect: true,
        callSessions: {
          include: {
            agent: true,
            milestoneResponses: {
              include: { milestone: true },
            },
            objectionResponses: {
              where: { outcome: { not: 'Resolved' } },
              include: { objection: true },
            },
            callOutcome: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return threads.map((thread) => ({
      thread: this.mapToThreadSummary(thread),
      calls: thread.callSessions.map((call) => this.mapToCallInThread(call)),
    }));
  }

  /**
   * Get a specific call thread with all calls
   */
  async getThreadById(
    threadId: string,
    organizationId: string
  ): Promise<CallThreadWithCalls | null> {
    const thread = await prisma.callThread.findFirst({
      where: {
        id: threadId,
        organizationId,
      },
      include: {
        prospect: true,
        callSessions: {
          include: {
            agent: true,
            milestoneResponses: {
              include: { milestone: true },
            },
            objectionResponses: {
              where: { outcome: { not: 'Resolved' } },
              include: { objection: true },
            },
            callOutcome: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!thread) return null;

    return {
      thread: this.mapToThreadSummary(thread),
      calls: thread.callSessions.map((call) => this.mapToCallInThread(call)),
    };
  }

  /**
   * Get the latest call thread for a prospect (or create new)
   */
  async getOrCreateThread(
    prospectId: string,
    organizationId: string
  ): Promise<{ id: string; isNew: boolean }> {
    // Check for existing active thread
    const existingThread = await prisma.callThread.findFirst({
      where: {
        prospectId,
        organizationId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        callSessions: {
          where: {
            status: { in: ['scheduled', 'in_progress'] },
          },
        },
      },
    });

    // If there's an active call in progress, use that thread
    if (existingThread && existingThread.callSessions.length > 0) {
      return { id: existingThread.id, isNew: false };
    }

    // Create new thread for new conversation
    const newThread = await prisma.callThread.create({
      data: {
        prospectId,
        organizationId,
      },
    });

    return { id: newThread.id, isNew: true };
  }

  /**
   * Get conversation history for a prospect
   */
  async getConversationHistory(
    prospectId: string,
    organizationId: string
  ): Promise<{
    prospect: { id: string; name: string; clientCount: number | null };
    threads: CallThreadWithCalls[];
    totalCalls: number;
    totalDuration: number;
  }> {
    const prospect = await prisma.prospect.findFirst({
      where: {
        id: prospectId,
        organizationId,
      },
    });

    if (!prospect) {
      throw new Error('Prospect not found');
    }

    const threads = await this.getThreadsForProspect(prospectId, organizationId);

    // Calculate totals
    const totalCalls = threads.reduce(
      (sum, t) => sum + t.calls.length,
      0
    );

    const totalDuration = threads.reduce((sum, t) => {
      return (
        sum +
        t.calls.reduce((callSum, call) => {
          if (call.startedAt && call.endedAt) {
            return (
              callSum +
              Math.round(
                (new Date(call.endedAt).getTime() -
                  new Date(call.startedAt).getTime()) /
                  1000
              )
            );
          }
          return callSum;
        }, 0)
      );
    }, 0);

    return {
      prospect: {
        id: prospect.id,
        name: prospect.name,
        clientCount: prospect.clientCount,
      },
      threads,
      totalCalls,
      totalDuration,
    };
  }

  /**
   * Map database thread to summary
   */
  private mapToThreadSummary(thread: {
    id: string;
    prospectId: string;
    prospect: { name: string; clientCount: number | null };
    callSessions: Array<{
      startedAt: Date | null;
      endedAt: Date | null;
      status: string;
      milestoneResponses: Array<{
        status: string;
        milestone: { milestoneNumber: number };
      }>;
      objectionResponses: Array<{ outcome: string }>;
      callOutcome: { outcomeType: string } | null;
    }>;
    createdAt: Date;
  }): CallThreadSummary {
    const completedCalls = thread.callSessions.filter(
      (c) => c.status === 'completed'
    );
    const lastCall = completedCalls[completedCalls.length - 1];
    const scheduledCall = thread.callSessions.find(
      (c) => c.status === 'scheduled'
    );

    // Find highest completed milestone across all calls
    let lastMilestoneCompleted: number | null = null;
    thread.callSessions.forEach((call) => {
      call.milestoneResponses
        .filter((r) => r.status === 'completed')
        .forEach((r) => {
          if (
            lastMilestoneCompleted === null ||
            r.milestone.milestoneNumber > lastMilestoneCompleted
          ) {
            lastMilestoneCompleted = r.milestone.milestoneNumber;
          }
        });
    });

    // Count unresolved objections across all calls
    const unresolvedObjections = thread.callSessions.reduce(
      (sum, call) => sum + call.objectionResponses.length,
      0
    );

    // Determine qualification status
    let qualificationStatus: 'qualified' | 'unqualified' | 'pending' = 'pending';
    if (thread.prospect.clientCount !== null) {
      qualificationStatus =
        thread.prospect.clientCount >= 500 ? 'qualified' : 'unqualified';
    }

    return {
      id: thread.id,
      prospectId: thread.prospectId,
      prospectName: thread.prospect.name,
      totalCalls: thread.callSessions.length,
      lastCallDate: lastCall?.endedAt || lastCall?.startedAt || null,
      nextScheduledCall: scheduledCall?.startedAt || null,
      lastMilestoneCompleted,
      unresolvedObjections,
      qualificationStatus,
      createdAt: thread.createdAt,
    };
  }

  /**
   * Map database call to thread call
   */
  private mapToCallInThread(call: {
    id: string;
    status: string;
    mode: string;
    language: string;
    startedAt: Date | null;
    endedAt: Date | null;
    agent: { name: string | null; email: string };
    milestoneResponses: Array<{ status: string }>;
    objectionResponses: Array<{ objection: { objectionType: string } }>;
    callOutcome: { outcomeType: string } | null;
    createdAt: Date;
  }): CallInThread {
    const completedMilestones = call.milestoneResponses.filter(
      (r) => r.status === 'completed'
    ).length;

    return {
      id: call.id,
      status: call.status,
      mode: call.mode,
      language: call.language,
      startedAt: call.startedAt,
      endedAt: call.endedAt,
      agentName: call.agent.name || call.agent.email,
      milestonesCompleted: completedMilestones,
      totalMilestones: call.milestoneResponses.length,
      outcome: call.callOutcome?.outcomeType || null,
      unresolvedObjections: call.objectionResponses.map(
        (r) => r.objection.objectionType
      ),
      createdAt: call.createdAt,
    };
  }
}

export const callThreadService = new CallThreadService();
