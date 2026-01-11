# CallOS Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CALLEOS SYSTEM ARCHITECTURE                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         DEPLOYMENT LAYER (ADR-0007)                         │
│                     Vercel (Phase 1) → Railway (Phase 2)                    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  EDGE (CDN + Global Distribution)                                   │  │
│  │  ├─ Static assets (slides, images)                                 │  │
│  │  ├─ Presentation view distribution                                 │  │
│  │  └─ API route load balancing                                       │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER (ADR-0001: Next.js)                    │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ FRONTEND (React Components with Zustand State - ADR-0006)            │  │
│  │ ├─ Control Panel Component (Agent Interface)                         │  │
│  │ │  ├─ Milestone Display & Progress Tracking                         │  │
│  │ │  ├─ Checklist Management                                          │  │
│  │ │  ├─ Notes & Confirmation Checkboxes                               │  │
│  │ │  ├─ Objection Trigger & Subflow Manager                           │  │
│  │ │  └─ WebSocket Connection State (ADR-0003)                         │  │
│  │ ├─ Presentation View (Client Tab - Slave)                           │  │
│  │ │  ├─ Slides Only (Read-Only, No Controls)                          │  │
│  │ │  └─ Real-time Sync via WebSocket <500ms (ADR-0003)                │  │
│  │ ├─ Manager Dashboard (Analytics)                                    │  │
│  │ │  ├─ Team Metrics Charts                                           │  │
│  │ │  ├─ Agent Performance Drill-Down                                  │  │
│  │ │  ├─ Risk Flags & Call Review                                      │  │
│  │ │  └─ Call Recording Player with Transcript                         │  │
│  │ ├─ Admin Config Panel                                               │  │
│  │ │  ├─ Milestone Editor                                              │  │
│  │ │  ├─ Objection Flow Manager                                        │  │
│  │ │  ├─ Slide Deck Manager                                            │  │
│  │ │  └─ AI Prompt Registry (ADR-0010)                                 │  │
│  │ └─ Authentication Pages (Clerk Integration - ADR-0005)              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                 ↕️ WebSocket (ADR-0003)                     │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ BACKEND API ROUTES (Next.js API Routes - ADR-0001)                   │  │
│  │                                                                       │  │
│  │ ├─ Realtime Handlers (WebSocket via Socket.io)                       │  │
│  │ │  ├─ /api/ws/slides - Slide sync controller                        │  │
│  │ │  └─ /api/ws/call-events - Call progress broadcast                 │  │
│  │ │                                                                     │  │
│  │ ├─ REST Endpoints                                                    │  │
│  │ │  ├─ /api/calls - Call CRUD operations                             │  │
│  │ │  ├─ /api/milestones - Milestone retrieval & tracking              │  │
│  │ │  ├─ /api/objections - Objection subflow management                │  │
│  │ │  ├─ /api/slides - Slide rendering & instance tracking            │  │
│  │ │  ├─ /api/analytics - Manager dashboard data (cached)              │  │
│  │ │  ├─ /api/auth - Clerk webhook integration                         │  │
│  │ │  └─ /api/admin - Configuration endpoints                          │  │
│  │ │                                                                     │  │
│  │ ├─ Service Layer (Business Logic)                                    │  │
│  │ │  ├─ CallSessionService - Session state machine                    │  │
│  │ │  ├─ MilestoneService - Milestone sequencing & enforcement          │  │
│  │ │  ├─ ObjectionService - Diagnostic question routing                │  │
│  │ │  ├─ ZoomRecordingService (ADR-0008) - Bot integration              │  │
│  │ │  ├─ AIAnalysisService (ADR-0004) - Claude API + queue              │  │
│  │ │  ├─ GHLSyncService (ADR-0009) - CRM bidirectional sync             │  │
│  │ │  └─ AnalyticsService - Aggregation & caching                       │  │
│  │ │                                                                     │  │
│  │ └─ Middleware                                                        │  │
│  │    ├─ Authentication (Clerk - ADR-0005)                              │  │
│  │    ├─ RBAC (Role-based access control)                               │  │
│  │    ├─ Request logging & audit trail                                  │  │
│  │    └─ Error handling & rate limiting                                 │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    DATA & INTEGRATION LAYER                                │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ DATABASE (PostgreSQL via Supabase - ADR-0002)                        │  │
│  │ ├─ Organizations (Multi-tenancy support)                            │  │
│  │ ├─ Users (Agent, Manager, Admin roles)                              │  │
│  │ ├─ Prospects (GHL sync targets - ADR-0009)                          │  │
│  │ ├─ Calls & CallThreads (Primary + follow-ups)                       │  │
│  │ ├─ Milestones & MilestoneResponses                                  │  │
│  │ ├─ Objections & ObjectionResponses                                  │  │
│  │ ├─ Slides (Templates + Instances)                                   │  │
│  │ ├─ PromptConfigs (5-layer system - ADR-0010)                        │  │
│  │ ├─ AIAnalyses (Claude output + risk flags - ADR-0004)               │  │
│  │ └─ Audit logs (All admin changes, auth events)                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ EXTERNAL INTEGRATIONS                                                │  │
│  │                                                                       │  │
│  │ ├─ Zoom Recording Bot (ADR-0008)                                     │  │
│  │ │  ├─ Joins meeting silently                                         │  │
│  │ │  ├─ Captures audio + speaker detection                            │  │
│  │ │  └─ Webhooks on recording ready                                   │  │
│  │ │                                                                     │  │
│  │ ├─ Transcription Service (AssemblyAI - ADR-0008)                     │  │
│  │ │  ├─ Audio → Text conversion                                        │  │
│  │ │  └─ Speaker identification                                         │  │
│  │ │                                                                     │  │
│  │ ├─ Claude API (Anthropic - ADR-0004)                                │  │
│  │ │  ├─ Post-call analysis (async queue)                              │  │
│  │ │  ├─ Structured prompt system (ADR-0010)                           │  │
│  │ │  └─ Risk flag detection                                           │  │
│  │ │                                                                     │  │
│  │ ├─ GoHighLevel CRM (ADR-0009)                                        │  │
│  │ │  ├─ Contact import/sync                                            │  │
│  │ │  ├─ Pipeline stage updates                                         │  │
│  │ │  └─ Calendar sync (follow-ups)                                    │  │
│  │ │                                                                     │  │
│  │ ├─ Clerk Auth (ADR-0005)                                             │  │
│  │ │  ├─ User identity & sessions                                      │  │
│  │ │  └─ MFA & password reset                                          │  │
│  │ │                                                                     │  │
│  │ └─ AWS S3 (ADR-0008)                                                 │  │
│  │    ├─ Recording storage                                              │  │
│  │    └─ Server-side encryption + access logging                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ ASYNC JOB QUEUE (Bull.js)                                            │  │
│  │ ├─ Post-call AI analysis (Claude - ADR-0004)                         │  │
│  │ ├─ GHL sync tasks (ADR-0009)                                         │  │
│  │ ├─ Email generation (follow-up drafts)                               │  │
│  │ └─ Retry logic & dead-letter handling                                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘

