/**
 * Slide Service
 *
 * Business logic for slide management, including:
 * - Fetching slides for a call session
 * - Rendering slides with parameter substitution
 * - Recording slide instances with timing
 */

import { prisma } from '@/lib/db';
import type { SlideOutcomeTag, Prisma } from '@prisma/client';
import {
  buildParameterContext,
  renderSlideContent,
  type ParameterSlot,
  type RenderedSlideContent,
} from './parameter-engine';

// Slide with template data
export interface SlideWithTemplate {
  id: string;
  slideTemplateId: string;
  title: string;
  coreMessage: string | null;
  visualizationTemplate: string | null;
  parameterSlots: ParameterSlot[] | null;
  orderIndex: number;
  milestoneId: string | null;
  milestoneName: string | null;
}

// Rendered slide with instance data
export interface RenderedSlide extends SlideWithTemplate {
  instanceId: string | null;
  renderedContent: RenderedSlideContent | null;
  agentNotes: string | null;
  outcomeTag: SlideOutcomeTag | null;
  startedAt: Date | null;
  endedAt: Date | null;
}

// Service input types
export interface GetSlidesInput {
  callId: string;
  organizationId: string;
}

export interface RenderSlidesInput {
  callId: string;
  organizationId: string;
}

export interface CreateSlideInstanceInput {
  callSessionId: string;
  slideTemplateId: string;
  prospectId: string;
  renderedContent: RenderedSlideContent;
}

export interface UpdateSlideInstanceInput {
  instanceId: string;
  organizationId: string;
  agentNotes?: string;
  outcomeTag?: SlideOutcomeTag;
}

export interface RecordSlideTimingInput {
  instanceId: string;
  organizationId: string;
  action: 'start' | 'end';
}

/**
 * Slide Service - manages all slide-related operations
 */
class SlideService {
  /**
   * Get all slide templates for a call session
   * Returns templates ordered by orderIndex
   */
  async getSlidesByCallId({
    callId,
    organizationId,
  }: GetSlidesInput): Promise<SlideWithTemplate[]> {
    // Verify call exists and belongs to organization
    const call = await prisma.callSession.findFirst({
      where: {
        id: callId,
        organizationId,
      },
      select: { id: true },
    });

    if (!call) {
      throw new Error('Call not found');
    }

    // Fetch slide templates for this organization
    const templates = await prisma.slideTemplate.findMany({
      where: { organizationId },
      include: {
        milestone: {
          select: { title: true },
        },
      },
      orderBy: { orderIndex: 'asc' },
    });

    return templates.map((template) => ({
      id: template.id,
      slideTemplateId: template.id,
      title: template.titleStatic,
      coreMessage: template.coreMessageStatic,
      visualizationTemplate: template.visualizationTemplate,
      parameterSlots: template.parameterSlots as ParameterSlot[] | null,
      orderIndex: template.orderIndex,
      milestoneId: template.milestoneId,
      milestoneName: template.milestone?.title ?? null,
    }));
  }

  /**
   * Get a single slide by ID with call context
   */
  async getSlideById(
    slideId: string,
    callId: string,
    organizationId: string
  ): Promise<SlideWithTemplate | null> {
    const template = await prisma.slideTemplate.findFirst({
      where: {
        id: slideId,
        organizationId,
      },
      include: {
        milestone: {
          select: { title: true },
        },
      },
    });

    if (!template) {
      return null;
    }

    return {
      id: template.id,
      slideTemplateId: template.id,
      title: template.titleStatic,
      coreMessage: template.coreMessageStatic,
      visualizationTemplate: template.visualizationTemplate,
      parameterSlots: template.parameterSlots as ParameterSlot[] | null,
      orderIndex: template.orderIndex,
      milestoneId: template.milestoneId,
      milestoneName: template.milestone?.title ?? null,
    };
  }

  /**
   * Render all slides for a call session with parameter substitution
   */
  async renderSlidesForCall({
    callId,
    organizationId,
  }: RenderSlidesInput): Promise<RenderedSlide[]> {
    // Fetch call with prospect data
    const call = await prisma.callSession.findFirst({
      where: {
        id: callId,
        organizationId,
      },
      include: {
        prospect: true,
        agent: {
          select: { name: true, email: true },
        },
        slideInstances: {
          include: {
            slideTemplate: true,
          },
        },
      },
    });

    if (!call) {
      throw new Error('Call not found');
    }

    // Fetch slide templates
    const templates = await prisma.slideTemplate.findMany({
      where: { organizationId },
      include: {
        milestone: {
          select: { title: true },
        },
      },
      orderBy: { orderIndex: 'asc' },
    });

    // Build parameter context
    const agentContext = call.agent && call.agent.name
      ? { name: call.agent.name, email: call.agent.email }
      : undefined;
    const context = buildParameterContext(call.prospect, call, agentContext);

    // Map existing instances by template ID
    const instanceMap = new Map(
      call.slideInstances.map((instance) => [instance.slideTemplateId, instance])
    );

    // Render each template
    return templates.map((template) => {
      const existingInstance = instanceMap.get(template.id);

      // Render content with parameters
      const renderedContent = renderSlideContent(
        template.titleStatic,
        template.coreMessageStatic,
        template.visualizationTemplate,
        template.parameterSlots as ParameterSlot[] | null,
        context
      );

      return {
        id: template.id,
        slideTemplateId: template.id,
        title: template.titleStatic,
        coreMessage: template.coreMessageStatic,
        visualizationTemplate: template.visualizationTemplate,
        parameterSlots: template.parameterSlots as ParameterSlot[] | null,
        orderIndex: template.orderIndex,
        milestoneId: template.milestoneId,
        milestoneName: template.milestone?.title ?? null,
        // Instance data (if exists)
        instanceId: existingInstance?.id ?? null,
        renderedContent: existingInstance
          ? (existingInstance.renderedContent as RenderedSlideContent | null)
          : renderedContent,
        agentNotes: existingInstance?.agentNotes ?? null,
        outcomeTag: existingInstance?.outcomeTag ?? null,
        startedAt: existingInstance?.startedAt ?? null,
        endedAt: existingInstance?.endedAt ?? null,
      };
    });
  }

