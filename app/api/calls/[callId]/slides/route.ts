/**
 * Slides API Route
 * GET /api/calls/[callId]/slides - Get all slides for a call
 * POST /api/calls/[callId]/slides/render - Render slides with parameters
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { checkRateLimit, createRateLimitHeaders, RATE_LIMITS } from '@/lib/api/rate-limit';
import { callParamsSchema } from '@/lib/validation';
import { slideService } from '@/services/slide-service';

/**
 * GET /api/calls/[callId]/slides
 * Get all slide templates for a call session
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

    // Rate limiting
    const rateLimitResult = checkRateLimit(userId, RATE_LIMITS.standard);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: { message: 'Too many requests', code: 'RATE_LIMITED' } },
        { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    // Validate callId parameter
    const rawParams = await params;
    const paramsValidation = callParamsSchema.safeParse(rawParams);
    if (!paramsValidation.success) {
      return NextResponse.json(
        { error: { message: 'Invalid call ID format', code: 'INVALID_PARAMS' } },
        { status: 400 }
      );
    }
    const { callId } = paramsValidation.data;

    // Get user with organization
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, organizationId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get slides
    const slides = await slideService.getSlidesByCallId({
      callId,
      organizationId: user.organizationId,
    });

    return NextResponse.json({ data: slides });
  } catch (error) {
    console.error('Error fetching slides:', error);
    return NextResponse.json(
      { error: { message: 'Failed to fetch slides', code: 'FETCH_ERROR' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calls/[callId]/slides
 * Render all slides with parameter substitution for the call
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

    // Rate limiting
    const rateLimitResult = checkRateLimit(userId, RATE_LIMITS.standard);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: { message: 'Too many requests', code: 'RATE_LIMITED' } },
        { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    // Validate callId parameter
    const rawParams = await params;
    const paramsValidation = callParamsSchema.safeParse(rawParams);
    if (!paramsValidation.success) {
      return NextResponse.json(
        { error: { message: 'Invalid call ID format', code: 'INVALID_PARAMS' } },
        { status: 400 }
      );
    }
    const { callId } = paramsValidation.data;

    // Get user with organization
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, organizationId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Render slides with parameters
    const renderedSlides = await slideService.renderSlidesForCall({
      callId,
      organizationId: user.organizationId,
    });

    return NextResponse.json({ data: renderedSlides });
  } catch (error) {
    console.error('Error rendering slides:', error);
    return NextResponse.json(
      { error: { message: 'Failed to render slides', code: 'RENDER_ERROR' } },
      { status: 500 }
    );
  }
}
