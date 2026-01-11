/**
 * Call Session State Machine
 * Manages valid state transitions for call sessions
 *
 * State Diagram:
 * scheduled --> in_progress --> completed
 *     |              |
 *     v              v
 *  cancelled      cancelled
 */

import { CallStatus } from '@/lib/types';

export type CallStatusTransition = {
  from: CallStatus;
  to: CallStatus;
  requiresChecklist?: boolean;
  autoSetTimestamp?: 'startedAt' | 'endedAt';
};

/**
 * Valid state transitions for call sessions
 */
export const VALID_TRANSITIONS: CallStatusTransition[] = [
  {
    from: 'scheduled',
    to: 'in_progress',
    requiresChecklist: true,
    autoSetTimestamp: 'startedAt',
  },
  {
    from: 'scheduled',
    to: 'cancelled',
    autoSetTimestamp: 'endedAt',
  },
  {
    from: 'in_progress',
    to: 'completed',
    autoSetTimestamp: 'endedAt',
  },
  {
    from: 'in_progress',
    to: 'cancelled',
    autoSetTimestamp: 'endedAt',
  },
];

/**
 * Check if a state transition is valid
 */
export function isValidTransition(from: CallStatus, to: CallStatus): boolean {
  return VALID_TRANSITIONS.some(
    (transition) => transition.from === from && transition.to === to
  );
}

/**
 * Get transition details if valid
 */
export function getTransition(
  from: CallStatus,
  to: CallStatus
): CallStatusTransition | null {
  return (
    VALID_TRANSITIONS.find(
      (transition) => transition.from === from && transition.to === to
    ) ?? null
  );
}

/**
 * Get all valid next states from current state
 */
export function getValidNextStates(currentStatus: CallStatus): CallStatus[] {
  return VALID_TRANSITIONS.filter(
    (transition) => transition.from === currentStatus
  ).map((transition) => transition.to);
}

/**
 * Check if call can be started (requires checklist completion)
 */
export function canStartCall(currentStatus: CallStatus): boolean {
  return currentStatus === 'scheduled';
}

/**
 * Check if call can be completed
 */
export function canCompleteCall(currentStatus: CallStatus): boolean {
  return currentStatus === 'in_progress';
}

/**
 * Check if call can be cancelled
 */
export function canCancelCall(currentStatus: CallStatus): boolean {
  return currentStatus === 'scheduled' || currentStatus === 'in_progress';
}

/**
 * State machine error types
 */
export class InvalidStateTransitionError extends Error {
  constructor(from: CallStatus, to: CallStatus) {
    super(`Invalid state transition from '${from}' to '${to}'`);
    this.name = 'InvalidStateTransitionError';
  }
}

export class ChecklistNotCompleteError extends Error {
  constructor() {
    super('Pre-call checklist must be completed before starting the call');
    this.name = 'ChecklistNotCompleteError';
  }
}

export class QualificationGateError extends Error {
  constructor(clientCount: number) {
    super(
      `Prospect does not meet qualification gate. Required: 500+ clients, Current: ${clientCount}`
    );
    this.name = 'QualificationGateError';
  }
}
