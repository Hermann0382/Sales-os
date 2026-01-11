/**
 * Objection Service - Business logic for objection handling
 * Manages objection types, diagnostic flows, and outcome tracking
 */

import { prisma } from '@/lib/db';
import {
  CreateObjectionResponseInput,
  Objection,
  ObjectionOutcome,
  ObjectionResponse,
  ObjectionType,
} from '@/lib/types';

export class ObjectionService {
  /**
   * Get all objection types for an organization
   */
  async getObjectionTypes(organizationId: string): Promise<Objection[]> {
    const objections = await prisma.objection.findMany({
      where: { organizationId },
    });

    return objections.map(this.mapToObjection);
  }

  /**
   * Get objection type by ID
   */
  async getObjection(objectionId: string): Promise<Objection | null> {
    const objection = await prisma.objection.findUnique({
      where: { id: objectionId },
    });

    if (!objection) return null;
    return this.mapToObjection(objection);
  }

  /**
   * Get objection type by type name
   */
  async getObjectionByType(
    organizationId: string,
    type: ObjectionType
  ): Promise<Objection | null> {
    const objection = await prisma.objection.findFirst({
      where: {
        organizationId,
        objectionType: type,
      },
    });

    if (!objection) return null;
    return this.mapToObjection(objection);
  }

  /**
   * Create objection response (start objection subflow)
   */
  async createObjectionResponse(
    input: CreateObjectionResponseInput
  ): Promise<ObjectionResponse> {
    const response = await prisma.objectionResponse.create({
      data: {
        callSessionId: input.callSessionId,
        objectionId: input.objectionId,
        milestoneId: input.milestoneId,
        outcome: input.outcome,
        diagnosticAnswers: input.diagnosticAnswers || {},
        notes: input.notes || null,
      },
    });

    return this.mapToObjectionResponse(response);
  }

  /**
   * Update objection response
   */
  async updateObjectionResponse(
    responseId: string,
    updates: {
      outcome?: ObjectionOutcome;
      diagnosticAnswers?: Record<string, string>;
      notes?: string;
    }
  ): Promise<ObjectionResponse> {
    const response = await prisma.objectionResponse.update({
      where: { id: responseId },
      data: updates,
    });

    return this.mapToObjectionResponse(response);
  }

  /**
   * Get objection responses for a call
   */
  async getObjectionResponsesForCall(
    callSessionId: string
  ): Promise<ObjectionResponse[]> {
    const responses = await prisma.objectionResponse.findMany({
      where: { callSessionId },
      include: { objection: true },
      orderBy: { createdAt: 'asc' },
    });

    return responses.map(this.mapToObjectionResponse);
  }

  /**
   * Get unresolved objections for a call
   */
  async getUnresolvedObjections(
    callSessionId: string
  ): Promise<ObjectionResponse[]> {
    const responses = await prisma.objectionResponse.findMany({
      where: {
        callSessionId,
        outcome: { not: 'Resolved' },
      },
      include: { objection: true },
      orderBy: { createdAt: 'asc' },
    });

    return responses.map(this.mapToObjectionResponse);
  }

  /**
   * Get objection statistics for analytics
   */
  async getObjectionStats(
    organizationId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      agentId?: string;
    }
  ) {
    const where: Record<string, unknown> = {};

    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate)
        (where.createdAt as Record<string, Date>).gte = options.startDate;
      if (options.endDate)
        (where.createdAt as Record<string, Date>).lte = options.endDate;
    }

    const responses = await prisma.objectionResponse.findMany({
      where,
      include: {
        objection: true,
        callSession: {
          include: { agent: true },
        },
      },
    });

    // Filter by organization and optionally by agent
    const filtered = responses.filter((r) => {
      const orgMatch =
        r.callSession.organizationId === organizationId;
      const agentMatch = options?.agentId
        ? r.callSession.agentId === options.agentId
        : true;
      return orgMatch && agentMatch;
    });

    // Aggregate stats
    const byType: Record<string, { count: number; outcomes: Record<string, number> }> =
      {};

    filtered.forEach((r) => {
      const type = r.objection.objectionType;
      if (!byType[type]) {
        byType[type] = { count: 0, outcomes: {} };
      }
      byType[type].count++;
      byType[type].outcomes[r.outcome] =
        (byType[type].outcomes[r.outcome] || 0) + 1;
    });

    return {
      total: filtered.length,
      byType,
      resolved: filtered.filter((r) => r.outcome === 'Resolved').length,
      deferred: filtered.filter((r) => r.outcome === 'Deferred').length,
      disqualified: filtered.filter((r) => r.outcome === 'Disqualified').length,
    };
  }

  /**
   * Get objection patterns for learning
   */
  async getObjectionPatterns(organizationId: string) {
    const responses = await prisma.objectionResponse.findMany({
      where: {
        callSession: { organizationId },
      },
      include: {
        objection: true,
        milestone: true,
      },
    });

    // Analyze patterns
    const byMilestone: Record<
      number,
      Record<string, number>
    > = {};

    responses.forEach((r) => {
      const milestone = r.milestone.milestoneNumber;
      const type = r.objection.objectionType;

      if (!byMilestone[milestone]) {
        byMilestone[milestone] = {};
      }
      byMilestone[milestone][type] =
        (byMilestone[milestone][type] || 0) + 1;
    });

    return {
      total: responses.length,
      byMilestone,
    };
  }

  /**
   * Map Prisma model to domain type
   */
  private mapToObjection(o: {
    id: string;
    organizationId: string;
    objectionType: string;
    diagnosticQuestions: unknown;
    allowedOutcomes: unknown;
    createdAt: Date;
  }): Objection {
    return {
      id: o.id,
      organizationId: o.organizationId,
      objectionType: o.objectionType as ObjectionType,
      diagnosticQuestions: o.diagnosticQuestions as Objection['diagnosticQuestions'],
      allowedOutcomes: o.allowedOutcomes as ObjectionOutcome[],
      createdAt: o.createdAt,
    };
  }

  private mapToObjectionResponse(r: {
    id: string;
    callSessionId: string;
    objectionId: string;
    milestoneId: string;
    outcome: string;
    diagnosticAnswers: unknown;
    notes: string | null;
    createdAt: Date;
  }): ObjectionResponse {
    return {
      id: r.id,
      callSessionId: r.callSessionId,
      objectionId: r.objectionId,
      milestoneId: r.milestoneId,
      outcome: r.outcome as ObjectionOutcome,
      diagnosticAnswers: r.diagnosticAnswers as Record<string, string> | null,
      notes: r.notes,
      createdAt: r.createdAt,
    };
  }
}

export const objectionService = new ObjectionService();
