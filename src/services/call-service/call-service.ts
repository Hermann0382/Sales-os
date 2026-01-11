/**
 * Call Service - Business logic for call session management
 * Handles call creation, state transitions, and recording integration
 */

import { prisma } from '@/lib/db';
import {
  getTransition,
  InvalidStateTransitionError,
  isValidTransition,
} from '@/lib/state-machine/call-state';
import {
  CallSession,
  CallStatus,
  CallSummary,
  CreateCallSessionInput,
  UpdateCallSessionInput,
} from '@/lib/types';

export class CallService {
  /**
   * Create a new call session
   */
  async createCall(input: CreateCallSessionInput): Promise<CallSession> {
    // Create or get call thread
    let callThreadId = input.callThreadId;

    if (!callThreadId) {
      // Create new thread for this prospect
      const thread = await prisma.callThread.create({
        data: {
          organizationId: input.organizationId,
          prospectId: input.prospectId,
        },
      });
      callThreadId = thread.id;
    }

    // Create call session
    const callSession = await prisma.callSession.create({
      data: {
        organizationId: input.organizationId,
        callThreadId,
        prospectId: input.prospectId,
        agentId: input.agentId,
        mode: input.mode || 'flexible',
        language: input.language || 'EN',
        zoomLink: input.zoomLink,
        status: 'scheduled',
      },
    });

    return this.mapToCallSession(callSession);
  }

  /**
   * Get call session by ID
   */
  async getCall(callId: string): Promise<CallSession | null> {
    const call = await prisma.callSession.findUnique({
      where: { id: callId },
    });

    if (!call) return null;
    return this.mapToCallSession(call);
  }

  /**
   * Get call session with relations
   */
  async getCallWithRelations(callId: string) {
    return prisma.callSession.findUnique({
      where: { id: callId },
      include: {
        prospect: true,
        agent: true,
        callThread: true,
        milestoneResponses: {
          include: { milestone: true },
        },
        objectionResponses: {
          include: { objection: true },
        },
        aiAnalysis: true,
        callOutcome: true,
      },
    });
  }

  /**
   * Start a call session
   */
  async startCall(callId: string): Promise<CallSession> {
    const call = await prisma.callSession.update({
      where: { id: callId },
      data: {
        status: 'in_progress',
        startedAt: new Date(),
      },
    });

    return this.mapToCallSession(call);
  }

  /**
   * End a call session
   */
  async endCall(callId: string): Promise<CallSession> {
    const call = await prisma.callSession.update({
      where: { id: callId },
      data: {
        status: 'completed',
        endedAt: new Date(),
      },
    });

    return this.mapToCallSession(call);
  }

  /**
   * Update call session
   */
  async updateCall(
    callId: string,
    input: UpdateCallSessionInput
  ): Promise<CallSession> {
    const call = await prisma.callSession.update({
      where: { id: callId },
      data: input,
    });

    return this.mapToCallSession(call);
  }

  /**
   * Update call status with state machine validation
   */
  async updateStatus(callId: string, newStatus: CallStatus): Promise<CallSession> {
    // Get current call to check current status
    const currentCall = await prisma.callSession.findUnique({
      where: { id: callId },
    });

    if (!currentCall) {
      throw new Error('Call not found');
    }

    const currentStatus = currentCall.status as CallStatus;

    // Validate state transition
    if (!isValidTransition(currentStatus, newStatus)) {
      throw new InvalidStateTransitionError(currentStatus, newStatus);
    }

    // Get transition details for automatic timestamp setting
    const transition = getTransition(currentStatus, newStatus);
    const updateData: Record<string, unknown> = { status: newStatus };

    if (transition?.autoSetTimestamp === 'startedAt') {
      updateData.startedAt = new Date();
    }

    if (transition?.autoSetTimestamp === 'endedAt') {
      updateData.endedAt = new Date();
    }

    const call = await prisma.callSession.update({
      where: { id: callId },
      data: updateData,
    });

    return this.mapToCallSession(call);
  }

