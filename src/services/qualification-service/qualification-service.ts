/**
 * Qualification Service - Handles qualification gate enforcement
 * Advisory mode detection, milestone availability, and outcome restrictions
 */

import { prisma } from '@/lib/db';
import { CallOutcomeType } from '../call-outcome-service';

/**
 * Qualification threshold for full sales mode
 */
export const QUALIFICATION_THRESHOLD = 500;

/**
 * Milestones that are skipped in advisory mode
 */
export const ADVISORY_MODE_SKIPPED_MILESTONES = [6]; // M6: Offer Presentation

/**
 * Allowed outcomes in advisory mode for M7
 */
export const ADVISORY_MODE_ALLOWED_OUTCOMES: CallOutcomeType[] = [
  'Follow_up_Scheduled',
  'Disqualified',
];

/**
 * Full set of allowed outcomes in standard mode
 */
export const STANDARD_MODE_ALLOWED_OUTCOMES: CallOutcomeType[] = [
  'Coaching_Client',
  'Follow_up_Scheduled',
  'Implementation_Only',
  'Disqualified',
];

/**
 * Qualification status for a call
 */
export interface QualificationStatus {
  isQualified: boolean;
  isAdvisoryMode: boolean;
  clientCount: number;
  threshold: number;
  skippedMilestones: number[];
  allowedOutcomes: CallOutcomeType[];
  reasons: string[];
}

/**
 * Milestone availability based on qualification
 */
export interface MilestoneAvailability {
  milestoneNumber: number;
  isAvailable: boolean;
  reason: string | null;
}

/**
 * QualificationService - Manages qualification gates and advisory mode
 */
export class QualificationService {
  /**
   * Get qualification status for a call
   */
  async getQualificationStatus(
    organizationId: string,
    callId: string
  ): Promise<QualificationStatus> {
    const call = await prisma.callSession.findFirst({
      where: {
        id: callId,
        organizationId,
      },
      include: {
        prospect: true,
      },
    });

    if (!call) {
      throw new Error('Call not found');
    }

    const clientCount = call.prospect.clientCount || 0;
    const isQualified = clientCount >= QUALIFICATION_THRESHOLD;
    const isAdvisoryMode = !isQualified;
    const reasons: string[] = [];

    if (isAdvisoryMode) {
      reasons.push(
        `Client count (${clientCount}) below threshold (${QUALIFICATION_THRESHOLD})`
      );
    }

    return {
      isQualified,
      isAdvisoryMode,
      clientCount,
      threshold: QUALIFICATION_THRESHOLD,
      skippedMilestones: isAdvisoryMode ? ADVISORY_MODE_SKIPPED_MILESTONES : [],
      allowedOutcomes: isAdvisoryMode
        ? ADVISORY_MODE_ALLOWED_OUTCOMES
        : STANDARD_MODE_ALLOWED_OUTCOMES,
      reasons,
    };
  }

  /**
   * Get qualification status for a prospect (before call creation)
   */
  async getProspectQualificationStatus(
    organizationId: string,
    prospectId: string
  ): Promise<QualificationStatus> {
    const prospect = await prisma.prospect.findFirst({
      where: {
        id: prospectId,
        organizationId,
      },
    });

    if (!prospect) {
      throw new Error('Prospect not found');
    }

    const clientCount = prospect.clientCount || 0;
    const isQualified = clientCount >= QUALIFICATION_THRESHOLD;
    const isAdvisoryMode = !isQualified;
    const reasons: string[] = [];

    if (isAdvisoryMode) {
      reasons.push(
        `Client count (${clientCount}) below threshold (${QUALIFICATION_THRESHOLD})`
      );
    }

    return {
      isQualified,
      isAdvisoryMode,
      clientCount,
      threshold: QUALIFICATION_THRESHOLD,
      skippedMilestones: isAdvisoryMode ? ADVISORY_MODE_SKIPPED_MILESTONES : [],
      allowedOutcomes: isAdvisoryMode
        ? ADVISORY_MODE_ALLOWED_OUTCOMES
        : STANDARD_MODE_ALLOWED_OUTCOMES,
      reasons,
    };
  }

