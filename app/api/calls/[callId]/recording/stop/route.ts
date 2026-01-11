/**
 * Stop Recording API
 * POST /api/calls/[callId]/recording/stop - Stop recording for a call
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { handleApiError, ErrorResponses } from '@/lib/api/error-handler';
import { callParamsSchema } from '@/lib/validation';
import { zoomRecordingService } from '@/services/zoom-service';

/**
 * POST /api/calls/[callId]/recording/stop
 * Stop recording for a call
 * Only the call agent can stop recording
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ErrorResponses.unauthorized();
    }

    const rawParams = await params;

    // Validate callId format
    const paramsValidation = callParamsSchema.safeParse(rawParams);
    if (!paramsValidation.success) {
      return ErrorResponses.badRequest('Invalid call ID format');
    }
    const { callId } = paramsValidation.data;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, organizationId: true },
    });

    if (!user) {
      return ErrorResponses.notFound('User');
    }

    // Verify call exists and belongs to organization
    const call = await prisma.callSession.findFirst({
      where: {
        id: callId,
        organizationId: user.organizationId,
      },
      select: {
        id: true,
        agentId: true,
        status: true,
      },
    });

    if (!call) {
      return ErrorResponses.notFound('Call session');
    }

    // Check access: must be the call agent
    if (call.agentId !== user.id) {
      return ErrorResponses.forbidden('Only the call agent can stop recording');
    }

    // Stop recording
    const result = await zoomRecordingService.stopRecording(
      user.organizationId,
      callId
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            message: result.error || 'Failed to stop recording',
            code: 'RECORDING_STOP_FAILED',
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: {
        status: 'processing',
        duration: result.duration,
      },
      message: 'Recording stopped successfully',
    });
  } catch (error) {
    return handleApiError(error, 'POST /api/calls/[callId]/recording/stop', {
      fallbackMessage: 'Failed to stop recording',
    });
  }
}
