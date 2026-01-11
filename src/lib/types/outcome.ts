/**
 * Call outcome types
 * ENT-015: CallOutcome - Final call outcome classification
 */

import { BaseEntity } from './common';

// Call outcome type
export type CallOutcomeType =
  | 'Coaching_Client'
  | 'Follow_up_Scheduled'
  | 'Implementation_Only'
  | 'Disqualified';

// Disqualification reason
export type DisqualificationReason =
  | 'Under_500_Clients'
  | 'Cashflow_Mismatch'
  | 'Misaligned_Expectations'
  | 'Capacity_Constraint'
  | 'Authority_Issue';

// Qualification flags
export interface QualificationFlags {
  clientCountMet: boolean; // >= 500
  financialCapacity: boolean;
  strategicAlignment: boolean;
  willingsToChange: boolean;
  timeCapacity: boolean;
  notLookingForLeads: boolean;
}

// Call outcome (ENT-015)
export interface CallOutcome extends BaseEntity {
  callSessionId: string;
  outcomeType: CallOutcomeType;
  disqualificationReason: DisqualificationReason | null;
  qualificationFlags: QualificationFlags | null;
}

export interface CreateCallOutcomeInput {
  callSessionId: string;
  outcomeType: CallOutcomeType;
  disqualificationReason?: DisqualificationReason;
  qualificationFlags?: QualificationFlags;
}

export interface UpdateCallOutcomeInput {
  outcomeType?: CallOutcomeType;
  disqualificationReason?: DisqualificationReason;
  qualificationFlags?: QualificationFlags;
}

// Outcome display helpers
export function getOutcomeLabel(type: CallOutcomeType): string {
  const labels: Record<CallOutcomeType, string> = {
    Coaching_Client: 'Coaching Client',
    Follow_up_Scheduled: 'Follow-up Scheduled',
    Implementation_Only: 'Implementation Only',
    Disqualified: 'Disqualified',
  };
  return labels[type];
}

export function getDisqualificationLabel(reason: DisqualificationReason): string {
  const labels: Record<DisqualificationReason, string> = {
    Under_500_Clients: 'Under 500 Clients',
    Cashflow_Mismatch: 'Cashflow Mismatch',
    Misaligned_Expectations: 'Misaligned Expectations',
    Capacity_Constraint: 'Capacity Constraint',
    Authority_Issue: 'Authority Issue',
  };
  return labels[reason];
}

// Check if outcome requires disqualification reason
export function requiresDisqualificationReason(type: CallOutcomeType): boolean {
  return type === 'Disqualified';
}

// Outcome colors for UI
export function getOutcomeColor(type: CallOutcomeType): string {
  const colors: Record<CallOutcomeType, string> = {
    Coaching_Client: 'success',
    Follow_up_Scheduled: 'warning',
    Implementation_Only: 'primary',
    Disqualified: 'destructive',
  };
  return colors[type];
}
