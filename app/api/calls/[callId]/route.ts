/**
 * Call Session API Routes
 * GET /api/calls/[callId] - Get call session details
 * PATCH /api/calls/[callId] - Update call session
 * DELETE /api/calls/[callId] - Cancel/delete call session
 *
 * Full implementation in TASK-004
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

/**
 * GET /api/calls/[callId]
 * Get call session with all relations
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
      select: { id: true, organizationId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const call = await prisma.callSession.findFirst({
      where: {
        id: callId,
        organizationId: user.organizationId,
      },
      include: {
        prospect: true,
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        milestoneResponses: {
          include: { milestone: true },
          orderBy: { startedAt: 'asc' },
        },
        objectionResponses: {
          include: { objection: true },
          orderBy: { createdAt: 'asc' },
        },
        callOutcome: true,
        aiAnalysis: true,
      },
    });

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    return NextResponse.json({ data: call });
  } catch (error) {
    console.error('Error fetching call:', error);
    return NextResponse.json(
      { error: { message: 'Failed to fetch call', code: 'FETCH_ERROR' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/calls/[callId]
 * Update call session (status, mode, etc.)
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

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, organizationId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const existingCall = await prisma.callSession.findFirst({
      where: {
        id: callId,
        organizationId: user.organizationId,
      },
    });

    if (!existingCall) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // Only allow updating specific fields
    const { status, mode, language, recordingReference } = body;
    const updateData: Record<string, unknown> = {};

    if (status) {
      updateData.status = status;
      if (status === 'in_progress' && !existingCall.startedAt) {
        updateData.startedAt = new Date();
      }
      if (status === 'completed' || status === 'cancelled') {
        updateData.endedAt = new Date();
      }
    }
    if (mode) updateData.mode = mode;
    if (language) updateData.language = language;
    if (recordingReference) updateData.recordingReference = recordingReference;

    const call = await prisma.callSession.update({
      where: { id: callId },
      data: updateData,
    });

    return NextResponse.json({ data: call });
  } catch (error) {
    console.error('Error updating call:', error);
    return NextResponse.json(
      { error: { message: 'Failed to update call', code: 'UPDATE_ERROR' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/calls/[callId]
 * Cancel call session
 */
export async function DELETE(
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
      select: { id: true, organizationId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const call = await prisma.callSession.findFirst({
      where: {
        id: callId,
        organizationId: user.organizationId,
      },
    });

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // Don't delete, just cancel
    await prisma.callSession.update({
      where: { id: callId },
      data: {
        status: 'cancelled',
        endedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling call:', error);
    return NextResponse.json(
      { error: { message: 'Failed to cancel call', code: 'DELETE_ERROR' } },
      { status: 500 }
    );
  }
}
