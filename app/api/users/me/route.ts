/**
 * Current User API Route
 * GET /api/users/me - Get or create current user (syncs with Clerk)
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

/**
 * GET /api/users/me
 * Get current user, creating them if they don't exist (lazy sync)
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try to find existing user
    let user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        organization: true,
      },
    });

    // If user doesn't exist, create them (lazy sync from Clerk)
    if (!user) {
      const clerkUser = await currentUser();
      if (!clerkUser) {
        return NextResponse.json({ error: 'Could not fetch Clerk user' }, { status: 500 });
      }

      // Get or create default organization
      let organization = await prisma.organization.findUnique({
        where: { id: 'org_default' },
      });

      if (!organization) {
        organization = await prisma.organization.create({
          data: {
            id: 'org_default',
            name: 'RichtungsWechsel',
          },
        });
      }

      // Get primary email
      const email = clerkUser.emailAddresses[0]?.emailAddress;
      if (!email) {
        return NextResponse.json({ error: 'No email found for user' }, { status: 400 });
      }

      // Create user
      user = await prisma.user.create({
        data: {
          clerkId: userId,
          email,
          name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null,
          organizationId: organization.id,
          role: 'admin', // First user is admin
        },
        include: {
          organization: true,
        },
      });

      console.log(`✓ Created user ${user.email} (${user.role})`);
    }

    return NextResponse.json({
      data: {
        id: user.id,
        clerkId: user.clerkId,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organization.name,
      },
    });
  } catch (error) {
    console.error('Error fetching/creating user:', error);
    return NextResponse.json(
      { error: { message: 'Failed to get user', code: 'USER_ERROR' } },
      { status: 500 }
    );
  }
}
