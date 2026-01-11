---
id: PERF-002
status: open
priority: P1
category: performance
agent: performance-oracle
file: src/services/analytics-service/analytics-service.ts
line: 424-523
---

# N+1 Query Pattern in getMilestoneEffectiveness

## Problem

For each milestone, the function executes:
1. One query to get milestone responses
2. One count query for objections at that milestone

For 10 milestones, this results in 21 database queries.

**Impact:** ~1-3 second response times

## Current Code

```typescript
for (const milestone of milestones) {
  const responses = await prisma.milestoneResponse.findMany({ ... });

  const objectionCount = await prisma.objectionResponse.count({
    where: { milestoneId: milestone.id, ... },
  });
}
```

## Proposed Solution

Batch all queries upfront:

```typescript
// Get all milestones
const milestones = await prisma.milestone.findMany({
  where: { organizationId },
  orderBy: { orderIndex: 'asc' },
});

const milestoneIds = milestones.map(m => m.id);

// Batch fetch ALL responses
const allResponses = await prisma.milestoneResponse.findMany({
  where: {
    milestoneId: { in: milestoneIds },
    callSession: { organizationId, createdAt: { gte, lte } },
  },
  include: { callSession: { include: { callOutcome: true } } },
});

// Batch count objections using groupBy
const objectionCounts = await prisma.objectionResponse.groupBy({
  by: ['milestoneId'],
  where: {
    milestoneId: { in: milestoneIds },
    callSession: { organizationId, createdAt: { gte, lte } },
  },
  _count: { id: true },
});

// Convert to lookup map
const objectionCountMap = new Map(
  objectionCounts.map(o => [o.milestoneId, o._count.id])
);

// Process in memory
for (const milestone of milestones) {
  const responses = allResponses.filter(r => r.milestoneId === milestone.id);
  const objCount = objectionCountMap.get(milestone.id) ?? 0;
  // Calculate metrics...
}
```

## Acceptance Criteria

- [ ] Only 3 database queries executed (milestones + responses + objection counts)
- [ ] Response time < 300ms for 10 milestones
- [ ] Same output as current implementation
