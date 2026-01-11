# Sprint 3: Recording, AI Analysis & Manager Dashboard - Implementation Plan

**Project:** CallOS - Sales Call Orchestration & Objection Flow App
**Sprint Duration:** 2 weeks
**Total Story Points:** 58
**Team Capacity:** 40 hours/week
**Tech Debt Allocation:** 30% (~17.5 SP) | New Features: 70% (~40.5 SP)

---

## 1. Overview and Objectives

### Sprint Goal
Deliver call recording integration with Zoom, AI-powered post-call analysis, and a manager dashboard for team performance visibility. Address critical P2 tech debt items from Sprint 2 review.

### Key Deliverables
1. **P2 Tech Debt Resolution** - 6 items from Sprint 2 review (~17.5 SP)
2. **Call Recording Integration** - Zoom link detection and recording system
3. **AI Post-Call Analysis** - Summary generation, risk flags, follow-up email drafts
4. **Manager Dashboard** - Team metrics, objection patterns, agent performance
5. **Analytics API Layer** - Backend services for dashboard data

### Success Criteria
- [ ] All 6 P2 tech debt items resolved and verified
- [ ] Zoom recording joins silently within 5 seconds of link detection
- [ ] Transcript with speaker detection generated and searchable
- [ ] AI analysis completes within 2 minutes of call end
- [ ] Risk flags (overpromise, pressure, misalignment) detected with evidence
- [ ] Manager dashboard shows team metrics, objection patterns, agent variance
- [ ] All new services have >90% test coverage

---

## 2. PRD Features Covered

### From EPIC-003: Recording & AI Analysis
| Feature | Story ID | Title | Priority |
|---------|----------|-------|----------|
| FR-011 | ST-028 | Record call via Zoom link | High |
| FR-012 | ST-029 | Generate call analysis | High |
| FR-012 | ST-030 | Generate follow-up email | Medium |
| FR-014 | ST-032 | Review call analytics | Medium |

---

## 3. Task Breakdown

### Phase 0: P2 Tech Debt Resolution (Days 1-3)

#### TASK-024: Fix race condition in ObjectionResponse creation
**Story Points:** 2 | **Estimated Hours:** 4 | **Assignee:** backend_developer
**Tech Debt ID:** DATA-001 | **Category:** Data Integrity

**Description:**
Wrap validation and creation in single transaction to prevent race conditions where call status could change between validation and creation.

**Acceptance Criteria:**
- [ ] Validation queries and creation wrapped in `prisma.$transaction()`
- [ ] Add test for concurrent creation attempts
- [ ] Existing unit tests pass
- [ ] Integration test verifies transaction rollback on failure

**Files to Modify:**
```
src/services/objection-response-service/objection-response-service.ts
src/services/objection-response-service/__tests__/objection-response-service.test.ts
```

**Testing Strategy:**
```bash
npm run test -- objection-response-service
```

---

#### TASK-025: Add cascade delete constraints for objection FK
**Story Points:** 1 | **Estimated Hours:** 2 | **Assignee:** backend_developer
**Tech Debt ID:** DATA-006 | **Category:** Data Integrity

**Description:**
Add `onDelete: Restrict` to ObjectionResponse foreign keys to prevent orphaned records and ensure referential integrity.

**Acceptance Criteria:**
- [ ] Add `onDelete: Restrict` to objection relation
- [ ] Add `onDelete: Restrict` to milestone relation
- [ ] Run migration successfully
- [ ] Test that deleting referenced objection fails gracefully with clear error
- [ ] Test that deleting referenced milestone fails gracefully

**Files to Modify:**
```
prisma/schema.prisma
prisma/migrations/xxx_add_fk_constraints/migration.sql
```

**Migration Command:**
```bash
npx prisma migrate dev --name add_objection_fk_constraints
```

---

#### TASK-026: Create error mapper utility and sanitize error responses
**Story Points:** 2 | **Estimated Hours:** 6 | **Assignee:** backend_developer
**Tech Debt ID:** SEC-003 | **Category:** Security

