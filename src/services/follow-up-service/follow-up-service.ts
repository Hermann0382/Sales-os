/**
 * FollowUp Service - Business logic for follow-up call support
 * Handles context resume, unresolved objection tracking, and resume point selection
 */

import { CallMode, Language } from '@prisma/client';

import { prisma } from '@/lib/db';

export interface FollowUpContext {
  callSessionId: string;
  prospectId: string;
  prospectName: string;
  previousCallSummary: {
    date: Date | null;
    duration: number;
    agentName: string;
    outcome: string | null;
  };
  lastMilestoneCompleted: {
    number: number;
    title: string;
  } | null;
  unresolvedObjections: Array<{
    id: string;
    type: string;
    previousOutcome: string;
    notes: string | null;
  }>;
  qualificationFlags: {
    clientCountMet: boolean;
    clientCount: number;
    mainPain: string | null;
    revenueVolatility: number | null;
  };
  suggestedResumePoints: Array<{
    type: 'milestone' | 'decision' | 'objection';
    label: string;
    milestoneNumber?: number;
    description: string;
  }>;
  languagePreference: string;
  callMode: string;
}

export interface ResumePoint {
  type: 'from_milestone' | 'jump_to_decision' | 'address_objection';
  milestoneNumber?: number;
  objectionId?: string;
}

export class FollowUpService {
  /**
   * Get context for a follow-up call
   * Returns previous call summary, unresolved objections, and suggested resume points
   */
  async getFollowUpContext(
    callId: string,
    organizationId: string
  ): Promise<FollowUpContext | null> {
    // Get the call with its thread and previous calls
    const call = await prisma.callSession.findFirst({
      where: {
        id: callId,
        organizationId,
      },
      include: {
        prospect: true,
        callThread: {
          include: {
            callSessions: {
              where: {
                id: { not: callId },
                status: 'completed',
              },
              include: {
                agent: true,
                milestoneResponses: {
                  include: { milestone: true },
                  where: { status: 'completed' },
                },
                objectionResponses: {
                  where: { outcome: { not: 'Resolved' } },
                  include: { objection: true },
                },
                callOutcome: true,
              },
              orderBy: { endedAt: 'desc' },
            },
          },
        },
      },
    });

    if (!call) return null;

    // Get the most recent previous call
    const previousCall = call.callThread.callSessions[0];

    if (!previousCall) {
      // This is the first call, no follow-up context needed
      return null;
    }

    // Find highest completed milestone
    const allMilestoneResponses = call.callThread.callSessions.flatMap(
      (session) => session.milestoneResponses
    );
    const lastMilestoneCompleted = allMilestoneResponses.reduce<{
      number: number;
      title: string;
    } | null>((highest, response) => {
      if (!highest || response.milestone.milestoneNumber > highest.number) {
        return {
          number: response.milestone.milestoneNumber,
          title: response.milestone.title,
        };
      }
      return highest;
    }, null);

    // Collect all unresolved objections from all previous calls
    const unresolvedObjections: FollowUpContext['unresolvedObjections'] = [];
    call.callThread.callSessions.forEach((session) => {
      session.objectionResponses.forEach((response) => {
        unresolvedObjections.push({
          id: response.id,
          type: response.objection.objectionType,
          previousOutcome: response.outcome,
          notes: response.notes,
        });
      });
    });

    // Calculate previous call duration
    const previousDuration =
      previousCall.startedAt && previousCall.endedAt
        ? Math.round(
            (previousCall.endedAt.getTime() - previousCall.startedAt.getTime()) /
              1000
          )
        : 0;

    // Build suggested resume points
    const suggestedResumePoints: FollowUpContext['suggestedResumePoints'] = [];

    // Suggest continuing from next milestone
    if (lastMilestoneCompleted && lastMilestoneCompleted.number < 7) {
      suggestedResumePoints.push({
        type: 'milestone',
        label: `Continue from M${lastMilestoneCompleted.number + 1}`,
        milestoneNumber: lastMilestoneCompleted.number + 1,
        description: `Resume from where you left off after ${lastMilestoneCompleted.title}`,
      });
    }

    // Suggest addressing unresolved objections
    if (unresolvedObjections.length > 0) {
      suggestedResumePoints.push({
        type: 'objection',
        label: 'Address Objections First',
        description: `${unresolvedObjections.length} unresolved objection(s) from previous call`,
      });
    }

    // Suggest jumping to decision if close
    if (lastMilestoneCompleted && lastMilestoneCompleted.number >= 5) {
      suggestedResumePoints.push({
        type: 'decision',
        label: 'Jump to Decision (M7)',
        milestoneNumber: 7,
        description: 'Proceed directly to the decision point',
      });
    }

    return {
      callSessionId: callId,
      prospectId: call.prospectId,
      prospectName: call.prospect.name,
      previousCallSummary: {
        date: previousCall.endedAt || previousCall.startedAt,
        duration: previousDuration,
        agentName: previousCall.agent.name || previousCall.agent.email,
        outcome: previousCall.callOutcome?.outcomeType || null,
      },
      lastMilestoneCompleted,
      unresolvedObjections,
      qualificationFlags: {
        clientCountMet: (call.prospect.clientCount || 0) >= 500,
        clientCount: call.prospect.clientCount || 0,
        mainPain: call.prospect.mainPain,
        revenueVolatility: call.prospect.revenueVolatility,
      },
      suggestedResumePoints,
      languagePreference: previousCall.language,
      callMode: previousCall.mode,
    };
  }

