---
id: DATA-006
status: open
priority: P2
category: data-integrity
source: sprint-2-review
created: 2026-01-10T00:00:00Z
assignee: null
severity: risky
---

# Missing onDelete on ObjectionResponse.objection Foreign Key

## Context
Found during Sprint 2 review by data-integrity-guardian agent.

## Problem
The `ObjectionResponse.objection` relation does not specify `onDelete` behavior. If an `Objection` is deleted, the database will throw a constraint error rather than handling gracefully.

## Location
- File: `prisma/schema.prisma`
- Lines: 301-302

## Current Code
```prisma
model ObjectionResponse {
  // ...
  objection   Objection   @relation(fields: [objectionId], references: [id])
  // Missing: onDelete behavior
}
```

## Proposed Solution
```prisma
model ObjectionResponse {
  // ...
  objection   Objection   @relation(fields: [objectionId], references: [id], onDelete: Restrict)
  milestone   Milestone   @relation(fields: [milestoneId], references: [id], onDelete: Restrict)
}
```

Using `Restrict` prevents deletion of objections/milestones that have responses, which is the desired behavior (don't delete master data that's referenced).

## Migration
```sql
-- This is a constraint change, not data migration
-- Prisma will handle this automatically
```

## Acceptance Criteria
- [ ] Add `onDelete: Restrict` to objection relation
- [ ] Add `onDelete: Restrict` to milestone relation (DATA-007)
- [ ] Run `npx prisma db push` or create migration
- [ ] Test that deleting referenced objection fails gracefully

## Effort Estimate
1 story point (combined with DATA-007)

## Related
- DATA-007: Same issue with milestone FK
