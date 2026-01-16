/**
 * Slide Navigate API Route
 * POST /api/calls/[callId]/slides/[slideId]/navigate - Navigate to a slide (record timing)
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

/**
 * POST /api/calls/[callId]/slides/[slideId]/navigate
 * Navigate to a slide - creates instance if needed and records start time
 */
export async function POST(
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

    // Get or create slide instance
    const { id: instanceId, isNew } = await slideService.getOrCreateSlideInstance(
      callId,
      slideId,
      user.organizationId
    );

    // Record slide start timing
    const { timing } = await slideService.recordSlideTiming({
      instanceId,
      organizationId: user.organizationId,
      action: 'start',
    });

    return NextResponse.json({
      data: {
        instanceId,
        isNew,
        navigatedAt: timing,
        slideId,
        callId,
      },
    });
  } catch (error) {
    console.error('Error navigating to slide:', error);
    return NextResponse.json(
      { error: { message: 'Failed to navigate to slide', code: 'NAVIGATE_ERROR' } },
      { status: 500 }
    );
  }
}
