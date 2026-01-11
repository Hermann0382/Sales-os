/**
 * AI Analysis Service
 * Orchestrates post-call AI analysis pipeline
 */

import { prisma } from '@/lib/db';
import {
  SUMMARY_SYSTEM_PROMPT,
  buildSummaryPrompt,
  parseSummaryResponse,
  validateSummaryContent,
} from './prompts/summary-prompt';
import {
  RISK_DETECTION_SYSTEM_PROMPT,
  buildRiskDetectionPrompt,
  parseRiskDetectionResponse,
  calculateRiskScore,
} from './prompts/risk-detection-prompt';
import {
  FEEDBACK_SYSTEM_PROMPT,
  buildFeedbackPrompt,
  parseFeedbackResponse,
  calculateExecutionScore,
} from './prompts/feedback-prompt';
import {
  EMAIL_SYSTEM_PROMPT,
  buildEmailPrompt,
  parseEmailResponse,
  validateEmailContent,
  generateEmailTemplate,
} from './prompts/email-prompt';
import type {
  AIAnalysisResult,
  GenerateAnalysisInput,
  GenerateAnalysisResult,
  RiskFlag,
  ObjectionClassification,
  SlideEffectivenessSignal,
  EvidenceMarker,
  LLMConfig,
} from './types';

/**
 * Default LLM configuration
 */
const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: 'anthropic',
  model: 'claude-3-haiku-20240307',
  maxTokens: 2000,
  temperature: 0.3,
};

/**
 * AI Analysis Service
 * Handles post-call analysis generation and storage
 */
class AIAnalysisService {
  private config: LLMConfig;

  constructor(config?: Partial<LLMConfig>) {
    this.config = { ...DEFAULT_LLM_CONFIG, ...config };
  }

