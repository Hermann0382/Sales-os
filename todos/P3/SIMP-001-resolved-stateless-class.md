---
id: SIMP-001
status: open
priority: P3
category: simplicity
source: sprint-2-review
created: 2026-01-10T00:00:00Z
assignee: null
severity: low
---

# Stateless Class Wrapper with No Benefit

## Context
Found during Sprint 2 review by code-simplicity-reviewer agent.

## Problem
`ObjectionFlowService` is a class that wraps purely stateless functions. The class has no instance state, no dependencies injected, and all methods are pure transformations.

## Location
- File: `src/services/objection-flow-service/objection-flow-service.ts`
- Lines: 52-266

## Current Code
```typescript
export class ObjectionFlowService {
  startFlow(objectionType: ObjectionType): StartFlowResult {
    // pure function logic - no this. references
  }
  advanceStep(flowState: ObjectionFlowState, input: AdvanceStepInput): AdvanceStepResult {
    // pure function logic
  }
  // ... more pure functions
}
export const objectionFlowService = new ObjectionFlowService();
```

## Alternative Approach
```typescript
// As plain functions
export function startFlow(objectionType: ObjectionType): StartFlowResult {
  // same logic
}

export function advanceStep(
  flowState: ObjectionFlowState,
  input: AdvanceStepInput
): AdvanceStepResult {
  // same logic
}

// Export as namespace for backwards compatibility
export const objectionFlowService = {
  startFlow,
  advanceStep,
  goBackStep,
  completeFlow,
  // ...
};
```

## Decision Required
- Is dependency injection planned for testing?
- Will the class gain state in the future?

If no to both, plain functions are simpler.

## Acceptance Criteria
- [ ] Discuss with team if class pattern is intentional
- [ ] If refactoring: convert to plain functions
- [ ] If keeping: document reason for class pattern

## Effort Estimate
1 story point (if refactoring)

## Note
Low priority - current code works, this is a style/simplicity concern.
