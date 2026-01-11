/**
 * Call Session API Routes
 * GET /api/calls - List calls for current user's organization
 * POST /api/calls - Create a new call session
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

/**
 * GET /api/calls
 * List call sessions with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const prospectId = searchParams.get('prospectId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get user with organization
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, organizationId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build query filters - always include organizationId for tenant isolation
    const where: Record<string, unknown> = {
      organizationId: user.organizationId,
    };

    if (status) {
      where.status = status;
    }

    if (prospectId) {
      where.prospectId = prospectId;
    }

    const [calls, total] = await Promise.all([
      prisma.callSession.findMany({
        where,
        include: {
          prospect: {
            select: {
              id: true,
              name: true,
              clientCount: true,
            },
          },
          agent: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          callOutcome: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.callSession.count({ where }),
    ]);

    return NextResponse.json({
      data: calls,
      meta: {
        total,
        limit,
        offset,
        hasMore: offset + calls.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching calls:', error);
    return NextResponse.json(
      { error: { message: 'Failed to fetch calls', code: 'FETCH_ERROR' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calls
 * Create a new call session
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { prospectId, callThreadId, zoomLink, mode, language } = body;

    if (!prospectId) {
      return NextResponse.json(
        { error: { message: 'Prospect ID is required', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      );
    }

    // Get user with organization
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, organizationId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify prospect exists and belongs to the same organization
    const prospect = await prisma.prospect.findFirst({
      where: {
        id: prospectId,
        organizationId: user.organizationId,
      },
    });

    if (!prospect) {
      return NextResponse.json(
        { error: { message: 'Prospect not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    // Create or find thread
    let threadId = callThreadId;
    if (!threadId) {
      const thread = await prisma.callThread.create({
        data: {
          organizationId: user.organizationId,
          prospectId,
        },
      });
      threadId = thread.id;
    }

    // Create call session
    const call = await prisma.callSession.create({
      data: {
        organizationId: user.organizationId,
        callThreadId: threadId,
        prospectId,
        agentId: user.id,
        status: 'scheduled',
        mode: mode || 'flexible',
        language: language || 'EN',
        zoomLink,
      },
      include: {
        prospect: {
          select: {
            id: true,
            name: true,
            clientCount: true,
          },
        },
        callThread: true,
      },
    });

    return NextResponse.json({ data: call }, { status: 201 });
  } catch (error) {
    console.error('Error creating call:', error);
    return NextResponse.json(
      { error: { message: 'Failed to create call', code: 'CREATE_ERROR' } },
      { status: 500 }
    );
  }
}