**Description:**
Create centralized error mapper utility to sanitize error messages and prevent exposure of internal system details. Apply to all API routes.

**Acceptance Criteria:**
- [ ] Create `src/lib/api/error-handler.ts` with `mapErrorToApiResponse()`
- [ ] Internal error details logged server-side only
- [ ] Client receives sanitized, generic error messages
- [ ] Apply to all Sprint 2 API routes
- [ ] Consistent error response format: `{ error: { message, code } }`

**Files to Create/Modify:**
```
src/lib/api/error-handler.ts (create)
app/api/calls/[callId]/objections/route.ts
app/api/calls/[callId]/objections/[objectionResponseId]/route.ts
app/api/calls/[callId]/outcome/route.ts
```

---

#### TASK-027: Add length limits to notes and diagnosticAnswers fields
**Story Points:** 1 | **Estimated Hours:** 2 | **Assignee:** backend_developer
**Tech Debt ID:** SEC-005 | **Category:** Security

**Description:**
Add validation limits to prevent oversized input that could exhaust database storage or memory.

**Acceptance Criteria:**
- [ ] Add `.max(10000)` to notes field in objection routes
- [ ] Add key length limit (100 chars) to diagnosticAnswers
- [ ] Add value length limit (5000 chars) to diagnosticAnswers
- [ ] Add max entries limit (50) to diagnosticAnswers
- [ ] Return 400 with clear message when limit exceeded
- [ ] Add tests for oversized input rejection

**Files to Modify:**
```
app/api/calls/[callId]/objections/route.ts
app/api/calls/[callId]/objections/[objectionResponseId]/route.ts
```

---

#### TASK-028: Optimize getOutcomeStats with groupBy aggregation
**Story Points:** 1 | **Estimated Hours:** 3 | **Assignee:** backend_developer
**Tech Debt ID:** PERF-003 | **Category:** Performance

**Description:**
Replace `findMany` + JavaScript aggregation with database-level `groupBy` for efficient stats calculation.

**Acceptance Criteria:**
- [ ] Replace `findMany` with `groupBy` aggregation
- [ ] Use `Promise.all` for parallel queries
- [ ] Same response format as before
- [ ] Add benchmark test showing performance improvement
- [ ] Memory usage reduced for large datasets

**Files to Modify:**
```
src/services/call-outcome-service/call-outcome-service.ts
src/services/call-outcome-service/__tests__/call-outcome-service.test.ts
```

**Performance Target:**
- Before: O(n) memory, loads all records
- After: O(1) memory, database aggregation
- Expected: ~90% memory reduction for large datasets

---

#### TASK-029: Add composite index for objection queries
**Story Points:** 0.5 | **Estimated Hours:** 1 | **Assignee:** backend_developer
**Tech Debt ID:** PERF-004 | **Category:** Performance

**Description:**
Add composite index on `[callSessionId, outcome]` for efficient filtered objection queries.

**Acceptance Criteria:**
- [ ] Add composite index `@@index([callSessionId, outcome])`
- [ ] Run migration successfully
- [ ] Verify query plan shows index usage
- [ ] Benchmark shows improvement for filtered queries

**Files to Modify:**
```
prisma/schema.prisma
```

**Migration Command:**
```bash
npx prisma migrate dev --name add_objection_composite_index
```

**Performance Target:**
- Expected: ~60% faster for filtered objection queries

---

### Phase 1: Recording Infrastructure (Days 3-5)

#### TASK-030: Create Zoom recording service foundation
**Story Points:** 5 | **Estimated Hours:** 12 | **Assignee:** fullstack_developer
**Dependencies:** None

**Description:**
Build the ZoomRecordingService that detects Zoom links, initiates recording, and manages recording lifecycle.

**Acceptance Criteria:**
- [ ] ZoomRecordingService created with link detection
- [ ] Zoom link regex validates various Zoom URL formats
- [ ] Recording start triggers within 5 seconds of link detection
- [ ] Recording status tracked (pending, recording, completed, failed)
- [ ] Recording reference stored in CallSession
- [ ] Error handling for Zoom API failures

