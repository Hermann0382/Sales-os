---
id: SEC-001
status: resolved
priority: P1
category: security
source: sprint-2-review
created: 2026-01-10T00:00:00Z
resolved: 2026-01-11T00:00:00Z
assignee: null
severity: high
cwe: CWE-639
---

# Missing callId Path Parameter Validation in ObjectionResponse Route

## Context
Found during Sprint 2 review by security-sentinel agent.

## Problem
The `callId` path parameter is extracted from the URL but never validated or used to ensure the `objectionResponseId` belongs to the specified call. An attacker could manipulate the URL to access objection responses from different calls.

**Attack Scenario:**
1. User knows objectionResponseId from Call A
2. User constructs URL: `/api/calls/CALL_B_ID/objections/OBJECTION_FROM_CALL_A`
3. API returns/modifies objection from Call A (wrong call context)

## Location
- File: `app/api/calls/[callId]/objections/[objectionResponseId]/route.ts`
- Lines: 36, 80

## Current Code
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string; objectionResponseId: string }> }
) {
  const { callId, objectionResponseId } = await params;
  // callId is destructured but NEVER used!

  const response = await objectionResponseService.getObjectionResponse(
    user.organizationId,
    objectionResponseId  // Only validates org, not call
  );
}
```

## Proposed Solution

### Option A: Pass callId to service (Recommended)
```typescript
// In route.ts
const { callId, objectionResponseId } = await params;

const response = await objectionResponseService.getObjectionResponse(
  user.organizationId,
  callId,           // ADD THIS
  objectionResponseId
);

// In objection-response-service.ts
async getObjectionResponse(
  organizationId: string,
  callId: string,       // ADD THIS
  responseId: string
): Promise<ObjectionResponseData | null> {
  const response = await prisma.objectionResponse.findFirst({
    where: {
      id: responseId,
      callSessionId: callId,  // ADD THIS CHECK
      callSession: { organizationId },
    },
    include: { objection: true },
  });
  // ...
}
```

### Option B: Validate at route level
```typescript
const response = await objectionResponseService.getObjectionResponse(
  user.organizationId,
  objectionResponseId
);

// Validate call ownership
if (response && response.callSessionId !== callId) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
```

## Acceptance Criteria
- [ ] GET endpoint validates objectionResponseId belongs to callId
- [ ] PATCH endpoint validates objectionResponseId belongs to callId
- [ ] Invalid callId returns 404 (not 403 to prevent enumeration)
- [ ] Add integration test for cross-call access attempt
- [ ] Update service interface to accept callId parameter

## Effort Estimate
2 story points

## References
- [OWASP Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- CWE-639: Authorization Bypass Through User-Controlled Key
