# Sprint 4: Presentation Mode Implementation Plan

**Version:** 1.0.0
**Created:** 2026-01-11
**Status:** Draft - Awaiting Approval
**Sprint Focus:** FR-008, FR-009, FR-010 (Dual Interface System, Canonical Slide Deck, Template vs Instance Model)

---

## Executive Summary

Sprint 4 implements the Presentation Mode system, enabling sales agents to share a synchronized, client-facing slide view during calls while maintaining a private control panel. This sprint delivers:

- **Dual-view architecture**: Control panel (agent-only) + Presentation view (client-visible)
- **Real-time synchronization**: WebSocket-based slide sync between views
- **Slide rendering engine**: Parameter substitution for personalized slides
- **Slide instance tracking**: Recording rendered content per call for analytics

---

## Prerequisites from Previous Sprints

| Dependency | Status | Location |
|------------|--------|----------|
| SlideTemplate model | Exists | `prisma/schema.prisma:197` |
| SlideDeck model | Exists | `prisma/schema.prisma:214` |
| SlideInstance model | Exists | `prisma/schema.prisma:231` |
| use-presentation.ts hook | Exists (stub) | `src/hooks/use-presentation.ts` |
| use-realtime.ts hook | Exists | `src/hooks/use-realtime.ts` |
| slide-store.ts | Exists | `src/stores/slide-store.ts` |
| CallSession integration | Complete | Sprint 1-3 |

---

## Phase Structure

### Phase 0: P1/P2 Code Review Fix Sweep (Pre-Sprint)
**Duration:** 1 session
**Purpose:** Address critical findings from Sprint 3 reviews before proceeding

| ID | Priority | Issue | Fix |
|----|----------|-------|-----|
| SEC-003 | P1 | No rate limiting on analytics endpoints | Add rate limiter to all analytics routes |
| DATA-001 | P1 | RecordingSession lacks organizationId filter | Add multi-tenant filter |
| PERF-001 | P1 | N+1 query in getAgentVariance | Batch fetch with single query |
| PERF-002 | P1 | N+1 query in getMilestoneEffectiveness | Use groupBy aggregation |
| DATA-002 | P2 | CallOutcome groupBy multi-tenancy issue | Fetch callSessionIds first |
| SEC-001/002 | P2 | Missing agentIds CUID validation | Add zod validation |
| SEC-004 | P2 | Missing callId validation in detail route | Use callParamsSchema |
| SEC-006 | P2 | No max pagination limit | Cap at 100 |
| DATA-008 | P2 | Timezone inconsistency in date parsing | Use parseDateToUTC helper |

**Acceptance Criteria:**
- [ ] Rate limiting implemented on all `/api/analytics/**` routes
- [ ] All multi-tenant queries verified
- [ ] N+1 queries eliminated
- [ ] Input validation complete

---

### Phase 1: WebSocket Infrastructure
**Duration:** 2 sessions
**Focus:** Real-time communication layer

#### Tasks

**1.1 WebSocket Server Setup**
- [ ] Create `/app/api/realtime/route.ts` using Socket.IO or Pusher
- [ ] Implement channel authentication with Clerk
- [ ] Create room management per callSessionId
- [ ] Add reconnection handling

**1.2 Client-Side WebSocket Integration**
- [ ] Enhance `src/lib/realtime/socket-client.ts`
- [ ] Implement connection state management
- [ ] Add event handlers for slide:navigate, slide:focus, presentation:sync
- [ ] Create automatic reconnection with exponential backoff

**1.3 Same-Device Sync (BroadcastChannel)**
- [ ] Create `src/lib/realtime/broadcast-channel.ts`
- [ ] Implement local tab communication as primary (no server needed)
- [ ] Fall back to WebSocket only for cross-device scenarios
- [ ] Add channel lifecycle management

