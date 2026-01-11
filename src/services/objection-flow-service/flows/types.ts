/**
 * Objection Flow Types - Shared types for diagnostic flows
 */

/**
 * Objection types matching Prisma enum
 */
export type ObjectionType =
  | 'Price'
  | 'Timing'
  | 'Capacity_Time'
  | 'Need_to_Think'
  | 'Partner_Team'
  | 'Skepticism';

/**
 * Outcome types matching Prisma enum
 */
export type ObjectionOutcome = 'Resolved' | 'Deferred' | 'Disqualified';

/**
 * Input types for diagnostic steps
 */
export type DiagnosticInputType = 'text' | 'select' | 'multiselect' | 'statement';

/**
 * A single diagnostic step in an objection flow
 */
export interface DiagnosticStep {
  /** Step number (1-based) */
  stepNumber: number;
  /** The question or statement to present */
  question: string;
  /** Why this question matters */
  purpose: string;
  /** Type of input expected */
  inputType: DiagnosticInputType;
  /** Options for select/multiselect types */
  options?: string[];
  /** Placeholder text for text inputs */
  placeholder?: string;
  /** Whether this is a statement to be read (no input required) */
  isStatement?: boolean;
}

/**
 * Complete flow definition for an objection type
 */
export interface ObjectionFlowDefinition {
  /** Objection type this flow handles */
  type: ObjectionType;
  /** Display name */
  displayName: string;
  /** Brief description */
  description: string;
  /** Ordered list of diagnostic steps */
  steps: DiagnosticStep[];
  /** Allowed outcomes for this objection type */
  allowedOutcomes: ObjectionOutcome[];
}

/**
 * Current state of an active objection flow
 */
export interface ObjectionFlowState {
  /** Unique flow instance ID */
  flowId: string;
  /** Objection type being handled */
  objectionType: ObjectionType;
  /** Current step number (1-based) */
  currentStep: number;
  /** Total steps in this flow */
  totalSteps: number;
  /** Answers provided at each step (keyed by step number) */
  answers: Record<number, string>;
  /** Selected outcome (null until final step) */
  outcome: ObjectionOutcome | null;
  /** Whether flow is complete */
  isComplete: boolean;
  /** Timestamp when flow started */
  startedAt: Date;
}

/**
 * Input for advancing to next step
 */
export interface AdvanceStepInput {
  /** Answer for current step */
  answer: string;
}

/**
 * Input for completing a flow with outcome
 */
export interface CompleteFlowInput {
  /** Selected outcome */
  outcome: ObjectionOutcome;
  /** Optional final notes */
  notes?: string;
}
