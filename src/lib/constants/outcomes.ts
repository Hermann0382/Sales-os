/**
 * Outcome Constants
 * Single source of truth for call outcome types, labels, and styling
 */

/**
 * All possible outcome types (matches Prisma enum)
 */
export const OUTCOME_TYPES = [
  'Coaching_Client',
  'Follow_up_Scheduled',
  'Implementation_Only',
  'Disqualified',
] as const;

export type OutcomeType = (typeof OUTCOME_TYPES)[number];

/**
 * Human-readable labels for outcome types
 */
export const OUTCOME_LABELS: Record<OutcomeType, string> = {
  Coaching_Client: 'Coaching Client',
  Follow_up_Scheduled: 'Follow-up Scheduled',
  Implementation_Only: 'Implementation Only',
  Disqualified: 'Disqualified',
};

/**
 * CSS classes for outcome badges/pills
 */
export const OUTCOME_BADGE_CLASSES: Record<OutcomeType, string> = {
  Coaching_Client: 'bg-success text-white',
  Follow_up_Scheduled: 'bg-primary text-white',
  Implementation_Only: 'bg-secondary text-white',
  Disqualified: 'bg-muted-foreground text-white',
};

/**
 * CSS classes for outcome text color
 */
export const OUTCOME_TEXT_CLASSES: Record<OutcomeType, string> = {
  Coaching_Client: 'text-success',
  Follow_up_Scheduled: 'text-primary',
  Implementation_Only: 'text-secondary',
  Disqualified: 'text-muted-foreground',
};

/**
 * Convert snake_case outcome to PascalCase (for API responses)
 */
export const OUTCOME_API_MAP: Record<string, OutcomeType> = {
  coaching_client: 'Coaching_Client',
  follow_up_scheduled: 'Follow_up_Scheduled',
  implementation_only: 'Implementation_Only',
  disqualified: 'Disqualified',
};

/**
 * Convert PascalCase outcome to snake_case (for UI)
 */
export const OUTCOME_UI_MAP: Record<OutcomeType, string> = {
  Coaching_Client: 'coaching_client',
  Follow_up_Scheduled: 'follow_up_scheduled',
  Implementation_Only: 'implementation_only',
  Disqualified: 'disqualified',
};

/**
 * Get display label for an outcome
 */
export function getOutcomeLabel(outcome: string): string {
  const normalized = OUTCOME_API_MAP[outcome] || (outcome as OutcomeType);
  return OUTCOME_LABELS[normalized] || outcome;
}

/**
 * Get badge classes for an outcome
 */
export function getOutcomeBadgeClasses(outcome: string): string {
  const normalized = OUTCOME_API_MAP[outcome] || (outcome as OutcomeType);
  return OUTCOME_BADGE_CLASSES[normalized] || 'bg-muted text-muted-foreground';
}

/**
 * Check if outcome is positive (not disqualified)
 */
export function isPositiveOutcome(outcome: string): boolean {
  const normalized = OUTCOME_API_MAP[outcome] || outcome;
  return normalized !== 'Disqualified';
}
