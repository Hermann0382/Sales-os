# Backend Architecture Rules

## Overview

CallOS uses a modular monolith architecture with domain-driven design principles. The backend is built with Next.js API routes, Prisma ORM, and PostgreSQL.

## Directory Structure

```
src/
├── lib/
│   ├── db/           # Prisma client singleton
│   ├── types/        # TypeScript type definitions
│   └── utils.ts      # Utility functions
├── services/         # Business logic layer
│   ├── call-service/
│   ├── milestone-service/
│   ├── objection-service/
│   ├── ai-service/
│   ├── zoom-service/
│   └── ghl-service/
├── stores/           # Zustand state management
└── hooks/            # React hooks
app/
└── api/              # Next.js API routes
    ├── calls/
    ├── prospects/
    ├── milestones/
    ├── objections/
    ├── users/
    └── webhooks/
```

## API Route Patterns

### Route Handler Structure

All API routes should follow this pattern:

```typescript
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user and verify organization access
    const user = await db.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, organizationId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Business logic here...

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Response Format

All API responses should use a consistent format:

```typescript
// Success response
{ data: T }

// List response with pagination
{
  data: T[],
  pagination: {
    total: number,
    limit: number,
    offset: number,
    hasMore: boolean
  }
}

// Error response
{ error: string }
```

## Service Layer

Services encapsulate business logic and database operations:

```typescript
// src/services/call-service/call-service.ts
import { db } from '@/lib/db';
import { CallSession, CallStatus } from '@/lib/types';

export const callService = {
  async getById(id: string, organizationId: string): Promise<CallSession | null> {
    return db.callSession.findFirst({
      where: { id, organizationId },
      include: { prospect: true, agent: true },
    });
  },

  async updateStatus(id: string, status: CallStatus): Promise<CallSession> {
    return db.callSession.update({
      where: { id },
      data: { status },
    });
  },
};
```

## Database Patterns

### Always Filter by Organization

All queries must filter by `organizationId` for multi-tenancy:

```typescript
// CORRECT
const calls = await db.callSession.findMany({
  where: {
    organizationId: user.organizationId,
    status: 'IN_PROGRESS',
  },
});

// WRONG - security vulnerability
const calls = await db.callSession.findMany({
  where: { status: 'IN_PROGRESS' },
});
```

### Use Transactions for Complex Operations

```typescript
const result = await db.$transaction(async (tx) => {
  const call = await tx.callSession.update({
    where: { id: callId },
    data: { status: 'COMPLETED' },
  });

  await tx.callOutcome.create({
    data: { callSessionId: callId, type: 'COACHING_CLIENT' },
  });

  return call;
});
```

## Authentication & Authorization

### Clerk Integration

All routes use Clerk for authentication:

```typescript
import { auth } from '@clerk/nextjs/server';

const { userId } = await auth();
if (!userId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Role-Based Access Control

User roles: `ADMIN`, `MANAGER`, `AGENT`

```typescript
// Check role for admin-only operations
if (user.role !== 'ADMIN') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// Check for manager or above
if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

## Error Handling

### Standard Error Response

```typescript
try {
  // ...
} catch (error) {
  console.error('Descriptive context:', error);
  return NextResponse.json(
    { error: 'User-friendly message' },
    { status: 500 }
  );
}
```

### Validation Errors

```typescript
if (!requiredField) {
  return NextResponse.json(
    { error: 'Field is required' },
    { status: 400 }
  );
}
```

## Naming Conventions

- **Files**: kebab-case (`call-service.ts`)
- **Types**: PascalCase (`CallSession`)
- **Functions**: camelCase (`getCallById`)
- **API Routes**: kebab-case paths (`/api/call-sessions`)
- **Database**: PascalCase models, snake_case fields in Prisma

## Common Pitfalls to Avoid

1. Never expose raw database errors to clients
2. Always validate user has access to requested resource
3. Always filter by organizationId
4. Use proper HTTP status codes
5. Never store secrets in code - use environment variables
6. Always sanitize user input before database queries
