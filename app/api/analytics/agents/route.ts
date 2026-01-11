/**
 * Agent Analytics API Route
 * GET /api/analytics/agents - Get agent performance variance
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { checkRateLimit, createRateLimitHeaders, RATE_LIMITS } from '@/lib/api/rate-limit';
import { validateAgentIds } from '@/lib/validation';
import { analyticsService, getTimeRangeFromPreset, parseDateToUTC } from '@/services/analytics-service';

/**
 * GET /api/analytics/agents
 * Get agent performance variance for the organization
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const preset = searchParams.get('preset') as 'week' | 'month' | 'quarter' | 'year' | null;

    // Validate agentIds format (SEC-001 fix)
    const agentIdsParam = searchParams.get('agentIds');
    let agentIds: string[] | undefined;
    if (agentIdsParam) {
      const validatedIds = validateAgentIds(agentIdsParam);
      if (validatedIds === null) {
        return NextResponse.json(
          { error: { message: 'Invalid agent ID format in agentIds parameter', code: 'INVALID_PARAMS' } },
          { status: 400 }
        );
      }
      agentIds = validatedIds;
    }

    // Get user with organization and role
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, organizationId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only managers and admins can view team analytics
    if (user.role !== 'manager' && user.role !== 'admin') {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions', code: 'FORBIDDEN' } },
        { status: 403 }
      );
    }

    // Build time range (DATA-008: Use UTC consistently)
    let timeRange: { startDate: Date; endDate: Date };
    if (preset) {
      timeRange = getTimeRangeFromPreset(preset);
    } else if (startDate && endDate) {
      timeRange = {
        startDate: parseDateToUTC(startDate, false),
        endDate: parseDateToUTC(endDate, true),
      };
    } else {
      timeRange = getTimeRangeFromPreset('month');
    }

    const variance = await analyticsService.getAgentVariance({
      organizationId: user.organizationId,
      timeRange,
      agentIds,
    });

    return NextResponse.json({ data: variance });
  } catch (error) {
    console.error('Error fetching agent variance:', error);
    return NextResponse.json(
      { error: { message: 'Failed to fetch agent variance', code: 'FETCH_ERROR' } },
      { status: 500 }
    );
  }
}
