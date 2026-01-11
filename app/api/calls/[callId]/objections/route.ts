/**
 * Call Objection Responses API
 * GET /api/calls/[callId]/objections - List objection responses for a call
 * POST /api/calls/[callId]/objections - Record objection response with outcome
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import { handleApiError, ErrorResponses } from '@/lib/api/error-handler';
import { callParamsSchema, objectionIdSchema, milestoneIdSchema } from '@/lib/validation';
import { objectionResponseService } from '@/services/objection-response-service';

/**
 * Constants for field limits (SEC-005)
 */
const MAX_NOTES_LENGTH = 10000;
const MAX_DIAGNOSTIC_KEY_LENGTH = 100;
const MAX_DIAGNOSTIC_VALUE_LENGTH = 5000;
const MAX_DIAGNOSTIC_ENTRIES = 50;

/**
 * Validation schema for diagnostic answers with limits
 */
const diagnosticAnswersSchema = z
  .record(
    z.string().max(MAX_DIAGNOSTIC_KEY_LENGTH, `Key must be ${MAX_DIAGNOSTIC_KEY_LENGTH} characters or less`),
    z.string().max(MAX_DIAGNOSTIC_VALUE_LENGTH, `Answer must be ${MAX_DIAGNOSTIC_VALUE_LENGTH} characters or less`)
  )
  .refine(
    (obj) => Object.keys(obj).length <= MAX_DIAGNOSTIC_ENTRIES,
    { message: `Maximum ${MAX_DIAGNOSTIC_ENTRIES} diagnostic answers allowed` }
  )
  .optional();

/**
 * Validation schema for creating objection response
 */
const CreateObjectionResponseSchema = z.object({
  objectionId: objectionIdSchema,
  milestoneId: milestoneIdSchema,
  outcome: z.enum(['Resolved', 'Deferred', 'Disqualified'], {
    errorMap: () => ({ message: 'Invalid outcome. Must be Resolved, Deferred, or Disqualified' }),
  }),
  diagnosticAnswers: diagnosticAnswersSchema,
  notes: z.string().max(MAX_NOTES_LENGTH, `Notes must be ${MAX_NOTES_LENGTH} characters or less`).optional(),
});

/**
 * GET /api/calls/[callId]/objections
 * List all objection responses for a call with stats
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
      select: { organizationId: true },
    });

    if (!user) {
      return ErrorResponses.notFound('User');
    }

    // Get responses and stats in parallel
    const [responses, stats] = await Promise.all([
      objectionResponseService.listObjectionResponsesForCall(user.organizationId, callId),
      objectionResponseService.getObjectionStats(user.organizationId, callId),
    ]);

    return NextResponse.json({
      data: responses,
      meta: {
        stats,
        hasUnresolved: stats.deferred > 0,
      },
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/calls/[callId]/objections', {
      fallbackMessage: 'Failed to fetch objection responses',
    });
  }
}

/**
 * POST /api/calls/[callId]/objections
 * Record an objection response with outcome
 * Requires: objectionId, milestoneId, outcome
 * Optional: diagnosticAnswers, notes
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

    const body = await request.json();

    // Validate input
    const validation = CreateObjectionResponseSchema.safeParse(body);
    if (!validation.success) {
      return ErrorResponses.validationError(
        validation.error.errors.map((e) => e.message).join(', ')
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true },
    });

    if (!user) {
      return ErrorResponses.notFound('User');
    }

    // Create objection response via service
    const response = await objectionResponseService.createObjectionResponse(
      user.organizationId,
      {
        callSessionId: callId,
        ...validation.data,
      }
    );

    return NextResponse.json({ data: response }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/calls/[callId]/objections', {
      fallbackMessage: 'Failed to record objection response',
    });
  }
}