```

## Data Flow Diagram: Call Execution

```
AGENT JOURNEY: First Sales Call
===============================

1. PRE-CALL PREPARATION
   ┌─────────────────┐
   │ Agent logs in   │──[Clerk Auth (ADR-0005)]──→ User session with JWT
   └─────────────────┘
   
   ┌─────────────────────────────────┐
   │ Agent starts new call for        │
   │ prospect (from GHL import)       │
   └─────────────────────────────────┘
                   ↓
   ┌─────────────────────────────────┐
   │ Control Panel loads prospect     │ ←──[API /api/calls]←── DB: Prospects table
   │ ├─ Client count (500+ gate)      │                      (GHL synced - ADR-0009)
   │ ├─ Main pain points              │
   │ ├─ Revenue volatility            │
   │ └─ Pre-call checklist (8 items)  │
   └─────────────────────────────────┘
                   ↓
   ┌─────────────────────────────────┐
   │ Pre-call checklist gate          │
   │ If <500 clients: block coaching  │ ←── Check: client_count >= 500
   │ pitch, show "advisory only"      │
   └─────────────────────────────────┘


2. CALL EXECUTION (Real-Time)
   ┌──────────────────────────────────────┐
   │ Agent pastes Zoom link               │ ──→ Zoom Bot (ADR-0008) joins silently
   │                                      │     + AssemblyAI recording begins
   └──────────────────────────────────────┘
                   ↓
   ┌──────────────────────────────────────┐
   │ Milestone 1: Context & Frame         │
   │ ├─ Control Panel: display M1 info    │ ←── API /api/milestones/:id
   │ ├─ Agent reads script guidance       │ ←── DB: Milestones table
   │ ├─ Agent takes notes                 │ ──→ API POST /api/milestone-responses
   │ └─ Timer: 5 minutes (estimated)      │
   └──────────────────────────────────────┘
                   ↓
   ┌──────────────────────────────────────┐
   │ Milestone 2: Current State Mapping   │
   │ ├─ Control Panel: input fields       │
   │ │  (client count, revenue, pain)     │
   │ ├─ Agent fills in data               │ ──→ Store in MilestoneResponse
   │ ├─ System generates summary          │ ←── [State from Zustand - ADR-0006]
   │ │  "You have X clients, volatility Y" │
   │ └─ Timer: 15-20 minutes              │
   └──────────────────────────────────────┘
                   ↓
   ... M3 (Vision), M4 (Reality), M5 (Solution), M6 (Offer), M7 (Decision) ...
                   ↓
   
