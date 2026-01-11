# Sprint 2: Objection System & Outcome Enforcement - Implementation Plan

**Project:** CallOS - Sales Call Orchestration & Objection Flow App
**Sprint Duration:** 2 weeks
**Total Story Points:** 55
**Team Capacity:** 40 hours/week

---

## 1. Overview and Objectives

### Sprint Goal
Deliver a complete objection handling system with diagnostic subflows, outcome enforcement, and enhanced qualification gates. Every call must end with a clean outcome classification.

### Key Deliverables
1. **Objection Subflow Engine** - 6 objection types with multi-step diagnostic questions
2. **Outcome Enforcement** - Mandatory outcome selection before proceeding
3. **ObjectionResponse Tracking** - Persist objection interactions with outcomes
4. **Enhanced Qualification Gates** - Advisory call routing for unqualified prospects
5. **Call Outcome Classification** - Forced end-of-call outcome with disqualification reasons
6. **Integration Polish** - Wire services to index exports, fix technical debt

### Success Criteria
- [ ] All 6 objection types have working diagnostic subflows (3-4 steps each)
- [ ] Objection outcomes (Resolved/Deferred/Disqualified) are mandatory before returning to milestones
- [ ] Cannot complete call without outcome classification
- [ ] Unresolved objections persist into follow-up calls
- [ ] Qualification gate blocks coaching pitch if <500 clients (advisory only)
- [ ] All services properly exported from index files

---

## 2. Epics and User Stories Covered

### From PRD - FR-003: Objection System
| Story ID | Title | Priority |
|----------|-------|----------|
| ST-010 | Trigger objection subflow | High |
| ST-011 | Complete objection with outcome | High |
| ST-012 | Price objection subflow | High |
| ST-013 | Timing objection subflow | High |
| ST-014 | Capacity/Time objection subflow | High |
| ST-015 | Need to think objection subflow | High |
| ST-016 | Partner/Team objection subflow | High |
| ST-017 | Skepticism objection subflow | High |

### From PRD - FR-005: Qualification Gates
| Story ID | Title | Priority |
|----------|-------|----------|
| ST-019 | Enforce qualification gate | High |

### From PRD - FR-006: Call Outcome Classification
| Story ID | Title | Priority |
|----------|-------|----------|
| ST-020 | Classify call outcome | High |

---

## 3. Task Breakdown with Acceptance Criteria

### Phase 1: Backend Services (Days 1-4)

#### TASK-009: Implement ObjectionResponse service and API
**Story Points:** 5 | **Estimated Hours:** 12 | **Assignee:** backend_developer
**Dependencies:** TASK-002 (complete)

**Description:**
Build the ObjectionResponse entity management for tracking objection interactions during calls.

**Acceptance Criteria:**
- [ ] ObjectionResponseService created with CRUD operations
- [ ] POST /api/calls/:callId/objections - Create objection response
- [ ] GET /api/calls/:callId/objections - List objections for call
- [ ] PATCH /api/calls/:callId/objections/:id - Update objection (notes, outcome)
- [ ] POST /api/calls/:callId/objections/:id/resolve - Mark objection resolved with outcome
- [ ] Outcome enum enforced: Resolved | Deferred | Disqualified
- [ ] Cannot update resolved objection (locked after outcome)
- [ ] tenantId (organizationId) included in all queries

**Files to Create:**
```
src/services/objection-response-service/objection-response-service.ts
src/services/objection-response-service/index.ts
app/api/calls/[callId]/objections/route.ts
app/api/calls/[callId]/objections/[objectionId]/route.ts
app/api/calls/[callId]/objections/[objectionId]/resolve/route.ts
```

**Database Schema (already exists):**
```prisma
model ObjectionResponse {
  id                String   @id @default(cuid())
  callSessionId     String
  objectionId       String
  milestoneId       String?
  outcome           String?  // Resolved | Deferred | Disqualified
  notes             String?
  diagnosticAnswers Json?    // Stores answers from diagnostic steps
  createdAt         DateTime @default(now())
  resolvedAt        DateTime?
}
```

