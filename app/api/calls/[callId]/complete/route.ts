/**
 * Call Complete API
 * POST /api/calls/[callId]/complete - Complete a call session
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import {
  canCompleteCall,
  InvalidStateTransitionError,
} from '@/lib/state-machine/call-state';

/**
 * POST - Complete a call session
 * Records final outcome and updates status
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
    const body = await request.json().catch(() => ({}));
    const { outcomeType, disqualificationReason, qualificationFlags, notes } = body;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, organizationId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get call
    const call = await prisma.callSession.findFirst({
      where: {
        id: callId,
        organizationId: user.organizationId,
      },
      include: {
        milestoneResponses: true,
        objectionResponses: true,
      },
    });

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // Validate state transition
    if (!canCompleteCall(call.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled')) {
      throw new InvalidStateTransitionError(
        call.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled',
        'completed'
      );
    }

    // Update call status and create outcome in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update call status
      const updatedCall = await tx.callSession.update({
        where: { id: callId },
        data: {
          status: 'completed',
          endedAt: new Date(),
        },
      });

      // Create or update call outcome if provided
      let outcome = null;
      if (outcomeType) {
        outcome = await tx.callOutcome.upsert({
          where: { callSessionId: callId },
          create: {
            callSessionId: callId,
            outcomeType,
            disqualificationReason,
            qualificationFlags: qualificationFlags ?? undefined,
          },
          update: {
            outcomeType,
            disqualificationReason,
            qualificationFlags: qualificationFlags ?? undefined,
          },
        });
      }

      return { call: updatedCall, outcome };
    });

    // Get final call data with relations
    const completedCall = await prisma.callSession.findUnique({
      where: { id: callId },
      include: {
        prospect: true,
        agent: true,
        milestoneResponses: {
          include: { milestone: true },
        },
        objectionResponses: {
          include: { objection: true },
        },
        callOutcome: true,
      },
    });

    // Calculate call duration
    const duration =
      completedCall?.startedAt && completedCall?.endedAt
        ? Math.round(
            (completedCall.endedAt.getTime() - completedCall.startedAt.getTime()) / 1000
          )
        : 0;

    // Count completed milestones
    const completedMilestones = completedCall?.milestoneResponses.filter(
      (r) => r.status === 'completed'
    ).length;

    return NextResponse.json({
      data: completedCall,
      message: 'Call completed successfully',
      meta: {
        durationSeconds: duration,
        milestonesCompleted: completedMilestones,
        totalMilestones: completedCall?.milestoneResponses.length,
        objectionCount: completedCall?.objectionResponses.length,
        outcomeRecorded: !!result.outcome,
      },
    });
  } catch (error) {
    console.error('Error completing call:', error);

    if (error instanceof InvalidStateTransitionError) {
      return NextResponse.json(
        { error: { message: error.message, code: 'INVALID_STATE_TRANSITION' } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: { message: 'Failed to complete call', code: 'COMPLETE_ERROR' } },
      { status: 500 }
    );
  }
}
