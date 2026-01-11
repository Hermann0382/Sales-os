---
id: SIMP-006
status: open
priority: P3
category: simplicity
agent: code-simplicity-reviewer
file: src/components/dashboard/manager/metrics-card.tsx
line: 47-76
created: 2026-01-11T11:30:00Z
---

# Duplicated Trend Arrow SVG Icons

## Context

Found during Sprint 3 Phase 3 review by code-simplicity-reviewer agent.

## Problem

Inline SVG icons for trend arrows are duplicated across:
- `metrics-card.tsx` (up/down arrows)
- `dashboard/page.tsx` (risk trend section)
- Multiple other components

The same SVG markup is copied in multiple places.

## Proposed Solution

Create a shared icon component:

```typescript
// src/components/ui/icons.tsx
interface IconProps {
  className?: string;
  size?: number;
}

export function TrendUpIcon({ className, size = 14 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="18,15 12,9 6,15" />
    </svg>
  );
}

export function TrendDownIcon({ className, size = 14 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="6,9 12,15 18,9" />
    </svg>
  );
}

export function WarningIcon({ className, size = 20 }: IconProps) {
  // Warning triangle icon
}
```

## Acceptance Criteria

- [ ] Shared icon components created
- [ ] Components refactored to use shared icons
- [ ] Bundle size reduced
- [ ] Consistent icon sizing
