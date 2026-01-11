/**
 * Milestone Response API
 * GET /api/calls/[callId]/milestones/[milestoneId]/response - Get milestone response
 * PATCH /api/calls/[callId]/milestones/[milestoneId]/response - Update response (notes, items)
 * POST /api/calls/[callId]/milestones/[milestoneId]/response/complete - Complete milestone
 * POST /api/calls/[callId]/milestones/[milestoneId]/response/skip - Skip milestone
 */

import { Prisma } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { milestoneService } from '@/services/milestone-service/milestone-service';

/**
 * GET - Get milestone response for a specific milestone in a call
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string; milestoneId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { callId, milestoneId } = await params;

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

    // Get response
    const response = await prisma.milestoneResponse.findFirst({
      where: {
        callSessionId: callId,
        milestoneId,
      },
      include: { milestone: true },
    });

    if (!response) {
      return NextResponse.json(
        { error: 'Milestone response not found' },
        { status: 404 }
      );
    }

    // Get validation status
    const validation = await milestoneService.validateMilestoneCompletion(
      milestoneId,
      (response.requiredItemsChecked as Record<string, unknown>) || {}
    );

    return NextResponse.json({
      data: response,
      meta: {
        canComplete: validation.isValid,
        missingItems: validation.missingItems,
      },
    });
  } catch (error) {
    console.error('Error fetching milestone response:', error);
    return NextResponse.json(
      { error: { message: 'Failed to fetch milestone response', code: 'FETCH_ERROR' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update milestone response (check items, add notes)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string; milestoneId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { callId, milestoneId } = await params;
    const body = await request.json();
    const { itemId, itemValue, notes, requiredItemsChecked } = body;

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

    // Get existing response
    const existingResponse = await prisma.milestoneResponse.findFirst({
      where: {
        callSessionId: callId,
        milestoneId,
      },
    });

    if (!existingResponse) {
      return NextResponse.json(
        { error: 'Milestone response not found. Start the milestone first.' },
        { status: 404 }
      );
    }

    // Update individual item if provided
    if (itemId !== undefined && itemValue !== undefined) {
      const response = await milestoneService.checkItem(
        existingResponse.id,
        itemId,
        itemValue
      );
      return NextResponse.json({ data: response, message: 'Item updated' });
    }

    // Add notes if provided
    if (notes) {
      const response = await milestoneService.addNotes(existingResponse.id, notes);
      return NextResponse.json({ data: response, message: 'Notes added' });
    }

    // Bulk update requiredItemsChecked if provided
    if (requiredItemsChecked) {
      const currentItems =
        (existingResponse.requiredItemsChecked as Record<string, unknown>) || {};
      const updatedItems = { ...currentItems, ...requiredItemsChecked };

      const response = await prisma.milestoneResponse.update({
        where: { id: existingResponse.id },
        data: { requiredItemsChecked: updatedItems as Prisma.InputJsonValue },
        include: { milestone: true },
      });

      return NextResponse.json({ data: response, message: 'Items updated' });
    }

    return NextResponse.json(
      { error: { message: 'No update data provided', code: 'VALIDATION_ERROR' } },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating milestone response:', error);
    return NextResponse.json(
      { error: { message: 'Failed to update milestone response', code: 'UPDATE_ERROR' } },
      { status: 500 }
    );
  }
}

/**
 * POST - Complete or skip milestone
 * Use action=complete or action=skip in body
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string; milestoneId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { callId, milestoneId } = await params;
    const body = await request.json();
    const { action, overrideReason } = body;

    if (!action || !['complete', 'skip'].includes(action)) {
      return NextResponse.json(
        { error: { message: 'action must be "complete" or "skip"', code: 'VALIDATION_ERROR' } },
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

    // Get existing response
    const existingResponse = await prisma.milestoneResponse.findFirst({
      where: {
        callSessionId: callId,
        milestoneId,
      },
    });

    if (!existingResponse) {
      return NextResponse.json(
        { error: 'Milestone response not found. Start the milestone first.' },
        { status: 404 }
      );
    }

    if (action === 'complete') {
      // Validate completion requirements in strict mode
      if (call.mode === 'strict') {
        const validation = await milestoneService.validateMilestoneCompletion(
          milestoneId,
          (existingResponse.requiredItemsChecked as Record<string, unknown>) || {}
        );

        if (!validation.isValid) {
          return NextResponse.json(
            {
              error: {
                message: 'Cannot complete milestone. Missing required items.',
                code: 'COMPLETION_REQUIREMENTS_NOT_MET',
                missingItems: validation.missingItems,
              },
            },
            { status: 400 }
          );
        }
      }

      const response = await milestoneService.completeMilestone(existingResponse.id);
      return NextResponse.json({
        data: response,
        message: 'Milestone completed successfully',
      });
    }

    if (action === 'skip') {
      // Skip requires a reason
      if (!overrideReason) {
        return NextResponse.json(
          { error: { message: 'overrideReason is required to skip a milestone', code: 'VALIDATION_ERROR' } },
          { status: 400 }
        );
      }

      const response = await milestoneService.skipMilestone(
        existingResponse.id,
        overrideReason
      );

      // Log the skip for audit
      console.log(
        `Milestone ${milestoneId} skipped in call ${callId}: ${overrideReason}`
      );

      return NextResponse.json({
        data: response,
        message: 'Milestone skipped',
        meta: {
          overrideReason,
        },
      });
    }

    return NextResponse.json(
      { error: { message: 'Invalid action', code: 'VALIDATION_ERROR' } },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error completing/skipping milestone:', error);
    return NextResponse.json(
      { error: { message: 'Failed to complete/skip milestone', code: 'ACTION_ERROR' } },
      { status: 500 }
    );
  }
}
