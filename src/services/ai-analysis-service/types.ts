/**
 * AI Analysis Service Types
 * Type definitions for AI-powered post-call analysis
 */

/**
 * Risk types that can be detected in calls
 */
export enum RiskType {
  OVERPROMISE = 'overpromise',
  PRESSURE_TACTIC = 'pressure_tactic',
  MISALIGNMENT = 'misalignment',
  QUALIFICATION_BYPASS = 'qualification_bypass',
  INCOMPLETE_DISCOVERY = 'incomplete_discovery',
}

/**
 * Risk severity levels
 */
export type RiskSeverity = 'low' | 'medium' | 'high';

/**
 * Individual risk flag detected in call
 */
export interface RiskFlag {
  /** Type of risk detected */
  type: RiskType;
  /** Severity level */
  severity: RiskSeverity;
  /** Evidence text from transcript */
  evidence: string;
  /** Timestamp in transcript (seconds) */
  transcriptTimestamp?: number;
  /** Recommendation for improvement */
  recommendation: string;
}

/**
 * Objection classification from AI analysis
 */
export interface ObjectionClassification {
  /** Objection type detected */
  type: string;
  /** Whether it was properly addressed */
  addressed: boolean;
  /** Resolution approach used */
  resolutionApproach?: string;
  /** Effectiveness score (0-1) */
  effectivenessScore?: number;
}

/**
 * Slide effectiveness analysis
 */
export interface SlideEffectivenessSignal {
  /** Slide template ID */
  slideTemplateId: string;
  /** Slide title */
  slideTitle: string;
  /** Engagement indicators */
  engagementIndicators: string[];
  /** Effectiveness rating */
  rating: 'effective' | 'neutral' | 'ineffective';
  /** Specific feedback */
  feedback?: string;
}

/**
 * Evidence marker linking analysis to transcript
 */
export interface EvidenceMarker {
  /** Type of evidence */
  type: 'summary' | 'risk' | 'objection' | 'feedback';
  /** Reference to related item ID */
  referenceId?: string;
  /** Transcript segment ID */
  segmentId: string;
  /** Start time in seconds */
  startTime: number;
  /** End time in seconds */
  endTime: number;
  /** Quoted text from transcript */
  quote: string;
}

/**
 * Complete AI analysis result
 */
export interface AIAnalysisResult {
  /** Call session ID */
  callSessionId: string;
  /** Factual call summary */
  summary: string;
  /** Classified objections */
  objectionClassification: ObjectionClassification[];
  /** Decision readiness score (0-1) */
  decisionReadinessScore: number;
  /** Detected risk flags */
  riskFlags: RiskFlag[];
  /** Agent execution feedback */
  agentExecutionFeedback: string;
  /** Slide effectiveness signals */
  slideEffectivenessSignals: SlideEffectivenessSignal[];
  /** Follow-up email draft */
  followUpEmailDraft?: string;
  /** Evidence markers linking to transcript */
  evidenceMarkers: EvidenceMarker[];
  /** Analysis generation timestamp */
  generatedAt: Date;
}

/**
 * Input for AI analysis generation
 */
export interface GenerateAnalysisInput {
  /** Call session ID */
  callSessionId: string;
  /** Full transcript text */
  transcriptText: string;
  /** Transcript segments for evidence linking */
  transcriptSegments?: Array<{
    id: string;
    speaker: string;
    text: string;
    startTime: number;
    endTime: number;
  }>;
  /** Call duration in seconds */
  duration: number;
  /** Prospect name */
  prospectName: string;
  /** Client count */
  clientCount?: number;
  /** Milestones completed */
  milestonesCompleted: string[];
  /** Milestones skipped */
  milestonesSkipped: string[];
  /** Objections raised during call */
  objectionsRaised: Array<{
    type: string;
    outcome: string;
  }>;
  /** Call outcome */
  outcome?: {
    type: string;
    disqualificationReason?: string;
  };
  /** Language for analysis */
  language: 'EN' | 'DE';
}

/**
 * Result of analysis generation
 */
export interface GenerateAnalysisResult {
  success: boolean;
  analysis?: AIAnalysisResult;
  error?: string;
}

/**
 * Summary generation input
 */
export interface SummaryInput {
  /** Prospect name */
  prospectName: string;
  /** Client count */
  clientCount?: number;
  /** Call duration in minutes */
  durationMinutes: number;
  /** Milestones completed */
  milestonesCompleted: string[];
  /** Milestones skipped */
  milestonesSkipped: string[];
  /** Full transcript */
  transcript: string;
  /** Language */
  language: 'EN' | 'DE';
}

/**
 * Risk detection input
 */
export interface RiskDetectionInput {
  /** Full transcript */
  transcript: string;
  /** Transcript segments for timestamp linking */
  segments?: Array<{
    id: string;
    text: string;
    startTime: number;
  }>;
  /** Language */
  language: 'EN' | 'DE';
}

/**
 * Agent feedback input
 */
export interface FeedbackInput {
  /** Full transcript */
  transcript: string;
  /** Milestones completed */
  milestonesCompleted: string[];
  /** Milestones skipped */
  milestonesSkipped: string[];
  /** Objections and outcomes */
  objections: Array<{
    type: string;
    outcome: string;
  }>;
  /** Risk flags detected */
  riskFlags: RiskFlag[];
  /** Language */
  language: 'EN' | 'DE';
}

/**
 * Email generation input
 */
export interface EmailInput {
  /** Prospect name */
  prospectName: string;
  /** Prospect first name for greeting */
  prospectFirstName?: string;
  /** Agent name for signature */
  agentName: string;
  /** Call summary */
  summary: string;
  /** Key points discussed */
  keyPoints: string[];
  /** Agreed next steps */
  nextSteps: string[];
  /** Call outcome */
  outcome?: string;
  /** Language */
  language: 'EN' | 'DE';
}

/**
 * LLM provider configuration
 */
export interface LLMConfig {
  /** Provider name */
  provider: 'anthropic' | 'openai';
  /** Model ID */
  model: string;
  /** Max tokens for response */
  maxTokens: number;
  /** Temperature for generation */
  temperature: number;
}

/**
 * Analysis status for tracking
 */
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Analysis job for queue processing
 */
export interface AnalysisJob {
  /** Job ID */
  id: string;
  /** Call session ID */
  callSessionId: string;
  /** Organization ID */
  organizationId: string;
  /** Current status */
  status: AnalysisStatus;
  /** Number of retry attempts */
  retryCount: number;
  /** Error message if failed */
  error?: string;
  /** Created timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
}
