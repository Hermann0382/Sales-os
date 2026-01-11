/**
 * Call Detail API Route
 * GET /api/analytics/calls/[callId] - Get detailed call information for managers
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { checkRateLimit, createRateLimitHeaders, RATE_LIMITS } from '@/lib/api/rate-limit';
import { callParamsSchema } from '@/lib/validation';

/**
 * GET /api/analytics/calls/[callId]
 * Get detailed call information including analysis, milestones, and objections
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = checkRateLimit(userId, RATE_LIMITS.analytics);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: { message: 'Too many requests', code: 'RATE_LIMITED' } },
        { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    // Validate callId parameter (SEC-004 fix)
    const rawParams = await params;
    const paramsValidation = callParamsSchema.safeParse(rawParams);
    if (!paramsValidation.success) {
      return NextResponse.json(
        { error: { message: 'Invalid call ID format', code: 'INVALID_PARAMS' } },
        { status: 400 }
      );
    }
    const { callId } = paramsValidation.data;

    // Get user with organization and role
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, organizationId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only managers and admins can view detailed call analytics
    if (user.role !== 'manager' && user.role !== 'admin') {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions', code: 'FORBIDDEN' } },
        { status: 403 }
      );
    }

    // Fetch call with all related data
    const call = await prisma.callSession.findFirst({
      where: {
        id: callId,
        organizationId: user.organizationId,
      },
      include: {
        prospect: {
          select: {
            id: true,
            name: true,
            clientCount: true,
            mainPain: true,
          },
        },
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        callOutcome: true,
        milestoneResponses: {
          include: {
            milestone: true,
          },
          orderBy: { startedAt: 'asc' },
        },
        objectionResponses: {
          include: {
            objection: true,
            milestone: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        aiAnalysis: true,
      },
    });

    if (!call) {
      return NextResponse.json(
        { error: { message: 'Call not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    // Fetch recording session separately (not related in Prisma)
    // SECURITY: Include organizationId filter to prevent cross-tenant data access
    const recordingSession = await prisma.recordingSession.findFirst({
      where: {
        callSessionId: callId,
        organizationId: user.organizationId,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate call duration
    const duration = call.endedAt && call.startedAt
      ? Math.round((call.endedAt.getTime() - call.startedAt.getTime()) / 1000)
      : 0;

    // Transform milestones for UI
    const milestones = call.milestoneResponses.map((response) => ({
      id: response.milestoneId,
      title: response.milestone.title,
      status: response.status === 'skipped'
        ? 'skipped'
        : response.status === 'completed'
          ? 'completed'
          : 'pending',
      startedAt: response.startedAt,
      completedAt: response.completedAt,
      skippedAt: response.status === 'skipped' ? response.completedAt : undefined,
      duration: response.completedAt && response.startedAt
        ? Math.round((response.completedAt.getTime() - response.startedAt.getTime()) / 1000)
        : undefined,
    }));

    // Transform objections for UI
    const objections = call.objectionResponses.map((response) => {
      // Map ObjectionOutcome enum to UI status
      const statusMap: Record<string, string> = {
        Resolved: 'resolved',
        Deferred: 'deferred',
        Disqualified: 'disqualified',
      };

      return {
        id: response.id,
        type: response.objection.objectionType.toLowerCase().replace(/_/g, ' '),
        status: statusMap[response.outcome] || 'raised',
        raisedAt: response.createdAt,
        resolvedAt: response.outcome === 'Resolved' ? response.createdAt : undefined,
        response: response.notes,
        duration: undefined, // Not tracked in current schema
      };
    });

    // Transform AI analysis for UI
    const analysis = call.aiAnalysis
      ? {
          summary: call.aiAnalysis.summary ?? undefined,
          riskFlags: call.aiAnalysis.riskFlags as unknown as Array<{
            type: string;
            severity: 'high' | 'medium' | 'low';
            description: string;
            timestamp?: number;
            quote?: string;
            recommendation: string;
          }> | undefined,
          feedback: {
            strengths: undefined as string[] | undefined,
            improvements: undefined as string[] | undefined,
            overallScore: call.aiAnalysis.decisionReadinessScore
              ? Number(call.aiAnalysis.decisionReadinessScore) * 100
              : undefined,
          },
          emailDraft: call.aiAnalysis.followUpEmailDraft ?? undefined,
        }
      : undefined;

    // Map outcome type to snake_case for UI
    const outcomeMap: Record<string, string> = {
      Coaching_Client: 'coaching_client',
      Follow_up_Scheduled: 'follow_up_scheduled',
      Implementation_Only: 'implementation_only',
      Disqualified: 'disqualified',
    };

    // Build response
    const response = {
      id: call.id,
      prospectName: call.prospect.name,
      agentId: call.agent.id,
      agentName: call.agent.name,
      date: call.startedAt || call.createdAt,
      duration,
      status: call.status,
      outcome: call.callOutcome ? outcomeMap[call.callOutcome.outcomeType] : undefined,
      zoomLink: call.zoomLink,
      hasRecording: !!recordingSession?.recordingUrl,
      recordingUrl: recordingSession?.recordingUrl,
      milestones,
      objections,
      analysis,
    };

    return NextResponse.json({ data: response });
  } catch (error) {
    console.error('Error fetching call details:', error);
    return NextResponse.json(
      { error: { message: 'Failed to fetch call details', code: 'FETCH_ERROR' } },
      { status: 500 }
    );
  }
}
