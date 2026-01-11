/**
 * CallOS Services
 * Central export for all business logic services
 */

// Core call services
export { callService, CallService } from './call-service';
export { milestoneService, MilestoneService } from './milestone-service';
export { objectionService, ObjectionService } from './objection-service';
export { checklistService, ChecklistService } from './checklist-service';

// Objection flow services (Sprint 2)
export {
  objectionFlowService,
  ObjectionFlowService,
  type ObjectionType,
  type ObjectionOutcome,
  type ObjectionFlowState,
  type ObjectionFlowDefinition,
  type DiagnosticStep,
} from './objection-flow-service';

export {
  objectionResponseService,
  ObjectionResponseService,
  type CreateObjectionResponseInput,
  type ObjectionResponseData,
} from './objection-response-service';

export {
  callOutcomeService,
  CallOutcomeService,
  type CallOutcomeType,
  type DisqualificationReason,
  type QualificationFlags,
  type CreateCallOutcomeInput,
  type CallOutcomeData,
} from './call-outcome-service';

export {
  qualificationService,
  QualificationService,
  QUALIFICATION_THRESHOLD,
  ADVISORY_MODE_SKIPPED_MILESTONES,
  ADVISORY_MODE_ALLOWED_OUTCOMES,
  STANDARD_MODE_ALLOWED_OUTCOMES,
  type QualificationStatus,
  type MilestoneAvailability,
} from './qualification-service';

// External integrations
export { aiService, AIService } from './ai-service';
export { zoomService, ZoomService } from './zoom-service';
export { ghlService, GHLService } from './ghl-service';
