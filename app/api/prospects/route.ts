/**
 * Prospects API Routes
 * GET /api/prospects - List prospects
 * POST /api/prospects - Create prospect
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

/**
 * GET /api/prospects
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const where: Record<string, unknown> = {
      organizationId: user.organizationId,
    };

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [prospects, total] = await Promise.all([
      prisma.prospect.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.prospect.count({ where }),
    ]);

    return NextResponse.json({
      data: prospects,
      meta: {
        total,
        limit,
        offset,
        hasMore: offset + prospects.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching prospects:', error);
    return NextResponse.json(
      { error: { message: 'Failed to fetch prospects', code: 'FETCH_ERROR' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/prospects
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, clientCount, mainPain, revenueVolatility, ghlContactId } = body;

    if (!name) {
      return NextResponse.json(
        { error: { message: 'name is required', code: 'VALIDATION_ERROR' } },
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

    const prospect = await prisma.prospect.create({
      data: {
        organizationId: user.organizationId,
        name,
        clientCount,
        mainPain,
        revenueVolatility,
        ghlContactId,
      },
    });

    return NextResponse.json({ data: prospect }, { status: 201 });
  } catch (error) {
    console.error('Error creating prospect:', error);
    return NextResponse.json(
      { error: { message: 'Failed to create prospect', code: 'CREATE_ERROR' } },
      { status: 500 }
    );
  }
}
