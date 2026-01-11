---
id: PERF-003
status: open
priority: P2
category: performance
source: sprint-2-review
created: 2026-01-10T00:00:00Z
assignee: null
severity: medium
---

# Over-Fetching in getOutcomeStats - Use groupBy

## Context
Found during Sprint 2 review by performance-oracle agent.

## Problem
Fetches ALL outcome records into memory and aggregates in JavaScript. For organizations with thousands of calls, this loads all records into memory.

## Location
- File: `src/services/call-outcome-service/call-outcome-service.ts`
- Lines: 276-324

## Current Code
```typescript
async getOutcomeStats(organizationId: string, options?: {...}) {
  const outcomes = await prisma.callOutcome.findMany({ where });

  const byType = {...};
  const disqualificationReasons = {...};

  // JavaScript aggregation
  for (const outcome of outcomes) {
    byType[outcome.outcomeType] = (byType[outcome.outcomeType] || 0) + 1;
    if (outcome.disqualificationReason) {
      disqualificationReasons[outcome.disqualificationReason] =
        (disqualificationReasons[outcome.disqualificationReason] || 0) + 1;
    }
  }
}
```

## Proposed Solution
```typescript
async getOutcomeStats(
  organizationId: string,
  options?: { startDate?: Date; endDate?: Date }
): Promise<{
  total: number;
  byType: Record<CallOutcomeType, number>;
  disqualificationReasons: Record<DisqualificationReason, number>;
}> {
  const where: Prisma.CallOutcomeWhereInput = {
    callSession: { organizationId },
    ...(options?.startDate && { createdAt: { gte: options.startDate } }),
    ...(options?.endDate && { createdAt: { lte: options.endDate } }),
  };

  // Use groupBy for efficient aggregation
  const [outcomeStats, disqualStats] = await Promise.all([
    prisma.callOutcome.groupBy({
      by: ['outcomeType'],
      where,
      _count: { id: true },
    }),
    prisma.callOutcome.groupBy({
      by: ['disqualificationReason'],
      where: {
        ...where,
        disqualificationReason: { not: null },
      },
      _count: { id: true },
    }),
  ]);

  // Initialize with zeros
  const byType: Record<string, number> = {
    Coaching_Client: 0,
    Follow_up_Scheduled: 0,
    Implementation_Only: 0,
    Disqualified: 0,
  };

  const disqualificationReasons: Record<string, number> = {
    Under_500_Clients: 0,
    Cashflow_Mismatch: 0,
    Misaligned_Expectations: 0,
    Capacity_Constraint: 0,
    Authority_Issue: 0,
  };

  // Map results
  for (const stat of outcomeStats) {
    byType[stat.outcomeType] = stat._count.id;
  }
  for (const stat of disqualStats) {
    if (stat.disqualificationReason) {
      disqualificationReasons[stat.disqualificationReason] = stat._count.id;
    }
  }

  const total = outcomeStats.reduce((sum, s) => sum + s._count.id, 0);

  return {
    total,
    byType: byType as Record<CallOutcomeType, number>,
    disqualificationReasons: disqualificationReasons as Record<DisqualificationReason, number>,
  };
}
```

## Acceptance Criteria
- [ ] Replace `findMany` with `groupBy` aggregation
- [ ] Same response format as before
- [ ] Add test for large dataset performance
- [ ] Unit tests pass

## Effort Estimate
1 story point

## Performance Impact
- Before: O(n) memory, loads all records
- After: O(1) memory, database aggregation
- Improvement: ~90% memory reduction for large datasets
