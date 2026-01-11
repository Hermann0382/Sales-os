/**
 * Call domain types
 * ENT-005: CallThread - Groups primary call with follow-ups
 * ENT-006: CallSession - Individual call instance
 */

import { BaseEntity, Language } from './common';
import { MilestoneProgress } from './milestone';
import { Prospect } from './prospect';
import { User } from './user';

// Call status
export type CallStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

// Call mode (strict vs flexible milestone enforcement)
export type CallMode = 'strict' | 'flexible';

// Call thread (ENT-005)
export interface CallThread extends BaseEntity {
  organizationId: string;
  prospectId: string;
  primaryCallId: string | null;
}

export interface CallThreadWithRelations extends CallThread {
  prospect: Prospect;
  primaryCall: CallSession | null;
  callSessions: CallSession[];
}

// Call session (ENT-006)
export interface CallSession extends BaseEntity {
  organizationId: string;
  callThreadId: string;
  prospectId: string;
  agentId: string;
  status: CallStatus;
  mode: CallMode;
  language: Language;
  startedAt: Date | null;
  endedAt: Date | null;
  recordingReference: string | null;
  zoomLink: string | null;
}

export interface CallSessionWithRelations extends CallSession {
  prospect: Prospect;
  agent: User;
  callThread: CallThread;
}

export interface CreateCallSessionInput {
  organizationId: string;
  prospectId: string;
  agentId: string;
  callThreadId?: string;
  mode?: CallMode;
  language?: Language;
  zoomLink?: string;
}

export interface UpdateCallSessionInput {
  status?: CallStatus;
  mode?: CallMode;
  language?: Language;
  startedAt?: Date;
  endedAt?: Date;
  recordingReference?: string;
  zoomLink?: string;
}

// Active call state for real-time UI
export interface ActiveCallState {
  callSessionId: string;
  callThreadId: string;
  prospectId: string;
  agentId: string;
  status: CallStatus;
  mode: CallMode;
  language: Language;
  startedAt: Date | null;
  currentMilestoneId: string | null;
  milestoneProgress: MilestoneProgress[];
  activeObjectionId: string | null;
  isRecording: boolean;
  isPresentationMode: boolean;
}

// Pre-call checklist
export interface PreCallChecklist {
  qualificationFormReviewed: boolean;
  clientCountConfirmed: boolean;
  businessTypeConfirmed: boolean;
  revenueRangeNoted: boolean;
  mainPainIdentified: boolean;
  toolStackNoted: boolean;
  roiToolReady: boolean;
  timeBlockClear: boolean;
}

export function isPreCallChecklistComplete(checklist: PreCallChecklist): boolean {
  return Object.values(checklist).every(Boolean);
}

// Call duration tracking
export interface CallDuration {
  total: number; // seconds
  byMilestone: Record<string, number>; // milestoneId -> seconds
}

// Unresolved objection detail for follow-up context
export interface UnresolvedObjectionDetail {
  id: string;
  objectionType: string;
  outcome: string;
  diagnosticAnswers: Record<number, string> | null;
  notes: string | null;
  milestoneNumber: number | null;
  createdAt: Date;
}

// Call summary for follow-up context
export interface CallSummary {
  callSessionId: string;
  prospectName: string;
  agentName: string;
  date: Date;
  duration: number;
  lastCompletedMilestone: number | null;
  unresolvedObjections: string[];
  unresolvedObjectionDetails: UnresolvedObjectionDetail[];
  qualificationStatus: {
    clientCountMet: boolean;
    hasFinancialCapacity: boolean;
    hasStrategicAlignment: boolean;
  };
  notes: string | null;
}
