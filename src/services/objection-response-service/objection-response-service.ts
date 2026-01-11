/**
 * Objection Response Service - Business logic for objection tracking
 * Handles objection creation, diagnostic answers, and outcome management
 */

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

/**
 * Input types
 */
export interface CreateObjectionResponseInput {
  callSessionId: string;
  objectionId: string;
  milestoneId: string;
  outcome: 'Resolved' | 'Deferred' | 'Disqualified';
  diagnosticAnswers?: Record<string, string>;
  notes?: string;
}

export interface UpdateObjectionResponseInput {
  notes?: string;
  diagnosticAnswers?: Record<string, string>;
}

/**
 * Mapped response type
 */
export interface ObjectionResponseData {
  id: string;
  callSessionId: string;
  objectionId: string;
  milestoneId: string;
  outcome: 'Resolved' | 'Deferred' | 'Disqualified';
  diagnosticAnswers: Record<string, string> | null;
  notes: string | null;
  createdAt: Date;
  objection?: {
    id: string;
    objectionType: string;
    diagnosticQuestions: unknown;
    allowedOutcomes: unknown;
  };
}

/**
 * ObjectionResponseService - Manages objection interactions during calls
 */
export class ObjectionResponseService {
  /**
   * Create a new objection response with outcome
   * Called when agent completes objection diagnostic flow
   *
   * All validations are performed inside a transaction to prevent race conditions
   * where call status could change between validation and creation.
   */
  async createObjectionResponse(
    organizationId: string,
    input: CreateObjectionResponseInput
  ): Promise<ObjectionResponseData> {
    // Create objection response in transaction with all validations inside
    const response = await prisma.$transaction(async (tx) => {
      // Validate call belongs to organization (inside transaction)
      const call = await tx.callSession.findFirst({
        where: {
          id: input.callSessionId,
          organizationId,
        },
      });

      if (!call) {
        throw new Error('Call session not found or unauthorized');
      }

      // Validate call is in progress (inside transaction)
      if (call.status !== 'in_progress') {
        throw new Error('Can only add objections to calls in progress');
      }

      // Validate objection exists and belongs to organization (inside transaction)
      const objection = await tx.objection.findFirst({
        where: {
          id: input.objectionId,
          organizationId,
        },
      });

      if (!objection) {
        throw new Error('Objection type not found or unauthorized');
      }

      // Validate outcome is allowed for this objection type
      const allowedOutcomes = objection.allowedOutcomes as string[];
      if (!allowedOutcomes.includes(input.outcome)) {
        throw new Error(`Invalid outcome. Allowed: ${allowedOutcomes.join(', ')}`);
      }

      // Create objection response (inside transaction)
      return tx.objectionResponse.create({
        data: {
          callSessionId: input.callSessionId,
          objectionId: input.objectionId,
          milestoneId: input.milestoneId,
          outcome: input.outcome,
          diagnosticAnswers: input.diagnosticAnswers as Prisma.InputJsonValue ?? Prisma.JsonNull,
          notes: input.notes,
        },
        include: {
          objection: true,
        },
      });
    });

    return this.mapToObjectionResponse(response);
  }

  /**
   * Get objection response by ID
   */
  async getObjectionResponse(
    organizationId: string,
    responseId: string
  ): Promise<ObjectionResponseData | null> {
    const response = await prisma.objectionResponse.findFirst({
      where: {
        id: responseId,
        callSession: { organizationId },
      },
      include: {
        objection: true,
      },
    });

    if (!response) return null;
    return this.mapToObjectionResponse(response);
  }

