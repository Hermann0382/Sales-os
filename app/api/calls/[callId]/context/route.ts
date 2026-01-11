/**
 * Follow-up Context API - Get context for a follow-up call
 * GET /api/calls/[callId]/context - Get follow-up context for a call
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { followUpService } from '@/services/follow-up-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { callId } = await params;

  try {
    const context = await followUpService.getFollowUpContext(callId, orgId);

    if (!context) {
      // Return empty context for first calls (no previous calls exist)
      return NextResponse.json({
        isFirstCall: true,
        message: 'No previous call context available',
      });
    }

    return NextResponse.json({
      isFirstCall: false,
      context,
    });
  } catch (error) {
    console.error('Error fetching follow-up context:', error);
    return NextResponse.json(
      { error: 'Failed to fetch follow-up context' },
      { status: 500 }
    );
  }
}
