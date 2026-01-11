---
id: SEC-006
status: open
priority: P2
category: security
agent: security-sentinel
file: app/api/analytics/calls/route.ts
line: 29
created: 2026-01-11T11:30:00Z
---

# Pagination Limit Without Maximum Bound

## Context

Found during Sprint 3 Phase 3 review by security-sentinel agent.

## Problem

The `limit` parameter has no maximum cap. An attacker could request `?limit=100000` to force the server to return an excessive amount of data.

## Impact

- Memory exhaustion
- Slow response times
- Potential denial of service

## Location

- File: `app/api/analytics/calls/route.ts`
- Line: 29

## Current Code

```typescript
const limit = parseInt(searchParams.get('limit') || '50', 10);
const offset = parseInt(searchParams.get('offset') || '0', 10);
```

## Proposed Solution

Enforce maximum limit:

```typescript
const MAX_LIMIT = 100;
const requestedLimit = parseInt(searchParams.get('limit') || '50', 10);
const limit = Math.min(Math.max(1, requestedLimit), MAX_LIMIT);

const requestedOffset = parseInt(searchParams.get('offset') || '0', 10);
const offset = Math.max(0, requestedOffset);
```

## Acceptance Criteria

- [ ] Maximum limit enforced (suggest 100)
- [ ] Negative values handled
- [ ] Test confirms limit capping works