**API Integration Points:**
```typescript
// Zoom API endpoints to integrate
- POST /meetings/{meetingId}/recordings/start
- GET /meetings/{meetingId}/recordings
- POST /meetings/{meetingId}/registrants (for bot participant)
```

**Files to Create:**
```
src/services/zoom-service/zoom-recording-service.ts
src/services/zoom-service/zoom-api-client.ts
src/services/zoom-service/link-detector.ts
src/services/zoom-service/types.ts
src/lib/config/zoom.ts
```

**Environment Variables:**
```
ZOOM_API_KEY=
ZOOM_API_SECRET=
ZOOM_ACCOUNT_ID=
ZOOM_BOT_EMAIL=
```

---

#### TASK-031: Build recording API endpoints
**Story Points:** 3 | **Estimated Hours:** 8 | **Assignee:** backend_developer
**Dependencies:** TASK-030

**Description:**
Create REST API for recording management - start, stop, status, and retrieval.

**Acceptance Criteria:**
- [ ] POST /api/calls/:callId/recording/start - Start recording for call
- [ ] POST /api/calls/:callId/recording/stop - Stop recording
- [ ] GET /api/calls/:callId/recording - Get recording status and URL
- [ ] Recording URL is time-limited signed URL
- [ ] Only call agent or manager can access recording
- [ ] Recording automatically stops when call completes

**Files to Create:**
```
app/api/calls/[callId]/recording/route.ts
app/api/calls/[callId]/recording/start/route.ts
app/api/calls/[callId]/recording/stop/route.ts
```

---

#### TASK-032: Implement transcript generation service
**Story Points:** 5 | **Estimated Hours:** 12 | **Assignee:** backend_developer
**Dependencies:** TASK-030

**Description:**
Build transcript generation service that processes recordings and generates timestamped transcripts with speaker detection.

**Acceptance Criteria:**
- [ ] TranscriptService processes completed recordings
- [ ] Speaker detection identifies agent vs prospect
- [ ] Timestamps aligned with recording timeline
- [ ] Transcript searchable by keyword
- [ ] Milestone markers injected at timestamps
- [ ] Objection markers injected at timestamps
- [ ] Transcript stored in CallSession or separate table

**Integration Options:**
```typescript
// Option 1: Zoom native transcription
// Option 2: AssemblyAI / Deepgram integration
// Option 3: OpenAI Whisper integration

interface TranscriptSegment {
  speaker: 'agent' | 'prospect' | 'unknown';
  text: string;
  startTime: number; // seconds
  endTime: number;
  confidence: number;
}
```

**Files to Create:**
```
src/services/transcript-service/transcript-service.ts
src/services/transcript-service/speaker-detector.ts
src/services/transcript-service/marker-injector.ts
src/services/transcript-service/types.ts
```

---

### Phase 2: AI Analysis System (Days 5-8)

#### TASK-033: Create AI analysis service foundation
**Story Points:** 5 | **Estimated Hours:** 12 | **Assignee:** fullstack_developer
**Dependencies:** TASK-032

**Description:**
Build AIAnalysisService that orchestrates post-call analysis using LLM (Claude/GPT).

**Acceptance Criteria:**
- [ ] AIAnalysisService created with analysis pipeline
- [ ] Analysis triggered automatically on call completion
- [ ] Analysis completes within 2 minutes
- [ ] Analysis results stored in AIAnalysis entity
- [ ] Retry mechanism for failed analyses
- [ ] Rate limiting for API calls

**Analysis Pipeline:**
```
1. Fetch transcript + milestone responses + objections
2. Generate call summary (factual, neutral)
3. Classify objections and outcomes
4. Calculate decision readiness score
5. Detect risk flags
6. Generate agent feedback
7. Store results
```

**Files to Create:**
```
src/services/ai-analysis-service/ai-analysis-service.ts
src/services/ai-analysis-service/prompts/summary-prompt.ts
src/services/ai-analysis-service/prompts/risk-detection-prompt.ts
src/services/ai-analysis-service/prompts/feedback-prompt.ts
src/services/ai-analysis-service/types.ts
```

