---
id: ARCH-007
status: open
priority: P3
category: architecture
agent: architecture-strategist
file: src/components/dashboard/manager/*.tsx
line: N/A
created: 2026-01-11T11:30:00Z
---

# Duplicated Outcome Color/Label Mappings

## Context

Found during Sprint 3 Phase 3 review by architecture-strategist agent.

## Problem

Outcome color and label mappings are duplicated across:
- `calls-table.tsx` (lines 41-53)
- `call-summary.tsx` (lines 38-50)
- `app/api/analytics/calls/[callId]/route.ts` (lines 164-169)

The same mapping logic exists in 3 places.

## Proposed Solution

Create shared constants:

```typescript
// src/lib/constants/outcomes.ts
export const OUTCOME_TYPES = [
  'coaching_client',
  'follow_up_scheduled',
  'implementation_only',
  'disqualified',
] as const;

export const OUTCOME_LABELS: Record<string, string> = {
  coaching_client: 'Coaching Client',
  follow_up_scheduled: 'Follow-up Scheduled',
  implementation_only: 'Implementation Only',
  disqualified: 'Disqualified',
};

export const OUTCOME_COLORS: Record<string, string> = {
  coaching_client: 'bg-success text-white',
  follow_up_scheduled: 'bg-primary text-white',
  implementation_only: 'bg-secondary text-white',
  disqualified: 'bg-muted-foreground text-white',
};
```

## Acceptance Criteria

- [ ] Shared constants file created
- [ ] All components use shared constants
- [ ] API routes use shared constants
- [ ] Single source of truth for outcome display
