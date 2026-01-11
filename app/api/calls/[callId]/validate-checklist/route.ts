/**
 * Validate Checklist API
 * POST /api/calls/[callId]/validate-checklist - Validate checklist and enforce gates
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { checklistService } from '@/services/checklist-service';

/**
 * POST - Validate checklist for call start
 * Returns validation result and whether call can be started
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { callId } = await params;
    const body = await request.json().catch(() => ({}));
    const { overrideReason } = body;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify call belongs to user's organization
    const call = await prisma.callSession.findFirst({
      where: {
        id: callId,
        organizationId: user.organizationId,
      },
      include: {
        prospect: true,
      },
    });

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // Check if override is allowed (only managers and admins can override)
    const canOverride = user.role === 'manager' || user.role === 'admin';
    const effectiveOverrideReason = canOverride ? overrideReason : undefined;

    if (overrideReason && !canOverride) {
      return NextResponse.json(
        {
          error: {
            message: 'Only managers and admins can override qualification gates',
            code: 'OVERRIDE_NOT_ALLOWED',
          },
        },
        { status: 403 }
      );
    }

    // Validate checklist
    const validation = await checklistService.validateChecklist(
      callId,
      effectiveOverrideReason
    );

    // Get qualification status for additional context
    const qualificationStatus = await checklistService.getQualificationStatus(
      call.prospectId
    );

    // Return appropriate response based on validation
    if (!validation.canStart) {
      return NextResponse.json(
        {
          data: {
            validation,
            qualification: qualificationStatus,
            canOverride,
          },
          message: 'Checklist validation failed',
        },
        { status: validation.isValid ? 200 : 400 }
      );
    }

    // Log override if used
    if (effectiveOverrideReason && !qualificationStatus.isQualified) {
      console.log(
        `Qualification gate override by ${userId} for call ${callId}: ${effectiveOverrideReason}`
      );
    }

    return NextResponse.json({
      data: {
        validation,
        qualification: qualificationStatus,
        canOverride,
      },
      message: 'Checklist validated successfully. Call can be started.',
    });
  } catch (error) {
    console.error('Error validating checklist:', error);
    return NextResponse.json(
      {
        error: {
          message: 'Failed to validate checklist',
          code: 'VALIDATION_ERROR',
        },
      },
      { status: 500 }
    );
  }
}
