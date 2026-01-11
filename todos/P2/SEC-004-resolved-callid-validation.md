---
id: SEC-004
status: open
priority: P2
category: security
agent: security-sentinel
file: app/api/analytics/calls/[callId]/route.ts
line: 25
created: 2026-01-11T11:30:00Z
---

# Missing callId Validation in Call Detail Route

## Context

Found during Sprint 3 Phase 3 review by security-sentinel agent.

## Problem

The `callId` parameter is used directly without CUID format validation, unlike other routes (e.g., `/api/calls/[callId]/recording/route.ts` uses `callParamsSchema`).

## Location

- File: `app/api/analytics/calls/[callId]/route.ts`
- Line: 25

## Current Code

```typescript
const { callId } = await params;
// callId used directly in Prisma query without validation
```

## Proposed Solution

Use the existing validation schema:

```typescript
import { callParamsSchema } from '@/lib/validation';

const rawParams = await params;
const paramsValidation = callParamsSchema.safeParse(rawParams);
if (!paramsValidation.success) {
  return ErrorResponses.badRequest('Invalid call ID format');
}
const { callId } = paramsValidation.data;
```

## Acceptance Criteria

- [ ] callId validated against CUID format
- [ ] Invalid format returns 400 error
- [ ] Consistent with other API routes
