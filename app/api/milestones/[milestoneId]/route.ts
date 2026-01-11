/**
 * Milestone Detail API
 * GET /api/milestones/[milestoneId]
 * PATCH /api/milestones/[milestoneId] - Update milestone (admin only)
 * DELETE /api/milestones/[milestoneId] - Delete milestone (admin only)
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

/**
 * GET - Get milestone details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ milestoneId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { milestoneId } = await params;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const milestone = await prisma.milestone.findFirst({
      where: {
        id: milestoneId,
        organizationId: user.organizationId,
      },
    });

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    return NextResponse.json({ data: milestone });
  } catch (error) {
    console.error('Error fetching milestone:', error);
    return NextResponse.json(
      { error: { message: 'Failed to fetch milestone', code: 'FETCH_ERROR' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update milestone (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ milestoneId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { milestoneId } = await params;
    const body = await request.json();

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const milestone = await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        title: body.title,
        objective: body.objective,
        requiredQuestions: body.requiredQuestions ?? undefined,
        confirmations: body.confirmations ?? undefined,
        estimatedDurationMinutes: body.estimatedDurationMinutes,
        orderIndex: body.orderIndex,
      },
    });

    return NextResponse.json({ data: milestone });
  } catch (error) {
    console.error('Error updating milestone:', error);
    return NextResponse.json(
      { error: { message: 'Failed to update milestone', code: 'UPDATE_ERROR' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete milestone (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ milestoneId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { milestoneId } = await params;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.milestone.delete({
      where: { id: milestoneId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting milestone:', error);
    return NextResponse.json(
      { error: { message: 'Failed to delete milestone', code: 'DELETE_ERROR' } },
      { status: 500 }
    );
  }
}
