/**
 * Recording Status API
 * GET /api/calls/[callId]/recording - Get recording status and URL
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { handleApiError, ErrorResponses } from '@/lib/api/error-handler';
import { callParamsSchema } from '@/lib/validation';
import { zoomRecordingService } from '@/services/zoom-service';

/**
 * GET /api/calls/[callId]/recording
 * Get the recording status and URL for a call
 * Accessible by call agent or managers
 */
export async function GET(
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
      select: { id: true, organizationId: true, role: true },
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
      },
    });

    if (!call) {
      return ErrorResponses.notFound('Call session');
    }

    // Check access: must be the call agent or a manager/admin
    const isCallAgent = call.agentId === user.id;
    const isManagerOrAdmin = user.role === 'manager' || user.role === 'admin';

    if (!isCallAgent && !isManagerOrAdmin) {
      return ErrorResponses.forbidden('Only the call agent or managers can access recording');
    }

    // Get recording details
    const recording = await zoomRecordingService.getRecording(
      user.organizationId,
      callId
    );

    if (!recording) {
      return NextResponse.json({
        data: null,
        meta: {
          hasRecording: false,
        },
      });
    }

    return NextResponse.json({
      data: {
        id: recording.id,
        status: recording.status,
        duration: recording.duration,
        recordingUrl: recording.recordingUrl,
        transcriptUrl: recording.transcriptUrl,
        startedAt: recording.startedAt,
        endedAt: recording.endedAt,
      },
      meta: {
        hasRecording: true,
        isAvailable: recording.status === 'completed' && !!recording.recordingUrl,
      },
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/calls/[callId]/recording', {
      fallbackMessage: 'Failed to fetch recording status',
    });
  }
}