  /**
   * Create a follow-up call for a prospect
   */
  async createFollowUpCall(
    prospectId: string,
    agentId: string,
    organizationId: string,
    options?: {
      scheduledFor?: Date;
      inheritLanguage?: boolean;
      inheritMode?: boolean;
    }
  ): Promise<{
    callId: string;
    threadId: string;
    isFirstCall: boolean;
  }> {
    // Find existing thread or get the latest one
    const existingThread = await prisma.callThread.findFirst({
      where: {
        prospectId,
        organizationId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        callSessions: {
          where: { status: 'completed' },
          orderBy: { endedAt: 'desc' },
          take: 1,
        },
      },
    });

    let threadId: string;
    let language: Language = Language.EN;
    let mode: CallMode = CallMode.flexible;
    const isFirstCall = !existingThread;

    if (existingThread) {
      threadId = existingThread.id;
      const lastCall = existingThread.callSessions[0];
      if (lastCall) {
        if (options?.inheritLanguage !== false) {
          language = lastCall.language;
        }
        if (options?.inheritMode !== false) {
          mode = lastCall.mode;
        }
      }
    } else {
      // Create new thread
      const newThread = await prisma.callThread.create({
        data: {
          prospectId,
          organizationId,
        },
      });
      threadId = newThread.id;
    }

    // Create the follow-up call
    const call = await prisma.callSession.create({
      data: {
        organizationId,
        callThreadId: threadId,
        prospectId,
        agentId,
        status: 'scheduled',
        mode,
        language,
      },
    });

    return {
      callId: call.id,
      threadId,
      isFirstCall,
    };
  }

  /**
   * Get scheduled follow-up calls for an agent
   */
  async getScheduledFollowUps(
    agentId: string,
    organizationId: string
  ): Promise<
    Array<{
      callId: string;
      prospectId: string;
      prospectName: string;
      scheduledFor: Date;
      hasContext: boolean;
      previousCallCount: number;
      lastOutcome: string | null;
    }>
  > {
    const calls = await prisma.callSession.findMany({
      where: {
        agentId,
        organizationId,
        status: 'scheduled',
      },
      include: {
        prospect: true,
        callThread: {
          include: {
            callSessions: {
              where: { status: 'completed' },
              include: {
                callOutcome: true,
              },
              orderBy: { endedAt: 'desc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return calls.map((call) => {
      const previousCalls = call.callThread.callSessions;
      const lastCall = previousCalls[0];

      return {
        callId: call.id,
        prospectId: call.prospectId,
        prospectName: call.prospect.name,
        scheduledFor: call.createdAt,
        hasContext: previousCalls.length > 0,
        previousCallCount: previousCalls.length,
        lastOutcome: lastCall?.callOutcome?.outcomeType || null,
      };
    });
  }

  /**
   * Get unresolved objections for a prospect across all calls
   */
  async getUnresolvedObjections(
    prospectId: string,
    organizationId: string
  ): Promise<
    Array<{
      objectionId: string;
      objectionType: string;
      callDate: Date | null;
      outcome: string;
      notes: string | null;
      diagnosticQuestions: unknown;
    }>
  > {
    const threads = await prisma.callThread.findMany({
      where: {
        prospectId,
        organizationId,
      },
      include: {
        callSessions: {
          include: {
            objectionResponses: {
              where: { outcome: { not: 'Resolved' } },
              include: { objection: true },
            },
          },
        },
      },
    });

    const objections: Array<{
      objectionId: string;
      objectionType: string;
      callDate: Date | null;
      outcome: string;
      notes: string | null;
      diagnosticQuestions: unknown;
    }> = [];

    threads.forEach((thread) => {
      thread.callSessions.forEach((call) => {
        call.objectionResponses.forEach((response) => {
          objections.push({
            objectionId: response.objection.id,
            objectionType: response.objection.objectionType,
            callDate: call.endedAt || call.startedAt,
            outcome: response.outcome,
            notes: response.notes,
            diagnosticQuestions: response.objection.diagnosticQuestions,
          });
        });
      });
    });

    return objections;
  }
}

export const followUpService = new FollowUpService();
