/**
 * Checklist API
 * GET /api/calls/[callId]/checklist - Get checklist items with completion status
 * PATCH /api/calls/[callId]/checklist - Update checklist items
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import {
  checklistService,
  PRE_CALL_CHECKLIST_ITEMS,
} from '@/services/checklist-service';

/**
 * GET - Get checklist for a call
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

    const checklist = await checklistService.getChecklist(callId);

    return NextResponse.json({
      data: checklist,
      meta: {
        totalItems: PRE_CALL_CHECKLIST_ITEMS.length,
        requiredItems: PRE_CALL_CHECKLIST_ITEMS.filter((i) => i.required).length,
        gateItems: PRE_CALL_CHECKLIST_ITEMS.filter((i) => i.isGate).length,
      },
    });
  } catch (error) {
    console.error('Error fetching checklist:', error);
    return NextResponse.json(
      { error: { message: 'Failed to fetch checklist', code: 'FETCH_ERROR' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update checklist items
 */
export async function PATCH(
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
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: { message: 'items array is required', code: 'VALIDATION_ERROR' } },
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

    // Update each item
    for (const item of items) {
      if (item.id && typeof item.checked === 'boolean') {
        await checklistService.updateChecklistItem(
          callId,
          item.id,
          item.checked,
          item.value
        );
      }
    }

    // Get updated checklist
    const checklist = await checklistService.getChecklist(callId);

    return NextResponse.json({
      data: checklist,
      message: 'Checklist updated successfully',
    });
  } catch (error) {
    console.error('Error updating checklist:', error);
    return NextResponse.json(
      { error: { message: 'Failed to update checklist', code: 'UPDATE_ERROR' } },
      { status: 500 }
    );
  }
}
