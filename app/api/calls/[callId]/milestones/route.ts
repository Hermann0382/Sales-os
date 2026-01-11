/**
 * Call Milestone Responses API
 * GET /api/calls/[callId]/milestones - List milestone responses with progress
 * POST /api/calls/[callId]/milestones - Start a new milestone
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { milestoneService } from '@/services/milestone-service/milestone-service';

/**
 * GET /api/calls/[callId]/milestones
 * Returns all milestones with their responses and progress for a call
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

    const { callId } = await params;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify call belongs to user's organization
    const call = await prisma.callSession.findFirst({
      where: {
        id: callId,
        organizationId: user.organizationId,
      },
    });

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // Get milestones with responses
    const milestonesWithResponses = await milestoneService.getMilestonesForCall(callId);

    // Get progress information
    const progress = await milestoneService.getMilestoneProgress(callId);

    // Get next milestone
    const nextMilestone = await milestoneService.getNextMilestone(callId);

    // Get total estimated duration
    const totalDuration = await milestoneService.getTotalEstimatedDuration(
      user.organizationId
    );

    return NextResponse.json({
      data: milestonesWithResponses,
      meta: {
        progress,
        nextMilestoneId: nextMilestone?.id,
        totalMilestones: milestonesWithResponses.length,
        completedMilestones: progress.filter((p) => p.status === 'completed').length,
        totalEstimatedMinutes: totalDuration,
        callMode: call.mode,
      },
    });
  } catch (error) {
    console.error('Error fetching milestone responses:', error);
    return NextResponse.json(
      { error: { message: 'Failed to fetch milestone responses', code: 'FETCH_ERROR' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calls/[callId]/milestones
 * Start a new milestone (creates a MilestoneResponse with in_progress status)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { callId } = await params;
    const body = await request.json();
    const { milestoneId, overrideReason } = body;

    if (!milestoneId) {
      return NextResponse.json(
        { error: { message: 'milestoneId is required', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify call exists and is in progress
    const call = await prisma.callSession.findFirst({
      where: {
        id: callId,
        organizationId: user.organizationId,
      },
    });

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    if (call.status !== 'in_progress') {
      return NextResponse.json(
        { error: { message: 'Call must be in progress to start milestones', code: 'INVALID_STATE' } },
        { status: 400 }
      );
    }

    // Check if milestone can be started (respects strict mode)
    const canStart = await milestoneService.canStartMilestone(callId, milestoneId);

    if (!canStart.canStart) {
      // In strict mode without override, reject
      if (canStart.requiresOverride && !overrideReason) {
        return NextResponse.json(
          {
            error: {
              message: canStart.reason,
              code: 'SEQUENTIAL_VIOLATION',
              requiresOverride: true,
            },
          },
          { status: 400 }
        );
      }
    }

    // Start the milestone
    const response = await milestoneService.startMilestoneResponse({
      callSessionId: callId,
      milestoneId,
    });

    // Get milestone details
    const milestone = await milestoneService.getMilestone(milestoneId);

    return NextResponse.json({
      data: {
        response,
        milestone,
      },
      message: 'Milestone started successfully',
      meta: {
        overrideApplied: canStart.requiresOverride && !!overrideReason,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error starting milestone:', error);
    return NextResponse.json(
      { error: { message: 'Failed to start milestone', code: 'CREATE_ERROR' } },
      { status: 500 }
    );
  }
}
