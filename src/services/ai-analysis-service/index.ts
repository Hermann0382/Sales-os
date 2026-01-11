/**
 * AI Analysis Service Module
 * Exports all AI analysis-related services and utilities
 */

// Main analysis service
export { aiAnalysisService } from './ai-analysis-service';

// Prompts
export {
  SUMMARY_SYSTEM_PROMPT,
  buildSummaryPrompt,
  parseSummaryResponse,
  validateSummaryContent,
} from './prompts/summary-prompt';

export {
  RISK_DETECTION_SYSTEM_PROMPT,
  buildRiskDetectionPrompt,
  parseRiskDetectionResponse,
  calculateRiskScore,
} from './prompts/risk-detection-prompt';

export {
  FEEDBACK_SYSTEM_PROMPT,
  buildFeedbackPrompt,
  parseFeedbackResponse,
  generateQuickFeedback,
  calculateExecutionScore,
} from './prompts/feedback-prompt';

export {
  EMAIL_SYSTEM_PROMPT,
  buildEmailPrompt,
  parseEmailResponse,
  validateEmailContent,
  generateEmailTemplate,
} from './prompts/email-prompt';

// Types
export { RiskType } from './types';
export type {
  RiskSeverity,
  RiskFlag,
  ObjectionClassification,
  SlideEffectivenessSignal,
  EvidenceMarker,
  AIAnalysisResult,
  GenerateAnalysisInput,
  GenerateAnalysisResult,
  SummaryInput,
  RiskDetectionInput,
  FeedbackInput,
  EmailInput,
  LLMConfig,
  AnalysisStatus,
  AnalysisJob,
} from './types';
