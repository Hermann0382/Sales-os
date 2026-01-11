---
id: SEC-001
status: open
priority: P2
category: security
agent: security-sentinel
file: app/api/analytics/agents/route.ts
line: 27
---

# Missing Input Validation on agentIds Array Parameter

## Problem

The `agentIds` parameter is split and passed directly to the Prisma query without validation. While Prisma prevents SQL injection, malicious users could supply non-CUID values (e.g., very long strings, special characters) that may cause unexpected behavior or resource exhaustion.

## Current Code

```typescript
const agentIds = searchParams.get('agentIds')?.split(',').filter(Boolean);
```

## Proposed Solution

Validate each agentId against the CUID schema before passing to the query:

```typescript
import { cuidSchema } from '@/lib/validation';

const rawAgentIds = searchParams.get('agentIds')?.split(',').filter(Boolean) ?? [];
const agentIds = rawAgentIds.filter(id => cuidSchema.safeParse(id).success);

// Also validate that agentIds belong to user's organization
if (agentIds.length > 0) {
  const validAgents = await prisma.user.findMany({
    where: { id: { in: agentIds }, organizationId: user.organizationId },
    select: { id: true }
  });
  const validAgentIds = validAgents.map(a => a.id);
  // Use validAgentIds
}
```

## Acceptance Criteria

- [ ] agentIds validated against CUID format
- [ ] agentIds verified to belong to user's organization
- [ ] Invalid IDs are filtered out silently (not error)
- [ ] Same pattern applied to calls route (SEC-002)