3. PRESENTATION MODE (Dual Interface)
   ┌─────────────────────────────────┐
   │ Agent clicks "Start Presentation"│
   │                                  │
   │ CONTROL PANEL (Master)           │ PRESENTATION VIEW (Slave)
   │ ├─ All controls visible          │ ├─ Slides only
   │ ├─ Notes & confirmations         │ ├─ Client-safe (no controls)
   │ ├─ Objection triggers            │ ├─ Synced <500ms via WebSocket
   │ ├─ Slide nav buttons             │ │  (ADR-0003: Socket.io)
   │ └─ Milestone tracking            │ └─ Ready for Zoom screen share
   │           ↕️                       │
   │   WebSocket Channel               │
   │   (ADR-0003)                      │
   └─────────────────────────────────┘
   
4. OBJECTION HANDLING (Mid-Call)
   ┌──────────────────────────────────┐
   │ Prospect raises objection         │
   │ (at any milestone)                │
   │                                  │
   │ Agent clicks "Trigger Objection"  │ ──→ API /api/objections/select
   │ ├─ Choose type (Price/Timing/...) │ ←── DB: Objections table (6 types)
   │ └─ Load diagnostic questions      │
   │                                  │
   │ Agent asks questions, takes notes │ ──→ API POST /api/objection-responses
   │ (NO rebuttal/persuasion available)│
   │                                  │
   │ Agent classifies outcome:         │
   │ ├─ Resolved (proceed to next M)   │
   │ ├─ Deferred (flag for follow-up)  │ ──→ DB: ObjectionResponse.outcome
   │ └─ Disqualified (end call path)   │
   └──────────────────────────────────┘


5. CALL COMPLETION
   ┌──────────────────────────────────┐
   │ Reach M7: Decision Point          │
   │ Agent requests explicit choice:   │
   │ ├─ Proceed (coaching client)      │
   │ ├─ Pause (follow-up needed)       │
   │ └─ Decline (disqualified)         │
   │                                  │
   │ If Decline: mandatory reason      │ ──→ DB: CallOutcome.disqualification_reason
   │ (500+ clients, cashflow, etc.)    │
   │                                  │
   │ Call Status: completed            │ ──→ API PUT /api/calls/:id/complete
   └──────────────────────────────────┘
                   ↓
   
6. POST-CALL AI ANALYSIS (Async)
   ┌──────────────────────────────────┐
   │ Recording ready from Zoom         │ ←── Zoom webhook
   │ AssemblyAI transcript generated   │ ←── Transcription service
   │ Timeline markers inserted         │ ←── Milestones + objections
   │                                  │
   │ Job enqueued in Bull.js queue     │ ──→ Bull job: 'analyze-call'
   │                                  │
   │ Claude API (Sonnet) called        │ ←── ADR-0004 (Anthropic)
   │ ├─ 5-layer prompts (ADR-0010)     │ ←── PromptConfigs from DB
   │ ├─ Summary generation             │
   │ ├─ Objection classification       │
   │ ├─ Decision readiness score       │
   │ ├─ Risk flags detection           │
   │ └─ Follow-up email draft          │
   │                                  │
   │ AIAnalysis saved to DB            │ ──→ DB: AIAnalyses table
   │ Control Panel updates with:       │
   │ ├─ AI Summary                     │
   │ ├─ Call recording link            │
   │ └─ Follow-up email preview        │ ←── [Real-time via Zustand]
   └──────────────────────────────────┘
                   ↓
   