**Technical Specifications:**
```typescript
// Event Types
interface SlideEvent {
  type: 'slide:navigate' | 'slide:focus' | 'presentation:start' | 'presentation:end';
  callId: string;
  slideId: string;
  slideIndex: number;
  timestamp: number;
  agentId: string;
}

// Sync Strategy
// 1. Try BroadcastChannel first (same device, zero latency)
// 2. Fall back to WebSocket (cross-device, <500ms latency)
```

**Acceptance Criteria:**
- [ ] WebSocket connection established within 2 seconds
- [ ] Slide sync latency < 500ms (per PRD TR)
- [ ] Graceful degradation when WebSocket unavailable
- [ ] Connection state visible in UI

---

### Phase 2: Slide API & Data Layer
**Duration:** 2 sessions
**Focus:** Backend API for slide management

#### Tasks

**2.1 Slide API Routes**
- [ ] `GET /api/calls/[callId]/slides` - Get slides for call
- [ ] `GET /api/calls/[callId]/slides/[slideId]` - Get single slide with parameters
- [ ] `POST /api/calls/[callId]/slides/[slideId]/navigate` - Navigate to slide (broadcast event)
- [ ] `POST /api/calls/[callId]/slides/render` - Render all slides with parameters
- [ ] `PATCH /api/calls/[callId]/slides/[slideInstanceId]` - Update timing/notes

**2.2 Slide Service Layer**
- [ ] Create `src/services/slide-service/slide-service.ts`
- [ ] Implement `getSlidesByCallId(callId, organizationId)`
- [ ] Implement `renderSlideWithParameters(templateId, parameters)`
- [ ] Implement `recordSlideInstance(callId, slideId, timing)`
- [ ] Implement parameter substitution engine

**2.3 Parameter Substitution Engine**
- [ ] Create `src/services/slide-service/parameter-engine.ts`
- [ ] Parse template slots: `{{prospect.clientCount}}`, `{{call.painPoints}}`
- [ ] Map parameters from CallSession and Prospect data
- [ ] Handle missing parameters gracefully (show placeholder)
- [ ] Cache rendered content per call

**Data Flow:**
```
SlideTemplate (static, admin-created)
    ↓ + CallSession parameters
    ↓ + Prospect data
SlideInstance (rendered, call-specific)
```

**Acceptance Criteria:**
- [ ] All API routes return proper auth errors (401/403)
- [ ] Parameter substitution handles all defined slots
- [ ] Slide instances linked to call session
- [ ] Timing data captured (start/end timestamps)

---

### Phase 3: Control Panel Enhancements
**Duration:** 2 sessions
**Focus:** Agent-side slide controls

#### Tasks

**3.1 Slide Navigation Component**
- [ ] Create `src/components/call-control/slide-navigator.tsx`
- [ ] Thumbnail strip of all slides
- [ ] Current slide indicator
- [ ] Previous/Next navigation buttons
- [ ] Keyboard shortcuts (Left/Right arrows)

**3.2 Slide Preview Panel**
- [ ] Create `src/components/call-control/slide-preview.tsx`
- [ ] Display current slide content (rendered)
- [ ] Show slide notes (agent-only)
- [ ] Highlight current milestone's slides

**3.3 Presentation Mode Controls**
- [ ] Create `src/components/call-control/presentation-controls.tsx`
- [ ] "Open Presentation" button (opens new tab)
- [ ] "Close Presentation" button
- [ ] Sync status indicator (connected/disconnected)
- [ ] Manual sync button for recovery

**3.4 Integration with Existing Control Panel**
- [ ] Update `src/components/call-control/control-panel.tsx`
- [ ] Add slide section to layout
- [ ] Bind to milestone progression (auto-advance optional)
- [ ] Integrate with call state management

**Acceptance Criteria:**
- [ ] Slide navigation responds within 100ms
- [ ] Current slide visually highlighted
- [ ] Keyboard shortcuts work when panel focused
- [ ] Presentation controls visible during active call

