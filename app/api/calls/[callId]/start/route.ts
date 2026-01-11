/**
 * Call Start API
 * POST /api/calls/[callId]/start - Start a call (validates checklist first)
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import {
  canStartCall,
  ChecklistNotCompleteError,
  InvalidStateTransitionError,
  QualificationGateError,
} from '@/lib/state-machine/call-state';

/**
 * Pre-call checklist items that must be verified
 */
const PRE_CALL_CHECKLIST = [
  { id: 'qualification_reviewed', label: 'Qualification form reviewed', required: true },
  { id: 'client_count_confirmed', label: 'Client count confirmed (>=500)', required: true, isGate: true },
  { id: 'business_type_confirmed', label: 'Business type confirmed', required: true },
  { id: 'revenue_range_noted', label: 'Revenue range noted', required: true },
  { id: 'main_pain_identified', label: 'Main pain identified', required: true },
  { id: 'tool_stack_noted', label: 'Tool stack noted', required: false },
  { id: 'roi_tool_ready', label: 'ROI tool ready', required: false },
  { id: 'time_block_clear', label: 'Time block clear (90 min)', required: true },
];

const QUALIFICATION_THRESHOLD = 500;

/**
 * POST - Start a call session
 * Validates pre-call checklist and qualification gate before starting
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
    const { checklistItems, overrideReason } = body;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, organizationId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get call with prospect data
    const call = await prisma.callSession.findFirst({
      where: {
        id: callId,
        organizationId: user.organizationId,
      },
      include: {
        prospect: true,
      },
    });

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // Check if call can be started (state machine validation)
    if (!canStartCall(call.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled')) {
      throw new InvalidStateTransitionError(
        call.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled',
        'in_progress'
      );
    }

    // Validate checklist completion
    if (checklistItems) {
      const requiredItems = PRE_CALL_CHECKLIST.filter((item) => item.required);
      const missingItems = requiredItems.filter(
        (item) => !checklistItems[item.id]
      );

      if (missingItems.length > 0 && !overrideReason) {
        throw new ChecklistNotCompleteError();
      }
    }

    // Check qualification gate (500+ clients)
    const clientCount = call.prospect.clientCount || 0;
    const isQualified = clientCount >= QUALIFICATION_THRESHOLD;

    if (!isQualified) {
      // In flexible mode with override, allow continuation but log it
      if (call.mode === 'flexible' && overrideReason) {
        // Log the override for audit purposes
        console.log(
          `Qualification gate override for call ${callId}: ${overrideReason}`
        );
      } else {
        throw new QualificationGateError(clientCount);
      }
    }

    // Start the call
    const updatedCall = await prisma.callSession.update({
      where: { id: callId },
      data: {
        status: 'in_progress',
        startedAt: new Date(),
      },
      include: {
        prospect: true,
        agent: true,
      },
    });

    return NextResponse.json({
      data: updatedCall,
      message: 'Call started successfully',
      meta: {
        checklistValidated: true,
        qualificationMet: isQualified,
        overrideApplied: !isQualified && !!overrideReason,
      },
    });
  } catch (error) {
    console.error('Error starting call:', error);

    if (error instanceof InvalidStateTransitionError) {
      return NextResponse.json(
        { error: { message: error.message, code: 'INVALID_STATE_TRANSITION' } },
        { status: 400 }
      );
    }

    if (error instanceof ChecklistNotCompleteError) {
      return NextResponse.json(
        {
          error: { message: error.message, code: 'CHECKLIST_INCOMPLETE' },
          checklist: PRE_CALL_CHECKLIST,
        },
        { status: 400 }
      );
    }

    if (error instanceof QualificationGateError) {
      return NextResponse.json(
        {
          error: { message: error.message, code: 'QUALIFICATION_GATE_FAILED' },
          threshold: QUALIFICATION_THRESHOLD,
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: { message: 'Failed to start call', code: 'START_ERROR' } },
      { status: 500 }
    );
  }
}