7. CRM SYNC (Background)
   ┌──────────────────────────────────┐
   │ Job enqueued: 'sync-ghl-outcome'  │ ──→ Bull job queue
   │                                  │
   │ GHL Integration (ADR-0009):       │
   │ ├─ Get prospect ghl_contact_id    │ ←── DB: Prospects.ghl_contact_id
   │ ├─ Map call outcome to GHL stage  │
   │ │  (Closed/Follow-up/Disqualified)│
   │ ├─ Update GHL contact record      │ ──→ GHL API v4.1
   │ │                                  │
   │ │  If outcome = Follow-up:         │
   │ │  ├─ Agent schedules time         │
   │ │  └─ Create GHL calendar event    │
   │ │                                  │
   │ └─ Log sync event                 │ ──→ DB: Audit logs
   └──────────────────────────────────┘


8. MANAGER REVIEW (Async, Next Day)
   ┌──────────────────────────────────┐
   │ Manager logs in                  │ ──[Clerk Auth]──→ Manager role JWT
   │                                  │
   │ Manager Dashboard (ADR-0007):     │
   │ ├─ Team metrics (calls, close %)  │ ←── API /api/analytics/team
   │ ├─ Agent drill-down (Marcus)      │ ←── API /api/analytics/agent/:id
   │ │  ├─ Close rate vs average       │
   │ │  ├─ Objection patterns          │
   │ │  └─ Milestone variance          │
   │ │                                  │
   │ ├─ Call list (sortable)           │ ←── API /api/calls?filter=agent_id
   │ ├─ Select specific call           │
   │ └─ Review panel:                  │
   │    ├─ Call summary (AI-generated) │ ←── DB: AIAnalyses.summary
   │    ├─ Play recording with sync'd  │ ←── Recording link + transcript
   │    │  transcript                  │
   │    ├─ Timeline markers            │
   │    ├─ Risk flags highlighted      │ ← DB: AIAnalyses.risk_flags
   │    └─ Agent execution feedback    │ ← DB: AIAnalyses.agent_feedback
   │                                  │
   │ 1-on-1 coaching notes:            │
   │ ├─ Manager writes coaching notes  │ ──→ API POST /api/coaching-notes
   │ └─ Notes linked to call moments   │ ──→ DB: Coach notes (future)
   └──────────────────────────────────┘