  /**
   * List calls for an agent
   */
  async listCallsForAgent(
    agentId: string,
    options?: {
      status?: CallStatus;
      limit?: number;
      offset?: number;
    }
  ) {
    const where: Record<string, unknown> = { agentId };
    if (options?.status) {
      where.status = options.status;
    }

    return prisma.callSession.findMany({
      where,
      include: {
        prospect: true,
        callOutcome: true,
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 20,
      skip: options?.offset || 0,
    });
  }

  /**
   * List calls for an organization (manager view)
   */
  async listCallsForOrganization(
    organizationId: string,
    options?: {
      status?: CallStatus;
      agentId?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    const where: Record<string, unknown> = { organizationId };
    if (options?.status) where.status = options.status;
    if (options?.agentId) where.agentId = options.agentId;

    return prisma.callSession.findMany({
      where,
      include: {
        prospect: true,
        agent: true,
        callOutcome: true,
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
  }

  /**
   * Get call summary for follow-up context
   */
  async getCallSummary(callId: string): Promise<CallSummary | null> {
    const call = await prisma.callSession.findUnique({
      where: { id: callId },
      include: {
        prospect: true,
        agent: true,
        milestoneResponses: {
          include: { milestone: true },
          orderBy: { startedAt: 'desc' },
        },
        objectionResponses: {
          where: { outcome: { not: 'Resolved' } },
          include: {
            objection: true,
            milestone: true,
          },
        },
        callOutcome: true,
      },
    });

    if (!call) return null;

    // Find last completed milestone
    const completedMilestones = call.milestoneResponses.filter(
      (r) => r.status === 'completed'
    );
    const lastCompleted = completedMilestones[0]?.milestone.milestoneNumber || null;

    // Calculate duration
    const duration =
      call.startedAt && call.endedAt
        ? Math.round((call.endedAt.getTime() - call.startedAt.getTime()) / 1000)
        : 0;

    // Build detailed objection information
    const unresolvedObjectionDetails = call.objectionResponses.map((r) => ({
      id: r.id,
      objectionType: r.objection.objectionType,
      outcome: r.outcome,
      diagnosticAnswers: r.diagnosticAnswers as Record<number, string> | null,
      notes: r.notes,
      milestoneNumber: r.milestone?.milestoneNumber || null,
      createdAt: r.createdAt,
    }));

    return {
      callSessionId: call.id,
      prospectName: call.prospect.name,
      agentName: call.agent.name || call.agent.email,
      date: call.startedAt || call.createdAt,
      duration,
      lastCompletedMilestone: lastCompleted,
      unresolvedObjections: call.objectionResponses.map(
        (r) => r.objection.objectionType
      ),
      unresolvedObjectionDetails,
      qualificationStatus: {
        clientCountMet: (call.prospect.clientCount || 0) >= 500,
        hasFinancialCapacity:
          (call.callOutcome?.qualificationFlags as Record<string, boolean> | null)?.financialCapacity ?? false,
        hasStrategicAlignment:
          (call.callOutcome?.qualificationFlags as Record<string, boolean> | null)?.strategicAlignment ?? false,
      },
      notes: call.milestoneResponses[0]?.notes || null,
    };
  }

  /**
   * Set recording reference
   */
  async setRecordingReference(
    callId: string,
    recordingReference: string
  ): Promise<CallSession> {
    const call = await prisma.callSession.update({
      where: { id: callId },
      data: { recordingReference },
    });

    return this.mapToCallSession(call);
  }

  /**
   * Map Prisma model to domain type
   */
  private mapToCallSession(call: {
    id: string;
    organizationId: string;
    callThreadId: string;
    prospectId: string;
    agentId: string;
    status: string;
    mode: string;
    language: string;
    startedAt: Date | null;
    endedAt: Date | null;
    recordingReference: string | null;
    zoomLink: string | null;
    createdAt: Date;
  }): CallSession {
    return {
      id: call.id,
      organizationId: call.organizationId,
      callThreadId: call.callThreadId,
      prospectId: call.prospectId,
      agentId: call.agentId,
      status: call.status as CallStatus,
      mode: call.mode as 'strict' | 'flexible',
      language: call.language as 'EN' | 'DE',
      startedAt: call.startedAt,
      endedAt: call.endedAt,
      recordingReference: call.recordingReference,
      zoomLink: call.zoomLink,
      createdAt: call.createdAt,
    };
  }
}

export const callService = new CallService();