**Testing Strategy:**
```bash
# Unit tests
npm run test -- src/services/objection-response-service

# Integration tests
curl -X POST http://localhost:3000/api/calls/test-call/objections \
  -H "Content-Type: application/json" \
  -d '{"objectionId": "price-obj-id", "milestoneId": "m1-id"}'
```

---

#### TASK-010: Implement Objection Subflow state machine
**Story Points:** 8 | **Estimated Hours:** 16 | **Assignee:** fullstack_developer
**Dependencies:** TASK-009

**Description:**
Build the objection subflow engine that guides agents through diagnostic questions for each objection type.

**Acceptance Criteria:**
- [ ] ObjectionFlowService manages subflow state
- [ ] 6 objection types with distinct diagnostic flows:
  - Price: 4 steps (compare, classify, payback, reality anchor)
  - Timing: 4 steps (what changes, type, projection, delay cost)
  - Capacity_Time: 3 steps (reframe, core fear, trajectory)
  - Need_to_Think: 3 steps (what specifically, isolate, contain)
  - Partner_Team: 3 steps (authority, pre-solve, equip)
  - Skepticism: 3 steps (validate, pattern, structure)
- [ ] Each step stores agent's input/selection
- [ ] Flow enforces sequential progression
- [ ] Returns suggested responses based on diagnostic answers
- [ ] Final step requires outcome selection

**Objection Flow Data Structure:**
```typescript
interface ObjectionFlow {
  objectionType: ObjectionType;
  steps: DiagnosticStep[];
  currentStep: number;
  answers: Record<string, string>;
  outcome: ObjectionOutcome | null;
}

interface DiagnosticStep {
  stepNumber: number;
  question: string;
  purpose: string;
  inputType: 'text' | 'select' | 'multiselect';
  options?: string[];
  nextStepCondition?: (answer: string) => number;
}
```

**Files to Create:**
```
src/services/objection-flow-service/objection-flow-service.ts
src/services/objection-flow-service/flows/price-flow.ts
src/services/objection-flow-service/flows/timing-flow.ts
src/services/objection-flow-service/flows/capacity-flow.ts
src/services/objection-flow-service/flows/think-flow.ts
src/services/objection-flow-service/flows/partner-flow.ts
src/services/objection-flow-service/flows/skepticism-flow.ts
src/services/objection-flow-service/index.ts
```

**Testing Strategy:**
```bash
npm run test -- src/services/objection-flow-service
```

---

#### TASK-011: Implement Call Outcome service and API
**Story Points:** 5 | **Estimated Hours:** 10 | **Assignee:** backend_developer
**Dependencies:** TASK-004 (complete)

**Description:**
Build the CallOutcome entity management for end-of-call classification.

**Acceptance Criteria:**
- [ ] CallOutcomeService created
- [ ] GET /api/calls/:callId/outcome - Get outcome (if exists)
- [ ] POST /api/calls/:callId/outcome - Create outcome (required fields validated)
- [ ] Outcome types: Coaching_Client | Follow_Up_Scheduled | Implementation_Only | Disqualified
- [ ] If Disqualified: mandatory reason from enum
- [ ] Qualification flags stored: has500Clients, financialCapacity, strategicAlignment
- [ ] Cannot complete call without outcome
- [ ] Outcome triggers call status transition to 'completed'

**Disqualification Reasons (from PRD):**
```typescript
enum DisqualificationReason {
  UNDER_500_CLIENTS = 'under_500_clients',
  CASHFLOW_MISMATCH = 'cashflow_mismatch',
  MISALIGNED_EXPECTATIONS = 'misaligned_expectations',
  CAPACITY_CONSTRAINT = 'capacity_constraint',
  AUTHORITY_ISSUE = 'authority_issue'
}
```

**Files to Create:**
```
src/services/call-outcome-service/call-outcome-service.ts
src/services/call-outcome-service/index.ts
app/api/calls/[callId]/outcome/route.ts
```

**Testing Strategy:**
```bash
npm run test -- src/services/call-outcome-service
```

---

