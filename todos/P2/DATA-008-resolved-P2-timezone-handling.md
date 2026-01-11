---
id: DATA-008
status: open
priority: P2
category: data-integrity
agent: data-integrity-guardian
file: src/services/analytics-service/metrics-calculator.ts
line: 91-123
---

# Timezone Inconsistency in Date Range Handling

## Problem

`getTimeRangeFromPreset` uses local timezone, not UTC. Server timezone differences could cause inconsistent date ranges across deployments. A "week" query starting at midnight could include/exclude different records depending on server location.

Additionally, custom date ranges from API parameters (e.g., `?startDate=2024-01-15`) are parsed with `new Date(string)` which is timezone-dependent.

## Affected Files

- `src/services/analytics-service/metrics-calculator.ts` (preset)
- `app/api/analytics/team/route.ts` (custom dates)
- `app/api/analytics/agents/route.ts` (custom dates)
- `app/api/analytics/objections/route.ts` (custom dates)
- `app/api/analytics/milestones/route.ts` (custom dates)
- `app/api/analytics/calls/route.ts` (custom dates)

## Current Code

```typescript
// metrics-calculator.ts
const now = new Date();
startDate.setHours(0, 0, 0, 0); // Local timezone!

// API routes
timeRange = {
  startDate: new Date(startDate), // Timezone-dependent
  endDate: new Date(endDate),
};
```

## Proposed Solution

Use UTC consistently:

```typescript
// metrics-calculator.ts
export function getTimeRangeFromPreset(preset: 'week' | 'month' | 'quarter' | 'year'): TimeRange {
  const now = new Date();

  // Use UTC for consistency
  const endDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    23, 59, 59, 999
  ));

  let startDate: Date;
  switch (preset) {
    case 'week':
      startDate = new Date(endDate);
      startDate.setUTCDate(endDate.getUTCDate() - 7);
      break;
    // ...
  }

  startDate.setUTCHours(0, 0, 0, 0);
  return { startDate, endDate };
}

// API routes - require ISO 8601 format with timezone
timeRange = {
  startDate: new Date(startDate + 'T00:00:00.000Z'),
  endDate: new Date(endDate + 'T23:59:59.999Z'),
};
```

## Acceptance Criteria

- [ ] All date ranges use UTC consistently
- [ ] API accepts ISO 8601 date format
- [ ] Tests verify timezone-independent behavior
- [ ] Documentation updated for date format
