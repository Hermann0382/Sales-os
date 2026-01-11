---
id: ARCH-003
status: open
priority: P2
category: architecture
agent: architecture-strategist
file: app/api/analytics/calls/[callId]/route.ts
line: 46-97
---

# Business Logic in API Route Handler

## Problem

The call detail API route contains extensive data mapping, outcome transformations, and domain-specific calculations (duration, status mapping). This violates the established service layer pattern used elsewhere in the codebase (e.g., `call-service.ts`).

## Current State

The route handler contains:
- Database query with complex includes
- Duration calculation
- Milestone status transformation
- Objection status mapping
- AI analysis transformation
- Outcome type mapping

This is ~150 lines of business logic in an API route.

## Proposed Solution

Extract to analytics service:

```typescript
// In analytics-service.ts
interface CallDetail {
  id: string;
  prospectName: string;
  agentId: string;
  agentName: string;
  date: Date;
  duration: number;
  status: string;
  outcome?: string;
  zoomLink?: string;
  hasRecording: boolean;
  recordingUrl?: string;
  milestones: MilestoneDetail[];
  objections: ObjectionDetail[];
  analysis?: AIAnalysisDetail;
}

async getCallDetail(callId: string, organizationId: string): Promise<CallDetail | null> {
  // All the data fetching and transformation logic
}
```

```typescript
// In API route
const detail = await analyticsService.getCallDetail(callId, user.organizationId);
if (!detail) {
  return NextResponse.json({ error: 'Call not found' }, { status: 404 });
}
return NextResponse.json({ data: detail });
```

## Acceptance Criteria

- [ ] Business logic extracted to `analytics-service.ts`
- [ ] API route only handles HTTP concerns
- [ ] Unit tests for `getCallDetail` method
- [ ] No behavior change in API response