#### TASK-012: Enhance qualification gate enforcement
**Story Points:** 3 | **Estimated Hours:** 8 | **Assignee:** backend_developer
**Dependencies:** TASK-005 (complete), TASK-011

**Description:**
Enhance qualification gates to route unqualified prospects to advisory-only calls.

**Acceptance Criteria:**
- [ ] Qualification check at call start (already exists)
- [ ] NEW: Advisory call mode flag when <500 clients
- [ ] In advisory mode: M6 (Offer Presentation) is skipped
- [ ] In advisory mode: M7 outcome limited to Follow_Up_Scheduled or Disqualified
- [ ] Warning banner displayed when in advisory mode
- [ ] Qualification override requires manager approval (logged)
- [ ] GET /api/calls/:callId/qualification - Returns qualification status

**Files to Modify:**
```
src/services/checklist-service/checklist-service.ts
src/services/call-service/call-service.ts
app/api/calls/[callId]/qualification/route.ts (create)
```

---

### Phase 2: Frontend Components (Days 4-8)

#### TASK-013: Build ObjectionSubflow modal component
**Story Points:** 8 | **Estimated Hours:** 20 | **Assignee:** frontend_developer
**Dependencies:** TASK-010

**Description:**
Create the main objection handling modal with step-by-step diagnostic flow.

**Acceptance Criteria:**
- [ ] ObjectionSubflowModal opens when objection triggered
- [ ] Displays current diagnostic question with purpose
- [ ] Input field matches step type (text/select/multiselect)
- [ ] Progress indicator shows current step / total steps
- [ ] Back button to revisit previous steps
- [ ] Cannot skip steps (sequential enforcement)
- [ ] Final step shows outcome selection (Resolved/Deferred/Disqualified)
- [ ] Cannot close modal without selecting outcome
- [ ] Confirmation before disqualification
- [ ] Mobile-responsive design

**Component Structure:**
```
src/components/call-control/objection/
  ObjectionSubflowModal.tsx       # Main modal container
  DiagnosticStep.tsx              # Individual step display
  StepInput.tsx                   # Text/select/multiselect inputs
  OutcomeSelector.tsx             # Final outcome selection
  ObjectionProgress.tsx           # Step progress indicator
  index.ts
```

**State Management:**
```typescript
interface ObjectionModalState {
  isOpen: boolean;
  objectionType: ObjectionType | null;
  currentStep: number;
  answers: Record<number, string>;
  outcome: ObjectionOutcome | null;
  isSubmitting: boolean;
}
```

---

#### TASK-014: Build objection type selector component
**Story Points:** 3 | **Estimated Hours:** 6 | **Assignee:** frontend_developer
**Dependencies:** TASK-013

**Description:**
Create the objection type selector that appears when agent triggers objection.

**Acceptance Criteria:**
- [ ] 6 objection type buttons in grid layout
- [ ] Each button shows type name and brief description
- [ ] Visual indicator for objection frequency (from data)
- [ ] Keyboard navigation support
- [ ] Selected type opens ObjectionSubflowModal
- [ ] Accessible (WCAG 2.1 AA)

**Files to Create:**
```
src/components/call-control/objection/ObjectionTypeSelector.tsx
```

---

#### TASK-015: Build CallOutcome modal component
**Story Points:** 5 | **Estimated Hours:** 12 | **Assignee:** frontend_developer
**Dependencies:** TASK-011

**Description:**
Create the end-of-call outcome classification modal.

**Acceptance Criteria:**
- [ ] CallOutcomeModal appears when agent clicks "End Call"
- [ ] Cannot dismiss without selecting outcome
- [ ] 4 outcome types displayed as cards with descriptions
- [ ] If Disqualified selected: shows reason dropdown (required)
- [ ] Qualification flags checkboxes (500+ clients, financial capacity, strategic alignment)
- [ ] Summary section showing call stats (duration, milestones completed, objections handled)
- [ ] Unresolved objections warning if any exist
- [ ] Confirm button submits outcome and transitions call to completed
- [ ] Success state shows "Call Completed" with summary

