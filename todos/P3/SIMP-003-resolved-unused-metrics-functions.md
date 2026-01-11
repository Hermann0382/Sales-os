---
id: SIMP-003
status: open
priority: P3
category: simplicity
agent: code-simplicity-reviewer
file: src/services/analytics-service/metrics-calculator.ts
line: 50-61, 202-220, 250-267
created: 2026-01-11T11:30:00Z
---

# Unused Metrics Functions (YAGNI)

## Context

Found during Sprint 3 Phase 3 review by code-simplicity-reviewer agent.

## Problem

Three statistical functions are defined but never used anywhere in the codebase:
- `calculateMedian()` (lines 50-61)
- `calculateCorrelation()` (lines 202-220)
- `calculatePercentile()` (lines 250-267)

These are YAGNI violations - functions that may never be needed.

## Location

- File: `src/services/analytics-service/metrics-calculator.ts`

## Proposed Solution

Remove unused functions to keep the codebase lean. If needed later, they can be re-added.

```typescript
// Remove:
// - calculateMedian
// - calculateCorrelation
// - calculatePercentile

// Also remove from index.ts exports
```

## Acceptance Criteria

- [ ] Unused functions removed
- [ ] Exports updated
- [ ] No functionality affected
