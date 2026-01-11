---
id: PERF-004
status: open
priority: P2
category: performance
source: sprint-2-review
created: 2026-01-10T00:00:00Z
assignee: null
severity: medium
---

# Missing Composite Index for Objection Queries

## Context
Found during Sprint 2 review by performance-oracle agent.

## Problem
The `ObjectionResponse` model has separate indexes on `callSessionId`, `objectionId`, and `outcome`, but queries frequently filter by `callSessionId` AND `outcome` together.

## Location
- File: `prisma/schema.prisma`
- Lines: 306-309

## Current Indexes
```prisma
@@index([callSessionId])
@@index([objectionId])
@@index([outcome])
```

## Query Patterns Affected
```typescript
// getUnresolvedObjections
where: {
  callSessionId,
  callSession: { organizationId },
  outcome: 'Deferred',
}

// hasUnresolvedObjections
where: {
  callSessionId,
  outcome: 'Deferred',
}
```

## Proposed Solution
```prisma
model ObjectionResponse {
  // ... fields ...

  @@index([callSessionId])
  @@index([callSessionId, outcome])  // ADD: Composite index
  @@index([objectionId])
  @@index([outcome])
}
```

## Migration
```bash
npx prisma migrate dev --name add_objection_composite_index
```

## Acceptance Criteria
- [ ] Add composite index `[callSessionId, outcome]`
- [ ] Run migration
- [ ] Query plan shows index usage for filtered queries
- [ ] Benchmark shows improvement

## Effort Estimate
0.5 story points

## Performance Impact
- Before: Sequential scan or index scan + filter
- After: Direct index lookup
- Improvement: ~60% faster for filtered objection queries