---

#### TASK-034: Implement call summary generation
**Story Points:** 3 | **Estimated Hours:** 8 | **Assignee:** backend_developer
**Dependencies:** TASK-033

**Description:**
Generate factual, neutral call summaries based on transcript and milestone data.

**Acceptance Criteria:**
- [ ] Summary is factual and neutral (no persuasion language)
- [ ] Summary covers: context, current state findings, objections raised, outcome
- [ ] Summary length: 200-400 words
- [ ] Evidence markers link to transcript timestamps
- [ ] Language matches call language (DE/EN)

**Prompt Structure:**
```typescript
const summaryPrompt = `
You are analyzing a sales call. Generate a factual summary.

Context:
- Prospect: {prospect_name}
- Client count: {client_count}
- Call duration: {duration}
- Milestones completed: {milestones}

Transcript:
{transcript}

Generate a neutral summary covering:
1. Call context and frame
2. Key findings about prospect's current state
3. Objections raised and how addressed
4. Final outcome and next steps

Do NOT include:
- Persuasion language
- Sales recommendations
- Speculation about prospect intent
`;
```

---

#### TASK-035: Implement risk flag detection
**Story Points:** 3 | **Estimated Hours:** 8 | **Assignee:** backend_developer
**Dependencies:** TASK-033

**Description:**
Detect risk patterns in call transcripts: overpromise, pressure tactics, misalignment.

**Acceptance Criteria:**
- [ ] Detect overpromise: unrealistic guarantees, inflated claims
- [ ] Detect pressure: urgency tactics, manipulation language
- [ ] Detect misalignment: prospect hesitation, unclear commitment
- [ ] Each flag includes: type, severity (low/medium/high), evidence, timestamp
- [ ] Risk flags surfaced in manager dashboard

**Risk Types:**
```typescript
enum RiskType {
  OVERPROMISE = 'overpromise',
  PRESSURE_TACTIC = 'pressure_tactic',
  MISALIGNMENT = 'misalignment',
  QUALIFICATION_BYPASS = 'qualification_bypass',
  INCOMPLETE_DISCOVERY = 'incomplete_discovery',
}

interface RiskFlag {
  type: RiskType;
  severity: 'low' | 'medium' | 'high';
  evidence: string;
  transcriptTimestamp?: number;
  recommendation: string;
}
```

---

#### TASK-036: Implement follow-up email generation
**Story Points:** 2 | **Estimated Hours:** 6 | **Assignee:** backend_developer
**Dependencies:** TASK-034

**Description:**
Generate editable follow-up email drafts based on call facts.

**Acceptance Criteria:**
- [ ] Email based on call facts only (no persuasion)
- [ ] Recap of agreed facts from call
- [ ] Confirmed next steps included
- [ ] Language matches call language (DE/EN)
- [ ] Email editable before sending
- [ ] No urgency, discounts, or new offers

**Email Structure:**
```
Subject: {prospect_name} - Follow-up from our call

Hi {prospect_first_name},

Thank you for taking the time to speak with me today.

Here's a summary of what we discussed:
{key_points}

Based on our conversation, the next steps are:
{next_steps}

{conditional: If you have any questions, feel free to reach out.}

Best regards,
{agent_name}
```

---

### Phase 3: Manager Dashboard (Days 8-11)

#### TASK-037: Create analytics service layer
**Story Points:** 5 | **Estimated Hours:** 12 | **Assignee:** backend_developer
**Dependencies:** TASK-028 (getOutcomeStats optimization)

**Description:**
Build AnalyticsService that aggregates call data for manager dashboard.

**Acceptance Criteria:**
- [ ] getTeamMetrics: calls per agent, conversion rates, avg duration
- [ ] getObjectionPatterns: frequency by type, resolution rates, common triggers
- [ ] getAgentVariance: milestone timing variance, objection handling patterns
- [ ] getMilestoneEffectiveness: pass/fail rates, skip rates
- [ ] Time-range filtering (week/month/quarter)
- [ ] Organization-scoped queries

