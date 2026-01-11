/**
 * AI Service - Business logic for AI-powered call analysis
 * Handles prompt execution, analysis generation, and follow-up email drafts
 */

import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db';
import {
  AIAnalysis,
  AIAnalysisRequest,
  AIAnalysisResponse,
  CreateAIAnalysisInput,
  EvidenceMarker,
  Language,
  ObjectionClassification,
  PromptConfig,
  PromptScope,
  RiskFlag,
  SlideEffectivenessSignal,
} from '@/lib/types';

export class AIService {
  /**
   * Generate AI analysis for a completed call
   */
  async generateAnalysis(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const startTime = Date.now();

    try {
      // Get call data
      const call = await prisma.callSession.findUnique({
        where: { id: request.callSessionId },
        include: {
          prospect: true,
          milestoneResponses: {
            include: { milestone: true },
          },
          objectionResponses: {
            include: { objection: true },
          },
          slideInstances: {
            include: { slideTemplate: true },
          },
        },
      });

      if (!call) {
        return {
          success: false,
          error: 'Call session not found',
        };
      }

      // Get synthesis prompt
      const prompt = await this.getActivePrompt(
        call.organizationId,
        'call_synthesis',
        request.language
      );

      if (!prompt) {
        return {
          success: false,
          error: 'No active synthesis prompt found',
        };
      }

      // Build analysis context
      const context = this.buildAnalysisContext(call, request.transcript);

      // Execute AI analysis (placeholder - would call Claude API)
      const analysisResult = await this.executeAnalysis(prompt, context);

      // Create analysis record
      const analysis = await this.createAnalysis({
        callSessionId: request.callSessionId,
        ...analysisResult,
      });

      return {
        success: true,
        analysis,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Get analysis for a call
   */
  async getAnalysis(callSessionId: string): Promise<AIAnalysis | null> {
    const analysis = await prisma.aIAnalysis.findUnique({
      where: { callSessionId },
    });

    if (!analysis) return null;
    return this.mapToAIAnalysis(analysis);
  }

  /**
   * Create analysis record
   */
  async createAnalysis(input: CreateAIAnalysisInput): Promise<AIAnalysis> {
    const analysis = await prisma.aIAnalysis.create({
      data: {
        callSessionId: input.callSessionId,
        summary: input.summary,
        objectionClassification: input.objectionClassification as Prisma.InputJsonValue | undefined,
        decisionReadinessScore: input.decisionReadinessScore,
        riskFlags: input.riskFlags as Prisma.InputJsonValue | undefined,
        agentExecutionFeedback: input.agentExecutionFeedback,
        slideEffectivenessSignals: input.slideEffectivenessSignals as Prisma.InputJsonValue | undefined,
        followUpEmailDraft: input.followUpEmailDraft,
        evidenceMarkers: input.evidenceMarkers as Prisma.InputJsonValue | undefined,
      },
    });

    return this.mapToAIAnalysis(analysis);
  }

  /**
   * Generate follow-up email draft
   */
  async generateFollowUpEmail(
    callSessionId: string,
    language: Language
  ): Promise<string | null> {
    const call = await prisma.callSession.findUnique({
      where: { id: callSessionId },
      include: {
        prospect: true,
        milestoneResponses: {
          include: { milestone: true },
          where: { status: 'completed' },
        },
        objectionResponses: {
          where: { outcome: 'Deferred' },
          include: { objection: true },
        },
        callOutcome: true,
      },
    });

    if (!call) return null;

    // Build email based on call facts
    const prospectName = call.prospect.name;
    const completedMilestones = call.milestoneResponses.map(
      (r) => r.milestone.title
    );
    const deferredObjections = call.objectionResponses.map(
      (r) => r.objection.objectionType
    );
    const outcome = call.callOutcome?.outcomeType;

    // Template-based email generation (in production, would use AI)
    const emailDraft = this.buildFollowUpTemplate(
      prospectName,
      completedMilestones,
      deferredObjections,
      outcome,
      language
    );

    return emailDraft;
  }

  /**
   * Get active prompt for scope
   */
  async getActivePrompt(
    organizationId: string,
    scope: PromptScope,
    language: Language
  ): Promise<PromptConfig | null> {
    const prompt = await prisma.promptConfig.findFirst({
      where: {
        organizationId,
        scope,
        language,
        status: 'active',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!prompt) return null;
    return this.mapToPromptConfig(prompt);
  }

  /**
   * Build analysis context from call data
   */
  private buildAnalysisContext(
    call: {
      prospect: { name: string; clientCount: number | null; mainPain: string | null };
      milestoneResponses: Array<{
        milestone: { title: string };
        status: string;
        notes: string | null;
      }>;
      objectionResponses: Array<{
        objection: { objectionType: string };
        outcome: string;
        notes: string | null;
      }>;
      slideInstances: Array<{
        slideTemplate: { titleStatic: string };
        outcomeTag: string | null;
      }>;
    },
    transcript?: string
  ) {
    return {
      prospect: {
        name: call.prospect.name,
        clientCount: call.prospect.clientCount,
        mainPain: call.prospect.mainPain,
      },
      milestones: call.milestoneResponses.map((r) => ({
        title: r.milestone.title,
        status: r.status,
        notes: r.notes,
      })),
      objections: call.objectionResponses.map((r) => ({
        type: r.objection.objectionType,
        outcome: r.outcome,
        notes: r.notes,
      })),
      slides: call.slideInstances.map((s) => ({
        title: s.slideTemplate.titleStatic,
        outcome: s.outcomeTag,
      })),
      transcript,
    };
  }

  /**
   * Execute AI analysis (placeholder for Claude API integration)
   */
  private async executeAnalysis(
    _prompt: PromptConfig,
    _context: ReturnType<typeof this.buildAnalysisContext>
  ): Promise<Omit<CreateAIAnalysisInput, 'callSessionId'>> {
    // In production, this would call Claude API
    // For now, return placeholder analysis

    return {
      summary: 'Call analysis pending AI integration.',
      objectionClassification: [],
      decisionReadinessScore: 0,
      riskFlags: [],
      agentExecutionFeedback: undefined,
      slideEffectivenessSignals: [],
      followUpEmailDraft: undefined,
      evidenceMarkers: [],
    };
  }

  /**
   * Build follow-up email template
   */
  private buildFollowUpTemplate(
    prospectName: string,
    completedMilestones: string[],
    deferredObjections: string[],
    outcome: string | undefined,
    language: Language
  ): string {
    if (language === 'DE') {
      return `Hallo ${prospectName},

vielen Dank für unser Gespräch heute.

Zusammenfassung der besprochenen Punkte:
${completedMilestones.map((m) => `- ${m}`).join('\n')}

${deferredObjections.length > 0 ? `Offene Fragen, die wir klären werden:\n${deferredObjections.map((o) => `- ${o}`).join('\n')}` : ''}

${outcome === 'Follow_up_Scheduled' ? 'Ich freue mich auf unser nächstes Gespräch.' : 'Bei Fragen stehe ich gerne zur Verfügung.'}

Mit freundlichen Grüßen`;
    }

    return `Hello ${prospectName},

Thank you for our conversation today.

Summary of what we discussed:
${completedMilestones.map((m) => `- ${m}`).join('\n')}

${deferredObjections.length > 0 ? `Open points we'll address:\n${deferredObjections.map((o) => `- ${o}`).join('\n')}` : ''}

${outcome === 'Follow_up_Scheduled' ? 'Looking forward to our next conversation.' : 'Please don\'t hesitate to reach out with any questions.'}

Best regards`;
  }

  /**
   * Map Prisma model to domain type
   */
  private mapToAIAnalysis(a: {
    id: string;
    callSessionId: string;
    summary: string | null;
    objectionClassification: unknown;
    decisionReadinessScore: unknown;
    riskFlags: unknown;
    agentExecutionFeedback: string | null;
    slideEffectivenessSignals: unknown;
    followUpEmailDraft: string | null;
    evidenceMarkers: unknown;
    createdAt: Date;
  }): AIAnalysis {
    return {
      id: a.id,
      callSessionId: a.callSessionId,
      summary: a.summary,
      objectionClassification:
        a.objectionClassification as ObjectionClassification[] | null,
      decisionReadinessScore: a.decisionReadinessScore
        ? Number(a.decisionReadinessScore)
        : null,
      riskFlags: a.riskFlags as RiskFlag[] | null,
      agentExecutionFeedback: a.agentExecutionFeedback,
      slideEffectivenessSignals:
        a.slideEffectivenessSignals as SlideEffectivenessSignal[] | null,
      followUpEmailDraft: a.followUpEmailDraft,
      evidenceMarkers: a.evidenceMarkers as EvidenceMarker[] | null,
      createdAt: a.createdAt,
    };
  }

  private mapToPromptConfig(p: {
    id: string;
    organizationId: string;
    scope: string;
    milestoneId: string | null;
    objectionId: string | null;
    language: string;
    promptText: string;
    variables: unknown;
    version: string;
    status: string;
    createdAt: Date;
  }): PromptConfig {
    return {
      id: p.id,
      organizationId: p.organizationId,
      scope: p.scope as PromptScope,
      milestoneId: p.milestoneId,
      objectionId: p.objectionId,
      language: p.language as Language,
      promptText: p.promptText,
      variables: p.variables as PromptConfig['variables'],
      version: p.version,
      status: p.status as 'draft' | 'active' | 'deprecated',
      createdAt: p.createdAt,
    };
  }
}

export const aiService = new AIService();
