/**
 * AI system types
 * ENT-013: PromptConfig - AI prompt configuration
 * ENT-014: AIAnalysis - AI-generated post-call analysis
 */

import { BaseEntity, Language } from './common';

// Prompt scope
export type PromptScope =
  | 'global'
  | 'milestone'
  | 'objection'
  | 'slide_analysis'
  | 'call_synthesis';

// Prompt status
export type PromptStatus = 'draft' | 'active' | 'deprecated';

// Prompt variable definition
export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  defaultValue?: unknown;
}

// Prompt config (ENT-013)
export interface PromptConfig extends BaseEntity {
  organizationId: string;
  scope: PromptScope;
  milestoneId: string | null;
  objectionId: string | null;
  language: Language;
  promptText: string;
  variables: PromptVariable[] | null;
  version: string;
  status: PromptStatus;
}

export interface CreatePromptConfigInput {
  organizationId: string;
  scope: PromptScope;
  milestoneId?: string;
  objectionId?: string;
  language: Language;
  promptText: string;
  variables?: PromptVariable[];
  version?: string;
}

export interface UpdatePromptConfigInput {
  promptText?: string;
  variables?: PromptVariable[];
  version?: string;
  status?: PromptStatus;
}

// Risk flag for AI analysis
export interface RiskFlag {
  type: 'misalignment' | 'overpromise' | 'pressure' | 'qualification_gap' | 'objection_unresolved';
  severity: 'low' | 'medium' | 'high';
  description: string;
  evidence: string;
  timestamp?: number;
}

// Objection classification from AI
export interface ObjectionClassification {
  type: string;
  count: number;
  outcomes: Record<string, number>;
  patterns: string[];
}

// Slide effectiveness signal
export interface SlideEffectivenessSignal {
  slideId: string;
  slideName: string;
  engagementScore: number;
  objectionsTrigger: number;
  positiveSignals: string[];
  negativeSignals: string[];
}

// Evidence marker for traceability
export interface EvidenceMarker {
  claimId: string;
  claim: string;
  source: 'transcript' | 'milestone_response' | 'objection_response' | 'agent_notes';
  sourceId: string;
  timestamp?: number;
  quote?: string;
}

// AI Analysis (ENT-014)
export interface AIAnalysis extends BaseEntity {
  callSessionId: string;
  summary: string | null;
  objectionClassification: ObjectionClassification[] | null;
  decisionReadinessScore: number | null;
  riskFlags: RiskFlag[] | null;
  agentExecutionFeedback: string | null;
  slideEffectivenessSignals: SlideEffectivenessSignal[] | null;
  followUpEmailDraft: string | null;
  evidenceMarkers: EvidenceMarker[] | null;
}

export interface CreateAIAnalysisInput {
  callSessionId: string;
  summary?: string;
  objectionClassification?: ObjectionClassification[];
  decisionReadinessScore?: number;
  riskFlags?: RiskFlag[];
  agentExecutionFeedback?: string;
  slideEffectivenessSignals?: SlideEffectivenessSignal[];
  followUpEmailDraft?: string;
  evidenceMarkers?: EvidenceMarker[];
}

// AI analysis request
export interface AIAnalysisRequest {
  callSessionId: string;
  transcript?: string;
  milestoneResponses?: unknown[];
  objectionResponses?: unknown[];
  slideInstances?: unknown[];
  language: Language;
}

// AI analysis response
export interface AIAnalysisResponse {
  success: boolean;
  analysis?: AIAnalysis;
  error?: string;
  processingTimeMs?: number;
}