**Metrics to Calculate:**
```typescript
interface TeamMetrics {
  totalCalls: number;
  callsByAgent: Record<string, number>;
  conversionRate: number;
  avgCallDuration: number;
  outcomeDistribution: Record<CallOutcomeType, number>;
}

interface ObjectionPatterns {
  byType: Record<ObjectionType, {
    count: number;
    resolutionRate: number;
    avgTimeToResolve: number;
  }>;
  topTriggerMilestones: Array<{
    milestone: string;
    objectionCount: number;
  }>;
}

interface AgentVariance {
  milestoneTiming: {
    agent: string;
    avgDuration: Record<string, number>;
    variance: Record<string, number>;
  }[];
  objectionHandling: {
    agent: string;
    resolutionRate: number;
    avgTimePerObjection: number;
  }[];
}
```

**Files to Create:**
```
src/services/analytics-service/analytics-service.ts
src/services/analytics-service/metrics-calculator.ts
src/services/analytics-service/types.ts
```

---

#### TASK-038: Build analytics API endpoints
**Story Points:** 3 | **Estimated Hours:** 8 | **Assignee:** backend_developer
**Dependencies:** TASK-037

**Description:**
Create REST API for analytics data retrieval with manager-only access.

**Acceptance Criteria:**
- [ ] GET /api/analytics/team - Team performance metrics
- [ ] GET /api/analytics/objections - Objection pattern analysis
- [ ] GET /api/analytics/agents - Per-agent performance
- [ ] GET /api/analytics/milestones - Milestone effectiveness
- [ ] Manager or Admin role required
- [ ] Date range query parameters supported

**Files to Create:**
```
app/api/analytics/team/route.ts
app/api/analytics/objections/route.ts
app/api/analytics/agents/route.ts
app/api/analytics/milestones/route.ts
```

---

#### TASK-039: Create Manager Dashboard UI
**Story Points:** 8 | **Estimated Hours:** 20 | **Assignee:** frontend_developer
**Dependencies:** TASK-038

**Description:**
Build manager-facing dashboard with team metrics, charts, and drill-down capability.

**Acceptance Criteria:**
- [ ] Dashboard layout with card-based metrics
- [ ] Team overview: total calls, conversion rate, avg duration
- [ ] Agent performance table with sortable columns
- [ ] Objection pattern chart (pie/bar chart)
- [ ] Milestone timing variance visualization
- [ ] Risk flags summary with call links
- [ ] Date range selector
- [ ] Export to CSV capability
- [ ] Mobile-responsive layout

**Component Structure:**
```
src/components/dashboard/
  ManagerDashboard.tsx          # Main container
  TeamMetricsCards.tsx          # KPI cards row
  AgentPerformanceTable.tsx     # Sortable agent table
  ObjectionPatternsChart.tsx    # Objection type distribution
  MilestoneTimingChart.tsx      # Timing variance visualization
  RiskFlagsSummary.tsx          # Recent risk flags
  DateRangeSelector.tsx         # Time filter
  index.ts
```

**State Management:**
```typescript
interface DashboardState {
  dateRange: { start: Date; end: Date };
  teamMetrics: TeamMetrics | null;
  objectionPatterns: ObjectionPatterns | null;
  agentVariance: AgentVariance | null;
  isLoading: boolean;
  selectedAgent: string | null;
}
```

---

#### TASK-040: Create Call Detail View for managers
**Story Points:** 3 | **Estimated Hours:** 8 | **Assignee:** frontend_developer
**Dependencies:** TASK-039

**Description:**
Build call detail view showing recording, transcript, AI analysis, and risk flags.

**Acceptance Criteria:**
- [ ] Recording player with timeline
- [ ] Transcript view with speaker labels
- [ ] Milestone markers on timeline
- [ ] Objection markers on timeline
- [ ] AI summary displayed
- [ ] Risk flags highlighted with evidence
- [ ] Agent feedback section
- [ ] Follow-up email draft (if generated)

