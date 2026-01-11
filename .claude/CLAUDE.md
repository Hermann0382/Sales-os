# CLAUDE.md — KreativReason Quick Reference

> Global config for AI agents. Read first, follow always.
> Full guide: `~/.claude/docs/KREATIVREASON-GUIDE.md`

## ⛔ CRITICAL: NEVER DO THIS

```
SECURITY
1. NEVER skip tenantId in queries — security breach
2. NEVER trust user input — validate everything
3. NEVER log sensitive data — PII, tokens, passwords
4. NEVER expose stack traces — generic errors to clients

ARCHITECTURE  
5. NEVER put business logic in frontend — API only
6. NEVER put business logic in controllers — services only
7. NEVER query in loops (N+1) — batch everything
8. NEVER use `any` type — find proper type
9. NEVER use `export default` — named exports only

QUALITY
10. NEVER skip writing tests — no PR without tests
11. NEVER hardcode UI text — use content constants
12. NEVER write undocumented functions — JSDoc required
13. NEVER use 'use client' without justification

GIT HYGIENE
14. NEVER mix unrelated changes in one commit — atomic commits
15. NEVER commit in wrong order — types → api → web
16. NEVER use vague commit messages — use type(scope): description
17. NEVER create 50+ file PRs — split into smaller PRs
```

---

## Architecture

```
┌─────────────┐     HTTP/JSON      ┌─────────────┐
│   Web App   │ ─────────────────► │     API     │
│  (Next.js)  │                    │  (Express)  │
└─────────────┘                    └──────┬──────┘
                                          │
┌─────────────┐                           │
│ Mobile App  │ ──────────────────────────┤
└─────────────┘                           ▼
                                   ┌─────────────┐
                                   │ PostgreSQL  │
                                   └─────────────┘
```

**API** = ALL business logic, validation, auth
**Frontend** = UI only, calls API
**Shared** = Types, schemas (contracts)

---

## Stack

```
API:      Express + Prisma + PostgreSQL + Zod
Frontend: Next.js 15 + React 19 + Tailwind + shadcn/ui
Testing:  Jest + Testing Library + Cypress
Package:  npm
```

---

## Project Structure

```
monorepo/
├── apps/
│   ├── api/src/
│   │   └── modules/
│   │       └── {domain}/
│   │           ├── {domain}.routes.ts
│   │           ├── {domain}.controller.ts
│   │           ├── {domain}.service.ts
│   │           ├── {domain}.types.ts
│   │           └── __tests__/
│   │               ├── {domain}.controller.test.ts
│   │               └── {domain}.service.test.ts
│   │   ├── common/
│   │   │   ├── middleware/
│   │   │   ├── errors/
│   │   │   └── utils/
│   │   └── config/
│   └── web/src/
│       ├── app/                # Next.js pages
│       ├── components/         # React components
│       ├── hooks/              # Custom hooks
│       └── constants/content.ts
├── packages/
│   ├── db/                     # Prisma schema
│   └── types/                  # Shared types
└── e2e/                        # Cypress tests
```

---

## Backend Architecture

### Request Flow

```
Request → Route → Controller → Service → Database
            │          │           │
            │          │           └── Business logic + transactions
            │          └── Parse request, format response
            └── URL mapping + middleware
```

### Layer Responsibilities

| Layer | File | Does | Doesn't |
|-------|------|------|---------|
| **Route** | `*.routes.ts` | URL mapping, middleware chain | Logic, try/catch |
| **Controller** | `*.controller.ts` | Parse request, format response | Business logic, DB access |
| **Service** | `*.service.ts` | Business logic, transactions | Access req/res |
| **Types** | `*.types.ts` | Validation schemas, types | Logic |

---

## Core Patterns

### 1. Route — URL Mapping Only

```typescript
// modules/order/order.routes.ts
import { Router } from 'express'
import { orderController } from './order.controller'
import { auth } from '@/common/middleware/auth'
import { validate } from '@/common/middleware/validate'
import { CreateOrderSchema, ShipOrderSchema } from './order.types'

const router = Router()

router.get('/', auth, orderController.findAll)
router.get('/:id', auth, orderController.findOne)
router.post('/', auth, validate(CreateOrderSchema), orderController.create)
router.post('/:id/ship', auth, validate(ShipOrderSchema), orderController.ship)

export { router as orderRoutes }
```

### 2. Controller — HTTP Handling Only

