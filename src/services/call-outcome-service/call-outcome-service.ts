/**
 * Call Outcome Service - Business logic for end-of-call classification
 * Handles outcome creation, validation, and call completion
 */

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import {
  qualificationService,
  QUALIFICATION_THRESHOLD,
} from '../qualification-service';

/**
 * Outcome types matching Prisma enum
 */
export type CallOutcomeType =
  | 'Coaching_Client'
  | 'Follow_up_Scheduled'
  | 'Implementation_Only'
  | 'Disqualified';

/**
 * Disqualification reasons matching Prisma enum
 */
export type DisqualificationReason =
  | 'Under_500_Clients'
  | 'Cashflow_Mismatch'
  | 'Misaligned_Expectations'
  | 'Capacity_Constraint'
  | 'Authority_Issue';

/**
 * Qualification flags structure
 */
export interface QualificationFlags {
  has500Clients: boolean;
  financialCapacity: boolean;
  strategicAlignment: boolean;
}

/**
 * Input for creating a call outcome
 */
export interface CreateCallOutcomeInput {
  callSessionId: string;
  outcomeType: CallOutcomeType;
  disqualificationReason?: DisqualificationReason;
  qualificationFlags?: QualificationFlags;
}

/**
 * Mapped outcome data
 */
export interface CallOutcomeData {
  id: string;
  callSessionId: string;
  outcomeType: CallOutcomeType;
  disqualificationReason: DisqualificationReason | null;
  qualificationFlags: QualificationFlags | null;
  createdAt: Date;
}

/**
 * CallOutcomeService - Manages end-of-call classification
 */