**Component Structure:**
```
src/components/call-control/outcome/
  CallOutcomeModal.tsx            # Main modal
  OutcomeTypeCard.tsx             # Individual outcome option
  DisqualificationReasonSelect.tsx # Reason dropdown
  QualificationFlags.tsx          # Checkbox group
  CallSummary.tsx                 # Stats summary
  index.ts
```

---

#### TASK-016: Integrate objection components with ControlPanel
**Story Points:** 3 | **Estimated Hours:** 8 | **Assignee:** frontend_developer
**Dependencies:** TASK-013, TASK-014, TASK-015

**Description:**
Wire all objection and outcome components into the main control panel.

**Acceptance Criteria:**
- [ ] ObjectionTrigger button opens ObjectionTypeSelector
- [ ] After objection resolved, returns to milestone view
- [ ] Unresolved objections shown in sidebar with status
- [ ] End Call button opens CallOutcomeModal
- [ ] Cannot end call with in-progress objections (warning)
- [ ] Advisory mode banner when qualification failed
- [ ] All modals follow design system

**Files to Modify:**
```
src/components/call-control/ControlPanel.tsx
src/components/call-control/ObjectionTrigger.tsx
app/(agent)/call/[callId]/page.tsx
```

---

### Phase 3: Follow-Up Enhancement (Days 8-10)

#### TASK-017: Display unresolved objections in follow-up context
**Story Points:** 3 | **Estimated Hours:** 8 | **Assignee:** frontend_developer
**Dependencies:** TASK-009, TASK-021 (complete)

**Description:**
Enhance follow-up call context to prominently display unresolved objections.

**Acceptance Criteria:**
- [ ] PreviousCallContext shows unresolved objections section
- [ ] Each objection shows: type, diagnostic answers summary, why deferred
- [ ] Option to "Resume Objection" which opens ObjectionSubflowModal pre-filled
- [ ] Visual indicator for objection age (days since deferred)
- [ ] Objection count badge on follow-up call card

**Files to Modify:**
```
src/components/call-control/PreviousCallContext.tsx
src/components/call-control/FollowUpCallSetup.tsx
```

---

### Phase 4: Data Seeding & Polish (Days 10-11)

#### TASK-018: Seed detailed objection diagnostic data
**Story Points:** 3 | **Estimated Hours:** 6 | **Assignee:** backend_developer
**Dependencies:** TASK-010

**Description:**
Populate database with complete diagnostic questions for all 6 objection types.

**Acceptance Criteria:**
- [ ] All 6 objection types have complete diagnostic questions in DB
- [ ] Each objection has 3-4 diagnostic steps with purpose text
- [ ] Questions match PRD exactly (from ST-012 through ST-017)
- [ ] Allowed outcomes defined per objection type
- [ ] Seed script idempotent (can run multiple times)

**Objection Data (from PRD):**

**Price Objection (ST-012):**
```json
{
  "type": "Price",
  "diagnosticQuestions": [
    { "step": 1, "question": "Compared to what?", "purpose": "Neutralize emotion, identify comparison anchor" },
    { "step": 2, "question": "Classify the comparison (software costs, coaching prices, current income, fear)", "purpose": "Identify objection subtype" },
    { "step": 3, "question": "If this system reliably paid for itself within 6 months, would it still feel expensive?", "purpose": "Structural check - value mismatch vs risk perception" },
    { "step": 4, "question": "The reason we only work with advisors with 500+ clients is because below that number, the math breaks.", "purpose": "Reality anchor - only if aligned" }
  ],
  "allowedOutcomes": ["Resolved", "Deferred", "Disqualified"]
}
```

**Timing Objection (ST-013):**
```json
{
  "type": "Timing",
  "diagnosticQuestions": [
    { "step": 1, "question": "What would need to change for now to be the right time?", "purpose": "Surface real blocker" },
    { "step": 2, "question": "Is this a cash issue, a capacity issue, an emotional issue, or avoidance?", "purpose": "Identify timing objection type" },
    { "step": 3, "question": "If we fast-forward 6 months and nothing has changed, how would you feel?", "purpose": "Future projection to surface urgency" },
    { "step": 4, "question": "What's the cost of waiting another 6 months at your current trajectory?", "purpose": "Delay cost acknowledgment" }
  ],
  "allowedOutcomes": ["Resolved", "Deferred", "Disqualified"]
}
```