  /**
   * Get milestone availability for a call
   * Accepts optional pre-fetched status to avoid duplicate DB queries
   */
  async getMilestoneAvailability(
    organizationId: string,
    callId: string,
    existingStatus?: QualificationStatus
  ): Promise<MilestoneAvailability[]> {
    const [status, milestones] = await Promise.all([
      existingStatus ?? this.getQualificationStatus(organizationId, callId),
      prisma.milestone.findMany({
        where: { organizationId },
        orderBy: { orderIndex: 'asc' },
      }),
    ]);

    return milestones.map((milestone) => {
      const isSkipped = status.skippedMilestones.includes(milestone.milestoneNumber);
      return {
        milestoneNumber: milestone.milestoneNumber,
        isAvailable: !isSkipped,
        reason: isSkipped
          ? `Milestone ${milestone.milestoneNumber} is skipped in advisory mode (client count: ${status.clientCount})`
          : null,
      };
    });
  }

  /**
   * Get combined qualification status and milestone availability in one call
   * More efficient than calling both methods separately
   */
  async getFullQualificationData(
    organizationId: string,
    callId: string
  ): Promise<{ status: QualificationStatus; milestoneAvailability: MilestoneAvailability[] }> {
    const status = await this.getQualificationStatus(organizationId, callId);
    const milestoneAvailability = await this.getMilestoneAvailability(
      organizationId,
      callId,
      status // Pass the already-fetched status
    );

    return { status, milestoneAvailability };
  }

  /**
   * Check if a specific milestone is available
   */
  async isMilestoneAvailable(
    organizationId: string,
    callId: string,
    milestoneNumber: number
  ): Promise<{ isAvailable: boolean; reason: string | null }> {
    const status = await this.getQualificationStatus(organizationId, callId);
    const isSkipped = status.skippedMilestones.includes(milestoneNumber);

    return {
      isAvailable: !isSkipped,
      reason: isSkipped
        ? `Milestone ${milestoneNumber} is skipped in advisory mode (client count: ${status.clientCount})`
        : null,
    };
  }

  /**
   * Check if an outcome is allowed for a call
   */
  async isOutcomeAllowed(
    organizationId: string,
    callId: string,
    outcome: CallOutcomeType
  ): Promise<{ isAllowed: boolean; reason: string | null }> {
    const status = await this.getQualificationStatus(organizationId, callId);
    const isAllowed = status.allowedOutcomes.includes(outcome);

    return {
      isAllowed,
      reason: isAllowed
        ? null
        : `Outcome "${outcome}" is not allowed in advisory mode. Allowed: ${status.allowedOutcomes.join(', ')}`,
    };
  }

  /**
   * Validate outcome before creating
   * Throws error if outcome is not allowed
   */
  async validateOutcomeForCall(
    organizationId: string,
    callId: string,
    outcome: CallOutcomeType
  ): Promise<void> {
    const result = await this.isOutcomeAllowed(organizationId, callId, outcome);
    if (!result.isAllowed) {
      throw new Error(result.reason || 'Outcome not allowed');
    }
  }

  /**
   * Get next available milestone number
   * Skips milestones that are not available in advisory mode
   */
  async getNextAvailableMilestone(
    organizationId: string,
    callId: string,
    currentMilestoneNumber: number
  ): Promise<number | null> {
    const [status, milestones] = await Promise.all([
      this.getQualificationStatus(organizationId, callId),
      prisma.milestone.findMany({
        where: { organizationId },
        orderBy: { milestoneNumber: 'asc' },
      }),
    ]);

    // Find next available milestone after current
    for (const milestone of milestones) {
      if (milestone.milestoneNumber <= currentMilestoneNumber) continue;
      if (!status.skippedMilestones.includes(milestone.milestoneNumber)) {
        return milestone.milestoneNumber;
      }
    }

    return null; // No more milestones
  }

  /**
   * Check if call can proceed to offer presentation
   * Requires qualification threshold to be met
   */
  async canProceedToOffer(
    organizationId: string,
    callId: string
  ): Promise<{ canProceed: boolean; reason: string | null }> {
    const status = await this.getQualificationStatus(organizationId, callId);

    if (status.isAdvisoryMode) {
      return {
        canProceed: false,
        reason: `Cannot proceed to offer presentation. Client count (${status.clientCount}) below threshold (${status.threshold}). Schedule follow-up to continue qualification.`,
      };
    }

    return {
      canProceed: true,
      reason: null,
    };
  }
}

export const qualificationService = new QualificationService();
