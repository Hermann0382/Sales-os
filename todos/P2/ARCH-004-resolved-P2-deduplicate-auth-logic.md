---
id: ARCH-004
status: open
priority: P2
category: architecture
agent: architecture-strategist
file: app/api/analytics/*.ts
line: N/A
---

# Duplicated Authentication/Authorization Logic

## Problem

All 7 analytics API routes contain identical code for:
- Clerk auth check (~5 lines)
- User lookup with organization (~7 lines)
- Role-based access control check (~8 lines)
- Time range parsing logic (~15 lines)

This is ~35 lines of duplicated code across 7 files = 245 lines that could be ~30.

## Affected Files

- `app/api/analytics/team/route.ts`
- `app/api/analytics/agents/route.ts`
- `app/api/analytics/objections/route.ts`
- `app/api/analytics/milestones/route.ts`
- `app/api/analytics/dashboard/route.ts`
- `app/api/analytics/calls/route.ts`
- `app/api/analytics/calls/[callId]/route.ts`

## Proposed Solution

Create shared utilities:

```typescript
// src/lib/api/analytics-auth.ts
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function requireManagerAuth() {
  const { userId } = await auth();
  if (!userId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, organizationId: true, role: true },
  });

  if (!user) {
    return { error: NextResponse.json({ error: 'User not found' }, { status: 404 }) };
  }

  if (user.role !== 'manager' && user.role !== 'admin') {
    return { error: NextResponse.json(
      { error: { message: 'Insufficient permissions', code: 'FORBIDDEN' } },
      { status: 403 }
    )};
  }

  return { user };
}

export function parseTimeRangeParams(searchParams: URLSearchParams): TimeRange {
  const preset = searchParams.get('preset') as 'week' | 'month' | 'quarter' | 'year' | null;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (preset) {
    return getTimeRangeFromPreset(preset);
  }
  if (startDate && endDate) {
    return {
      startDate: new Date(startDate + 'T00:00:00.000Z'),
      endDate: new Date(endDate + 'T23:59:59.999Z'),
    };
  }
  return getTimeRangeFromPreset('month');
}
```

Usage:

```typescript
// In each route
export async function GET(request: NextRequest) {
  const authResult = await requireManagerAuth();
  if ('error' in authResult) return authResult.error;
  const { user } = authResult;

  const { searchParams } = new URL(request.url);
  const timeRange = parseTimeRangeParams(searchParams);

  // Route-specific logic...
}
```

## Acceptance Criteria

- [ ] Create `src/lib/api/analytics-auth.ts`
- [ ] Refactor all 7 routes to use shared utilities
- [ ] No behavior change
- [ ] Reduced code duplication