**Capacity/Time Objection (ST-014):**
```json
{
  "type": "Capacity_Time",
  "diagnosticQuestions": [
    { "step": 1, "question": "When you say you don't have time, is it because you're overloaded with manual work, or because you don't want another project to manage?", "purpose": "Distinguish burnout from project resistance" },
    { "step": 2, "question": "What's the core fear here - that this will add to your plate, or that it won't actually reduce your current load?", "purpose": "Identify core fear" },
    { "step": 3, "question": "If your current trajectory continues unchanged for another year, what happens?", "purpose": "Reality check on status quo" }
  ],
  "allowedOutcomes": ["Resolved", "Deferred", "Disqualified"]
}
```

**Need to Think Objection (ST-015):**
```json
{
  "type": "Need_to_Think",
  "diagnosticQuestions": [
    { "step": 1, "question": "What specifically do you want to think through?", "purpose": "Surface the actual variable" },
    { "step": 2, "question": "Is it the price, the risk, trust in the approach, need to consult someone, or something about yourself?", "purpose": "Isolate the variable" },
    { "step": 3, "question": "If we could resolve [that variable] right now, would you be ready to make a decision?", "purpose": "Containment check" }
  ],
  "allowedOutcomes": ["Resolved", "Deferred", "Disqualified"]
}
```

**Partner/Team Objection (ST-016):**
```json
{
  "type": "Partner_Team",
  "diagnosticQuestions": [
    { "step": 1, "question": "Is this something you can decide on your own, or do you need permission from someone else?", "purpose": "Clarify authority" },
    { "step": 2, "question": "What concerns do you anticipate they'll have, and how would you address them?", "purpose": "Pre-solve anticipated objections" },
    { "step": 3, "question": "Would it help if I gave you a summary you could share with them?", "purpose": "Equip them to sell internally" }
  ],
  "allowedOutcomes": ["Resolved", "Deferred", "Disqualified"]
}
```

**Skepticism Objection (ST-017):**
```json
{
  "type": "Skepticism",
  "diagnosticQuestions": [
    { "step": 1, "question": "What have you tried before that didn't work?", "purpose": "Validate past experience" },
    { "step": 2, "question": "When it didn't work, was the problem the strategy itself or the execution?", "purpose": "Pattern recognition" },
    { "step": 3, "question": "The structural difference with our approach is [X]. Does that distinction make sense?", "purpose": "Articulate difference" }
  ],
  "allowedOutcomes": ["Resolved", "Deferred", "Disqualified"]
}
```

**Files to Modify:**
```
app/api/seed/route.ts
prisma/seed.ts (if separate)
```

---

#### TASK-019: Fix service exports and technical debt
**Story Points:** 2 | **Estimated Hours:** 4 | **Assignee:** backend_developer
**Dependencies:** All backend tasks

**Description:**
Clean up service exports and fix technical debt identified during Sprint 1.

**Acceptance Criteria:**
- [ ] All services exported from src/services/index.ts
- [ ] checklistService exported
- [ ] callThreadService exported
- [ ] followUpService exported
- [ ] objectionResponseService exported
- [ ] callOutcomeService exported
- [ ] objectionFlowService exported
- [ ] No circular dependencies
- [ ] Type exports consistent

**Files to Modify:**
```
src/services/index.ts
src/services/checklist-service/index.ts
src/services/call-thread-service/index.ts
src/services/follow-up-service/index.ts
```

---

### Phase 5: Testing (Days 11-14)

#### TASK-022: Unit tests for objection services
**Story Points:** 5 | **Estimated Hours:** 12 | **Assignee:** qa_developer
**Dependencies:** TASK-009, TASK-010, TASK-011

**Description:**
Write comprehensive unit tests for all objection-related services.

**Test Coverage Requirements:**
- [ ] ObjectionResponseService: 100% coverage
  - Create objection response
  - Update with notes
  - Resolve with outcome
  - Cannot update after resolved
  - Validation errors
