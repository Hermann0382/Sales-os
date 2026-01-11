# Sprint 1: Core Call Flow Engine - Implementation Plan

**Project:** CallOS - Sales Call Orchestration & Objection Flow App
**Sprint Duration:** 2 weeks
**Total Story Points:** 52
**Team Capacity:** 40 hours/week

---

## 1. Overview and Objectives

### Sprint Goal
Deliver the foundational call flow engine that enables sales agents to execute structured, milestone-based sales calls with pre-call qualification enforcement and role-based access control.

### Key Deliverables
1. **Database Schema & Migrations** - All 15 entities with relationships
2. **Authentication & Authorization** - JWT auth with RBAC (Agent/Manager/Admin)
3. **Call Flow Engine** - Sequential milestone execution with state machine
4. **Pre-Call Checklist** - Qualification gate enforcement (500+ clients)
5. **Control Panel UI** - Agent-facing interface for call execution
6. **Follow-Up Support** - Call thread linking and context resume

### Success Criteria
- [ ] All 7 milestones execute sequentially with required fields
- [ ] Pre-call checklist enforces qualification gate (>=500 clients)
- [ ] Notes capture and milestone responses persist correctly
- [ ] Strict vs flexible mode toggle works with override logging
- [ ] Three roles (Agent/Manager/Admin) with distinct permissions enforced
- [ ] Follow-up calls display previous call context and unresolved objections

---

## 2. Epics and Tasks

### EPIC-001: Core Call Flow Engine (34 SP)
Foundation system for milestone-based call execution.

### EPIC-005: Follow-Up & CRM Integration - Partial (18 SP)
Follow-up call support with context resume.

### EPIC-007: Role-Based Access Control (16 SP)
Multi-tier user roles with permission enforcement.

---

## 3. Task Breakdown with Acceptance Criteria

### Phase 1: Infrastructure & Database (Days 1-3)

#### TASK-001: Set up project infrastructure and monorepo
**Story Points:** 5 | **Estimated Hours:** 8 | **Assignee:** backend_developer

**Description:**
Initialize git repository, configure build pipeline, set up development environment, Docker containerization.

