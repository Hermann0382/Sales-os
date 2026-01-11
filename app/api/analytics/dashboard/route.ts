/**
 * Dashboard Analytics API Route
 * GET /api/analytics/dashboard - Get dashboard summary
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { checkRateLimit, createRateLimitHeaders, RATE_LIMITS } from '@/lib/api/rate-limit';
import { analyticsService, getTimeRangeFromPreset } from '@/services/analytics-service';

/**
 * GET /api/analytics/dashboard
 * Get dashboard summary for managers
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting - dashboard is a heavier endpoint
    const rateLimitResult = checkRateLimit(userId, RATE_LIMITS.analyticsDashboard);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: { message: 'Too many requests', code: 'RATE_LIMITED' } },
        { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    const { searchParams } = new URL(request.url);
    const preset = searchParams.get('preset') as 'week' | 'month' | 'quarter' | 'year' | null;

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

    // Build time range (default to month)
    const timeRange = getTimeRangeFromPreset(preset || 'month');

    const summary = await analyticsService.getDashboardSummary({
      organizationId: user.organizationId,
      timeRange,
      includePreviousPeriod: true,
    });

    return NextResponse.json({ data: summary });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return NextResponse.json(
      { error: { message: 'Failed to fetch dashboard summary', code: 'FETCH_ERROR' } },
      { status: 500 }
    );
  }
}
