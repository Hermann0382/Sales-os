/**
 * Single Slide API Route
 * GET /api/calls/[callId]/slides/[slideId] - Get a single slide
 * PATCH /api/calls/[callId]/slides/[slideId] - Update slide instance
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import { checkRateLimit, createRateLimitHeaders, RATE_LIMITS } from '@/lib/api/rate-limit';
import { slideService } from '@/services/slide-service';

// Validation schemas
const slideParamsSchema = z.object({
  callId: z.string().cuid('Invalid call ID format'),
  slideId: z.string().cuid('Invalid slide ID format'),
});

const updateSlideSchema = z.object({
  agentNotes: z.string().max(5000).optional(),
  outcomeTag: z.enum(['positive', 'neutral', 'negative']).optional(),
});

/**
 * GET /api/calls/[callId]/slides/[slideId]
 * Get a single slide with template and instance data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string; slideId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = checkRateLimit(userId, RATE_LIMITS.standard);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: { message: 'Too many requests', code: 'RATE_LIMITED' } },
        { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    // Validate params
    const rawParams = await params;
    const paramsValidation = slideParamsSchema.safeParse(rawParams);
    if (!paramsValidation.success) {
      return NextResponse.json(
        { error: { message: 'Invalid parameters', code: 'INVALID_PARAMS' } },
        { status: 400 }
      );
    }
    const { callId, slideId } = paramsValidation.data;

    // Get user with organization
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, organizationId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get slide
    const slide = await slideService.getSlideById(
      slideId,
      callId,
      user.organizationId
    );

    if (!slide) {
      return NextResponse.json(
        { error: { message: 'Slide not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: slide });
  } catch (error) {
    console.error('Error fetching slide:', error);
    return NextResponse.json(
      { error: { message: 'Failed to fetch slide', code: 'FETCH_ERROR' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/calls/[callId]/slides/[slideId]
 * Update a slide instance (notes, outcome tag)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string; slideId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = checkRateLimit(userId, RATE_LIMITS.standard);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: { message: 'Too many requests', code: 'RATE_LIMITED' } },
        { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    // Validate params
    const rawParams = await params;
    const paramsValidation = slideParamsSchema.safeParse(rawParams);
    if (!paramsValidation.success) {
      return NextResponse.json(
        { error: { message: 'Invalid parameters', code: 'INVALID_PARAMS' } },
        { status: 400 }
      );
    }
    const { callId, slideId } = paramsValidation.data;

    // Validate body
    const body = await request.json();
    const bodyValidation = updateSlideSchema.safeParse(body);
    if (!bodyValidation.success) {
      return NextResponse.json(
        { error: { message: 'Invalid request body', code: 'INVALID_BODY' } },
        { status: 400 }
      );
    }

    // Get user with organization
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, organizationId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get or create slide instance
    const { id: instanceId } = await slideService.getOrCreateSlideInstance(
      callId,
      slideId,
      user.organizationId
    );

    // Update the instance
    const { agentNotes, outcomeTag } = bodyValidation.data;
    const updated = await slideService.updateSlideInstance({
      instanceId,
      organizationId: user.organizationId,
      agentNotes,
      outcomeTag,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Error updating slide:', error);
    return NextResponse.json(
      { error: { message: 'Failed to update slide', code: 'UPDATE_ERROR' } },
      { status: 500 }
    );
  }
}