```

## Technology Stack Summary

| Layer | Technology | Decision | Notes |
|-------|-----------|----------|-------|
| **Framework** | Next.js 14 | ADR-0001 | Full-stack unified codebase |
| **Language** | TypeScript | ADR-0001 | Type safety end-to-end |
| **Frontend Framework** | React 18+ | ADR-0001 | Component-based UI |
| **State Management** | Zustand | ADR-0006 | Minimal boilerplate (2.6KB) |
| **Styling** | TailwindCSS + CSS-in-JS | - | Corporate design system |
| **Real-time** | Socket.io / ws | ADR-0003 | WebSocket <500ms latency |
| **Database** | PostgreSQL | ADR-0002 | Supabase (managed) Phase 1 |
| **ORM** | Prisma | - | Type-safe migrations |
| **Authentication** | Clerk | ADR-0005 | Pre-built user management |
| **AI/LLM** | Claude API (Anthropic) | ADR-0004 | Post-call analysis only |
| **Transcription** | AssemblyAI | ADR-0008 | Audio to text + speaker ID |
| **Recording** | Zoom Bot SDK | ADR-0008 | Custom bot integration |
| **Storage** | AWS S3 | ADR-0008 | Recordings + encrypted |
| **CRM Integration** | GoHighLevel API | ADR-0009 | Custom sync layer |
| **Job Queue** | Bull.js | - | Async processing (analysis, sync) |
| **Caching** | Redis | - | Analytics aggregation |
| **Deployment** | Vercel | ADR-0007 | Phase 1 (Railway Phase 2) |
| **Monitoring** | Sentry / Vercel Analytics | - | Error tracking + performance |
| **Logging** | Pino / Winston | - | Structured logging |

## Deployment Topology (Phase 1)

```
┌──────────────────────────────────────────────────────────────────┐
│                     Vercel Edge Network (Global CDN)             │
│                                                                  │
│  ┌─ us-east-1   ┌─ eu-west-1   ┌─ ap-southeast-1   ...         │
│  │ (Americas)   │ (Europe)      │ (Asia Pacific)                 │
│  └──────────────┴───────────────┴──────────────────              │
│                                                                  │
│         ↓ Routes to (based on latency)                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │       Vercel Serverless Functions (Node.js)            │    │
│  │  ├─ Next.js Pages (React Server Components)            │    │
│  │  ├─ API Routes (/api/**)                               │    │
│  │  └─ WebSocket Handlers (Socket.io adapter)             │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│         ↓                                                        │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │       Supabase PostgreSQL (EU Region)                   │    │
│  │  ├─ Primary Database                                    │    │
│  │  ├─ Row-level Security (Multi-tenancy)                  │    │
│  │  ├─ Backups & Replication (Auto)                        │    │
│  │  └─ Built-in Auth with Postgres Auth                    │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│         ↓                                                        │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │       External Services (API Calls)                     │    │
│  │  ├─ Clerk (Auth webhooks)                               │    │
│  │  ├─ Claude API (Anthropic)                              │    │
│  │  ├─ AssemblyAI (Transcription)                          │    │
│  │  ├─ GoHighLevel API (CRM sync)                          │    │
│  │  ├─ Zoom API (Recording webhooks)                       │    │
│  │  └─ AWS S3 (Recording storage)                          │    │
│  └────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SECURITY LAYERS                                 │
│                                                                     │
│  1. AUTHENTICATION (Clerk - ADR-0005)                               │
│     ├─ Email/Password with bcrypt hashing                          │
│     ├─ JWT tokens in secure httpOnly cookies                       │
│     ├─ Session timeout (2 hours idle)                              │
│     ├─ MFA support (TOTP authenticator)                            │
│     └─ Audit logging of login/logout events                        │
│                                                                     │
│  2. AUTHORIZATION (Role-Based Access Control)                       │
│     ├─ Sales Agent: create/run calls, view own data                │
│     ├─ Manager: view team calls, analytics, AI output              │
│     ├─ Admin: configure milestones, slides, prompts                │
│     └─ Row-level security on PostgreSQL enforces isolation         │
│                                                                     │
│  3. DATA ENCRYPTION                                                 │
│     ├─ Transport: TLS 1.3 (HTTPS everywhere)                       │
│     ├─ At Rest: PostgreSQL encryption (Supabase managed)           │
│     ├─ S3 Storage: Server-side encryption (AES-256)                │
│     └─ Secrets: Environment variables (Vercel secrets vault)       │
│                                                                     │
│  4. AUDIT & COMPLIANCE                                              │
│     ├─ Call session audit trail (all changes logged)               │
│     ├─ Admin change logging (milestone edits, prompt versions)     │
│     ├─ Recording consent (explicit UI confirmation)                │
│     ├─ GDPR-ready: soft deletes, data export, user deletion        │
│     └─ Access logging on S3 (who accessed recordings)              │
│                                                                     │
│  5. API SECURITY                                                    │
│     ├─ Rate limiting (prevent brute force, DOS)                    │
│     ├─ CORS configuration (only trusted domains)                   │
│     ├─ CSRF protection (SameSite cookies)                          │
│     ├─ Input validation (Zod/Joi schemas)                          │
│     └─ SQL injection prevention (Prisma parameterized queries)     │
│                                                                     │
│  6. THIRD-PARTY SECURITY                                            │
│     ├─ Clerk: Enterprise authentication, SOC 2 compliant           │
│     ├─ Supabase: Security key management, encrypted at rest        │
│     ├─ Claude API: Conversations not used for training             │
│     ├─ Zoom Bot: Credentials in env vars, IP whitelisting          │
│     └─ GHL: OAuth 2.0, scoped permissions, token refresh           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Cross-Reference: ADRs to Implementation Tasks

| ADR | Decision | Related Tasks | Epics |
|-----|----------|---------------|-------|
| ADR-0001 | Next.js Framework | TASK-001, 008, 010, 013, 014 | EPIC-001, 004 |
| ADR-0002 | PostgreSQL Database | TASK-002, 004 | EPIC-001 |
| ADR-0003 | WebSocket Real-Time | TASK-015, 016, 024 | EPIC-004 |
| ADR-0004 | Claude AI Analysis | TASK-012, 013 | EPIC-003 |
| ADR-0005 | Clerk Authentication | TASK-003, 024 | EPIC-007 |
| ADR-0006 | Zustand State Mgmt | TASK-008, 010 | EPIC-001, 002 |
| ADR-0007 | Vercel Deployment | TASK-001 | All |
| ADR-0008 | Zoom Recording | TASK-011, 012 | EPIC-003 |
| ADR-0009 | GoHighLevel Sync | TASK-017 | EPIC-005 |
| ADR-0010 | AI Prompt System | TASK-012 | EPIC-006 |

---

**Document Generated**: 2026-01-08  
**Next Phase**: Scaffolding (Infrastructure Setup)  
**Approval Required**: Hermann (Technical Architect), Usama (Technical Review)
