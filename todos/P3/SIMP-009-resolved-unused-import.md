---
id: SIMP-009
status: open
priority: P3
category: simplicity
source: sprint-2-review
created: 2026-01-10T00:00:00Z
assignee: null
severity: low
---

# Unused Import in ObjectionTypeSelector

## Context
Found during Sprint 2 review by code-simplicity-reviewer agent.

## Problem
The component imports `objectionFlowService` but never uses it.

## Location
- File: `src/components/call-control/ObjectionTypeSelector.tsx`
- Lines: 23-25

## Current Code
```typescript
import {
  objectionFlowService,  // Unused!
  type ObjectionType,
} from '@/services/objection-flow-service';
```

## Fix
```typescript
import {
  type ObjectionType,
} from '@/services/objection-flow-service';
```

## Acceptance Criteria
- [ ] Remove unused import

## Effort Estimate
0.1 story points