- [ ] ObjectionFlowService: 100% coverage
  - Start flow for each objection type
  - Step progression
  - Answer storage
  - Outcome selection
  - Invalid transitions rejected
- [ ] CallOutcomeService: 100% coverage
  - Create outcome
  - Require disqualification reason
  - Qualification flags
  - Cannot complete without outcome

**Files to Create:**
```
src/services/objection-response-service/__tests__/objection-response-service.test.ts
src/services/objection-flow-service/__tests__/objection-flow-service.test.ts
src/services/call-outcome-service/__tests__/call-outcome-service.test.ts
```

---

#### TASK-023: E2E tests for objection flow
**Story Points:** 5 | **Estimated Hours:** 12 | **Assignee:** qa_developer
**Dependencies:** TASK-016

**Description:**
Write end-to-end tests for the complete objection handling flow.

**Test Scenarios:**
1. **Objection Flow - Price**
   - Navigate to call, trigger Price objection
   - Complete 4 diagnostic steps
   - Select "Resolved" outcome
   - Verify objection saved and modal closed

2. **Objection Flow - Deferred**
   - Trigger any objection
   - Complete diagnostic steps
   - Select "Deferred" outcome
   - Verify objection appears in sidebar as unresolved

3. **Call Outcome - Coaching Client**
   - Complete call through milestones
   - Click End Call
   - Select "Coaching Client" outcome
   - Verify qualification flags
   - Confirm call status is "completed"

4. **Call Outcome - Disqualified**
   - End call
   - Select "Disqualified" outcome
   - Verify reason is required
   - Select reason and confirm
   - Verify call completed with disqualification

5. **Follow-Up with Unresolved Objections**
   - Create follow-up for call with deferred objection
   - Verify unresolved objections displayed
   - Resume objection flow
   - Resolve objection
   - Verify status updated

**Files to Create:**
```
tests/e2e/objection-flow.spec.ts
tests/e2e/call-outcome.spec.ts
tests/e2e/objection-followup.spec.ts
```

---

## 4. File-by-File Implementation Order

### Days 1-2: Objection Response Service
```
1. src/services/objection-response-service/objection-response-service.ts
2. src/services/objection-response-service/index.ts
3. app/api/calls/[callId]/objections/route.ts
4. app/api/calls/[callId]/objections/[objectionId]/route.ts
5. app/api/calls/[callId]/objections/[objectionId]/resolve/route.ts
```

### Days 2-4: Objection Flow Service
```
6. src/services/objection-flow-service/flows/price-flow.ts
7. src/services/objection-flow-service/flows/timing-flow.ts
8. src/services/objection-flow-service/flows/capacity-flow.ts
9. src/services/objection-flow-service/flows/think-flow.ts
10. src/services/objection-flow-service/flows/partner-flow.ts
11. src/services/objection-flow-service/flows/skepticism-flow.ts
12. src/services/objection-flow-service/objection-flow-service.ts
13. src/services/objection-flow-service/index.ts
```

### Days 4-5: Call Outcome Service
```
14. src/services/call-outcome-service/call-outcome-service.ts
15. src/services/call-outcome-service/index.ts
16. app/api/calls/[callId]/outcome/route.ts
17. app/api/calls/[callId]/qualification/route.ts
```

### Days 5-8: Frontend Components
```
18. src/components/call-control/objection/DiagnosticStep.tsx
19. src/components/call-control/objection/StepInput.tsx
20. src/components/call-control/objection/OutcomeSelector.tsx
21. src/components/call-control/objection/ObjectionProgress.tsx
22. src/components/call-control/objection/ObjectionSubflowModal.tsx
23. src/components/call-control/objection/ObjectionTypeSelector.tsx
24. src/components/call-control/objection/index.ts
25. src/components/call-control/outcome/OutcomeTypeCard.tsx
26. src/components/call-control/outcome/DisqualificationReasonSelect.tsx
27. src/components/call-control/outcome/QualificationFlags.tsx
28. src/components/call-control/outcome/CallSummary.tsx
29. src/components/call-control/outcome/CallOutcomeModal.tsx
30. src/components/call-control/outcome/index.ts
```

