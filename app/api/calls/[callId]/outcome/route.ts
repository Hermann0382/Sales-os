/**
 * Call Outcome API
 * GET /api/calls/[callId]/outcome - Get call outcome
 * POST /api/calls/[callId]/outcome - Record call outcome (completes the call)
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import { callOutcomeService } from '@/services/call-outcome-service';

/**
 * Validation schema for creating call outcome
 */
const CreateCallOutcomeSchema = z
  .object({
    outcomeType: z.enum([
      'Coaching_Client',
      'Follow_up_Scheduled',
      'Implementation_Only',
      'Disqualified',
    ]),
    disqualificationReason: z
      .enum([
        'Under_500_Clients',
        'Cashflow_Mismatch',
        'Misaligned_Expectations',
        'Capacity_Constraint',
        'Authority_Issue',
      ])
      .optional(),
    qualificationFlags: z
      .object({
        has500Clients: z.boolean(),
        financialCapacity: z.boolean(),
        strategicAlignment: z.boolean(),
      })
      .optional(),
  })
  .refine(
    (data) => {
      // If outcome is Disqualified, reason is required
      if (data.outcomeType === 'Disqualified' && !data.disqualificationReason) {
        return false;
      }
      return true;
    },
    {
      message: 'Disqualification reason is required when outcome is Disqualified',
      path: ['disqualificationReason'],
    }
  );

/**
 * GET - Get call outcome
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

    // Get outcome and completion status
    const [outcome, completionStatus] = await Promise.all([
      callOutcomeService.getOutcome(user.organizationId, callId),
      callOutcomeService.canCompleteCall(user.organizationId, callId),
    ]);

    if (!outcome) {
      // Return completion status even if no outcome yet
      return NextResponse.json({
        data: null,
        meta: completionStatus,
      });
    }

    return NextResponse.json({ data: outcome });
  } catch (error) {
    console.error('Error fetching call outcome:', error);
    return NextResponse.json(
      { error: { message: 'Failed to fetch call outcome', code: 'FETCH_ERROR' } },
      { status: 500 }
    );
  }
}

/**
 * POST - Record call outcome
 * This also completes the call (sets status to completed)
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

    // Validate input
    const validation = CreateCallOutcomeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: validation.error.errors,
          },
        },
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

    // Create outcome via service (also completes the call)
    const outcome = await callOutcomeService.createOutcome(user.organizationId, {
      callSessionId: callId,
      ...validation.data,
    });

    return NextResponse.json({ data: outcome }, { status: 201 });
  } catch (error) {
    console.error('Error recording call outcome:', error);
    const message = error instanceof Error ? error.message : 'Failed to record call outcome';
    const status = message.includes('not found') || message.includes('unauthorized')
      ? 404
      : message.includes('already exists') || message.includes('Cannot')
      ? 400
      : 500;
    return NextResponse.json(
      { error: { message, code: 'CREATE_ERROR' } },
      { status }
    );
  }
}
