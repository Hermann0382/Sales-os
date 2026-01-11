/**
 * Objection Detail API
 * GET /api/objections/[objectionId]
 * PATCH /api/objections/[objectionId] - Update objection (admin only)
 * DELETE /api/objections/[objectionId] - Delete objection (admin only)
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

/**
 * GET - Get objection details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ objectionId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { objectionId } = await params;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const objection = await prisma.objection.findFirst({
      where: {
        id: objectionId,
        organizationId: user.organizationId,
      },
    });

    if (!objection) {
      return NextResponse.json({ error: 'Objection not found' }, { status: 404 });
    }

    return NextResponse.json({ data: objection });
  } catch (error) {
    console.error('Error fetching objection:', error);
    return NextResponse.json(
      { error: { message: 'Failed to fetch objection', code: 'FETCH_ERROR' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update objection (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ objectionId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { objectionId } = await params;
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

    const objection = await prisma.objection.update({
      where: { id: objectionId },
      data: {
        diagnosticQuestions: body.diagnosticQuestions,
        allowedOutcomes: body.allowedOutcomes,
      },
    });

    return NextResponse.json({ data: objection });
  } catch (error) {
    console.error('Error updating objection:', error);
    return NextResponse.json(
      { error: { message: 'Failed to update objection', code: 'UPDATE_ERROR' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete objection (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ objectionId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { objectionId } = await params;

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

    await prisma.objection.delete({
      where: { id: objectionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting objection:', error);
    return NextResponse.json(
      { error: { message: 'Failed to delete objection', code: 'DELETE_ERROR' } },
      { status: 500 }
    );
  }
}