### Days 8-10: Integration & Follow-Up
```
31. src/components/call-control/ControlPanel.tsx (modify)
32. src/components/call-control/ObjectionTrigger.tsx (modify)
33. src/components/call-control/PreviousCallContext.tsx (modify)
34. app/(agent)/call/[callId]/page.tsx (modify)
```

### Days 10-11: Data & Polish
```
35. app/api/seed/route.ts (modify - add objection data)
36. src/services/index.ts (modify - export all services)
```

### Days 11-14: Testing
```
37. src/services/objection-response-service/__tests__/objection-response-service.test.ts
38. src/services/objection-flow-service/__tests__/objection-flow-service.test.ts
39. src/services/call-outcome-service/__tests__/call-outcome-service.test.ts
40. tests/e2e/objection-flow.spec.ts
41. tests/e2e/call-outcome.spec.ts
42. tests/e2e/objection-followup.spec.ts
```

---

## 5. API Endpoints to Create

### Objection Responses
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/calls/:callId/objections | Create objection response |
| GET | /api/calls/:callId/objections | List objections for call |
| GET | /api/calls/:callId/objections/:id | Get objection details |
| PATCH | /api/calls/:callId/objections/:id | Update objection (notes) |
| POST | /api/calls/:callId/objections/:id/resolve | Resolve with outcome |

### Call Outcome
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/calls/:callId/outcome | Get call outcome |
| POST | /api/calls/:callId/outcome | Create call outcome |
| GET | /api/calls/:callId/qualification | Get qualification status |

---

## 6. Components to Build

### Objection Components
```
src/components/call-control/objection/
  ObjectionSubflowModal.tsx       # Main modal with step navigation
  ObjectionTypeSelector.tsx       # 6-type grid selector
  DiagnosticStep.tsx              # Question display with purpose
  StepInput.tsx                   # Text/select/multiselect inputs
  OutcomeSelector.tsx             # Resolved/Deferred/Disqualified
  ObjectionProgress.tsx           # Step progress indicator
  index.ts
```

### Outcome Components
```
src/components/call-control/outcome/
  CallOutcomeModal.tsx            # End-of-call classification
  OutcomeTypeCard.tsx             # Individual outcome option
  DisqualificationReasonSelect.tsx # Reason dropdown
  QualificationFlags.tsx          # Checkbox group
  CallSummary.tsx                 # Call stats summary
  index.ts
```

---

## 7. State Management

### Objection Store (Zustand)
```typescript
// src/stores/objectionStore.ts
interface ObjectionState {
  // Current objection flow
  activeObjection: {
    objectionId: string;
    objectionType: ObjectionType;
    currentStep: number;
    totalSteps: number;
    answers: Record<number, string>;
  } | null;

  // All objections for current call
  callObjections: ObjectionResponse[];
  unresolvedCount: number;

  // Actions
  startObjection: (type: ObjectionType) => void;
  nextStep: (answer: string) => void;
  previousStep: () => void;
  resolveObjection: (outcome: ObjectionOutcome) => Promise<void>;
  cancelObjection: () => void;
  loadCallObjections: (callId: string) => Promise<void>;
}
```

### Outcome Store (Zustand)
```typescript
// src/stores/outcomeStore.ts
interface OutcomeState {
  outcome: CallOutcome | null;
  qualificationStatus: QualificationStatus | null;
  isAdvisoryMode: boolean;

  // Actions
  loadOutcome: (callId: string) => Promise<void>;
  createOutcome: (callId: string, outcome: CreateOutcomeInput) => Promise<void>;
  loadQualification: (callId: string) => Promise<void>;
}
```

---

## 8. Testing Strategy

### Unit Tests
| Service | File | Coverage Target |
|---------|------|-----------------|
| ObjectionResponseService | objection-response-service.test.ts | 100% |
| ObjectionFlowService | objection-flow-service.test.ts | 100% |
| CallOutcomeService | call-outcome-service.test.ts | 100% |

