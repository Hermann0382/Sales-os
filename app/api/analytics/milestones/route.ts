/**
 * Milestone Analytics API Route
 * GET /api/analytics/milestones - Get milestone effectiveness analysis
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { analyticsService, getTimeRangeFromPreset } from '@/services/analytics-service';

/**
 * GET /api/analytics/milestones
 * Get milestone effectiveness for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
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

    // Build time range
    let timeRange: { startDate: Date; endDate: Date };
    if (preset) {
      timeRange = getTimeRangeFromPreset(preset);
    } else if (startDate && endDate) {
      timeRange = {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      };
    } else {
      timeRange = getTimeRangeFromPreset('month');
    }

    const effectiveness = await analyticsService.getMilestoneEffectiveness({
      organizationId: user.organizationId,
      timeRange,
    });

    return NextResponse.json({ data: effectiveness });
  } catch (error) {
    console.error('Error fetching milestone effectiveness:', error);
    return NextResponse.json(
      { error: { message: 'Failed to fetch milestone effectiveness', code: 'FETCH_ERROR' } },
      { status: 500 }
    );
  }
}
