/**
 * User API Routes
 * GET /api/users/[userId] - Get user details
 * PATCH /api/users/[userId] - Update user (admin only)
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

/**
 * GET /api/users/[userId]
 * Get user details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: authUserId } = await auth();
    if (!authUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;

    const authUser = await prisma.user.findUnique({
      where: { clerkId: authUserId },
      select: { id: true, organizationId: true, role: true },
    });

    if (!authUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Users can view their own profile, managers and admins can view anyone in org
    const canView =
      authUser.id === userId ||
      authUser.role === 'admin' ||
      authUser.role === 'manager';

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: authUser.organizationId,
      },
      select: {
        id: true,
        clerkId: true,
        email: true,
        name: true,
        role: true,
        languagePreference: true,
        createdAt: true,
        _count: {
          select: {
            callSessions: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: { message: 'Failed to fetch user', code: 'FETCH_ERROR' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/[userId]
 * Update user (admin only for role changes)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: authUserId } = await auth();
    if (!authUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
    const body = await request.json();

    const authUser = await prisma.user.findUnique({
      where: { clerkId: authUserId },
      select: { id: true, organizationId: true, role: true },
    });

    if (!authUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only admins can update user roles
    if (authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: authUser.organizationId,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only allow updating specific fields
    const allowedFields = ['role', 'name', 'languagePreference'];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        clerkId: true,
        email: true,
        name: true,
        role: true,
        languagePreference: true,
      },
    });

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: { message: 'Failed to update user', code: 'UPDATE_ERROR' } },
      { status: 500 }
    );
  }
}
