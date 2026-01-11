# CallOS - Project Context

## Business Overview

CallOS is a **Sales Call Orchestration & Objection Flow App** - a standardized, integrity-based sales call operating system designed for coaching and consulting businesses.

### Core Value Proposition

- **Guided Call Flow**: 7-milestone structure (M1-M7) that guides agents through discovery, qualification, and close
- **Objection Handling**: 6 objection types with diagnostic questions and handling strategies
- **Real-time Sync**: Presentation slides synced between agent control panel and client view
- **AI-Assisted**: Real-time risk flagging and post-call analysis

### User Roles

| Role | Access | Primary Functions |
|------|--------|-------------------|
| **Agent** | `/dashboard`, `/call/*` | Conduct calls, manage prospects, follow milestone flow |
| **Manager** | `/manager/*` | View team analytics, monitor call performance, coach agents |
| **Admin** | `/admin/*` | Configure milestones, objections, slides, AI prompts, users |

## Call Flow (7 Milestones)

| Code | Name | Purpose |
|------|------|---------|
| M1 | Connection | Build rapport, set agenda |
| M2 | Where They Are | Understand current situation |
| M3 | Where They Want To Be | Clarify goals and vision |
| M4 | Time & Money | Discuss investment capacity |
| M5 | Obstacles & Objections | Surface and address concerns |
| M6 | Present Solution | Tailored offer presentation |
| M7 | Qualify | Final qualification and close |

## 6 Objection Types

1. **Price**: "It's too expensive"
2. **Timing**: "Not the right time"
3. **Capacity/Time**: "I don't have time"
4. **Need to Think**: "I need to think about it"
5. **Partner/Team**: "I need to talk to my partner"
6. **Skepticism**: "Does this really work?"

## Technical Architecture

### Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: Clerk
- **State**: Zustand with persistence
- **Styling**: Tailwind CSS with custom design system
- **Real-time**: Socket.io (planned)

### Directory Structure

```
Sales-OS/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (agent)/           # Agent dashboard & call UI
│   ├── (manager)/         # Manager analytics
│   ├── (admin)/           # Admin configuration
│   └── api/               # API route handlers
├── src/
│   ├── components/        # React components
│   │   ├── ui/           # Design system primitives
│   │   ├── call/         # Call-specific components
│   │   └── layout/       # Layout components
│   ├── hooks/            # Custom React hooks
│   ├── stores/           # Zustand state stores
│   ├── services/         # Business logic layer
│   └── lib/
│       ├── db/           # Prisma client
│       ├── types/        # TypeScript definitions
│       └── utils.ts      # Utility functions
├── prisma/
│   └── schema.prisma     # Database schema
└── .claude/
    └── rules/            # AI agent instructions
```

### Key Entities (from ERD)

| Entity | Purpose |
|--------|---------|
| Organization | Multi-tenant root |
| User | Agents, managers, admins |
| Prospect | Potential coaching clients |
| CallThread | Groups related call sessions |
| CallSession | Individual call instance |
| Milestone | M1-M7 definitions |
| MilestoneResponse | Agent notes per milestone |
| Objection | 6 objection type definitions |
| ObjectionResponse | Objections raised during calls |
| SlideTemplate | Reusable slide designs |
| SlideDeck | Collection of slides per milestone |
| SlideInstance | Active slides in a call |
| PromptConfig | AI prompt configurations |
| AIAnalysis | AI-generated call insights |
| CallOutcome | Call result and next steps |

## Development Guidelines

### Key Rules

1. **Multi-tenancy**: Always filter by `organizationId`
2. **Role-based access**: Check user role before allowing access
3. **Server components by default**: Only use 'use client' when needed
4. **Type safety**: No `any` types, use proper TypeScript
5. **Named exports**: No `export default` except for pages

### API Response Format

```typescript
// Success
{ data: T }

// List with pagination
{
  data: T[],
  pagination: { total, limit, offset, hasMore }
}

// Error
{ error: string }
```

### Testing Strategy

- Unit tests for services
- Integration tests for API routes
- Component tests for UI
- E2E tests for critical flows

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook verification |
| `NEXT_PUBLIC_APP_URL` | Application base URL |

## Related Documentation

- `.claude/rules/backend-architecture.md` - Backend patterns
- `.claude/rules/frontend-architecture.md` - Frontend patterns
- `.claude/rules/design-system.md` - UI design system
- `prisma/schema.prisma` - Database schema