```typescript
// modules/order/order.controller.ts
import { Request, Response, NextFunction } from 'express'
import { orderService } from './order.service'

class OrderController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const orders = await orderService.findAll(req.auth.tenantId, req.query)
      res.json({ data: orders })
    } catch (error) {
      next(error)
    }
  }

  async findOne(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await orderService.findOne(req.params.id, req.auth.tenantId)
      res.json({ data: order })
    } catch (error) {
      next(error)
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await orderService.create(req.auth.tenantId, req.body)
      res.status(201).json({ data: order })
    } catch (error) {
      next(error)
    }
  }

  async ship(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await orderService.ship(req.params.id, req.auth.tenantId, req.body)
      res.json({ data: order })
    } catch (error) {
      next(error)
    }
  }
}

export const orderController = new OrderController()
```

### 3. Service — Business Logic

```typescript
// modules/order/order.service.ts
import { prisma } from '@/config/database'
import { AppError } from '@/common/errors/app-error'
import type { CreateOrderInput, ShipOrderInput } from './order.types'

class OrderService {
  async findAll(tenantId: string, query: Record<string, any>) {
    return prisma.order.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    })
  }

  async findOne(id: string, tenantId: string) {
    const order = await prisma.order.findUnique({
      where: { id, tenantId }
    })

    if (!order) {
      throw new AppError('Order not found', 404)
    }

    return order
  }

  async create(tenantId: string, input: CreateOrderInput) {
    return prisma.order.create({
      data: { tenantId, ...input, status: 'pending' }
    })
  }

  async ship(id: string, tenantId: string, input: ShipOrderInput) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id, tenantId } })

      if (!order) {
        throw new AppError('Order not found', 404)
      }

      if (order.status !== 'paid') {
        throw new AppError('Order must be paid before shipping', 400)
      }

      return tx.order.update({
        where: { id },
        data: {
          status: 'shipped',
          shippedAt: new Date(),
          trackingNumber: input.trackingNumber
        }
      })
    })
  }
}

export const orderService = new OrderService()
```

### 4. Types — Schemas + Types

```typescript
// modules/order/order.types.ts
import { z } from 'zod'

export const CreateOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive()
  })).min(1),
  shippingAddress: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().length(2)
  })
})

export const ShipOrderSchema = z.object({
  trackingNumber: z.string().min(1),
  carrier: z.string().optional()
})

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>
export type ShipOrderInput = z.infer<typeof ShipOrderSchema>
```

### 5. Tenant Isolation (ALWAYS)

```typescript
// ❌ SECURITY BREACH
prisma.order.findMany({ where: { status: 'pending' } })

// ✅ ALWAYS include tenantId
prisma.order.findMany({ where: { tenantId, status: 'pending' } })
```

### 6. Server Components First (Frontend)

```typescript
// ✅ SERVER COMPONENT - data fetching
export default async function OrdersPage() {
  const orders = await apiClient.getOrders()
  return <OrderListView orders={orders} />
}

// Client only when needed for interactivity
'use client'  // Justified: useState, onClick
```

---

## Testing Requirements

| Layer | Test Type | Tool | Coverage |
|-------|-----------|------|----------|
| Services | Unit | Jest | 100% |
| Controllers | Integration | Jest + Supertest | 90% |
| Components | Component | Jest + Testing Library | 70% |
| E2E | End-to-end | Cypress | Critical paths |
| Overall | All | — | 80% min |

### Service Test Example

```typescript
// modules/order/__tests__/order.service.test.ts
import { orderService } from '../order.service'
import { prisma } from '@/config/database'
import { AppError } from '@/common/errors/app-error'

jest.mock('@/config/database')

describe('OrderService', () => {
  describe('ship', () => {
    it('should ship a paid order', async () => {
      const mockOrder = { id: '1', tenantId: 't1', status: 'paid' }
      ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
        return cb({
          order: {
            findUnique: jest.fn().mockResolvedValue(mockOrder),
            update: jest.fn().mockResolvedValue({ ...mockOrder, status: 'shipped' })
          }
        })
      })

      const result = await orderService.ship('1', 't1', { trackingNumber: 'TRK123' })
      
      expect(result.status).toBe('shipped')
    })

    it('should throw if order not paid', async () => {
      const mockOrder = { id: '1', tenantId: 't1', status: 'pending' }
      ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
        return cb({
          order: { findUnique: jest.fn().mockResolvedValue(mockOrder) }
        })
      })

      await expect(
        orderService.ship('1', 't1', { trackingNumber: 'TRK123' })
      ).rejects.toThrow(AppError)
    })
  })
})
```

### Controller Test Example

