---
id: SEC-003
status: open
priority: P1
category: security
agent: security-sentinel
file: app/api/analytics/**
line: N/A
---

# Missing Rate Limiting on Analytics Endpoints

## Problem

All analytics API routes lack rate limiting. Analytics queries can be computationally expensive (multiple database aggregations, joins). An attacker with valid credentials could overwhelm the system with repeated requests.

## Impact

- Denial of service
- Excessive database load
- Increased infrastructure costs

## Affected Routes

- `/api/analytics/team`
- `/api/analytics/agents`
- `/api/analytics/objections`
- `/api/analytics/milestones`
- `/api/analytics/dashboard`
- `/api/analytics/calls`
- `/api/analytics/calls/[callId]`

## Proposed Solution

Implement rate limiting using `@upstash/ratelimit` or similar:

```typescript
// src/lib/api/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '60 s'), // 10 requests per minute
});

export async function checkRateLimit(identifier: string) {
  const { success, limit, remaining, reset } = await ratelimit.limit(identifier);
  return { success, limit, remaining, reset };
}
```

```typescript
// In each analytics route
const { success, remaining } = await checkRateLimit(`analytics:${user.id}`);
if (!success) {
  return NextResponse.json(
    { error: { message: 'Too many requests', code: 'RATE_LIMITED' } },
    { status: 429, headers: { 'X-RateLimit-Remaining': String(remaining) } }
  );
}
```

## Acceptance Criteria

- [ ] Rate limiting applied to all analytics endpoints
- [ ] Limit: 10 requests per minute per user
- [ ] Proper 429 response with retry-after header
- [ ] Rate limit headers in responses
