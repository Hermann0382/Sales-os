/**
 * Follow-ups API - Create and list follow-up calls
 * GET /api/follow-ups - Get scheduled follow-ups for the current agent
 * POST /api/follow-ups - Create a new follow-up call for a prospect
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { followUpService } from '@/services/follow-up-service';

export async function GET(request: NextRequest) {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the agent record for the current user
    const agent = await prisma.user.findFirst({
      where: {
        clerkId: userId,
        organizationId: orgId,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const followUps = await followUpService.getScheduledFollowUps(
      agent.id,
      orgId
    );

    return NextResponse.json({ followUps });
  } catch (error) {
    console.error('Error fetching follow-ups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch follow-ups' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { prospectId, inheritLanguage, inheritMode } = body;

    if (!prospectId) {
      return NextResponse.json(
        { error: 'prospectId is required' },
        { status: 400 }
      );
    }

    // Get the agent record for the current user
    const agent = await prisma.user.findFirst({
      where: {
        clerkId: userId,
        organizationId: orgId,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Verify prospect exists and belongs to org
    const prospect = await prisma.prospect.findFirst({
      where: {
        id: prospectId,
        organizationId: orgId,
      },
    });

    if (!prospect) {
      return NextResponse.json(
        { error: 'Prospect not found' },
        { status: 404 }
      );
    }

    const result = await followUpService.createFollowUpCall(
      prospectId,
      agent.id,
      orgId,
      {
        inheritLanguage: inheritLanguage !== false,
        inheritMode: inheritMode !== false,
      }
    );

    return NextResponse.json({
      ...result,
      message: result.isFirstCall
        ? 'New call thread created'
        : 'Follow-up call scheduled',
    });
  } catch (error) {
    console.error('Error creating follow-up:', error);
    return NextResponse.json(
      { error: 'Failed to create follow-up' },
      { status: 500 }
    );
  }
}
