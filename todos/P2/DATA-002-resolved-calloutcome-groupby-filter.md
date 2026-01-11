---
id: DATA-002
status: open
priority: P2
category: data-integrity
agent: data-integrity-guardian
file: src/services/analytics-service/analytics-service.ts
line: 55-59
created: 2026-01-11T11:30:00Z
---

# CallOutcome groupBy Multi-Tenancy Filter Issue

## Context

Found during Sprint 3 Phase 3 review by data-integrity-guardian agent.

## Problem

When using `where: { callSession: where }` in a groupBy, Prisma's handling of nested filters in groupBy can be unreliable. This could potentially return outcomes from calls belonging to other organizations if the join is not properly enforced.

## Location

- File: `src/services/analytics-service/analytics-service.ts`
- Line: 55-59
- Function: `getTeamMetrics()`

## Current Code

```typescript
const outcomeStats = await prisma.callOutcome.groupBy({
  by: ['outcomeType'],
  where: { callSession: where },
  _count: { id: true },
});
```

## Proposed Solution

Fetch callSessionIds first, then filter outcomes explicitly:

```typescript
const callIds = await prisma.callSession.findMany({
  where,
  select: { id: true }
}).then(calls => calls.map(c => c.id));

const outcomeStats = await prisma.callOutcome.groupBy({
  by: ['outcomeType'],
  where: { callSessionId: { in: callIds } },
  _count: { id: true },
});
```

## Acceptance Criteria

- [ ] Outcomes are filtered by explicit callSessionId list
- [ ] Multi-tenant isolation confirmed with test
- [ ] No cross-organization data leakage
