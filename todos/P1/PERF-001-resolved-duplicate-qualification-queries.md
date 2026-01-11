---
id: PERF-001
status: resolved
priority: P1
category: performance
source: sprint-2-review
created: 2026-01-10T00:00:00Z
resolved: 2026-01-11T00:00:00Z
assignee: null
severity: high
---

# Duplicate Database Queries in Qualification Flow

## Context
Found during Sprint 2 review by performance-oracle agent.

## Problem
Both `getQualificationStatus` and `getMilestoneAvailability` execute the SAME query to fetch call + prospect data. `getMilestoneAvailability` internally calls `getQualificationStatus` again, resulting in 3 queries instead of 1.

## Location
- File: `app/api/calls/[callId]/qualification/route.ts`
- Lines: 39-42

## Current Code
```typescript
// Route handler
const [status, milestoneAvailability] = await Promise.all([
  qualificationService.getQualificationStatus(user.organizationId, callId),
  qualificationService.getMilestoneAvailability(user.organizationId, callId),
]);

// In getMilestoneAvailability (qualification-service.ts:158)
const [status, milestones] = await Promise.all([
  this.getQualificationStatus(organizationId, callId),  // DUPLICATE!
  prisma.milestone.findMany({...}),
]);
```

**Query count: 3 (2 identical call+prospect queries, 1 milestone query)**

## Proposed Solution

### Option A: Combine into single method (Recommended)
```typescript
// qualification-service.ts
async getFullQualificationData(
  organizationId: string,
  callId: string
): Promise<{
  status: QualificationStatus;
  milestoneAvailability: MilestoneAvailability[];
}> {
  const [call, milestones] = await Promise.all([
    prisma.callSession.findFirst({
      where: { id: callId, organizationId },
      include: { prospect: true },
    }),
    prisma.milestone.findMany({
      where: { organizationId },
      orderBy: { orderIndex: 'asc' },
    }),
  ]);

  if (!call) throw new Error('Call not found');

  const status = this.calculateQualificationStatus(call.prospect.clientCount || 0);
  const milestoneAvailability = milestones.map((m) => ({
    milestoneNumber: m.milestoneNumber,
    isAvailable: !status.skippedMilestones.includes(m.milestoneNumber),
    reason: status.skippedMilestones.includes(m.milestoneNumber)
      ? `Skipped in advisory mode`
      : null,
  }));

  return { status, milestoneAvailability };
}

// Helper method (pure function, no DB)
private calculateQualificationStatus(clientCount: number): QualificationStatus {
  const isQualified = clientCount >= QUALIFICATION_THRESHOLD;
  const isAdvisoryMode = !isQualified;
  return {
    isQualified,
    isAdvisoryMode,
    clientCount,
    threshold: QUALIFICATION_THRESHOLD,
    skippedMilestones: isAdvisoryMode ? ADVISORY_MODE_SKIPPED_MILESTONES : [],
    allowedOutcomes: isAdvisoryMode
      ? ADVISORY_MODE_ALLOWED_OUTCOMES
      : STANDARD_MODE_ALLOWED_OUTCOMES,
    reasons: isAdvisoryMode ? [`Client count (${clientCount}) below threshold`] : [],
  };
}
```

### Option B: Pass pre-fetched status
```typescript
async getMilestoneAvailability(
  organizationId: string,
  callId: string,
  preloadedStatus?: QualificationStatus  // Optional pre-loaded
): Promise<MilestoneAvailability[]> {
  const [status, milestones] = await Promise.all([
    preloadedStatus ?? this.getQualificationStatus(organizationId, callId),
    prisma.milestone.findMany({...}),
  ]);
  // ...
}

// In route
const status = await qualificationService.getQualificationStatus(...);
const availability = await qualificationService.getMilestoneAvailability(
  ...,
  status  // Pass pre-loaded
);
```

## Acceptance Criteria
- [ ] Query count reduced from 3 to 2 for qualification endpoint
- [ ] Existing API response format unchanged
- [ ] Unit tests for new combined method
- [ ] Performance test showing improvement

## Effort Estimate
2 story points

## Performance Impact
- Before: 3 queries (~150-200ms)
- After: 2 queries (~100-130ms)
- Improvement: ~35% latency reduction
