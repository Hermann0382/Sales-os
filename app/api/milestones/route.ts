/**
 * Milestone API Routes
 * GET /api/milestones - List all milestones for organization
 * POST /api/milestones - Create a new milestone (admin only)
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

/**
 * GET /api/milestones
 * List all milestones for the current user's organization
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, organizationId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const milestones = await prisma.milestone.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { orderIndex: 'asc' },
    });

    return NextResponse.json({ data: milestones });
  } catch (error) {
    console.error('Error fetching milestones:', error);
    return NextResponse.json(
      { error: { message: 'Failed to fetch milestones', code: 'FETCH_ERROR' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/milestones
 * Create a new milestone (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      milestoneNumber,
      title,
      objective,
      orderIndex,
      requiredQuestions,
      confirmations,
      estimatedDurationMinutes,
    } = body;

    if (!milestoneNumber || !title || !objective) {
      return NextResponse.json(
        { error: { message: 'milestoneNumber, title, and objective are required', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, organizationId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only admins can create milestones
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check for existing milestone with same number
    const existingMilestone = await prisma.milestone.findFirst({
      where: {
        milestoneNumber,
        organizationId: user.organizationId,
      },
    });

    if (existingMilestone) {
      return NextResponse.json(
        { error: { message: 'A milestone with this number already exists', code: 'DUPLICATE_ERROR' } },
        { status: 400 }
      );
    }

    const milestone = await prisma.milestone.create({
      data: {
        organizationId: user.organizationId,
        milestoneNumber,
        title,
        objective,
        orderIndex: orderIndex ?? milestoneNumber,
        requiredQuestions: requiredQuestions ?? undefined,
        confirmations: confirmations ?? undefined,
        estimatedDurationMinutes,
      },
    });

    return NextResponse.json({ data: milestone }, { status: 201 });
  } catch (error) {
    console.error('Error creating milestone:', error);
    return NextResponse.json(
      { error: { message: 'Failed to create milestone', code: 'CREATE_ERROR' } },
      { status: 500 }
    );
  }
}