**Files to Create:**
```
src/components/dashboard/CallDetailView.tsx
src/components/dashboard/RecordingPlayer.tsx
src/components/dashboard/TranscriptViewer.tsx
src/components/dashboard/TimelineMarkers.tsx
app/(manager)/dashboard/calls/[callId]/page.tsx
```

---

### Phase 4: Testing & Integration (Days 11-14)

#### TASK-041: Unit tests for Sprint 3 services
**Story Points:** 5 | **Estimated Hours:** 12 | **Assignee:** qa_developer
**Dependencies:** All backend tasks

**Description:**
Write comprehensive unit tests for all Sprint 3 services.

**Test Coverage Requirements:**
- [ ] ZoomRecordingService: 100% coverage
  - Link detection
  - Recording lifecycle
  - Error handling
- [ ] TranscriptService: 100% coverage
  - Transcript generation
  - Speaker detection
  - Marker injection
- [ ] AIAnalysisService: 100% coverage
  - Analysis pipeline
  - Summary generation
  - Risk detection
- [ ] AnalyticsService: 100% coverage
  - Metrics calculation
  - Aggregation accuracy

**Files to Create:**
```
src/services/zoom-service/__tests__/zoom-recording-service.test.ts
src/services/transcript-service/__tests__/transcript-service.test.ts
src/services/ai-analysis-service/__tests__/ai-analysis-service.test.ts
src/services/analytics-service/__tests__/analytics-service.test.ts
```

---

#### TASK-042: E2E tests for recording and dashboard flows
**Story Points:** 3 | **Estimated Hours:** 8 | **Assignee:** qa_developer
**Dependencies:** All frontend tasks

**Description:**
Write end-to-end tests for recording flow and manager dashboard.

**Test Scenarios:**
1. **Recording Flow**
   - Start call with Zoom link
   - Recording starts within 5 seconds
   - Complete call
   - Recording available in call detail

2. **AI Analysis Flow**
   - Complete call
   - Analysis generated within 2 minutes
   - Summary, risk flags, email draft available

3. **Manager Dashboard**
   - Navigate to dashboard
   - Metrics load correctly
   - Date range filter works
   - Drill into call detail
   - View recording and transcript

**Files to Create:**
```
tests/e2e/recording-flow.spec.ts
tests/e2e/ai-analysis-flow.spec.ts
tests/e2e/manager-dashboard.spec.ts
```

---

## 4. File-by-File Implementation Order

### Days 1-3: Tech Debt
```
1. src/services/objection-response-service/objection-response-service.ts (modify - transaction)
2. prisma/schema.prisma (modify - FK constraints, composite index)
3. prisma/migrations/xxx_add_fk_constraints/migration.sql
4. src/lib/api/error-handler.ts (create)
5. app/api/calls/[callId]/objections/route.ts (modify - error handler, length limits)
6. app/api/calls/[callId]/objections/[objectionResponseId]/route.ts (modify)
7. app/api/calls/[callId]/outcome/route.ts (modify)
8. src/services/call-outcome-service/call-outcome-service.ts (modify - groupBy)
```

### Days 3-5: Recording
```
9. src/lib/config/zoom.ts
10. src/services/zoom-service/types.ts
11. src/services/zoom-service/link-detector.ts
12. src/services/zoom-service/zoom-api-client.ts
13. src/services/zoom-service/zoom-recording-service.ts
14. app/api/calls/[callId]/recording/route.ts
15. app/api/calls/[callId]/recording/start/route.ts
16. app/api/calls/[callId]/recording/stop/route.ts
```

### Days 5-7: Transcript
```
17. src/services/transcript-service/types.ts
18. src/services/transcript-service/speaker-detector.ts
19. src/services/transcript-service/marker-injector.ts
20. src/services/transcript-service/transcript-service.ts
```

### Days 7-9: AI Analysis
```
21. src/services/ai-analysis-service/types.ts
22. src/services/ai-analysis-service/prompts/summary-prompt.ts
23. src/services/ai-analysis-service/prompts/risk-detection-prompt.ts
24. src/services/ai-analysis-service/prompts/feedback-prompt.ts
25. src/services/ai-analysis-service/prompts/email-prompt.ts
26. src/services/ai-analysis-service/ai-analysis-service.ts
```