---

### Phase 4: Presentation View
**Duration:** 2 sessions
**Focus:** Client-facing presentation window

#### Tasks

**4.1 Presentation Page**
- [ ] Create `app/(presentation)/[callId]/page.tsx`
- [ ] Full-screen slide display
- [ ] No controls, notes, or navigation visible
- [ ] Clean, client-safe URL
- [ ] Responsive for screen share

**4.2 Presentation Layout**
- [ ] Create `app/(presentation)/layout.tsx`
- [ ] Minimal header (optional logo)
- [ ] No navigation elements
- [ ] Black/neutral background
- [ ] Authentication via session token (not full Clerk UI)

**4.3 Slide Renderer Component**
- [ ] Create `src/components/presentation/slide-renderer.tsx`
- [ ] Render slide content with parameters
- [ ] Support slide types: text, comparison, data-viz placeholder
- [ ] Smooth transitions between slides
- [ ] Loading state while fetching

**4.4 Sync Consumer**
- [ ] Connect to WebSocket/BroadcastChannel
- [ ] Listen for slide:navigate events
- [ ] Update displayed slide on event
- [ ] Handle connection loss gracefully (show last slide)

**Acceptance Criteria:**
- [ ] Presentation opens in new tab
- [ ] No agent-only UI visible
- [ ] Slides update within 500ms of control panel action
- [ ] Works in Zoom screen share

---

### Phase 5: Slide Store & State Management
**Duration:** 1 session
**Focus:** Client-side state coordination

#### Tasks

**5.1 Enhance Slide Store**
- [ ] Update `src/stores/slide-store.ts`
- [ ] Add `currentSlideId`, `slideOrder`, `presentationActive`
- [ ] Add `syncStatus` ('connected' | 'disconnected' | 'syncing')
- [ ] Persist slide position across page refresh
- [ ] Subscribe to real-time events

**5.2 Presentation Hook Updates**
- [ ] Update `src/hooks/use-presentation.ts`
- [ ] Implement `openPresentation(callId)` - opens new tab
- [ ] Implement `closePresentation()` - closes tab, cleans up
- [ ] Implement `navigateToSlide(slideId)`
- [ ] Implement `getCurrentSlide()`

**5.3 Cross-Tab Communication**
- [ ] Detect presentation tab open/close
- [ ] Sync initial state on tab open
- [ ] Handle tab close cleanup

**Acceptance Criteria:**
- [ ] Store state consistent between tabs
- [ ] Presentation tab detects control panel disconnection
- [ ] Slide position persists on refresh

---

### Phase 6: Testing & Polish
**Duration:** 1 session
**Focus:** Quality assurance

#### Tasks

**6.1 Unit Tests**
- [ ] `src/services/slide-service/__tests__/slide-service.test.ts`
- [ ] `src/services/slide-service/__tests__/parameter-engine.test.ts`
- [ ] `src/lib/realtime/__tests__/broadcast-channel.test.ts`

**6.2 E2E Tests**
- [ ] `tests/e2e/presentation-mode.spec.ts`
- [ ] Test dual-view sync
- [ ] Test slide navigation
- [ ] Test connection recovery

**6.3 Performance Optimization**
- [ ] Lazy load slides outside viewport
- [ ] Optimize WebSocket message size
- [ ] Add slide content caching

**6.4 Accessibility**
- [ ] Keyboard navigation for slides
- [ ] Focus management on slide change
- [ ] Screen reader announcements

**Acceptance Criteria:**
- [ ] All new code has >70% test coverage
- [ ] E2E tests pass consistently
- [ ] No accessibility violations (WCAG 2.1 AA)

---

## Technical Architecture

### Sync Architecture Options

| Approach | Latency | Complexity | Use Case |
|----------|---------|------------|----------|
| BroadcastChannel | <10ms | Low | Same device (primary) |
| Socket.IO | ~100ms | Medium | Cross-device, self-hosted |
| Pusher | ~200ms | Low | Cross-device, managed |

