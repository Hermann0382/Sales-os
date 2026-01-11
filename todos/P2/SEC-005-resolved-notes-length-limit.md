---
id: SEC-005
status: open
priority: P2
category: security
source: sprint-2-review
created: 2026-01-10T00:00:00Z
assignee: null
severity: medium
cwe: CWE-400
---

# Notes Field Without Length Limits

## Context
Found during Sprint 2 review by security-sentinel agent.

## Problem
The `notes` field accepts strings of unlimited length, potentially allowing:
- Database storage exhaustion
- Memory exhaustion during processing
- Denial of service attacks

## Location
- File: `app/api/calls/[callId]/objections/route.ts` - Line 24
- File: `app/api/calls/[callId]/objections/[objectionResponseId]/route.ts` - Line 19

## Current Code
```typescript
// Both files
notes: z.string().optional(),
```

## Proposed Solution
```typescript
// Add reasonable max length
notes: z.string().max(10000, 'Notes cannot exceed 10000 characters').optional(),
```

Also add to `diagnosticAnswers`:
```typescript
diagnosticAnswers: z.record(
  z.string().max(100),   // Key max length
  z.string().max(5000)   // Value max length
).refine(
  obj => Object.keys(obj).length <= 50,
  'Too many diagnostic answers'
).optional(),
```

## Acceptance Criteria
- [ ] Add `.max(10000)` to notes field in both routes
- [ ] Add length limits to diagnosticAnswers keys and values
- [ ] Return 400 with clear message when limit exceeded
- [ ] Add test for oversized input rejection

## Effort Estimate
1 story point
