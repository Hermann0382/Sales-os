---
id: PERF-002
status: resolved
priority: P1
category: performance
source: sprint-2-review
created: 2026-01-10T00:00:00Z
resolved: 2026-01-11T00:00:00Z
assignee: null
severity: high
---

# Repeated Qualification Status Queries in Outcome Flow

## Context
Found during Sprint 2 review by performance-oracle agent.

## Problem
The `createOutcome` method already fetches the call with prospect data, but then calls `validateOutcomeForCall` which triggers ANOTHER query via `isOutcomeAllowed` -> `getQualificationStatus`. This pattern queries the same call+prospect data twice.

## Location
- File: `src/services/call-outcome-service/call-outcome-service.ts`
- Lines: 80-117

## Current Code
```typescript
async createOutcome(...) {
  // Query 1: Fetch call with prospect
  const call = await prisma.callSession.findFirst({
    where: { id: input.callSessionId, organizationId },
    include: {
      callOutcome: true,
      prospect: true,  // We have prospect data here!
      objectionResponses: {...},
    },
  });

  // ... validations ...

  // Query 2: This calls getQualificationStatus which re-fetches call+prospect!
  await qualificationService.validateOutcomeForCall(
    organizationId,
    input.callSessionId,
    input.outcomeType
  );
}
```

## Proposed Solution

Since DATA-005 recommends moving all validations inside the transaction, combine both fixes:

```typescript
async createOutcome(
  organizationId: string,
  input: CreateCallOutcomeInput
): Promise<CallOutcomeData> {
  const result = await prisma.$transaction(async (tx) => {
    const call = await tx.callSession.findFirst({
      where: { id: input.callSessionId, organizationId },
      include: {
        callOutcome: true,
        prospect: true,
        objectionResponses: { where: { outcome: 'Deferred' } },
      },
    });

    if (!call) throw new Error('Call session not found');
    if (call.callOutcome) throw new Error('Outcome already exists');
    if (call.status !== 'in_progress') throw new Error('Invalid status');

    // Validate outcome using ALREADY FETCHED prospect data (no new query!)
    const clientCount = call.prospect.clientCount || 0;
    const isAdvisoryMode = clientCount < QUALIFICATION_THRESHOLD;

    if (isAdvisoryMode) {
      const allowedInAdvisory = ['Follow_up_Scheduled', 'Disqualified'];
      if (!allowedInAdvisory.includes(input.outcomeType)) {
        throw new Error(
          `Outcome "${input.outcomeType}" not allowed in advisory mode`
        );
      }
    }

    // Disqualification reason validation
    if (input.outcomeType === 'Disqualified' && !input.disqualificationReason) {
      throw new Error('Disqualification reason required');
    }

    // Create outcome and update status atomically
    const outcome = await tx.callOutcome.create({...});
    await tx.callSession.update({...});

    return outcome;
  });

  return this.mapToCallOutcome(result);
}
```

## Alternative: Keep Separation with Helper
```typescript
// Add to qualification-service.ts
validateOutcomeWithClientCount(
  clientCount: number,
  outcomeType: CallOutcomeType
): { isAllowed: boolean; reason: string | null } {
  const isAdvisoryMode = clientCount < QUALIFICATION_THRESHOLD;
  // Pure function, no DB query
}

// In createOutcome
const validation = qualificationService.validateOutcomeWithClientCount(
  call.prospect.clientCount || 0,
  input.outcomeType
);
if (!validation.isAllowed) throw new Error(validation.reason);
```

## Acceptance Criteria
- [ ] Outcome creation uses single database query for validation
- [ ] No call to `getQualificationStatus` when prospect data already loaded
- [ ] Combined with DATA-005 transaction fix
- [ ] Unit tests pass
- [ ] API response unchanged

## Effort Estimate
1 story point (combined with DATA-005)

## Performance Impact
- Before: 3 queries
- After: 1 query (inside transaction)
- Improvement: ~66% reduction in DB load

## Dependencies
- Should be implemented together with DATA-005