### Integration Tests
| API | File | Coverage |
|-----|------|----------|
| /api/calls/:id/objections | objection-api.test.ts | All endpoints |
| /api/calls/:id/outcome | outcome-api.test.ts | All endpoints |

### E2E Tests (Playwright)
| Flow | File | Scenarios |
|------|------|-----------|
| Objection handling | objection-flow.spec.ts | 6 objection types |
| Call outcome | call-outcome.spec.ts | 4 outcome types |
| Follow-up | objection-followup.spec.ts | Unresolved objections |

---

## 9. Dependencies and Risks

### Dependencies
| Dependency | Type | Impact | Status |
|------------|------|--------|--------|
| Sprint 1 complete | Internal | High | Complete |
| Objection data in DB | Internal | High | Seed exists, needs enhancement |
| CallSession state machine | Internal | Medium | Complete |

### Technical Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Complex modal state | Medium | Medium | Zustand store isolation |
| Step validation edge cases | Medium | Low | Comprehensive unit tests |
| Outcome enforcement UX | Low | Medium | User testing early |

---

## 10. Sprint Schedule

### Week 1 (Days 1-7)
| Day | Focus | Tasks |
|-----|-------|-------|
| 1 | Backend: Objection Response | TASK-009 |
| 2-3 | Backend: Objection Flow | TASK-010 |
| 4 | Backend: Call Outcome | TASK-011, TASK-012 |
| 5-6 | Frontend: Objection Modal | TASK-013 |
| 7 | Frontend: Type Selector | TASK-014 |

### Week 2 (Days 8-14)
| Day | Focus | Tasks |
|-----|-------|-------|
| 8 | Frontend: Outcome Modal | TASK-015 |
| 9 | Frontend: Integration | TASK-016 |
| 10 | Frontend: Follow-up | TASK-017 |
| 11 | Data & Polish | TASK-018, TASK-019 |
| 12 | Testing: Unit | TASK-022 |
| 13-14 | Testing: E2E | TASK-023 |

---

## 11. Definition of Done (Sprint)

- [ ] All 15 tasks completed and merged
- [ ] All 6 objection types have working diagnostic flows
- [ ] Outcome enforcement prevents completing call without classification
- [ ] Unresolved objections appear in follow-up context
- [ ] Unit test coverage >90% on new services
- [ ] E2E tests passing for all critical paths
- [ ] No critical or high-severity bugs
- [ ] API documentation updated
- [ ] Code reviewed by at least one team member

---

## 12. Handoff Notes for `/kreativreason:work`

### Context Files for Each Task

**TASK-009 (ObjectionResponse Service):**
```
beginning_context: ["prisma/schema.prisma", "src/services/call-service/call-service.ts"]
end_state_files: ["src/services/objection-response-service/objection-response-service.ts"]
```

**TASK-010 (Objection Flow Service):**
```
beginning_context: ["docs/prd.json", "prisma/schema.prisma"]
end_state_files: ["src/services/objection-flow-service/objection-flow-service.ts"]
```

**TASK-011 (Call Outcome Service):**
```
beginning_context: ["docs/prd.json", "src/services/call-service/call-service.ts"]
end_state_files: ["src/services/call-outcome-service/call-outcome-service.ts"]
```

**TASK-013 (ObjectionSubflowModal):**
```
beginning_context: ["src/services/objection-flow-service/objection-flow-service.ts", "src/components/call-control/ControlPanel.tsx"]
end_state_files: ["src/components/call-control/objection/ObjectionSubflowModal.tsx"]
```

**TASK-015 (CallOutcomeModal):**
```
beginning_context: ["src/services/call-outcome-service/call-outcome-service.ts", "docs/prd.json"]
end_state_files: ["src/components/call-control/outcome/CallOutcomeModal.tsx"]
```

---

## Approval Required

This implementation plan requires approval from:
- **Cynthia** (Product Owner) - Feature alignment
- **Hermann** (Technical Lead) - Technical approach
- **Usama** (Project Manager) - Timeline and resources

---

*Document Version: 1.0.0*
*Created: 2026-01-10*
*Last Updated: 2026-01-10*