export class CallOutcomeService {
  /**
   * Create call outcome and complete the call
   * Validates:
   * - Call exists and belongs to organization
   * - Call is in progress (not already completed)
   * - Disqualification reason required if outcome is Disqualified
   * - No unresolved objections blocking completion
   *
   * All validations are performed inside a transaction to prevent race conditions.
   */
  async createOutcome(
    organizationId: string,
    input: CreateCallOutcomeInput
  ): Promise<CallOutcomeData> {
    // Validate disqualification reason before transaction (no DB state)
    if (input.outcomeType === 'Disqualified' && !input.disqualificationReason) {
      throw new Error('Disqualification reason is required when outcome is Disqualified');
    }

    // Create outcome in transaction with all validations inside
    const result = await prisma.$transaction(async (tx) => {
      // Validate call exists and belongs to organization (inside transaction)
      const call = await tx.callSession.findFirst({
        where: {
          id: input.callSessionId,
          organizationId,
        },
        include: {
          callOutcome: true,
          prospect: true,
          objectionResponses: {
            where: { outcome: 'Deferred' },
          },
        },
      });

      if (!call) {
        throw new Error('Call session not found or unauthorized');
      }

      // Check if outcome already exists (inside transaction)
      if (call.callOutcome) {
        throw new Error('Call outcome already exists. Cannot override.');
      }

      // Validate call is in progress (inside transaction)
      if (call.status !== 'in_progress') {
        throw new Error(`Cannot set outcome for call with status: ${call.status}`);
      }

      // Validate outcome is allowed based on qualification status (inside transaction)
      // Inline qualification check to avoid separate DB query
      const clientCount = call.prospect.clientCount || 0;
      const isAdvisoryMode = clientCount < QUALIFICATION_THRESHOLD;
      const allowedOutcomes: CallOutcomeType[] = isAdvisoryMode
        ? ['Follow_up_Scheduled', 'Disqualified']
        : ['Coaching_Client', 'Follow_up_Scheduled', 'Implementation_Only', 'Disqualified'];

      if (!allowedOutcomes.includes(input.outcomeType)) {
        throw new Error(
          `Outcome "${input.outcomeType}" is not allowed in advisory mode. Allowed: ${allowedOutcomes.join(', ')}`
        );
      }

      // Warn about unresolved objections (but don't block)
      const unresolvedCount = call.objectionResponses.length;
      if (unresolvedCount > 0) {
        console.warn(
          `Call ${input.callSessionId} has ${unresolvedCount} unresolved objection(s)`
        );
      }

      // Create outcome
      const outcome = await tx.callOutcome.create({
        data: {
          callSessionId: input.callSessionId,
          outcomeType: input.outcomeType,
          disqualificationReason: input.disqualificationReason ?? null,
          qualificationFlags: input.qualificationFlags
            ? (input.qualificationFlags as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        },
      });

      // Update call status to completed
      await tx.callSession.update({
        where: { id: input.callSessionId },
        data: {
          status: 'completed',
          endedAt: new Date(),
        },
      });

      return outcome;
    });

    return this.mapToCallOutcome(result);
  }

  /**
   * Get call outcome by call session ID
   */
  async getOutcome(
    organizationId: string,
    callSessionId: string
  ): Promise<CallOutcomeData | null> {
    const outcome = await prisma.callOutcome.findFirst({
      where: {
        callSessionId,
        callSession: { organizationId },
      },
    });

    if (!outcome) return null;
    return this.mapToCallOutcome(outcome);
  }

  /**
   * Check if call can be completed (has all requirements met)
   */
  async canCompleteCall(
    organizationId: string,
    callSessionId: string
  ): Promise<{
    canComplete: boolean;
    blockers: string[];
    warnings: string[];
    isAdvisoryMode: boolean;
    allowedOutcomes: CallOutcomeType[];
  }> {
    const [call, qualificationStatus] = await Promise.all([
      prisma.callSession.findFirst({
        where: {
          id: callSessionId,
          organizationId,
        },
        include: {
          callOutcome: true,
          prospect: true,
          objectionResponses: {
            where: { outcome: 'Deferred' },
            include: { objection: true },
          },
          milestoneResponses: {
            include: { milestone: true },
          },
        },
      }),
      qualificationService.getQualificationStatus(organizationId, callSessionId).catch(() => null),
    ]);

    if (!call) {
      return {
        canComplete: false,
        blockers: ['Call not found'],
        warnings: [],
        isAdvisoryMode: false,
        allowedOutcomes: [],
      };
    }

    const blockers: string[] = [];
    const warnings: string[] = [];

    // Check if already completed
    if (call.callOutcome) {
      blockers.push('Call already has an outcome');
    }

    // Check call status
    if (call.status !== 'in_progress') {
      blockers.push(`Call status is ${call.status}, must be in_progress`);
    }

    // Check for unresolved objections (warning, not blocker)
    if (call.objectionResponses.length > 0) {
      const types = call.objectionResponses.map((r) => r.objection.objectionType);
      warnings.push(`${types.length} unresolved objection(s): ${types.join(', ')}`);
    }

    // Check milestone completion (warning)
    const completedMilestones = call.milestoneResponses.filter(
      (r) => r.status === 'completed'
    ).length;
    const totalMilestones = call.milestoneResponses.length;
    if (completedMilestones < totalMilestones) {
      warnings.push(
        `Only ${completedMilestones}/${totalMilestones} milestones completed`
      );
    }

    // Advisory mode warning
    const isAdvisoryMode = qualificationStatus?.isAdvisoryMode ?? false;
    const allowedOutcomes = qualificationStatus?.allowedOutcomes ?? [
      'Coaching_Client',
      'Follow_up_Scheduled',
      'Implementation_Only',
      'Disqualified',
    ];

    if (isAdvisoryMode) {
      const clientCount = call.prospect.clientCount || 0;
      warnings.push(
        `Advisory mode: Client count (${clientCount}) below ${QUALIFICATION_THRESHOLD}. Limited outcomes available.`
      );
    }

    return {
      canComplete: blockers.length === 0,
      blockers,
      warnings,
      isAdvisoryMode,
      allowedOutcomes,
    };
  }

  /**
   * Get outcome statistics for an organization
   * Uses database-level groupBy aggregation for efficiency (PERF-003)
   */
  async getOutcomeStats(
    organizationId: string,
    options?: { startDate?: Date; endDate?: Date }
  ): Promise<{
    total: number;
    byType: Record<CallOutcomeType, number>;
    disqualificationReasons: Record<DisqualificationReason, number>;
  }> {
    const where: Prisma.CallOutcomeWhereInput = {
      callSession: { organizationId },
    };

    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }

    // Use groupBy for efficient database-level aggregation
    const [outcomeStats, disqualStats] = await Promise.all([
      prisma.callOutcome.groupBy({
        by: ['outcomeType'],
        where,
        _count: { id: true },
      }),
      prisma.callOutcome.groupBy({
        by: ['disqualificationReason'],
        where: {
          ...where,
          disqualificationReason: { not: null },
        },
        _count: { id: true },
      }),
    ]);

    // Initialize with zeros
    const byType: Record<string, number> = {
      Coaching_Client: 0,
      Follow_up_Scheduled: 0,
      Implementation_Only: 0,
      Disqualified: 0,
    };

    const disqualificationReasons: Record<string, number> = {
      Under_500_Clients: 0,
      Cashflow_Mismatch: 0,
      Misaligned_Expectations: 0,
      Capacity_Constraint: 0,
      Authority_Issue: 0,
    };

    // Map groupBy results
    for (const stat of outcomeStats) {
      byType[stat.outcomeType] = stat._count.id;
    }
    for (const stat of disqualStats) {
      if (stat.disqualificationReason) {
        disqualificationReasons[stat.disqualificationReason] = stat._count.id;
      }
    }

    const total = outcomeStats.reduce((sum, s) => sum + s._count.id, 0);

    return {
      total,
      byType: byType as Record<CallOutcomeType, number>,
      disqualificationReasons: disqualificationReasons as Record<DisqualificationReason, number>,
    };
  }

  /**
   * Map Prisma model to domain type
   */
  private mapToCallOutcome(outcome: {
    id: string;
    callSessionId: string;
    outcomeType: string;
    disqualificationReason: string | null;
    qualificationFlags: Prisma.JsonValue;
    createdAt: Date;
  }): CallOutcomeData {
    return {
      id: outcome.id,
      callSessionId: outcome.callSessionId,
      outcomeType: outcome.outcomeType as CallOutcomeType,
      disqualificationReason: outcome.disqualificationReason as DisqualificationReason | null,
      qualificationFlags: outcome.qualificationFlags as QualificationFlags | null,
      createdAt: outcome.createdAt,
    };
  }
}

export const callOutcomeService = new CallOutcomeService();
