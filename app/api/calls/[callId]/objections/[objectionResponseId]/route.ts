/**
 * Objection Response Detail API
 * GET /api/calls/[callId]/objections/[objectionResponseId] - Get details
 * PATCH /api/calls/[callId]/objections/[objectionResponseId] - Update notes
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import { objectionResponseParamsSchema } from '@/lib/validation';
import { objectionResponseService } from '@/services/objection-response-service';

/**
 * Validation schema for updating objection response
 * Note: outcome cannot be changed after creation
 */
const UpdateObjectionResponseSchema = z.object({
  notes: z.string().max(5000, 'Notes must be 5000 characters or less').optional(),
  diagnosticAnswers: z.record(z.string()).optional(),
});

/**
 * GET - Get objection response details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string; objectionResponseId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawParams = await params;

    // Validate ID formats
    const paramsValidation = objectionResponseParamsSchema.safeParse(rawParams);
    if (!paramsValidation.success) {
      return NextResponse.json(
        { error: { message: 'Invalid parameters', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      );
    }
    const { callId, objectionResponseId } = paramsValidation.data;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const response = await objectionResponseService.getObjectionResponse(
      user.organizationId,
      objectionResponseId
    );

    if (!response) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 });
    }

    // Validate that the response belongs to the specified call (prevents IDOR)
    if (response.callSessionId !== callId) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 });
    }

    return NextResponse.json({ data: response });
  } catch (error) {
    console.error('Error fetching objection response:', error);
    return NextResponse.json(
      { error: { message: 'Failed to fetch objection response', code: 'FETCH_ERROR' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update objection response notes
 * Note: Outcome cannot be changed after creation
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string; objectionResponseId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawParams = await params;

    // Validate ID formats
    const paramsValidation = objectionResponseParamsSchema.safeParse(rawParams);
    if (!paramsValidation.success) {
      return NextResponse.json(
        { error: { message: 'Invalid parameters', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      );
    }
    const { callId, objectionResponseId } = paramsValidation.data;
    const body = await request.json();

    // Validate input
    const validation = UpdateObjectionResponseSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: validation.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // First verify the response exists and belongs to the correct call
    const existing = await objectionResponseService.getObjectionResponse(
      user.organizationId,
      objectionResponseId
    );

    if (!existing) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 });
    }

    // Validate that the response belongs to the specified call (prevents IDOR)
    if (existing.callSessionId !== callId) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 });
    }

    const response = await objectionResponseService.updateObjectionResponse(
      user.organizationId,
      objectionResponseId,
      validation.data
    );

    return NextResponse.json({ data: response });
  } catch (error) {
    console.error('Error updating objection response:', error);
    const message = error instanceof Error ? error.message : 'Failed to update objection response';
    return NextResponse.json(
      { error: { message, code: 'UPDATE_ERROR' } },
      { status: 500 }
    );
  }
}
