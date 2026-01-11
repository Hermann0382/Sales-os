---
id: DATA-001
status: open
priority: P1
category: data-integrity
agent: data-integrity-guardian
file: app/api/analytics/calls/[callId]/route.ts
line: 93-96
---

# RecordingSession Missing Organization Filter (Multi-Tenancy Leak)

## Problem

The RecordingSession query lacks organizationId filter, enabling potential cross-tenant data access.

A manager could access recording URLs from a different organization's calls if they guess or enumerate callSessionIds. The CallSession fetch is properly scoped (line 46-49), but the subsequent RecordingSession query only filters by callSessionId without verifying organization ownership.

## Current Code

```typescript
const recordingSession = await prisma.recordingSession.findFirst({
  where: { callSessionId: callId },
  orderBy: { createdAt: 'desc' },
});
```

## Proposed Solution

Add `organizationId: user.organizationId` to the RecordingSession where clause:

```typescript
const recordingSession = await prisma.recordingSession.findFirst({
  where: {
    callSessionId: callId,
    organizationId: user.organizationId
  },
  orderBy: { createdAt: 'desc' },
});
```

## Risk

**Critical** - Cross-tenant data access possible

## Acceptance Criteria

- [ ] RecordingSession query includes organizationId filter
- [ ] Recording URLs are only accessible within the same organization
- [ ] Test confirms cross-tenant access is blocked