**Acceptance Criteria:**
- [ ] Git repo initialized with proper branch strategy (main, develop, feature/*)
- [ ] Docker Compose set up for local development (postgres, app)
- [ ] CI/CD pipeline configured (linting, tests, build)
- [ ] Development environment documented in README
- [ ] Package dependencies locked and reproducible (package-lock.json)

**Definition of Done:**
- [ ] Code committed to main branch
- [ ] CI pipeline passing on GitHub Actions
- [ ] README with setup instructions (<5 min setup)
- [ ] Team can clone and run locally within 5 minutes

**Files to Create:**
```
.github/workflows/ci.yml
docker-compose.yml
package.json
tsconfig.json
README.md
.env.example
```

**Testing Strategy:**
```bash
# Verify Docker builds
docker-compose up --build

# Verify CI passes
npm run lint && npm run test
```

---

#### TASK-002: Create database schema and migrations
**Story Points:** 8 | **Estimated Hours:** 16 | **Assignee:** backend_developer
**Dependencies:** TASK-001

**Description:**
Implement 15 database entities from ERD with proper relationships, indexes, constraints, and initial seed data.

**Acceptance Criteria:**
- [ ] All 15 entities created with correct attributes and types
- [ ] All 27 relationships defined with proper foreign keys
- [ ] Unique and check constraints applied
- [ ] Indexes created on high-query columns
- [ ] Migration system working (forward and rollback)
- [ ] Seed data for milestones (M1-M7) and objections (6 types) loaded
- [ ] Multi-tenancy isolation enforced at database level

**Entities to Implement:**
| Entity | Table Name | Priority |
|--------|------------|----------|
| ENT-001 Organization | organizations | High |
| ENT-002 User | users | High |
| ENT-003 Prospect | prospects | High |
| ENT-004 Milestone | milestones | High |
| ENT-005 CallThread | call_threads | High |
| ENT-006 CallSession | call_sessions | High |
| ENT-007 MilestoneResponse | milestone_responses | High |
| ENT-008 Objection | objections | Medium |
| ENT-009 ObjectionResponse | objection_responses | Medium |
| ENT-010 SlideTemplate | slide_templates | Low |
| ENT-011 SlideDeck | slide_decks | Low |
| ENT-012 SlideInstance | slide_instances | Low |
| ENT-013 PromptConfig | prompt_configs | Low |
| ENT-014 AIAnalysis | ai_analyses | Low |
| ENT-015 CallOutcome | call_outcomes | High |

**Files to Create/Modify:**
```
prisma/schema.prisma (already exists - verify complete)
prisma/migrations/001_initial_schema/migration.sql
prisma/seed.ts
```

**Seed Data:**
```typescript
// 7 Milestones
const milestones = [
  { milestone_number: 1, title: "M1 Context & Frame", objective: "Establish shared understanding...", duration: 5 },
  { milestone_number: 2, title: "M2 Current State Mapping", objective: "Map prospect's operational reality...", duration: 20 },
  { milestone_number: 3, title: "M3 Outcome Vision", objective: "Capture prospect's desired future state", duration: 15 },
  { milestone_number: 4, title: "M4 System Reality Check", objective: "Reveal hidden cost of manual implementation", duration: 10 },
  { milestone_number: 5, title: "M5 Solution Mapping", objective: "Present system leverage vs manual execution", duration: 15 },
  { milestone_number: 6, title: "M6 Offer Presentation", objective: "Present coaching infrastructure investment", duration: 10 },
  { milestone_number: 7, title: "M7 Decision Point", objective: "Request explicit decision with forced choice", duration: 5 }
];

// 6 Objection Types
const objections = [
  { type: "Price", questions: ["Compared to what?", "Classify comparison", "6-month payback check"] },
  { type: "Timing", questions: ["What would need to change?", "Identify type", "Future projection", "Delay cost"] },
  { type: "Capacity_Time", questions: ["Manual overload vs project resistance?", "Core fear", "Reality check"] },
  { type: "Need_to_Think", questions: ["What specifically?", "Isolate variable", "Containment"] },
  { type: "Partner_Team", questions: ["Authority clarification", "Pre-solve concerns", "Equip summary"] },
  { type: "Skepticism", questions: ["Validate experience", "Pattern recognition", "Structural difference"] }
];
```

**Testing Strategy:**
```bash
# Run migrations
npx prisma migrate dev

# Verify schema
npx prisma db push

# Run seed
npx prisma db seed

# Test rollback
npx prisma migrate reset
```

---

### Phase 2: Authentication & Authorization (Days 3-5)

#### TASK-003: Build User authentication and authorization system
**Story Points:** 8 | **Estimated Hours:** 16 | **Assignee:** fullstack_developer
**Dependencies:** TASK-002

**Description:**
Implement JWT-based authentication, role-based access control, session management, and audit logging.

**Acceptance Criteria:**
- [ ] JWT token generation and validation working
- [ ] Three roles (Agent, Manager, Admin) with distinct permissions
- [ ] Row-level security on call data enforced
- [ ] Login/logout flows implemented
- [ ] Session timeout after 2 hours of inactivity
- [ ] Audit log records all admin actions with timestamps
- [ ] Password hashing using bcrypt with salt rounds (12)
- [ ] Rate limiting on login attempts (5 max per 15 min)

**Permission Matrix:**
| Action | Agent | Manager | Admin |
|--------|-------|---------|-------|
| Create/run calls | Yes | Yes | Yes |
| View own calls | Yes | Yes | Yes |
| View team calls | No | Yes | Yes |
| Review analytics | No | Yes | Yes |
| Configure milestones | No | No | Yes |
| Edit prompts | No | No | Yes |
| Manage users | No | No | Yes |

**Files to Create:**
```
src/lib/auth/jwt.ts
src/lib/auth/rbac.ts
src/lib/auth/middleware.ts
src/lib/auth/audit.ts
app/api/auth/[...nextauth]/route.ts (or Clerk integration)
```

**API Endpoints:**
```typescript
POST /api/auth/login     // Returns JWT
POST /api/auth/logout    // Invalidates session
POST /api/auth/refresh   // Refresh token
GET  /api/auth/me        // Current user
```

**Testing Strategy:**
```bash
# Unit tests
npm run test -- src/lib/auth

# Integration tests
npm run test:e2e -- auth
```

---

### Phase 3: Core Services (Days 5-8)

#### TASK-004: Implement Call Session model and service layer
**Story Points:** 5 | **Estimated Hours:** 12 | **Assignee:** backend_developer
**Dependencies:** TASK-002, TASK-003

**Description:**
Build CallSession entity management, state machine, and core business logic for call lifecycle.

**Acceptance Criteria:**
- [ ] CallSession created with all required fields (prospect, agent, call_thread, status, mode, language)
- [ ] Call status state machine enforces valid transitions
- [ ] CallThread groups primary and follow-up calls correctly
- [ ] Session persists all milestone responses with timestamps
- [ ] Cannot start call until pre-call checklist complete
- [ ] Qualification gate enforced (blocks coaching pitch if < 500 clients)

**State Machine:**
```
scheduled --> in_progress --> completed
     |              |
     v              v
 cancelled      cancelled
```

**Files to Create:**
```
src/services/CallSessionService.ts
src/lib/types/call.ts
src/lib/state-machine/call-state.ts
```

**API Endpoints:**
```typescript
POST   /api/calls                  // Create call session
GET    /api/calls/:id              // Get call details
PATCH  /api/calls/:id/status       // Update status (state machine)
POST   /api/calls/:id/start        // Start call (validates checklist)
POST   /api/calls/:id/complete     // Complete call
DELETE /api/calls/:id              // Cancel call
```

---

#### TASK-005: Create pre-call checklist API endpoints
**Story Points:** 3 | **Estimated Hours:** 8 | **Assignee:** backend_developer
**Dependencies:** TASK-004

**Description:**
Build REST API for checklist retrieval, item validation, and gate enforcement before call starts.

**Acceptance Criteria:**
- [ ] GET /calls/:id/checklist returns 8-item checklist with completion status
- [ ] POST /calls/:id/validate-checklist validates all items checked
- [ ] Qualification gate: returns 403 if client_count < 500
- [ ] Flexibility mode: logs override reasons when applicable
- [ ] Cannot start call without checklist completion
- [ ] Response includes helpful messages and field requirements

**Checklist Items:**
```typescript
const preCallChecklist = [
  { id: 1, item: "Qualification form reviewed", required: true },
  { id: 2, item: "Client count confirmed (>=500)", required: true, gate: true },
  { id: 3, item: "Business type confirmed", required: true },
  { id: 4, item: "Revenue range noted", required: true },
  { id: 5, item: "Main pain identified", required: true },
  { id: 6, item: "Tool stack noted", required: false },
  { id: 7, item: "ROI tool ready", required: false },
  { id: 8, item: "Time block clear (90 min)", required: true }
];
```

**Files to Create:**
```
src/services/ChecklistService.ts
src/lib/validators/checklistValidator.ts
app/api/calls/[id]/checklist/route.ts
```

---

#### TASK-006: Build Milestone data model and service
**Story Points:** 5 | **Estimated Hours:** 12 | **Assignee:** backend_developer
**Dependencies:** TASK-002

**Description:**
Implement milestone retrieval, sequencing, and field management for 7-milestone call structure.

**Acceptance Criteria:**
- [ ] Load all 7 milestones in correct order with objectives and questions
- [ ] Milestone fields include: title, objective, required_questions, confirmations, estimated_duration_minutes
- [ ] Enforce sequential milestone progression in strict mode
- [ ] Allow milestone override in flexible mode with reason logging
- [ ] Return estimated duration for UX time estimates
- [ ] Support per-organization milestone customization

**Files to Create:**
```
src/services/MilestoneService.ts
app/api/milestones/route.ts
app/api/milestones/[id]/route.ts
```

**7 Core Milestones:**
| # | Title | Duration | Key Fields |
|---|-------|----------|------------|
| M1 | Context & Frame | 5 min | reason_for_call, confirmed_expectation |
| M2 | Current State Mapping | 20 min | client_count, revenue_volatility, main_pain |
| M3 | Outcome Vision | 15 min | desired_outcome, cost_of_inaction |
| M4 | System Reality Check | 10 min | understands_effort, acknowledges_risk |
| M5 | Solution Mapping | 15 min | sees_leverage, understands_scope |
| M6 | Offer Presentation | 10 min | price_shown, payment_plan_selected |
| M7 | Decision Point | 5 min | decision (Proceed/Pause/Decline) |

---

#### TASK-007: Build MilestoneResponse tracking service
**Story Points:** 5 | **Estimated Hours:** 10 | **Assignee:** backend_developer
**Dependencies:** TASK-002, TASK-006

**Description:**
Implement response capture, field checkoff tracking, and notes persistence for milestone execution.

**Acceptance Criteria:**
- [ ] Create MilestoneResponse on milestone start with status 'in_progress'
- [ ] Update required_items_checked as agent marks items
- [ ] Save agent notes with timestamps
- [ ] Mark milestone complete only when all required items checked (strict mode)
- [ ] Log override reason when skipping milestone (flexible mode)
- [ ] Track started_at and completed_at timestamps
- [ ] Prevent duplicate responses for same milestone in same call

**Files to Create:**
```
src/services/MilestoneResponseService.ts
app/api/calls/[id]/milestones/[milestoneId]/route.ts
app/api/calls/[id]/milestones/[milestoneId]/response/route.ts
```

---

### Phase 4: Follow-Up Support (Days 8-9)

#### TASK-020: Implement follow-up call support backend
**Story Points:** 5 | **Estimated Hours:** 12 | **Assignee:** backend_developer
**Dependencies:** TASK-002, TASK-004

**Description:**
Build call thread linking, context resume, and unresolved objection tracking for follow-ups.

**Acceptance Criteria:**
- [ ] CallThread groups primary call with follow-up sessions
- [ ] GET /call-threads/:prospect_id returns full conversation history
- [ ] GET /calls/:id/context returns previous summary, last milestone, unresolved objections
- [ ] Unresolved objections surfaced with type, content, previous outcome
- [ ] Agent can choose resume point: continue from milestone vs jump to decision
- [ ] Follow-up call inherits language preference from primary call
- [ ] Support multi-call threads (3+ calls in sequence)

**Files to Create:**
```
src/services/FollowUpService.ts
src/services/CallThreadService.ts
app/api/call-threads/[prospectId]/route.ts
app/api/calls/[id]/context/route.ts
```

---

### Phase 5: Frontend - Control Panel (Days 9-12)

#### TASK-008: Create control panel UI component (React)
**Story Points:** 8 | **Estimated Hours:** 20 | **Assignee:** frontend_developer
**Dependencies:** TASK-004, TASK-005, TASK-006

**Description:**
Build agent-facing control panel with milestone display, checklist, notes, objection triggers, and slides navigator.

**Acceptance Criteria:**
- [ ] Control panel displays current milestone with objective and timer
- [ ] Required items checklist visible with check/uncheck capability
- [ ] Notes textarea with autosave and character limit (2000 chars)
- [ ] Milestone progress indicator (e.g., 2/7 complete)
- [ ] Objection trigger button always accessible
- [ ] Slide navigator buttons (prev/next) linked to presentation view
- [ ] Confirmation checkboxes (when required by milestone)
- [ ] No client-sensitive information visible if screen shared
- [ ] Mobile-responsive layout for tablets

**Component Structure:**
```
src/components/call-control/
  ControlPanel.tsx           # Main container
  MilestoneDisplay.tsx       # Current milestone view
  ChecklistPanel.tsx         # Required items checklist
  NotesEditor.tsx            # Agent notes with autosave
  ProgressIndicator.tsx      # Milestone progress bar
  ObjectionTrigger.tsx       # Button to open objection flow
  TimerDisplay.tsx           # Milestone timer
  NavigationControls.tsx     # Prev/Next milestone buttons
```

**State Management:**
```typescript
interface CallControlState {
  currentMilestone: number;
  milestoneResponses: MilestoneResponse[];
  checklist: ChecklistItem[];
  notes: string;
  callStatus: CallStatus;
  mode: 'strict' | 'flexible';
  objectionOpen: boolean;
}
```

---

#### TASK-021: Build follow-up call UI flow
**Story Points:** 5 | **Estimated Hours:** 12 | **Assignee:** frontend_developer
**Dependencies:** TASK-020, TASK-008

**Description:**
Create UI for selecting follow-up call, displaying context, unresolved objections, and resume point selection.

**Acceptance Criteria:**
- [ ] Follow-up call selector shows scheduled follow-ups
- [ ] Context display: previous call summary, last milestone, objections, qualification flags
- [ ] Unresolved objections list with type, status, previous interaction
- [ ] Resume point selector: buttons for 'Continue from M#' vs 'Jump to Decision'
- [ ] Confirmation before call starts
- [ ] Mobile-friendly layout
- [ ] Clear visual hierarchy showing context vs current action

**Files to Create:**
```
src/components/call-control/FollowUpCallSetup.tsx
src/components/call-control/PreviousCallContext.tsx
src/components/call-control/ResumePointSelector.tsx
```

---

### Phase 6: Testing & Integration (Days 12-14)

#### TASK-027: End-to-end testing for Sprint 1 features
**Story Points:** 5 | **Estimated Hours:** 12 | **Assignee:** qa_developer

**Description:**
Write and execute end-to-end tests covering all Sprint 1 functionality.

**Test Scenarios:**
1. **Authentication Flow**
   - Agent login with valid credentials
   - Manager login sees team data
   - Admin login accesses config panel
   - Invalid credentials rejected
   - Session timeout after 2 hours

2. **Call Creation Flow**
   - Create new call with prospect
   - Pre-call checklist loads
   - Cannot start without checklist completion
   - Qualification gate blocks unqualified prospects

3. **Milestone Execution Flow**
   - Navigate through M1-M7 sequentially
   - Check required items
   - Save notes
   - Complete milestone
   - Skip milestone in flexible mode with reason

4. **Follow-Up Flow**
   - Create follow-up call for prospect
   - Previous context loads correctly
   - Resume from specific milestone
   - Unresolved objections displayed

**Files to Create:**
```
tests/e2e/auth.spec.ts
tests/e2e/call-creation.spec.ts
tests/e2e/milestone-execution.spec.ts
tests/e2e/follow-up.spec.ts
```

---

## 4. File-by-File Implementation Order

### Day 1-2: Infrastructure
```
1. .github/workflows/ci.yml
2. docker-compose.yml
3. package.json (dependencies)
4. tsconfig.json
5. .env.example
6. README.md
```

### Day 2-3: Database
```
7. prisma/schema.prisma (verify complete)
8. prisma/migrations/001_initial_schema/migration.sql
9. prisma/seed.ts
10. src/lib/db/client.ts
```

### Day 3-4: Authentication
```
11. src/lib/auth/jwt.ts
12. src/lib/auth/rbac.ts
13. src/lib/auth/middleware.ts
14. src/lib/auth/audit.ts
15. app/api/auth/[...nextauth]/route.ts
```

### Day 4-6: Core Services
```
16. src/lib/types/call.ts
17. src/lib/state-machine/call-state.ts
18. src/services/CallSessionService.ts
19. src/services/ChecklistService.ts
20. src/services/MilestoneService.ts
21. src/services/MilestoneResponseService.ts
22. src/lib/validators/checklistValidator.ts
```

### Day 6-7: API Routes
```
23. app/api/calls/route.ts
24. app/api/calls/[id]/route.ts
25. app/api/calls/[id]/checklist/route.ts
26. app/api/calls/[id]/start/route.ts
27. app/api/calls/[id]/milestones/[milestoneId]/route.ts
28. app/api/milestones/route.ts
```

### Day 7-8: Follow-Up
```
29. src/services/CallThreadService.ts
30. src/services/FollowUpService.ts
31. app/api/call-threads/[prospectId]/route.ts
32. app/api/calls/[id]/context/route.ts
```

### Day 8-11: Frontend Components
```
33. src/components/call-control/ControlPanel.tsx
34. src/components/call-control/MilestoneDisplay.tsx
35. src/components/call-control/ChecklistPanel.tsx
36. src/components/call-control/NotesEditor.tsx
37. src/components/call-control/ProgressIndicator.tsx
38. src/components/call-control/ObjectionTrigger.tsx
39. src/components/call-control/TimerDisplay.tsx
40. src/components/call-control/NavigationControls.tsx
41. src/components/call-control/FollowUpCallSetup.tsx
42. src/components/call-control/PreviousCallContext.tsx
43. src/hooks/useCallSession.ts
44. src/hooks/useMilestone.ts
45. src/stores/callStore.ts
```

### Day 11-12: Pages
```
46. app/(agent)/call/new/page.tsx
47. app/(agent)/call/[callId]/presentation/page.tsx
48. app/(agent)/dashboard/page.tsx
```

### Day 12-14: Testing
```
49. tests/unit/services/CallSessionService.test.ts
50. tests/unit/services/MilestoneService.test.ts
51. tests/unit/services/ChecklistService.test.ts
52. tests/e2e/auth.spec.ts
53. tests/e2e/call-creation.spec.ts
54. tests/e2e/milestone-execution.spec.ts
```

---

## 5. Database Migrations Needed

### Migration 001: Initial Schema
Already defined in `prisma/schema.prisma`. Run:
```bash
npx prisma migrate dev --name init
```

### Seed Data Required
```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create default organization
  const org = await prisma.organization.create({
    data: { name: 'LeadTunnel' }
  });

  // Seed 7 milestones
  const milestones = [
    {
      organizationId: org.id,
      milestoneNumber: 1,
      title: 'M1 Context & Frame',
      objective: 'Establish shared understanding of call scope and diagnostic intent',
      requiredQuestions: JSON.stringify([
        'What brought you to this call today?',
        'Have you confirmed this is a diagnostic, not a pitch?'
      ]),
      confirmations: JSON.stringify(['Confirmed expectation']),
      estimatedDurationMinutes: 5,
      orderIndex: 1
    },
    // ... M2-M7
  ];

  for (const m of milestones) {
    await prisma.milestone.create({ data: m });
  }

  // Seed 6 objection types
  const objections = [
    {
      organizationId: org.id,
      objectionType: 'Price',
      diagnosticQuestions: JSON.stringify([
        'Compared to what?',
        'Classify comparison (software/coaching/income/fear)',
        'Structural check: 6-month payback question'
      ]),
      allowedOutcomes: JSON.stringify(['Resolved', 'Deferred', 'Disqualified'])
    },
    // ... Timing, Capacity_Time, Need_to_Think, Partner_Team, Skepticism
  ];

  for (const o of objections) {
    await prisma.objection.create({ data: o });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## 6. API Endpoints to Create

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Authenticate user, return JWT |
| POST | /api/auth/logout | Invalidate session |
| POST | /api/auth/refresh | Refresh JWT token |
| GET | /api/auth/me | Get current user info |

### Calls
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/calls | Create new call session |
| GET | /api/calls | List agent's calls |
| GET | /api/calls/:id | Get call details |
| PATCH | /api/calls/:id | Update call (mode, language) |
| POST | /api/calls/:id/start | Start call (validates checklist) |
| POST | /api/calls/:id/complete | Complete call |
| DELETE | /api/calls/:id | Cancel call |

### Checklist
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/calls/:id/checklist | Get checklist items |
| PATCH | /api/calls/:id/checklist | Update checklist items |
| POST | /api/calls/:id/validate-checklist | Validate and enforce gate |

### Milestones
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/milestones | List all milestones |
| GET | /api/milestones/:id | Get milestone details |
| GET | /api/calls/:id/milestones | Get call's milestone responses |
| POST | /api/calls/:id/milestones/:mId/start | Start milestone |
| PATCH | /api/calls/:id/milestones/:mId | Update response/notes |
| POST | /api/calls/:id/milestones/:mId/complete | Complete milestone |
| POST | /api/calls/:id/milestones/:mId/skip | Skip with reason |

### Follow-Up
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/call-threads/:prospectId | Get prospect's call history |
| GET | /api/calls/:id/context | Get follow-up context |
| POST | /api/calls/:id/resume | Resume from milestone |

---

## 7. Components to Build

### Core Components
```typescript
// Control Panel Components
src/components/call-control/
  ControlPanel.tsx              // Main container
  MilestoneDisplay.tsx          // Current milestone view
  ChecklistPanel.tsx            // Required items checklist
  NotesEditor.tsx               // Agent notes with autosave
  ProgressIndicator.tsx         // Milestone progress bar
  ObjectionTrigger.tsx          // Button to open objection flow
  TimerDisplay.tsx              // Milestone timer
  NavigationControls.tsx        // Prev/Next milestone buttons

// Follow-Up Components
  FollowUpCallSetup.tsx         // Follow-up selection and context
  PreviousCallContext.tsx       // Previous call summary display
  ResumePointSelector.tsx       // Resume point selection

// Layout Components
src/components/layout/
  AgentLayout.tsx               // Agent dashboard layout
  CallHeader.tsx                // Call session header
  Sidebar.tsx                   // Navigation sidebar
```

### Hooks
```typescript
src/hooks/
  useCallSession.ts             // Call session state and actions
  useMilestone.ts               // Milestone navigation and updates
  useChecklist.ts               // Checklist state management
  useAuth.ts                    // Authentication state
```

### Stores (Zustand)
```typescript
src/stores/
  callStore.ts                  // Call session state
  authStore.ts                  // Authentication state
  uiStore.ts                    // UI state (modals, panels)
```

---

## 8. Testing Strategy

### Unit Tests (Jest)
```
tests/unit/
  services/
    CallSessionService.test.ts
    MilestoneService.test.ts
    MilestoneResponseService.test.ts
    ChecklistService.test.ts
    FollowUpService.test.ts
  lib/
    auth/jwt.test.ts
    auth/rbac.test.ts
    validators/checklistValidator.test.ts
    state-machine/call-state.test.ts
```

### Integration Tests (Jest + Supertest)
```
tests/integration/
  api/
    auth.test.ts
    calls.test.ts
    milestones.test.ts
    checklist.test.ts
```

### E2E Tests (Playwright)
```
tests/e2e/
  auth.spec.ts
  call-creation.spec.ts
  milestone-execution.spec.ts
  follow-up.spec.ts
```

### Test Commands
```bash
# Run all tests
npm run test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run with coverage
npm run test:coverage
```

---

## 9. Dependencies and Risks

### Dependencies
| Dependency | Type | Impact | Mitigation |
|------------|------|--------|------------|
| Prisma schema complete | Internal | High | Already defined, verify before starting |
| Clerk/NextAuth setup | External | Medium | Use existing Clerk integration |
| UI design system | Internal | Medium | Use TailwindCSS + shadcn/ui |

### Technical Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| State machine complexity | Medium | High | Thorough testing, clear documentation |
| Pre-call gate edge cases | Medium | Medium | Define all scenarios upfront |
| WebSocket not in Sprint 1 | Low | Low | Use polling for real-time updates |
| Database performance | Low | Medium | Index optimization, query analysis |

### Business Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Milestone content changes | Medium | Low | Database-driven, easily updateable |
| Qualification threshold changes | Low | Low | Configurable via admin settings |
| Role permissions unclear | Low | Medium | Document in PRD, verify with stakeholders |

---

## 10. Sprint Schedule

### Week 1 (Days 1-7)
| Day | Focus | Tasks |
|-----|-------|-------|
| 1 | Infrastructure | TASK-001 (setup) |
| 2 | Database | TASK-002 (schema, migrations) |
| 3 | Database + Auth | TASK-002 (seed), TASK-003 (start) |
| 4 | Auth | TASK-003 (complete) |
| 5 | Core Services | TASK-004, TASK-006 |
| 6 | Core Services | TASK-005, TASK-007 |
| 7 | Follow-Up Backend | TASK-020 |

### Week 2 (Days 8-14)
| Day | Focus | Tasks |
|-----|-------|-------|
| 8 | Frontend Start | TASK-008 (control panel) |
| 9 | Frontend | TASK-008 (continue) |
| 10 | Frontend | TASK-008, TASK-021 |
| 11 | Frontend | TASK-021 (complete) |
| 12 | Testing | TASK-027 (unit tests) |
| 13 | Testing | TASK-027 (integration tests) |
| 14 | Testing + Polish | TASK-027 (e2e), bug fixes |

---

## 11. Definition of Done (Sprint)

- [ ] All 7 tasks completed and merged to develop branch
- [ ] All unit tests passing (>80% coverage on services)
- [ ] All integration tests passing
- [ ] E2E tests covering critical paths
- [ ] No critical or high-severity bugs
- [ ] API documentation complete (OpenAPI spec)
- [ ] Database migrations tested (forward and rollback)
- [ ] Code reviewed by at least one team member
- [ ] Performance benchmarks met:
  - Page load < 2 seconds
  - API response < 500ms
  - Database queries < 100ms
- [ ] Security review completed for auth system
- [ ] Sprint demo completed with stakeholders

---

## 12. Handoff Notes for `/kreativreason:work`

### Context Files for Each Task

**TASK-001 (Infrastructure):**
```
beginning_context: []
end_state_files: [".github/workflows/ci.yml", "docker-compose.yml", "package.json"]
read_only_files: ["docs/prd.json", "docs/erd.json"]
```

**TASK-002 (Database):**
```
beginning_context: ["docs/erd.json", "prisma/schema.prisma"]
end_state_files: ["prisma/migrations/001_initial_schema/", "prisma/seed.ts"]
read_only_files: ["docs/erd.json"]
```

**TASK-003 (Auth):**
```
beginning_context: ["docs/prd.json", "prisma/schema.prisma"]
end_state_files: ["src/lib/auth/jwt.ts", "src/lib/auth/rbac.ts", "src/lib/auth/middleware.ts"]
read_only_files: ["docs/prd.json"]
```

**TASK-004 (CallSession):**
```
beginning_context: ["docs/erd.json", "prisma/schema.prisma"]
end_state_files: ["src/services/CallSessionService.ts", "app/api/calls/route.ts"]
read_only_files: ["docs/erd.json", "docs/flow.json"]
```

**TASK-005 (Checklist):**
```
beginning_context: ["docs/prd.json", "src/services/CallSessionService.ts"]
end_state_files: ["src/services/ChecklistService.ts", "app/api/calls/[id]/checklist/route.ts"]
read_only_files: ["docs/prd.json"]
```

**TASK-006 (Milestone):**
```
beginning_context: ["docs/erd.json", "prisma/schema.prisma"]
end_state_files: ["src/services/MilestoneService.ts", "app/api/milestones/route.ts"]
read_only_files: ["docs/erd.json"]
```

**TASK-007 (MilestoneResponse):**
```
beginning_context: ["docs/erd.json", "src/services/MilestoneService.ts"]
end_state_files: ["src/services/MilestoneResponseService.ts"]
read_only_files: ["docs/erd.json"]
```

**TASK-020 (Follow-Up):**
```
beginning_context: ["docs/erd.json", "src/services/CallSessionService.ts"]
end_state_files: ["src/services/FollowUpService.ts", "src/services/CallThreadService.ts"]
read_only_files: ["docs/erd.json"]
```

**TASK-008 (Control Panel UI):**
```
beginning_context: ["docs/prd.json", "src/services/CallSessionService.ts", "src/services/MilestoneService.ts"]
end_state_files: ["src/components/call-control/ControlPanel.tsx", "src/hooks/useCallSession.ts"]
read_only_files: ["docs/prd.json", "docs/journey.json"]
```

---

## Approval Required

This implementation plan requires approval from:
- **Cynthia** (Product Owner) - Feature alignment
- **Hermann** (Technical Lead) - Technical approach
- **Usama** (Project Manager) - Timeline and resources

---

*Document Version: 1.0.0*
*Created: 2026-01-09*
*Last Updated: 2026-01-09*
