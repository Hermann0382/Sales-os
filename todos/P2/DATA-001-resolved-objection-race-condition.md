---
id: DATA-001
status: open
priority: P2
category: data-integrity
source: sprint-2-review
created: 2026-01-10T00:00:00Z
assignee: null
severity: risky
---

# Race Condition in ObjectionResponse Creation

## Context
Found during Sprint 2 review by data-integrity-guardian agent.

## Problem
The `createObjectionResponse` method performs validation queries and creation as separate operations without a transaction. Between the validation queries and the create operation, the call status could change or a duplicate response could be created.

## Location
- File: `src/services/objection-response-service/objection-response-service.ts`
- Lines: 54-109

## Current Code
```typescript
async createObjectionResponse(...) {
  // Query 1: Validate call
  const call = await prisma.callSession.findFirst({...});
  if (!call) throw new Error('...');
  if (call.status !== 'in_progress') throw new Error('...');

  // Query 2: Validate objection
  const objection = await prisma.objection.findFirst({...});
  if (!objection) throw new Error('...');

  // Race window: call status could change here!

  // Query 3: Create response
  const response = await prisma.objectionResponse.create({...});
}
```

## Proposed Solution
```typescript
async createObjectionResponse(
  organizationId: string,
  input: CreateObjectionResponseInput
): Promise<ObjectionResponseData> {
  const response = await prisma.$transaction(async (tx) => {
    // Validate call inside transaction
    const call = await tx.callSession.findFirst({
      where: { id: input.callSessionId, organizationId },
    });

    if (!call) throw new Error('Call session not found');
    if (call.status !== 'in_progress') {
      throw new Error('Call is not in progress');
    }

    // Validate objection inside transaction
    const objection = await tx.objection.findFirst({
      where: { id: input.objectionId, organizationId },
    });

    if (!objection) throw new Error('Objection not found');

    // Validate outcome
    const allowedOutcomes = objection.allowedOutcomes as string[];
    if (!allowedOutcomes.includes(input.outcome)) {
      throw new Error(`Invalid outcome`);
    }

    // Create response
    return tx.objectionResponse.create({
      data: {
        callSessionId: input.callSessionId,
        objectionId: input.objectionId,
        milestoneId: input.milestoneId,
        outcome: input.outcome,
        diagnosticAnswers: input.diagnosticAnswers ?? Prisma.JsonNull,
        notes: input.notes,
      },
      include: { objection: true },
    });
  });

  return this.mapToObjectionResponse(response);
}
```

## Acceptance Criteria
- [ ] Wrap validation and creation in single transaction
- [ ] Add test for concurrent creation attempts
- [ ] Existing tests pass

## Effort Estimate
2 story points
