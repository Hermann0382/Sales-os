/**
 * Call Threads API - Get conversation history for a prospect
 * GET /api/call-threads/[prospectId] - Get all call threads for a prospect
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { callThreadService } from '@/services/call-thread-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ prospectId: string }> }
) {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { prospectId } = await params;

  try {
    const history = await callThreadService.getConversationHistory(
      prospectId,
      orgId
    );

    return NextResponse.json(history);
  } catch (error) {
    if (error instanceof Error && error.message === 'Prospect not found') {
      return NextResponse.json(
        { error: 'Prospect not found' },
        { status: 404 }
      );
    }
    console.error('Error fetching call threads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch call threads' },
      { status: 500 }
    );
  }
}
