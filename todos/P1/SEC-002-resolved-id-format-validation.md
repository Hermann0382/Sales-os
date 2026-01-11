---
id: SEC-002
status: resolved
priority: P1
category: security
source: sprint-2-review
created: 2026-01-10T00:00:00Z
resolved: 2026-01-11T00:00:00Z
assignee: null
severity: high
cwe: CWE-20
---

# Missing UUID/CUID Format Validation for ID Parameters

## Context
Found during Sprint 2 review by security-sentinel agent.

## Problem
ID parameters (callId, objectionId, milestoneId, objectionResponseId) are validated only for minimum length but not for expected format (UUID, CUID, etc.). This allows arbitrary strings to be passed to database queries.

## Location
- File: `app/api/calls/[callId]/objections/route.ts`
- Lines: 18-25
- Also affects: All Sprint 2 API routes

## Current Code
```typescript
const CreateObjectionResponseSchema = z.object({
  objectionId: z.string().min(1, 'Objection ID is required'),  // Only min length!
  milestoneId: z.string().min(1, 'Milestone ID is required'),  // Only min length!
  outcome: z.enum(['Resolved', 'Deferred', 'Disqualified']),
  diagnosticAnswers: z.record(z.string()).optional(),
  notes: z.string().optional(),
});
```

## Proposed Solution

### Step 1: Create reusable ID validators
```typescript
// src/lib/validation/ids.ts
import { z } from 'zod';

// Use cuid() for Prisma default IDs or uuid() if using UUID
export const idSchema = z.string().cuid();

// With custom error message
export const callIdSchema = z.string().cuid({
  message: 'Invalid call ID format'
});

export const objectionIdSchema = z.string().cuid({
  message: 'Invalid objection ID format'
});

// etc.
```

### Step 2: Update API schemas
```typescript
// app/api/calls/[callId]/objections/route.ts
import { idSchema } from '@/lib/validation/ids';

const CreateObjectionResponseSchema = z.object({
  objectionId: idSchema,
  milestoneId: idSchema,
  outcome: z.enum(['Resolved', 'Deferred', 'Disqualified']),
  diagnosticAnswers: z.record(z.string()).optional(),
  notes: z.string().max(10000).optional(),  // Also add max length
});
```

### Step 3: Validate path parameters
```typescript
// In route handlers
const PathParamsSchema = z.object({
  callId: idSchema,
  objectionResponseId: idSchema,
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string; objectionResponseId: string }> }
) {
  const rawParams = await params;
  const validatedParams = PathParamsSchema.safeParse(rawParams);

  if (!validatedParams.success) {
    return NextResponse.json(
      { error: 'Invalid parameters' },
      { status: 400 }
    );
  }

  const { callId, objectionResponseId } = validatedParams.data;
  // ...
}
```

## Files to Update
1. `app/api/calls/[callId]/objections/route.ts`
2. `app/api/calls/[callId]/objections/[objectionResponseId]/route.ts`
3. `app/api/calls/[callId]/outcome/route.ts`
4. `app/api/calls/[callId]/qualification/route.ts`

## Acceptance Criteria
- [ ] Create reusable ID validation schemas in `src/lib/validation/`
- [ ] Update all Sprint 2 API routes to use ID validators
- [ ] Validate path parameters (callId, objectionResponseId)
- [ ] Validate body parameters (objectionId, milestoneId)
- [ ] Add tests for malformed ID rejection
- [ ] Ensure consistent 400 error response format

## Effort Estimate
2 story points

## References
- [Zod CUID validation](https://zod.dev/?id=strings)
- CWE-20: Improper Input Validation
