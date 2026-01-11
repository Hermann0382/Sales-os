/**
 * Prospect Detail API
 * GET /api/prospects/[prospectId]
 * PATCH /api/prospects/[prospectId]
 * DELETE /api/prospects/[prospectId]
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

/**
 * GET - Get prospect details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ prospectId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prospectId } = await params;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const prospect = await prisma.prospect.findFirst({
      where: {
        id: prospectId,
        organizationId: user.organizationId,
      },
      include: {
        callThreads: {
          include: {
            callSessions: {
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
      },
    });

    if (!prospect) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
    }

    return NextResponse.json({ data: prospect });
  } catch (error) {
    console.error('Error fetching prospect:', error);
    return NextResponse.json(
      { error: { message: 'Failed to fetch prospect', code: 'FETCH_ERROR' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update prospect
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ prospectId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prospectId } = await params;
    const body = await request.json();

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const existingProspect = await prisma.prospect.findFirst({
      where: {
        id: prospectId,
        organizationId: user.organizationId,
      },
    });

    if (!existingProspect) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
    }

    const prospect = await prisma.prospect.update({
      where: { id: prospectId },
      data: {
        name: body.name,
        clientCount: body.clientCount,
        mainPain: body.mainPain,
        revenueVolatility: body.revenueVolatility,
        ghlContactId: body.ghlContactId,
      },
    });

    return NextResponse.json({ data: prospect });
  } catch (error) {
    console.error('Error updating prospect:', error);
    return NextResponse.json(
      { error: { message: 'Failed to update prospect', code: 'UPDATE_ERROR' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete prospect (manager/admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ prospectId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prospectId } = await params;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.prospect.delete({
      where: { id: prospectId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting prospect:', error);
    return NextResponse.json(
      { error: { message: 'Failed to delete prospect', code: 'DELETE_ERROR' } },
      { status: 500 }
    );
  }
}