  /**
   * Create a new slide instance for a call
   */
  async createSlideInstance({
    callSessionId,
    slideTemplateId,
    prospectId,
    renderedContent,
  }: CreateSlideInstanceInput): Promise<{ id: string }> {
    const instance = await prisma.slideInstance.create({
      data: {
        callSessionId,
        slideTemplateId,
        prospectId,
        renderedContent: JSON.parse(JSON.stringify(renderedContent)),
      },
      select: { id: true },
    });

    return instance;
  }

  /**
   * Create or get slide instance (upsert-like behavior)
   */
  async getOrCreateSlideInstance(
    callId: string,
    slideTemplateId: string,
    organizationId: string
  ): Promise<{ id: string; isNew: boolean }> {
    // Verify call and get prospect
    const call = await prisma.callSession.findFirst({
      where: {
        id: callId,
        organizationId,
      },
      include: {
        prospect: true,
        agent: {
          select: { name: true, email: true },
        },
      },
    });

    if (!call) {
      throw new Error('Call not found');
    }

    // Check for existing instance
    const existingInstance = await prisma.slideInstance.findFirst({
      where: {
        callSessionId: callId,
        slideTemplateId,
      },
      select: { id: true },
    });

    if (existingInstance) {
      return { id: existingInstance.id, isNew: false };
    }

    // Fetch template for rendering
    const template = await prisma.slideTemplate.findFirst({
      where: {
        id: slideTemplateId,
        organizationId,
      },
    });

    if (!template) {
      throw new Error('Slide template not found');
    }

    // Render content
    const agentCtx = call.agent && call.agent.name
      ? { name: call.agent.name, email: call.agent.email }
      : undefined;
    const context = buildParameterContext(call.prospect, call, agentCtx);
    const renderedContent = renderSlideContent(
      template.titleStatic,
      template.coreMessageStatic,
      template.visualizationTemplate,
      template.parameterSlots as ParameterSlot[] | null,
      context
    );

    // Create new instance
    const instance = await prisma.slideInstance.create({
      data: {
        callSessionId: callId,
        slideTemplateId,
        prospectId: call.prospectId,
        renderedContent: JSON.parse(JSON.stringify(renderedContent)),
      },
      select: { id: true },
    });

    return { id: instance.id, isNew: true };
  }

  /**
   * Update slide instance (notes, outcome tag)
   */
  async updateSlideInstance({
    instanceId,
    organizationId,
    agentNotes,
    outcomeTag,
  }: UpdateSlideInstanceInput): Promise<{ id: string }> {
    // Verify instance belongs to organization
    const instance = await prisma.slideInstance.findFirst({
      where: { id: instanceId },
      include: {
        callSession: {
          select: { organizationId: true },
        },
      },
    });

    if (!instance || instance.callSession.organizationId !== organizationId) {
      throw new Error('Slide instance not found');
    }

    // Update instance
    const updated = await prisma.slideInstance.update({
      where: { id: instanceId },
      data: {
        ...(agentNotes !== undefined && { agentNotes }),
        ...(outcomeTag !== undefined && { outcomeTag }),
      },
      select: { id: true },
    });

    return updated;
  }

  /**
   * Record slide timing (start or end)
   */
  async recordSlideTiming({
    instanceId,
    organizationId,
    action,
  }: RecordSlideTimingInput): Promise<{ id: string; timing: Date }> {
    // Verify instance belongs to organization
    const instance = await prisma.slideInstance.findFirst({
      where: { id: instanceId },
      include: {
        callSession: {
          select: { organizationId: true },
        },
      },
    });

    if (!instance || instance.callSession.organizationId !== organizationId) {
      throw new Error('Slide instance not found');
    }

    const now = new Date();

    // Update timing
    const updated = await prisma.slideInstance.update({
      where: { id: instanceId },
      data: action === 'start' ? { startedAt: now } : { endedAt: now },
      select: { id: true },
    });

    return { id: updated.id, timing: now };
  }

  /**
   * Get slide instances for a call session
   */
  async getSlideInstancesForCall(
    callId: string,
    organizationId: string
  ): Promise<Array<{
    id: string;
    slideTemplateId: string;
    renderedContent: RenderedSlideContent | null;
    agentNotes: string | null;
    outcomeTag: SlideOutcomeTag | null;
    startedAt: Date | null;
    endedAt: Date | null;
  }>> {
    const instances = await prisma.slideInstance.findMany({
      where: {
        callSessionId: callId,
        callSession: {
          organizationId,
        },
      },
      select: {
        id: true,
        slideTemplateId: true,
        renderedContent: true,
        agentNotes: true,
        outcomeTag: true,
        startedAt: true,
        endedAt: true,
      },
      orderBy: {
        slideTemplate: {
          orderIndex: 'asc',
        },
      },
    });

    return instances.map((instance) => ({
      ...instance,
      renderedContent: instance.renderedContent as RenderedSlideContent | null,
    }));
  }
}

export const slideService = new SlideService();
