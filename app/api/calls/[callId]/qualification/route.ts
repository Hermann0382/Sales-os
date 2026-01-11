/**
 * Qualification API
 * GET /api/calls/[callId]/qualification - Get qualification status for a call
 *
 * Returns advisory mode status, skipped milestones, and allowed outcomes
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { callParamsSchema } from '@/lib/validation';
import { qualificationService } from '@/services/qualification-service';

/**
 * GET - Get qualification status for a call
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawParams = await params;

    // Validate ID format
    const paramsValidation = callParamsSchema.safeParse(rawParams);
    if (!paramsValidation.success) {
      return NextResponse.json(
        { error: { message: 'Invalid call ID format', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      );
    }
    const { callId } = paramsValidation.data;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get qualification status and milestone availability in single optimized call
    const { status, milestoneAvailability } = await qualificationService.getFullQualificationData(
      user.organizationId,
      callId
    );

    return NextResponse.json({
      data: {
        ...status,
        milestoneAvailability,
      },
    });
  } catch (error) {
    console.error('Error fetching qualification status:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch qualification status';
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json(
      { error: { message, code: 'FETCH_ERROR' } },
      { status }
    );
  }
}