**Recommendation:** Use BroadcastChannel as primary (same device), with Socket.IO fallback for edge cases.

### Component Hierarchy

```
app/(agent)/call/[callId]/page.tsx
├── ControlPanel
│   ├── MilestonePanel (existing)
│   ├── SlideNavigator (new)
│   ├── SlidePreview (new)
│   ├── PresentationControls (new)
│   └── ObjectionPanel (existing)

app/(presentation)/[callId]/page.tsx
├── PresentationLayout
│   └── SlideRenderer
```

### State Flow

```
Control Panel                    Presentation View
     │                                 │
     ▼                                 │
  navigateToSlide()                    │
     │                                 │
     ├──► BroadcastChannel ──────────► │
     │                                 │
     └──► WebSocket (fallback) ──────► │
                                       │
                                       ▼
                              SlideRenderer.update()
```

---

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `app/api/calls/[callId]/slides/route.ts` | Slides list API |
| `app/api/calls/[callId]/slides/[slideId]/route.ts` | Single slide API |
| `app/api/calls/[callId]/slides/[slideId]/navigate/route.ts` | Navigate event API |
| `app/(presentation)/[callId]/page.tsx` | Presentation view page |
| `app/(presentation)/layout.tsx` | Presentation layout |
| `src/services/slide-service/slide-service.ts` | Slide business logic |
| `src/services/slide-service/parameter-engine.ts` | Template substitution |
| `src/lib/realtime/broadcast-channel.ts` | Same-device sync |
| `src/components/call-control/slide-navigator.tsx` | Navigation component |
| `src/components/call-control/slide-preview.tsx` | Preview component |
| `src/components/call-control/presentation-controls.tsx` | Controls component |
| `src/components/presentation/slide-renderer.tsx` | Render component |
| `src/lib/api/rate-limit.ts` | Rate limiting utility |

### Files to Modify

| File | Changes |
|------|---------|
| `src/stores/slide-store.ts` | Add sync state, current slide |
| `src/hooks/use-presentation.ts` | Full implementation |
| `src/hooks/use-realtime.ts` | Add slide events |
| `src/components/call-control/control-panel.tsx` | Add slide section |
| `prisma/schema.prisma` | (Optional) Add fields if needed |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| WebSocket scaling | High | Use BroadcastChannel for same-device; defer cross-device to Phase 2 |
| Browser tab restrictions | Medium | Document Zoom screen share best practices |
| Slide rendering performance | Medium | Lazy load, cache rendered content |
| Connection reliability | High | Implement reconnection, show last state on disconnect |

---

## Definition of Done

Sprint 4 is complete when:

1. [ ] Agent can open presentation in new tab from control panel
2. [ ] Presentation view shows only slides (no controls)
3. [ ] Slide navigation in control panel updates presentation view within 500ms
4. [ ] Slides render with prospect-specific parameters
5. [ ] SlideInstance records created for each shown slide
6. [ ] Timing data captured (start/end per slide)
7. [ ] Connection status visible to agent
8. [ ] Works in Chrome, Firefox, Safari, Edge
9. [ ] All P1/P2 code review fixes from Phase 0 complete
10. [ ] 70%+ test coverage on new code

---

## Sprint Review Checklist

- [ ] Demo: Open presentation, navigate slides, verify sync
- [ ] Demo: Parameter substitution with live data
- [ ] Demo: Connection recovery scenario
- [ ] Code review: No new P1/P2 issues introduced
- [ ] Tests: All passing
- [ ] Documentation: API routes documented

---

## Next Sprint Preview (Sprint 5)

Sprint 5 will focus on:
- Admin configuration panel for slides/milestones/objections
- AI prompt registry (5 scope layers)
- Slide visualization engine (Nano Banana Pro integration)
- Advanced analytics and iteration tracking