  /**
   * Generate complete AI analysis for a call
   * @param organizationId - Organization ID for tenant isolation
   * @param input - Analysis input data
   */
  async generateAnalysis(
    organizationId: string,
    input: GenerateAnalysisInput
  ): Promise<GenerateAnalysisResult> {
    try {
      // Verify call exists and belongs to organization
      const callSession = await prisma.callSession.findFirst({
        where: {
          id: input.callSessionId,
          organizationId,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!callSession) {
        return {
          success: false,
          error: 'Call session not found',
        };
      }

      // Run analysis pipeline in parallel where possible
      const [summaryResult, riskResult] = await Promise.all([
        this.generateSummary({
          prospectName: input.prospectName,
          clientCount: input.clientCount,
          durationMinutes: Math.round(input.duration / 60),
          milestonesCompleted: input.milestonesCompleted,
          milestonesSkipped: input.milestonesSkipped,
          transcript: input.transcriptText,
          language: input.language,
        }),
        this.detectRisks({
          transcript: input.transcriptText,
          segments: input.transcriptSegments,
          language: input.language,
        }),
      ]);

      // Generate feedback based on risks
      const feedbackResult = await this.generateFeedback({
        transcript: input.transcriptText,
        milestonesCompleted: input.milestonesCompleted,
        milestonesSkipped: input.milestonesSkipped,
        objections: input.objectionsRaised,
        riskFlags: riskResult,
        language: input.language,
      });

      // Generate email if outcome is positive
      let emailDraft: string | undefined;
      if (
        input.outcome &&
        input.outcome.type !== 'Disqualified' &&
        summaryResult
      ) {
        const emailResult = await this.generateEmail({
          prospectName: input.prospectName,
          agentName: 'Agent', // Would be passed from call session
          summary: summaryResult,
          keyPoints: this.extractKeyPoints(summaryResult),
          nextSteps: this.extractNextSteps(summaryResult),
          outcome: input.outcome.type,
          language: input.language,
        });
        emailDraft = emailResult ?? undefined;
      }

      // Classify objections
      const objectionClassification = this.classifyObjections(input.objectionsRaised);

      // Calculate decision readiness score
      const decisionReadinessScore = this.calculateDecisionReadiness(
        input.milestonesCompleted.length,
        input.milestonesCompleted.length + input.milestonesSkipped.length,
        objectionClassification,
        riskResult
      );

      // Build evidence markers
      const evidenceMarkers = this.buildEvidenceMarkers(
        input.transcriptSegments || [],
        riskResult
      );

      const analysis: AIAnalysisResult = {
        callSessionId: input.callSessionId,
        summary: summaryResult || 'Summary generation failed',
        objectionClassification,
        decisionReadinessScore,
        riskFlags: riskResult,
        agentExecutionFeedback: feedbackResult || 'Feedback generation failed',
        slideEffectivenessSignals: [], // TODO: Implement slide analysis
        followUpEmailDraft: emailDraft,
        evidenceMarkers,
        generatedAt: new Date(),
      };

      // Store analysis in database
      await this.storeAnalysis(input.callSessionId, analysis);

      return {
        success: true,
        analysis,
      };
    } catch (error) {
      console.error('AI analysis generation failed:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Analysis generation failed',
      };
    }
  }

  /**
   * Generate call summary
   */
  private async generateSummary(input: {
    prospectName: string;
    clientCount?: number;
    durationMinutes: number;
    milestonesCompleted: string[];
    milestonesSkipped: string[];
    transcript: string;
    language: 'EN' | 'DE';
  }): Promise<string | null> {
    try {
      const prompt = buildSummaryPrompt(input);
      const response = await this.callLLM(SUMMARY_SYSTEM_PROMPT, prompt);

      if (!response) {
        return null;
      }

      const summary = parseSummaryResponse(response);

      // Validate content
      const validation = validateSummaryContent(summary);
      if (!validation.isValid) {
        console.warn('Summary validation issues:', validation.issues);
        // Still return the summary, but could regenerate if needed
      }

      return summary;
    } catch (error) {
      console.error('Summary generation failed:', error);
      return null;
    }
  }

  /**
   * Detect risks in transcript
   */
  private async detectRisks(input: {
    transcript: string;
    segments?: Array<{ id: string; text: string; startTime: number }>;
    language: 'EN' | 'DE';
  }): Promise<RiskFlag[]> {
    try {
      const prompt = buildRiskDetectionPrompt(input);
      const response = await this.callLLM(RISK_DETECTION_SYSTEM_PROMPT, prompt);

      if (!response) {
        return [];
      }

      return parseRiskDetectionResponse(response, input.segments);
    } catch (error) {
      console.error('Risk detection failed:', error);
      return [];
    }
  }

  /**
   * Generate agent feedback
   */
  private async generateFeedback(input: {
    transcript: string;
    milestonesCompleted: string[];
    milestonesSkipped: string[];
    objections: Array<{ type: string; outcome: string }>;
    riskFlags: RiskFlag[];
    language: 'EN' | 'DE';
  }): Promise<string | null> {
    try {
      const prompt = buildFeedbackPrompt(input);
      const response = await this.callLLM(FEEDBACK_SYSTEM_PROMPT, prompt);

      if (!response) {
        return null;
      }

      return parseFeedbackResponse(response);
    } catch (error) {
      console.error('Feedback generation failed:', error);
      return null;
    }
  }

  /**
   * Generate follow-up email
   */
  private async generateEmail(input: {
    prospectName: string;
    agentName: string;
    summary: string;
    keyPoints: string[];
    nextSteps: string[];
    outcome?: string;
    language: 'EN' | 'DE';
  }): Promise<string | null> {
    try {
      // Use template for simple cases
      if (input.keyPoints.length === 0 && input.nextSteps.length === 0) {
        const template = generateEmailTemplate(input);
        return `Subject: ${template.subject}\n\n${template.body}`;
      }

      const prompt = buildEmailPrompt(input);
      const response = await this.callLLM(EMAIL_SYSTEM_PROMPT, prompt);

      if (!response) {
        // Fallback to template
        const template = generateEmailTemplate(input);
        return `Subject: ${template.subject}\n\n${template.body}`;
      }

      const { subject, body } = parseEmailResponse(response);

      // Validate content
      const validation = validateEmailContent(body);
      if (!validation.isValid) {
        console.warn('Email validation issues:', validation.issues);
      }

      return `Subject: ${subject}\n\n${body}`;
    } catch (error) {
      console.error('Email generation failed:', error);
      return null;
    }
  }

  /**
   * Call LLM with prompt
   * Placeholder for actual API integration
   */
  private async callLLM(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string | null> {
    // In production, this would call Anthropic or OpenAI API
    // For now, return null to indicate LLM not configured

    const apiKey =
      this.config.provider === 'anthropic'
        ? process.env.ANTHROPIC_API_KEY
        : process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.warn(`${this.config.provider} API key not configured`);
      return null;
    }

    // TODO: Implement actual API call
    // For now, log the call and return null
    console.log('LLM call:', {
      provider: this.config.provider,
      model: this.config.model,
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
    });

    return null;
  }

  /**
   * Classify objections based on outcomes
   */
  private classifyObjections(
    objections: Array<{ type: string; outcome: string }>
  ): ObjectionClassification[] {
    return objections.map((obj) => ({
      type: obj.type,
      addressed: obj.outcome === 'Resolved',
      resolutionApproach: obj.outcome === 'Resolved' ? 'Addressed during call' : undefined,
      effectivenessScore: obj.outcome === 'Resolved' ? 0.8 : 0.3,
    }));
  }

  /**
   * Calculate decision readiness score
   */
  private calculateDecisionReadiness(
    milestonesCompleted: number,
    totalMilestones: number,
    objections: ObjectionClassification[],
    risks: RiskFlag[]
  ): number {
    let score = 0.5; // Base score

    // Milestone completion contributes up to 0.3
    if (totalMilestones > 0) {
      score += (milestonesCompleted / totalMilestones) * 0.3;
    }

    // Objection resolution contributes up to 0.2
    if (objections.length > 0) {
      const resolved = objections.filter((o) => o.addressed).length;
      score += (resolved / objections.length) * 0.2;
    }

    // Risks reduce score
    const riskScore = calculateRiskScore(risks);
    score -= (riskScore.score / 100) * 0.3;

    // Ensure bounds
    return Math.max(0, Math.min(1, Number(score.toFixed(2))));
  }

  /**
   * Extract key points from summary
   */
  private extractKeyPoints(summary: string): string[] {
    // Simple extraction - look for bullet points or numbered items
    const lines = summary.split('\n');
    const keyPoints: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.match(/^[-•*]\s+/) || trimmed.match(/^\d+[.)]\s+/)) {
        const point = trimmed.replace(/^[-•*\d.)\s]+/, '').trim();
        if (point.length > 10 && point.length < 200) {
          keyPoints.push(point);
        }
      }
    }

    return keyPoints.slice(0, 5); // Max 5 key points
  }

  /**
   * Extract next steps from summary
   */
  private extractNextSteps(summary: string): string[] {
    // Look for "next steps" section
    const nextStepsMatch = summary.match(
      /next steps?:?\s*([\s\S]*?)(?:\n\n|$)/i
    );

    if (!nextStepsMatch) {
      return [];
    }

    const nextStepsSection = nextStepsMatch[1];
    return this.extractKeyPoints(nextStepsSection);
  }

  /**
   * Build evidence markers linking analysis to transcript
   */
  private buildEvidenceMarkers(
    segments: Array<{
      id: string;
      speaker: string;
      text: string;
      startTime: number;
      endTime: number;
    }>,
    risks: RiskFlag[]
  ): EvidenceMarker[] {
    const markers: EvidenceMarker[] = [];

    // Add markers for risk evidence
    for (const risk of risks) {
      if (risk.evidence && risk.transcriptTimestamp !== undefined) {
        // Find the matching segment
        const segment = segments.find(
          (s) =>
            s.startTime <= risk.transcriptTimestamp! &&
            s.endTime >= risk.transcriptTimestamp!
        );

        if (segment) {
          markers.push({
            type: 'risk',
            referenceId: risk.type,
            segmentId: segment.id,
            startTime: segment.startTime,
            endTime: segment.endTime,
            quote: risk.evidence.substring(0, 100),
          });
        }
      }
    }

    return markers;
  }

  /**
   * Store analysis in database
   */
  private async storeAnalysis(
    callSessionId: string,
    analysis: AIAnalysisResult
  ): Promise<void> {
    await prisma.aIAnalysis.upsert({
      where: { callSessionId },
      create: {
        callSessionId,
        summary: analysis.summary,
        objectionClassification: analysis.objectionClassification as unknown as object,
        decisionReadinessScore: analysis.decisionReadinessScore,
        riskFlags: analysis.riskFlags as unknown as object,
        agentExecutionFeedback: analysis.agentExecutionFeedback,
        slideEffectivenessSignals: analysis.slideEffectivenessSignals as unknown as object,
        followUpEmailDraft: analysis.followUpEmailDraft,
        evidenceMarkers: analysis.evidenceMarkers as unknown as object,
      },
      update: {
        summary: analysis.summary,
        objectionClassification: analysis.objectionClassification as unknown as object,
        decisionReadinessScore: analysis.decisionReadinessScore,
        riskFlags: analysis.riskFlags as unknown as object,
        agentExecutionFeedback: analysis.agentExecutionFeedback,
        slideEffectivenessSignals: analysis.slideEffectivenessSignals as unknown as object,
        followUpEmailDraft: analysis.followUpEmailDraft,
        evidenceMarkers: analysis.evidenceMarkers as unknown as object,
      },
    });
  }

  /**
   * Get analysis for a call
   */
  async getAnalysis(
    organizationId: string,
    callSessionId: string
  ): Promise<AIAnalysisResult | null> {
    const call = await prisma.callSession.findFirst({
      where: {
        id: callSessionId,
        organizationId,
      },
      include: {
        aiAnalysis: true,
      },
    });

    if (!call || !call.aiAnalysis) {
      return null;
    }

    const ai = call.aiAnalysis;

    return {
      callSessionId,
      summary: ai.summary || '',
      objectionClassification: (ai.objectionClassification as unknown as ObjectionClassification[]) || [],
      decisionReadinessScore: Number(ai.decisionReadinessScore) || 0,
      riskFlags: (ai.riskFlags as unknown as RiskFlag[]) || [],
      agentExecutionFeedback: ai.agentExecutionFeedback || '',
      slideEffectivenessSignals: (ai.slideEffectivenessSignals as unknown as SlideEffectivenessSignal[]) || [],
      followUpEmailDraft: ai.followUpEmailDraft || undefined,
      evidenceMarkers: (ai.evidenceMarkers as unknown as EvidenceMarker[]) || [],
      generatedAt: ai.createdAt,
    };
  }

  /**
   * Regenerate analysis for a call
   */
  async regenerateAnalysis(
    organizationId: string,
    callSessionId: string
  ): Promise<GenerateAnalysisResult> {
    // Delete existing analysis
    await prisma.aIAnalysis.deleteMany({
      where: { callSessionId },
    });

    // Fetch call data and regenerate
    const call = await prisma.callSession.findFirst({
      where: {
        id: callSessionId,
        organizationId,
      },
      include: {
        prospect: true,
        milestoneResponses: {
          include: { milestone: true },
        },
        objectionResponses: {
          include: { objection: true },
        },
        callOutcome: true,
      },
    });

    if (!call) {
      return { success: false, error: 'Call not found' };
    }

    // Would need transcript - this is a placeholder
    return {
      success: false,
      error: 'Regeneration requires transcript data',
    };
  }
}

/**
 * Singleton instance of the AI analysis service
 */
export const aiAnalysisService = new AIAnalysisService();