### Days 9-11: Analytics & Dashboard
```
27. src/services/analytics-service/types.ts
28. src/services/analytics-service/metrics-calculator.ts
29. src/services/analytics-service/analytics-service.ts
30. app/api/analytics/team/route.ts
31. app/api/analytics/objections/route.ts
32. app/api/analytics/agents/route.ts
33. app/api/analytics/milestones/route.ts
34. src/components/dashboard/DateRangeSelector.tsx
35. src/components/dashboard/TeamMetricsCards.tsx
36. src/components/dashboard/AgentPerformanceTable.tsx
37. src/components/dashboard/ObjectionPatternsChart.tsx
38. src/components/dashboard/MilestoneTimingChart.tsx
39. src/components/dashboard/RiskFlagsSummary.tsx
40. src/components/dashboard/ManagerDashboard.tsx
41. src/components/dashboard/RecordingPlayer.tsx
42. src/components/dashboard/TranscriptViewer.tsx
43. src/components/dashboard/TimelineMarkers.tsx
44. src/components/dashboard/CallDetailView.tsx
45. app/(manager)/dashboard/page.tsx
46. app/(manager)/dashboard/calls/[callId]/page.tsx
```

### Days 11-14: Testing
```
47. src/services/zoom-service/__tests__/zoom-recording-service.test.ts
48. src/services/transcript-service/__tests__/transcript-service.test.ts
49. src/services/ai-analysis-service/__tests__/ai-analysis-service.test.ts
50. src/services/analytics-service/__tests__/analytics-service.test.ts
51. tests/e2e/recording-flow.spec.ts
52. tests/e2e/ai-analysis-flow.spec.ts
53. tests/e2e/manager-dashboard.spec.ts
```

---

## 5. API Endpoints to Create

### Recording
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/calls/:callId/recording/start | Start recording | Agent |
| POST | /api/calls/:callId/recording/stop | Stop recording | Agent |
| GET | /api/calls/:callId/recording | Get recording status/URL | Agent/Manager |

### Analytics
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/analytics/team | Team performance metrics | Manager/Admin |
| GET | /api/analytics/objections | Objection pattern analysis | Manager/Admin |
| GET | /api/analytics/agents | Per-agent performance | Manager/Admin |
| GET | /api/analytics/milestones | Milestone effectiveness | Manager/Admin |

---

## 6. Database Changes

### Migration 1: FK Constraints (TASK-025)
```prisma
model ObjectionResponse {
  objection   Objection   @relation(fields: [objectionId], references: [id], onDelete: Restrict)
  milestone   Milestone   @relation(fields: [milestoneId], references: [id], onDelete: Restrict)
}
```

### Migration 2: Composite Index (TASK-029)
```prisma
model ObjectionResponse {
  @@index([callSessionId, outcome])
}
```

---

## 7. Environment Variables

```bash
# Zoom Integration
ZOOM_API_KEY=
ZOOM_API_SECRET=
ZOOM_ACCOUNT_ID=
ZOOM_BOT_EMAIL=

# AI Service (Claude or GPT)
ANTHROPIC_API_KEY=
# or
OPENAI_API_KEY=

# Transcript Service (if using third-party)
ASSEMBLY_AI_KEY=
# or
DEEPGRAM_API_KEY=
```

---

## 8. Dependencies and Risks

### Dependencies
| Dependency | Type | Impact | Status |
|------------|------|--------|--------|
| Sprint 2 complete | Internal | High | Complete |
| Zoom API access | External | High | Requires setup |
| Claude/GPT API access | External | High | Available |
| Transcript service | External | Medium | Options available |

### Technical Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Zoom API rate limits | Medium | Medium | Implement backoff, queue |
| AI analysis latency | Medium | Low | Async processing, timeout |
| Recording storage costs | Low | Medium | Implement retention policy |
| Speaker detection accuracy | Medium | Low | Human review option |

