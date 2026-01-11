/**
 * Objection API Routes
 * GET /api/objections - List all objection types for organization
 * POST /api/objections - Create a new objection type (admin only)
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

/**
 * GET /api/objections
 * List all objection types for the current user's organization
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

    const objections = await prisma.objection.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { objectionType: 'asc' },
    });

    return NextResponse.json({ data: objections });
  } catch (error) {
    console.error('Error fetching objections:', error);
    return NextResponse.json(
      { error: { message: 'Failed to fetch objections', code: 'FETCH_ERROR' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/objections
 * Create a new objection type (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      objectionType,
      diagnosticQuestions,
      allowedOutcomes,
    } = body;

    if (!objectionType || !diagnosticQuestions || !allowedOutcomes) {
      return NextResponse.json(
        { error: { message: 'objectionType, diagnosticQuestions, and allowedOutcomes are required', code: 'VALIDATION_ERROR' } },
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

    // Only admins can create objections
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check for existing objection with same type
    const existingObjection = await prisma.objection.findFirst({
      where: {
        objectionType,
        organizationId: user.organizationId,
      },
    });

    if (existingObjection) {
      return NextResponse.json(
        { error: { message: 'An objection with this type already exists', code: 'DUPLICATE_ERROR' } },
        { status: 400 }
      );
    }

    const objection = await prisma.objection.create({
      data: {
        organizationId: user.organizationId,
        objectionType,
        diagnosticQuestions,
        allowedOutcomes,
      },
    });

    return NextResponse.json({ data: objection }, { status: 201 });
  } catch (error) {
    console.error('Error creating objection:', error);
    return NextResponse.json(
      { error: { message: 'Failed to create objection', code: 'CREATE_ERROR' } },
      { status: 500 }
    );
  }
}
