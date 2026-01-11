/**
 * Objection domain types
 * ENT-008: Objection type definition (6 types)
 * ENT-009: Objection response during call
 */

import { BaseEntity } from './common';

// Objection types
export type ObjectionType =
  | 'Price'
  | 'Timing'
  | 'Capacity_Time'
  | 'Need_to_Think'
  | 'Partner_Team'
  | 'Skepticism';

// Objection outcome
export type ObjectionOutcome = 'Resolved' | 'Deferred' | 'Disqualified';

// Diagnostic question structure
export interface DiagnosticQuestion {
  id: string;
  step: number;
  question: string;
  guidance?: string;
  nextStepConditions?: {
    value: string;
    nextStep: number;
  }[];
}

// Objection definition (ENT-008)
export interface Objection extends BaseEntity {
  organizationId: string;
  objectionType: ObjectionType;
  diagnosticQuestions: DiagnosticQuestion[];
  allowedOutcomes: ObjectionOutcome[];
}

export interface CreateObjectionInput {
  organizationId: string;
  objectionType: ObjectionType;
  diagnosticQuestions: DiagnosticQuestion[];
  allowedOutcomes: ObjectionOutcome[];
}

export interface UpdateObjectionInput {
  diagnosticQuestions?: DiagnosticQuestion[];
  allowedOutcomes?: ObjectionOutcome[];
}

// Objection response (ENT-009)
export interface ObjectionResponse extends BaseEntity {
  callSessionId: string;
  objectionId: string;
  milestoneId: string;
  outcome: ObjectionOutcome;
  diagnosticAnswers: Record<string, string> | null;
  notes: string | null;
}

export interface CreateObjectionResponseInput {
  callSessionId: string;
  objectionId: string;
  milestoneId: string;
  outcome: ObjectionOutcome;
  diagnosticAnswers?: Record<string, string>;
  notes?: string;
}

// Active objection state for UI
export interface ActiveObjectionState {
  objectionId: string;
  objectionType: ObjectionType;
  currentStep: number;
  totalSteps: number;
  answers: Record<string, string>;
  isComplete: boolean;
}

// Default objection configurations
export const DEFAULT_OBJECTIONS: Omit<Objection, 'id' | 'createdAt' | 'organizationId'>[] = [
  {
    objectionType: 'Price',
    diagnosticQuestions: [
      { id: 'compared_to', step: 1, question: 'Compared to what?', guidance: 'Wait for answer, do not fill silence' },
      { id: 'classify', step: 2, question: 'Classify comparison', guidance: 'Software / Coaching / Income / Fear' },
      { id: 'structural', step: 3, question: 'Structural check - 6-month payback', guidance: 'ROI anchoring question' },
    ],
    allowedOutcomes: ['Resolved', 'Deferred', 'Disqualified'],
  },
  {
    objectionType: 'Timing',
    diagnosticQuestions: [
      { id: 'what_change', step: 1, question: 'What would need to change?' },
      { id: 'constraint_type', step: 2, question: 'Identify type of constraint', guidance: 'Cash / Capacity / Emotional / Avoidance' },
      { id: 'future', step: 3, question: 'Future projection' },
      { id: 'delay_cost', step: 4, question: 'Delay cost acknowledgment' },
    ],
    allowedOutcomes: ['Resolved', 'Deferred', 'Disqualified'],
  },
  {
    objectionType: 'Capacity_Time',
    diagnosticQuestions: [
      { id: 'overload_type', step: 1, question: 'Manual overload vs project resistance?', guidance: 'Distinguish burnout from new project fear' },
      { id: 'core_fear', step: 2, question: 'Core fear identification' },
      { id: 'trajectory', step: 3, question: 'Current trajectory reality check' },
      { id: 'work_reduction', step: 4, question: 'Work reduction alignment' },
    ],
    allowedOutcomes: ['Resolved', 'Deferred', 'Disqualified'],
  },
  {
    objectionType: 'Need_to_Think',
    diagnosticQuestions: [
      { id: 'what_specifically', step: 1, question: 'What specifically do you want to think through?' },
      { id: 'isolate', step: 2, question: 'Isolate variable', guidance: 'Price / Risk / Trust / Partner / Self-doubt' },
      { id: 'containment', step: 3, question: 'Containment question', guidance: 'Route to relevant subflow if variable identified' },
    ],
    allowedOutcomes: ['Resolved', 'Deferred', 'Disqualified'],
  },
  {
    objectionType: 'Partner_Team',
    diagnosticQuestions: [
      { id: 'authority', step: 1, question: 'Authority clarification', guidance: 'Can make decision vs need permission' },
      { id: 'pre_solve', step: 2, question: 'Pre-solve anticipated concerns' },
      { id: 'equip', step: 3, question: 'Equip with explanation summary' },
    ],
    allowedOutcomes: ['Resolved', 'Deferred', 'Disqualified'],
  },
  {
    objectionType: 'Skepticism',
    diagnosticQuestions: [
      { id: 'validate', step: 1, question: 'Validate past experience', guidance: 'What didn\'t work before?' },
      { id: 'pattern', step: 2, question: 'Pattern recognition', guidance: 'Strategy vs execution issue' },
      { id: 'difference', step: 3, question: 'Structural difference articulation' },
    ],
    allowedOutcomes: ['Resolved', 'Deferred', 'Disqualified'],
  },
];

// Helper to get objection label
export function getObjectionLabel(type: ObjectionType): string {
  const labels: Record<ObjectionType, string> = {
    Price: 'Price',
    Timing: 'Timing',
    Capacity_Time: 'Capacity / Time',
    Need_to_Think: 'Need to Think',
    Partner_Team: 'Partner / Team',
    Skepticism: 'Skepticism',
  };
  return labels[type];
}
