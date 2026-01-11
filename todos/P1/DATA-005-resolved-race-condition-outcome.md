---
id: DATA-005
status: resolved
priority: P1
category: data-integrity
source: sprint-2-review
created: 2026-01-10T00:00:00Z
resolved: 2026-01-11T00:00:00Z
assignee: null
severity: dangerous
---

# Race Condition Before Transaction in CallOutcome

## Context
Found during Sprint 2 review by data-integrity-guardian agent.

## Problem
Critical validations (call exists, no existing outcome, status check) occur OUTSIDE the transaction that creates the outcome.

**Risk Scenarios:**
1. Two concurrent requests both pass the `if (call.callOutcome)` check, then both attempt to create
2. Call status changes between validation and creation (e.g., cancelled after check)
3. Could result in outcome on a cancelled call

## Location
- File: `src/services/call-outcome-service/call-outcome-service.ts`
- Lines: 75-152
- Method: `createOutcome()`

## Current Code
```typescript
// Lines 80-91: Validation query OUTSIDE transaction
const call = await prisma.callSession.findFirst({
  where: { id: input.callSessionId, organizationId },
  include: { callOutcome: true, objectionResponses: {...} },
});

// Lines 98-99: Check for existing outcome OUTSIDE transaction
if (call.callOutcome) {
  throw new Error('Call outcome already exists...');
}

// Lines 103-105: Status check OUTSIDE transaction
if (call.status !== 'in_progress') {
  throw new Error(`Cannot set outcome for call with status: ${call.status}`);
}

// Lines 128-151: Transaction creates outcome (validations already passed)
const result = await prisma.$transaction(async (tx) => {
  const outcome = await tx.callOutcome.create({...});
  await tx.callSession.update({...});
  return outcome;
});
```

## Proposed Solution
```typescript
async createOutcome(
  organizationId: string,
  input: CreateCallOutcomeInput
): Promise<CallOutcomeData> {
  // Move ALL validations inside transaction
  const result = await prisma.$transaction(async (tx) => {
    // Validation inside transaction
    const call = await tx.callSession.findFirst({
      where: { id: input.callSessionId, organizationId },
      include: {
        callOutcome: true,
        prospect: true,
        objectionResponses: { where: { outcome: 'Deferred' } },
      },
    });

    if (!call) {
      throw new Error('Call session not found or unauthorized');
    }

    if (call.callOutcome) {
      throw new Error('Call outcome already exists. Cannot override.');
    }

    if (call.status !== 'in_progress') {
      throw new Error(`Cannot set outcome for call with status: ${call.status}`);
    }

    // Validate disqualification reason
    if (input.outcomeType === 'Disqualified' && !input.disqualificationReason) {
      throw new Error('Disqualification reason is required');
    }

    // Validate outcome against qualification (use inline check, not separate query)
    const clientCount = call.prospect.clientCount || 0;
    const isAdvisoryMode = clientCount < 500;
    const advisoryAllowedOutcomes = ['Follow_up_Scheduled', 'Disqualified'];

    if (isAdvisoryMode && !advisoryAllowedOutcomes.includes(input.outcomeType)) {
      throw new Error(`Outcome "${input.outcomeType}" not allowed in advisory mode`);
    }

    // Create outcome
    const outcome = await tx.callOutcome.create({
      data: {
        callSessionId: input.callSessionId,
        outcomeType: input.outcomeType,
        disqualificationReason: input.disqualificationReason ?? null,
        qualificationFlags: input.qualificationFlags ?? Prisma.JsonNull,
      },
    });

    // Update call status
    await tx.callSession.update({
      where: { id: input.callSessionId },
      data: { status: 'completed', endedAt: new Date() },
    });

    return outcome;
  });

  return this.mapToCallOutcome(result);
}
```

## Acceptance Criteria
- [ ] All validation queries moved inside transaction
- [ ] Qualification validation uses data from same transaction query (no separate service call)
- [ ] Existing unit tests pass
- [ ] Add test for concurrent outcome creation attempts
- [ ] Add test for status change during outcome creation

## Effort Estimate
3 story points

## References
- [Prisma Transactions](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)
- Related: PERF-002 (duplicate queries in same flow)
