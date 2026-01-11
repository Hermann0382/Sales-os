---
id: PERF-001
status: open
priority: P1
category: performance
agent: performance-oracle
file: src/services/analytics-service/analytics-service.ts
line: 297-419
---

# N+1 Query Pattern in getAgentVariance

## Problem

The `getAgentVariance()` method uses N+1 queries - one query to get agents, then one query per agent to get their calls. For an organization with 50 agents, this executes 51 database queries.

**Impact:** ~2-5 second response times, 50+ database round trips

## Current Code

```typescript
for (const agent of agents) {
  const agentCalls = await prisma.callSession.findMany({
    where: {
      organizationId: options.organizationId,
      agentId: agent.id,
      // ...
    },
    // ...
  });
  // Process each agent separately
}
```

## Proposed Solution

Batch fetch all agent calls in a single query, then process in-memory:

```typescript
// Fetch all agents
const agents = await prisma.user.findMany({
  where: { organizationId, role: 'agent' },
  select: { id: true, name: true, email: true },
});

// Batch fetch ALL calls for all agents in ONE query
const allCalls = await prisma.callSession.findMany({
  where: {
    organizationId,
    agentId: { in: agents.map(a => a.id) },
    createdAt: { gte: startDate, lte: endDate },
    status: 'completed',
  },
  include: {
    callOutcome: true,
    milestoneResponses: true,
    objectionResponses: true,
    aiAnalysis: true,
  },
});

// Group by agent in memory
const callsByAgent = new Map<string, typeof allCalls>();
for (const call of allCalls) {
  const existing = callsByAgent.get(call.agentId) ?? [];
  existing.push(call);
  callsByAgent.set(call.agentId, existing);
}

// Process each agent's calls
for (const agent of agents) {
  const agentCalls = callsByAgent.get(agent.id) ?? [];
  // Calculate metrics...
}
```

## Acceptance Criteria

- [ ] Only 2 database queries executed (agents + all calls)
- [ ] Response time < 500ms for 50 agents
- [ ] Same output as current implementation
- [ ] Add test to prevent N+1 regression