### Business Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Recording consent requirements | High | High | Consent UI before recording |
| Data privacy (GDPR) | Medium | High | Retention policy, deletion |
| AI hallucination in summaries | Medium | Medium | Evidence markers, review |

---

## 9. Sprint Schedule

### Week 1 (Days 1-7)
| Day | Focus | Tasks |
|-----|-------|-------|
| 1-2 | Tech Debt | TASK-024, TASK-025, TASK-026 |
| 3 | Tech Debt + Recording | TASK-027, TASK-028, TASK-029, TASK-030 (start) |
| 4-5 | Recording | TASK-030, TASK-031, TASK-032 |
| 6-7 | AI Analysis | TASK-033, TASK-034 |

### Week 2 (Days 8-14)
| Day | Focus | Tasks |
|-----|-------|-------|
| 8-9 | AI Analysis + Analytics | TASK-035, TASK-036, TASK-037 |
| 10 | Analytics API | TASK-038 |
| 11 | Dashboard UI | TASK-039 (start) |
| 12 | Dashboard UI | TASK-039, TASK-040 |
| 13 | Testing | TASK-041 |
| 14 | Testing + Polish | TASK-042, bug fixes |

---

## 10. Definition of Done (Sprint)

- [ ] All 6 P2 tech debt items resolved and verified
- [ ] All 19 tasks completed and merged
- [ ] Recording integration working with Zoom
- [ ] AI analysis generates within 2 minutes
- [ ] Manager dashboard displays all required metrics
- [ ] Unit test coverage >90% on new services
- [ ] E2E tests passing for all critical paths
- [ ] No critical or high-severity bugs
- [ ] API documentation updated
- [ ] Code reviewed by at least one team member
- [ ] Performance benchmarks met:
  - Recording start < 5 seconds
  - AI analysis < 2 minutes
  - Dashboard load < 3 seconds
  - Analytics queries < 500ms

---

## 11. P2 Tech Debt Summary

| ID | Category | Description | SP | Status |
|----|----------|-------------|------|--------|
| DATA-001 | Data Integrity | Race condition in objection creation | 2 | Open |
| DATA-006 | Data Integrity | Missing cascade delete for FK | 1 | Open |
| SEC-003 | Security | Verbose error messages | 2 | Open |
| SEC-005 | Security | Notes field length limit | 1 | Open |
| PERF-003 | Performance | Over-fetching in getOutcomeStats | 1 | Open |
| PERF-004 | Performance | Missing composite index | 0.5 | Open |
| **Total** | | | **7.5** | |

---

## 12. Handoff Notes for `/kreativreason:work`

### Context Files for Each Task

**TASK-024 (Race Condition Fix):**
```
beginning_context: ["src/services/objection-response-service/objection-response-service.ts", "todos/P2/DATA-001-open-objection-race-condition.md"]
end_state_files: ["src/services/objection-response-service/objection-response-service.ts"]
read_only_files: ["prisma/schema.prisma"]
```

**TASK-030 (Zoom Recording Service):**
```
beginning_context: ["docs/prd.json", "src/services/zoom-service/zoom-service.ts"]
end_state_files: ["src/services/zoom-service/zoom-recording-service.ts"]
read_only_files: ["docs/prd.json"]
```

**TASK-033 (AI Analysis Service):**
```
beginning_context: ["docs/prd.json", "prisma/schema.prisma"]
end_state_files: ["src/services/ai-analysis-service/ai-analysis-service.ts"]
read_only_files: ["docs/prd.json"]
```

**TASK-037 (Analytics Service):**
```
beginning_context: ["src/services/call-outcome-service/call-outcome-service.ts", "prisma/schema.prisma"]
end_state_files: ["src/services/analytics-service/analytics-service.ts"]
read_only_files: ["docs/prd.json"]
```

**TASK-039 (Manager Dashboard):**
```
beginning_context: ["src/services/analytics-service/analytics-service.ts", "src/components/ui/"]
end_state_files: ["src/components/dashboard/ManagerDashboard.tsx", "app/(manager)/dashboard/page.tsx"]
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
*Created: 2026-01-11*
*Last Updated: 2026-01-11*
