---
id: SIMP-003
status: open
priority: P3
category: simplicity
source: sprint-2-review
created: 2026-01-10T00:00:00Z
assignee: null
severity: low
---

# YAGNI Violation: Placeholder getSuggestedResponse Method

## Context
Found during Sprint 2 review by code-simplicity-reviewer agent.

## Problem
The `getSuggestedResponse` method is a placeholder that returns a hardcoded string with a comment about future AI integration.

## Location
- File: `src/services/objection-flow-service/objection-flow-service.ts`
- Lines: 227-239

## Current Code
```typescript
getSuggestedResponse(flowState: ObjectionFlowState): string {
  const flowDef = getFlowDefinition(flowState.objectionType);

  // For now, return a generic acknowledgment
  // In future, this could use AI to generate context-aware responses
  return `Based on your diagnostic assessment, here's a suggested approach for the ${flowDef.displayName}...`;
}
```

## YAGNI Principle
"You Aren't Gonna Need It" - don't add functionality until it's actually needed.

## Decision Required
- Is AI integration planned for Sprint 3?
- If yes, keep but add TODO/JIRA reference
- If no, delete the method

## Recommended Action
```typescript
// DELETE the method entirely
// When AI integration is actually needed, implement it properly
```

## Acceptance Criteria
- [ ] Confirm AI integration timeline
- [ ] If not imminent: delete method
- [ ] If imminent: add tracking ticket reference

## Effort Estimate
0.25 story points
