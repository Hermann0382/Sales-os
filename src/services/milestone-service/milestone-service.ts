/**
 * Milestone Service - Business logic for milestone execution
 * Handles milestone progression, responses, and validation
 */

import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db';
import {
  CreateMilestoneResponseInput,
  Milestone,
  MilestoneResponse,
  MilestoneResponseStatus,
  UpdateMilestoneResponseInput,
} from '@/lib/types';

export class MilestoneService {
  /**
   * Get all milestones for an organization
   */
  async getMilestones(organizationId: string): Promise<Milestone[]> {
    const milestones = await prisma.milestone.findMany({
      where: { organizationId },
      orderBy: { orderIndex: 'asc' },
    });

    return milestones.map(this.mapToMilestone);
  }

  /**
   * Get milestone by ID
   */
  async getMilestone(milestoneId: string): Promise<Milestone | null> {
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
    });

    if (!milestone) return null;
    return this.mapToMilestone(milestone);
  }

  /**
   * Get milestones for a call session with responses
   */
  async getMilestonesForCall(callSessionId: string) {
    const call = await prisma.callSession.findUnique({
      where: { id: callSessionId },
    });

    if (!call) return [];

    const milestones = await prisma.milestone.findMany({
      where: { organizationId: call.organizationId },
      orderBy: { orderIndex: 'asc' },
    });

    const responses = await prisma.milestoneResponse.findMany({
      where: { callSessionId },
    });

    const responseMap = new Map(responses.map((r) => [r.milestoneId, r]));

    return milestones.map((m) => ({
      milestone: this.mapToMilestone(m),
      response: responseMap.get(m.id)
        ? this.mapToMilestoneResponse(responseMap.get(m.id)!)
        : null,
    }));
  }

  /**
   * Start a milestone response
   */
  async startMilestoneResponse(
    input: CreateMilestoneResponseInput
  ): Promise<MilestoneResponse> {
    // Check if response already exists
    const existing = await prisma.milestoneResponse.findFirst({
      where: {
        callSessionId: input.callSessionId,
        milestoneId: input.milestoneId,
      },
    });

    if (existing) {
      return this.mapToMilestoneResponse(existing);
    }

    const response = await prisma.milestoneResponse.create({
      data: {
        callSessionId: input.callSessionId,
        milestoneId: input.milestoneId,
        status: 'in_progress',
        startedAt: new Date(),
      },
    });

    return this.mapToMilestoneResponse(response);
  }

  /**
   * Update milestone response
   */
  async updateMilestoneResponse(
    responseId: string,
    input: UpdateMilestoneResponseInput
  ): Promise<MilestoneResponse> {
    const response = await prisma.milestoneResponse.update({
      where: { id: responseId },
      data: {
        ...input,
        completedAt:
          input.status === 'completed' || input.status === 'skipped'
            ? new Date()
            : undefined,
      },
    });

    return this.mapToMilestoneResponse(response);
  }

  /**
   * Check off a required item
   */
  async checkItem(
    responseId: string,
    itemId: string,
    value: boolean | string | number
  ): Promise<MilestoneResponse> {
    const response = await prisma.milestoneResponse.findUnique({
      where: { id: responseId },
    });

    if (!response) {
      throw new Error('Milestone response not found');
    }

    const currentItems =
      (response.requiredItemsChecked as Record<string, unknown>) || {};
    const updatedItems = { ...currentItems, [itemId]: value };

    const updated = await prisma.milestoneResponse.update({
      where: { id: responseId },
      data: { requiredItemsChecked: updatedItems as Prisma.InputJsonValue },
    });

    return this.mapToMilestoneResponse(updated);
  }

  /**
   * Add notes to milestone response
   */
  async addNotes(responseId: string, notes: string): Promise<MilestoneResponse> {
    const response = await prisma.milestoneResponse.findUnique({
      where: { id: responseId },
    });

    if (!response) {
      throw new Error('Milestone response not found');
    }

    const existingNotes = response.notes || '';
    const updatedNotes = existingNotes ? `${existingNotes}\n${notes}` : notes;

    const updated = await prisma.milestoneResponse.update({
      where: { id: responseId },
      data: { notes: updatedNotes },
    });

    return this.mapToMilestoneResponse(updated);
  }

  /**
   * Complete a milestone
   */
  async completeMilestone(responseId: string): Promise<MilestoneResponse> {
    const response = await prisma.milestoneResponse.update({
      where: { id: responseId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    return this.mapToMilestoneResponse(response);
  }

  /**
   * Skip a milestone with reason
   */
  async skipMilestone(
    responseId: string,
    reason: string
  ): Promise<MilestoneResponse> {
    const response = await prisma.milestoneResponse.update({
      where: { id: responseId },
      data: {
        status: 'skipped',
        overrideReason: reason,
        completedAt: new Date(),
      },
    });

    return this.mapToMilestoneResponse(response);
  }

  /**
   * Validate milestone completion requirements
   */
  async validateMilestoneCompletion(
    milestoneId: string,
    checkedItems: Record<string, unknown>
  ): Promise<{ isValid: boolean; missingItems: string[] }> {
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
    });

    if (!milestone) {
      return { isValid: false, missingItems: ['Milestone not found'] };
    }

    const requiredQuestions =
      (milestone.requiredQuestions as Array<{ id: string; required: boolean }>) || [];
    const confirmations =
      (milestone.confirmations as Array<{ id: string; required: boolean }>) || [];

    const requiredItems = [
      ...requiredQuestions.filter((q) => q.required),
      ...confirmations.filter((c) => c.required),
    ];

    const missingItems = requiredItems
      .filter((item) => !checkedItems[item.id])
      .map((item) => item.id);

    return {
      isValid: missingItems.length === 0,
      missingItems,
    };
  }

  /**
   * Check if milestone can be started (enforces sequential progression in strict mode)
   */
  async canStartMilestone(
    callSessionId: string,
    milestoneId: string
  ): Promise<{
    canStart: boolean;
    reason?: string;
    requiresOverride: boolean;
  }> {
    // Get call to check mode
    const call = await prisma.callSession.findUnique({
      where: { id: callSessionId },
    });

    if (!call) {
      return { canStart: false, reason: 'Call not found', requiresOverride: false };
    }

    // Get the milestone we want to start
    const targetMilestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
    });

    if (!targetMilestone) {
      return { canStart: false, reason: 'Milestone not found', requiresOverride: false };
    }

    // Get all milestones for the organization
    const allMilestones = await prisma.milestone.findMany({
      where: { organizationId: call.organizationId },
      orderBy: { orderIndex: 'asc' },
    });

    // Get all responses for this call
    const responses = await prisma.milestoneResponse.findMany({
      where: { callSessionId },
    });

    const responseMap = new Map(responses.map((r) => [r.milestoneId, r]));

    // In flexible mode, always allow starting any milestone
    if (call.mode === 'flexible') {
      return { canStart: true, requiresOverride: false };
    }

    // In strict mode, check sequential progression
    const targetIndex = allMilestones.findIndex((m) => m.id === milestoneId);

    // Can always start the first milestone
    if (targetIndex === 0) {
      return { canStart: true, requiresOverride: false };
    }

    // Check if all previous milestones are completed
    for (let i = 0; i < targetIndex; i++) {
      const prevMilestone = allMilestones[i];
      const prevResponse = responseMap.get(prevMilestone.id);

      if (!prevResponse || prevResponse.status !== 'completed') {
        return {
          canStart: false,
          reason: `Previous milestone "${prevMilestone.title}" must be completed first`,
          requiresOverride: true,
        };
      }
    }

    return { canStart: true, requiresOverride: false };
  }

  /**
   * Get next milestone in sequence
   */
  async getNextMilestone(
    callSessionId: string
  ): Promise<Milestone | null> {
    const call = await prisma.callSession.findUnique({
      where: { id: callSessionId },
    });

    if (!call) return null;

    const allMilestones = await prisma.milestone.findMany({
      where: { organizationId: call.organizationId },
      orderBy: { orderIndex: 'asc' },
    });

    const responses = await prisma.milestoneResponse.findMany({
      where: { callSessionId },
    });

    const completedIds = new Set(
      responses
        .filter((r) => r.status === 'completed' || r.status === 'skipped')
        .map((r) => r.milestoneId)
    );

    // Find first uncompleted milestone
    const nextMilestone = allMilestones.find((m) => !completedIds.has(m.id));

    return nextMilestone ? this.mapToMilestone(nextMilestone) : null;
  }

  /**
   * Get total estimated duration for all milestones
   */
  async getTotalEstimatedDuration(organizationId: string): Promise<number> {
    const milestones = await prisma.milestone.findMany({
      where: { organizationId },
    });

    return milestones.reduce(
      (total, m) => total + (m.estimatedDurationMinutes || 0),
      0
    );
  }

  /**
   * Get milestone progress for a call
   */
  async getMilestoneProgress(callSessionId: string) {
    const responses = await prisma.milestoneResponse.findMany({
      where: { callSessionId },
      include: { milestone: true },
    });

    const milestones = await prisma.callSession.findUnique({
      where: { id: callSessionId },
    }).then(async (call) => {
      if (!call) return [];
      return prisma.milestone.findMany({
        where: { organizationId: call.organizationId },
        orderBy: { orderIndex: 'asc' },
      });
    });

    const responseMap = new Map(responses.map((r) => [r.milestoneId, r]));

    return milestones.map((m) => {
      const response = responseMap.get(m.id);
      const requiredQuestions =
        (m.requiredQuestions as Array<{ id: string; required: boolean }>) || [];
      const confirmations =
        (m.confirmations as Array<{ id: string; required: boolean }>) || [];
      const totalRequired =
        requiredQuestions.filter((q) => q.required).length +
        confirmations.filter((c) => c.required).length;

      const checkedItems =
        (response?.requiredItemsChecked as Record<string, unknown>) || {};
      const completedRequired = Object.keys(checkedItems).filter(
        (key) => checkedItems[key]
      ).length;

      return {
        milestoneId: m.id,
        milestoneNumber: m.milestoneNumber,
        title: m.title,
        status: (response?.status as MilestoneResponseStatus) || 'in_progress',
        progress: totalRequired > 0 ? (completedRequired / totalRequired) * 100 : 0,
        isActive: false,
        canProceed: completedRequired >= totalRequired,
        requiredItemsComplete: completedRequired,
        requiredItemsTotal: totalRequired,
      };
    });
  }

  /**
   * Map Prisma model to domain type
   */
  private mapToMilestone(m: {
    id: string;
    organizationId: string;
    milestoneNumber: number;
    title: string;
    objective: string;
    requiredQuestions: unknown;
    confirmations: unknown;
    estimatedDurationMinutes: number | null;
    orderIndex: number;
    createdAt: Date;
  }): Milestone {
    return {
      id: m.id,
      organizationId: m.organizationId,
      milestoneNumber: m.milestoneNumber,
      title: m.title,
      objective: m.objective,
      requiredQuestions: m.requiredQuestions as Milestone['requiredQuestions'],
      confirmations: m.confirmations as Milestone['confirmations'],
      estimatedDurationMinutes: m.estimatedDurationMinutes,
      orderIndex: m.orderIndex,
      createdAt: m.createdAt,
    };
  }

  private mapToMilestoneResponse(r: {
    id: string;
    callSessionId: string;
    milestoneId: string;
    status: string;
    requiredItemsChecked: unknown;
    notes: string | null;
    overrideReason: string | null;
    startedAt: Date;
    completedAt: Date | null;
  }): MilestoneResponse {
    return {
      id: r.id,
      callSessionId: r.callSessionId,
      milestoneId: r.milestoneId,
      status: r.status as MilestoneResponseStatus,
      requiredItemsChecked: r.requiredItemsChecked as Record<
        string,
        boolean | string | number
      > | null,
      notes: r.notes,
      overrideReason: r.overrideReason,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      createdAt: r.startedAt,
    };
  }
}

export const milestoneService = new MilestoneService();
