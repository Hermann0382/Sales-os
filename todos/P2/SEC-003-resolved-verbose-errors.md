---
id: SEC-003
status: open
priority: P2
category: security
source: sprint-2-review
created: 2026-01-10T00:00:00Z
assignee: null
severity: medium
cwe: CWE-209
---

# Verbose Error Messages Expose Internal State

## Context
Found during Sprint 2 review by security-sentinel agent.

## Problem
Internal error messages are directly exposed to clients, potentially revealing system internals, database structure, or business logic. The string-based status code determination is fragile.

## Location
- File: `app/api/calls/[callId]/outcome/route.ts`
- Lines: 154-162

## Current Code
```typescript
const message = error instanceof Error ? error.message : 'Failed to record call outcome';
const status = message.includes('not found') || message.includes('unauthorized')
  ? 404
  : message.includes('already exists') || message.includes('Cannot')
  ? 400
  : 500;
return NextResponse.json(
  { error: { message, code: 'CREATE_ERROR' } },
  { status }
);
```

## Proposed Solution

### Step 1: Create error mapper utility
```typescript
// src/lib/api/error-handler.ts
export interface ApiError {
  message: string;
  code: string;
  status: number;
}

const errorPatterns: Array<{
  pattern: RegExp;
  response: ApiError;
}> = [
  {
    pattern: /not found|unauthorized/i,
    response: { message: 'Resource not found', code: 'NOT_FOUND', status: 404 },
  },
  {
    pattern: /already exists/i,
    response: { message: 'Resource already exists', code: 'CONFLICT', status: 409 },
  },
  {
    pattern: /cannot|invalid|required/i,
    response: { message: 'Invalid request', code: 'BAD_REQUEST', status: 400 },
  },
];

export function mapErrorToApiResponse(error: unknown): ApiError {
  const message = error instanceof Error ? error.message : 'Unknown error';

  // Log full error internally
  console.error('API Error:', { message, stack: error instanceof Error ? error.stack : undefined });

  // Return sanitized response
  for (const { pattern, response } of errorPatterns) {
    if (pattern.test(message)) {
      return response;
    }
  }

  return { message: 'Internal server error', code: 'INTERNAL_ERROR', status: 500 };
}
```

### Step 2: Use in routes
```typescript
} catch (error) {
  const apiError = mapErrorToApiResponse(error);
  return NextResponse.json(
    { error: { message: apiError.message, code: apiError.code } },
    { status: apiError.status }
  );
}
```

## Acceptance Criteria
- [ ] Create error mapper utility
- [ ] Apply to all Sprint 2 API routes
- [ ] Internal error details logged, not exposed
- [ ] Consistent error response format across APIs

## Effort Estimate
2 story points