  /**
   * List all objection responses for a call
   */
  async listObjectionResponsesForCall(
    organizationId: string,
    callSessionId: string
  ): Promise<ObjectionResponseData[]> {
    const responses = await prisma.objectionResponse.findMany({
      where: {
        callSessionId,
        callSession: { organizationId },
      },
      include: {
        objection: true,
        milestone: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return responses.map((r) => this.mapToObjectionResponse(r));
  }

  /**
   * Get unresolved objections for a call (Deferred outcomes)
   */
  async getUnresolvedObjections(
    organizationId: string,
    callSessionId: string
  ): Promise<ObjectionResponseData[]> {
    const responses = await prisma.objectionResponse.findMany({
      where: {
        callSessionId,
        callSession: { organizationId },
        outcome: 'Deferred',
      },
      include: {
        objection: true,
        milestone: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return responses.map((r) => this.mapToObjectionResponse(r));
  }

  /**
   * Update objection response notes
   * Only notes and diagnostic answers can be updated after creation
   */
  async updateObjectionResponse(
    organizationId: string,
    responseId: string,
    input: UpdateObjectionResponseInput
  ): Promise<ObjectionResponseData> {
    // Verify access
    const existing = await prisma.objectionResponse.findFirst({
      where: {
        id: responseId,
        callSession: { organizationId },
      },
    });

    if (!existing) {
      throw new Error('Objection response not found or unauthorized');
    }

    const response = await prisma.objectionResponse.update({
      where: { id: responseId },
      data: {
        notes: input.notes !== undefined ? input.notes : existing.notes,
        diagnosticAnswers: input.diagnosticAnswers
          ? (input.diagnosticAnswers as Prisma.InputJsonValue)
          : undefined, // Keep existing if no new value provided
      },
      include: {
        objection: true,
      },
    });

    return this.mapToObjectionResponse(response);
  }

  /**
   * Count objections by outcome for a call
   */
  async getObjectionStats(
    organizationId: string,
    callSessionId: string
  ): Promise<{ resolved: number; deferred: number; disqualified: number; total: number }> {
    const counts = await prisma.objectionResponse.groupBy({
      by: ['outcome'],
      where: {
        callSessionId,
        callSession: { organizationId },
      },
      _count: { id: true },
    });

    const stats = {
      resolved: 0,
      deferred: 0,
      disqualified: 0,
      total: 0,
    };

    for (const count of counts) {
      const outcome = count.outcome.toLowerCase() as 'resolved' | 'deferred' | 'disqualified';
      stats[outcome] = count._count.id;
      stats.total += count._count.id;
    }

    return stats;
  }

  /**
   * Check if call has unresolved objections
   */
  async hasUnresolvedObjections(
    organizationId: string,
    callSessionId: string
  ): Promise<boolean> {
    const count = await prisma.objectionResponse.count({
      where: {
        callSessionId,
        callSession: { organizationId },
        outcome: 'Deferred',
      },
    });

    return count > 0;
  }

  /**
   * Get objection history for a prospect (across all calls)
   */
  async getObjectionHistoryForProspect(
    organizationId: string,
    prospectId: string
  ): Promise<ObjectionResponseData[]> {
    const responses = await prisma.objectionResponse.findMany({
      where: {
        callSession: {
          organizationId,
          prospectId,
        },
      },
      include: {
        objection: true,
        callSession: {
          select: {
            id: true,
            startedAt: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return responses.map((r) => this.mapToObjectionResponse(r));
  }

  /**
   * Map Prisma model to domain type
   */
  private mapToObjectionResponse(response: {
    id: string;
    callSessionId: string;
    objectionId: string;
    milestoneId: string;
    outcome: string;
    diagnosticAnswers: Prisma.JsonValue;
    notes: string | null;
    createdAt: Date;
    objection?: {
      id: string;
      objectionType: string;
      diagnosticQuestions: Prisma.JsonValue;
      allowedOutcomes: Prisma.JsonValue;
    };
  }): ObjectionResponseData {
    return {
      id: response.id,
      callSessionId: response.callSessionId,
      objectionId: response.objectionId,
      milestoneId: response.milestoneId,
      outcome: response.outcome as 'Resolved' | 'Deferred' | 'Disqualified',
      diagnosticAnswers: response.diagnosticAnswers as Record<string, string> | null,
      notes: response.notes,
      createdAt: response.createdAt,
      objection: response.objection
        ? {
            id: response.objection.id,
            objectionType: response.objection.objectionType,
            diagnosticQuestions: response.objection.diagnosticQuestions,
            allowedOutcomes: response.objection.allowedOutcomes,
          }
        : undefined,
    };
  }
}

export const objectionResponseService = new ObjectionResponseService();