```typescript
// modules/order/__tests__/order.controller.test.ts
import request from 'supertest'
import { app } from '@/app'
import { orderService } from '../order.service'

jest.mock('../order.service')

describe('OrderController', () => {
  describe('POST /orders/:id/ship', () => {
    it('should return 200 with shipped order', async () => {
      const mockOrder = { id: '1', status: 'shipped' }
      ;(orderService.ship as jest.Mock).mockResolvedValue(mockOrder)

      const response = await request(app)
        .post('/orders/1/ship')
        .set('Authorization', 'Bearer token')
        .send({ trackingNumber: 'TRK123' })

      expect(response.status).toBe(200)
      expect(response.body.data).toEqual(mockOrder)
    })
  })
})
```

---

## Decision Trees

### When to Create New Module

```
Has own DB tables? → NEW MODULE
Distinct business rules? → NEW MODULE
View of existing data? → EXISTING MODULE
Orchestrates modules? → NEW SERVICE
```

### Server vs Client Component

```
useState/useEffect? → 'use client'
onClick handlers? → 'use client'
Just displays data? → Server Component
```

---

## Anti-Patterns → Correct Patterns

| ❌ Never | ✅ Always |
|---------|----------|
| Business logic in controller | Logic in service |
| Missing tenantId | Include in every query |
| Loop queries (N+1) | Batch with `include` or Map |
| `any` type | Proper TypeScript types |
| `export default` | Named exports |
| Hardcoded text | Content constants |
| Controller accessing DB | Service handles DB |
| Service using req/res | Service receives plain data |

---

## Response Formats

```typescript
// Success
{ "data": { ... } }
{ "data": [...], "meta": { "total": 100, "page": 1, "limit": 20 } }

// Error
{ "error": { "message": "...", "code": "ERROR_CODE", "details": {} } }
```

---

## Commands

```bash
# Dev
npm run dev              # All services
npm run dev --filter=api # API only

# Test
npm test                 # All tests
npm run test:coverage    # With coverage
npm run test:e2e         # Cypress

# Database
npx prisma studio        # GUI
npx prisma migrate dev   # Migrations

# Quality
npm run type-check
npm run lint
```

---

## PR Checklist

```
□ Tests written for new code
□ npm test passes
□ npm run type-check passes
□ No `any` types
□ tenantId in all queries
□ Business logic in services only
□ Controllers are thin
□ JSDoc on public methods
□ Content constants used
□ Loading/error states (frontend)
```

---

## Files to Create for New Module

```
apps/api/src/modules/{name}/
├── {name}.routes.ts           # URL mapping
├── {name}.controller.ts       # HTTP handling
├── {name}.service.ts          # Business logic
├── {name}.types.ts            # Schemas + types
└── __tests__/
    ├── {name}.service.test.ts     # Unit tests ← REQUIRED
    └── {name}.controller.test.ts  # Integration tests ← REQUIRED
```

---

## Git & PR Guidelines

### Commit Message Format

```
<type>(<scope>): <description>
```

| Type | When |
|------|------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change (no new feature/fix) |
| `test` | Adding tests |
| `docs` | Documentation |
| `chore` | Config, deps, tooling |

| Scope | Path |
|-------|------|
| `types` | `packages/types/` |
| `db` | `packages/db/` |
| `api` | `apps/api/` |
| `web` | `apps/web/` |
| `e2e` | `e2e/` |

### Commit Order (Dependencies First)

```
1st: packages/types   → Shared contracts
2nd: packages/db      → Database schema
3rd: apps/api         → Backend
4th: apps/web         → Frontend
5th: tests            → Validation
```

### PR Structure

```
PR #42: "Add user profile feature"

Commits:
├── feat(types): add UserProfile interface
├── feat(api): add profile endpoints
├── feat(web): add ProfileCard component
└── test(api): add profile tests
```

### PR Size Limits

| Size | Files | Action |
|------|-------|--------|
| Small | 1-10 | ✅ Ideal |
| Medium | 10-30 | ✅ Acceptable |
| Large | 30-50 | ⚠️ Consider splitting |
| XL | 50+ | ❌ Must split |

### ❌ Never Do

```bash
# Giant mixed commit
feat: add profile feature  # 47 files, can't revert partially

# Wrong order
feat(web): add UI          # Depends on API that doesn't exist yet
feat(api): add endpoint
feat(types): add type      # Should be FIRST

# Vague messages
fix: stuff
update: changes
```

---

**Full documentation:** `~/.claude/docs/KREATIVREASON-GUIDE.md` (v7.0)
