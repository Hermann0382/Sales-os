/**
 * Start Recording API
 * POST /api/calls/[callId]/recording/start - Start recording for a call
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import { handleApiError, ErrorResponses } from '@/lib/api/error-handler';
import { callParamsSchema } from '@/lib/validation';
import { zoomRecordingService, isZoomConfigured } from '@/services/zoom-service';

/**
 * Validation schema for start recording request
 */
const StartRecordingSchema = z.object({
  zoomLink: z.string().url('Invalid Zoom URL format'),
});

/**
 * POST /api/calls/[callId]/recording/start
 * Start recording for a call using the provided Zoom link
 * Only the call agent can start recording
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

    // Check if Zoom is configured
    if (!isZoomConfigured()) {
      return ErrorResponses.serviceUnavailable('Zoom recording is not configured');
    }

    const rawParams = await params;

    // Validate callId format
    const paramsValidation = callParamsSchema.safeParse(rawParams);
    if (!paramsValidation.success) {
      return ErrorResponses.badRequest('Invalid call ID format');
    }
    const { callId } = paramsValidation.data;

    // Parse and validate request body
    const body = await request.json();
    const validation = StartRecordingSchema.safeParse(body);
    if (!validation.success) {
      return ErrorResponses.validationError(
        validation.error.errors.map((e) => e.message).join(', ')
      );
    }
    const { zoomLink } = validation.data;

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
        zoomLink: true,
      },
    });

    if (!call) {
      return ErrorResponses.notFound('Call session');
    }

    // Check access: must be the call agent
    if (call.agentId !== user.id) {
      return ErrorResponses.forbidden('Only the call agent can start recording');
    }

    // Check call status: must be in progress
    if (call.status !== 'in_progress') {
      return ErrorResponses.badRequest(
        'Recording can only be started for calls that are in progress'
      );
    }

    // Start recording
    const result = await zoomRecordingService.startRecording(user.organizationId, {
      callSessionId: callId,
      zoomLink,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            message: result.error || 'Failed to start recording',
            code: 'RECORDING_START_FAILED',
          },
        },
        { status: 400 }
      );
    }

    // Update call session with Zoom link if not already set
    if (!call.zoomLink) {
      await prisma.callSession.update({
        where: { id: callId },
        data: { zoomLink },
      });
    }

    return NextResponse.json(
      {
        data: {
          recordingId: result.recordingId,
          meetingId: result.meetingId,
          status: 'recording',
        },
        message: 'Recording started successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/calls/[callId]/recording/start', {
      fallbackMessage: 'Failed to start recording',
    });
  }
}
