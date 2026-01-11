/**
 * Milestone domain types
 * ENT-004: Call phase definition (M1-M7)
 * ENT-007: Milestone responses during calls
 */

import { BaseEntity } from './common';

// Milestone definition (ENT-004)
export interface Milestone extends BaseEntity {
  organizationId: string;
  milestoneNumber: number;
  title: string;
  objective: string;
  requiredQuestions: RequiredQuestion[] | null;
  confirmations: Confirmation[] | null;
  estimatedDurationMinutes: number | null;
  orderIndex: number;
}

export interface RequiredQuestion {
  id: string;
  question: string;
  fieldType: 'text' | 'number' | 'select' | 'multiselect' | 'checkbox';
  required: boolean;
  options?: string[];
}

export interface Confirmation {
  id: string;
  label: string;
  required: boolean;
}

export interface CreateMilestoneInput {
  organizationId: string;
  milestoneNumber: number;
  title: string;
  objective: string;
  requiredQuestions?: RequiredQuestion[];
  confirmations?: Confirmation[];
  estimatedDurationMinutes?: number;
  orderIndex: number;
}

export interface UpdateMilestoneInput {
  title?: string;
  objective?: string;
  requiredQuestions?: RequiredQuestion[];
  confirmations?: Confirmation[];
  estimatedDurationMinutes?: number;
  orderIndex?: number;
}

// Milestone response status
export type MilestoneResponseStatus = 'in_progress' | 'completed' | 'skipped';

// Milestone response (ENT-007)
export interface MilestoneResponse extends BaseEntity {
  callSessionId: string;
  milestoneId: string;
  status: MilestoneResponseStatus;
  requiredItemsChecked: Record<string, boolean | string | number> | null;
  notes: string | null;
  overrideReason: string | null;
  startedAt: Date;
  completedAt: Date | null;
}

export interface CreateMilestoneResponseInput {
  callSessionId: string;
  milestoneId: string;
}

export interface UpdateMilestoneResponseInput {
  status?: MilestoneResponseStatus;
  requiredItemsChecked?: Record<string, boolean | string | number>;
  notes?: string;
  overrideReason?: string;
  completedAt?: Date;
}

// Milestone progress for UI
export interface MilestoneProgress {
  milestoneId: string;
  milestoneNumber: number;
  title: string;
  status: MilestoneResponseStatus;
  progress: number; // 0-100
  isActive: boolean;
  canProceed: boolean;
  requiredItemsComplete: number;
  requiredItemsTotal: number;
}

// Default milestone structure
export const DEFAULT_MILESTONES: Omit<Milestone, 'id' | 'createdAt' | 'organizationId'>[] = [
  {
    milestoneNumber: 1,
    title: 'M1 Context & Frame',
    objective: 'Establish shared understanding of call scope and diagnostic intent',
    estimatedDurationMinutes: 5,
    orderIndex: 1,
    requiredQuestions: [
      { id: 'reason_for_call', question: 'Reason for call', fieldType: 'text', required: true },
    ],
    confirmations: [
      { id: 'expectation_confirmed', label: 'Confirmed expectation', required: true },
    ],
  },
  {
    milestoneNumber: 2,
    title: 'M2 Current State Mapping',
    objective: 'Map prospect\'s operational reality and expose fragility without judgment',
    estimatedDurationMinutes: 20,
    orderIndex: 2,
    requiredQuestions: [
      { id: 'client_count', question: 'Client count', fieldType: 'number', required: true },
      { id: 'revenue_volatility', question: 'Revenue volatility (1-5)', fieldType: 'select', required: true, options: ['1', '2', '3', '4', '5'] },
      { id: 'main_pain', question: 'Main pain', fieldType: 'multiselect', required: true, options: ['Storno', 'Chaos', 'Instability'] },
    ],
    confirmations: null,
  },
  {
    milestoneNumber: 3,
    title: 'M3 Outcome Vision',
    objective: 'Capture prospect\'s desired future state',
    estimatedDurationMinutes: 15,
    orderIndex: 3,
    requiredQuestions: [
      { id: 'desired_outcome', question: 'Desired outcome', fieldType: 'text', required: true },
      { id: 'cost_of_inaction', question: 'Cost of inaction', fieldType: 'text', required: true },
    ],
    confirmations: null,
  },
  {
    milestoneNumber: 4,
    title: 'M4 System Reality Check',
    objective: 'Reveal hidden cost of manual implementation',
    estimatedDurationMinutes: 10,
    orderIndex: 4,
    requiredQuestions: null,
    confirmations: [
      { id: 'understands_effort', label: 'Understands implementation effort', required: true },
      { id: 'acknowledges_workload', label: 'Acknowledges manual workload risk', required: true },
    ],
  },
  {
    milestoneNumber: 5,
    title: 'M5 Solution Mapping',
    objective: 'Present system leverage vs manual execution',
    estimatedDurationMinutes: 15,
    orderIndex: 5,
    requiredQuestions: null,
    confirmations: [
      { id: 'sees_leverage', label: 'Sees system leverage', required: true },
      { id: 'understands_scope', label: 'Understands scope', required: true },
    ],
  },
  {
    milestoneNumber: 6,
    title: 'M6 Offer Presentation',
    objective: 'Present coaching infrastructure investment with structural framing',
    estimatedDurationMinutes: 10,
    orderIndex: 6,
    requiredQuestions: [
      { id: 'payment_plan', question: 'Payment plan selected', fieldType: 'select', required: false, options: ['Full', '3-Month', '6-Month'] },
    ],
    confirmations: null,
  },
  {
    milestoneNumber: 7,
    title: 'M7 Decision Point',
    objective: 'Request explicit decision with forced choice',
    estimatedDurationMinutes: 5,
    orderIndex: 7,
    requiredQuestions: null,
    confirmations: null,
  },
];
