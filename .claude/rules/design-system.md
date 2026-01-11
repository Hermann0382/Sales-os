# Design System Rules

## Overview

CallOS uses a corporate design system with a teal/cyan color palette, glassmorphism effects, and clean typography. The system is built on Tailwind CSS with custom extensions.

## Color Palette

### Primary Colors

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | #14b8a6 (Teal-500) | Primary actions, links, active states |
| `secondary` | #0d9488 (Teal-600) | Secondary elements, hover states |
| `accent` | #0891b2 (Cyan-600) | Accent highlights |

### Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| `success` | #10b981 | Success states, completed items |
| `warning` | #f59e0b | Warning states, attention needed |
| `destructive` | #ef4444 | Error states, destructive actions |

### Neutral Colors

| Token | Value | Usage |
|-------|-------|-------|
| `background` | #ffffff | Page background |
| `surface` | #f0fdfa | Card backgrounds, elevated surfaces |
| `foreground` | #134e4a | Primary text |
| `muted-foreground` | #64748b | Secondary text, placeholders |
| `border` | #e2e8f0 | Borders, dividers |

## Typography

### Font Families

- **Headings & Body**: Inter (sans-serif)
- **Monospace**: JetBrains Mono

### Font Sizes

```css
text-xs: 0.75rem   /* 12px - Labels, badges */
text-sm: 0.875rem  /* 14px - Body small, buttons */
text-base: 1rem    /* 16px - Body default */
text-lg: 1.125rem  /* 18px - Subheadings */
text-xl: 1.25rem   /* 20px - Section headings */
text-2xl: 1.5rem   /* 24px - Page headings */
text-3xl: 1.875rem /* 30px - Large headings */
```

### Font Weights

```css
font-normal: 400   /* Body text */
font-medium: 500   /* Labels, buttons */
font-semibold: 600 /* Subheadings */
font-bold: 700     /* Headings */
```

## Glassmorphism

### Glass Card Component

```tsx
import { GlassCard } from '@/components/ui/glass-card';

// Default settings
<GlassCard className="p-6">
  Content here
</GlassCard>

// Customized
<GlassCard
  blur="xl"           // sm, md, lg, xl, 2xl, 3xl
  opacity={0.7}       // 0-1
  borderOpacity={0.3} // 0-1
  hoverEffect         // Adds hover shadow
>
  Content here
</GlassCard>
```

### Glass Card CSS Class

```css
.glass-card {
  @apply bg-white/70 backdrop-blur-xl border border-white/30
         rounded-xl shadow-glass;
}
```

### Shadow Tokens

```css
shadow-glass: 0 8px 32px rgba(20, 184, 166, 0.1)
shadow-glass-lg: 0 16px 48px rgba(20, 184, 166, 0.15)
```

## Floating Orbs Background

```tsx
import { FloatingOrbs } from '@/components/ui/floating-orbs';

// Usage in layout
<div className="relative min-h-screen">
  <FloatingOrbs
    orbCount={3}
    primaryColor="var(--color-primary)"
    secondaryColor="var(--color-secondary)"
    animated
  />
  <main className="relative z-10">
    {/* Content */}
  </main>
</div>
```

## Component Patterns

### Buttons

```tsx
import { Button } from '@/components/ui/button';

// Variants
<Button variant="default">Primary Action</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
<Button variant="success">Confirm</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>
```

### Badges

```tsx
import { Badge } from '@/components/ui/badge';

<Badge variant="default">Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="success">Completed</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="muted">Inactive</Badge>
```

### Cards

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

### Progress Bars

```tsx
// Simple progress bar
<div className="progress-bar">
  <div className="progress-bar-fill bg-primary" style={{ width: '75%' }} />
</div>

// Radix Progress component
import { Progress } from '@/components/ui/progress';
<Progress value={75} />
```

## Spacing System

Use consistent spacing with Tailwind's spacing scale:

```css
p-2: 0.5rem  (8px)
p-3: 0.75rem (12px)
p-4: 1rem    (16px)
p-6: 1.5rem  (24px)
p-8: 2rem    (32px)

gap-2: 0.5rem
gap-3: 0.75rem
gap-4: 1rem
gap-6: 1.5rem
```

## Border Radius

```css
rounded: 0.25rem      (4px)
rounded-md: 0.375rem  (6px)
rounded-lg: 0.5rem    (8px)
rounded-xl: 0.75rem   (12px)
rounded-2xl: 1rem     (16px)
rounded-full: 9999px
```

## Animations

### Float Animation (for orbs)

```css
@keyframes float {
  0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
  50% { transform: translate(-50%, -50%) translateY(-20px); }
}
.animate-float {
  animation: float 15s ease-in-out infinite;
}
```

### Transitions

```css
transition-colors: color, background-color, border-color
transition-shadow: box-shadow
transition-all: all properties
transition-transform: transform
```

## Milestone Colors (Call Flow)

| Milestone | Status | Color |
|-----------|--------|-------|
| Any | Pending | `bg-muted-foreground` |
| Any | Current | `bg-primary animate-pulse` |
| Any | Completed | `bg-success` |
| Any | Skipped | `bg-warning` |

## Objection Type Colors

| Type | Color Class |
|------|-------------|
| Price | `bg-red-500/10 text-red-600` |
| Timing | `bg-orange-500/10 text-orange-600` |
| Capacity/Time | `bg-yellow-500/10 text-yellow-600` |
| Need to Think | `bg-blue-500/10 text-blue-600` |
| Partner/Team | `bg-purple-500/10 text-purple-600` |
| Skepticism | `bg-gray-500/10 text-gray-600` |

## Dark Mode (Future)

The design system supports dark mode via CSS variables. Dark mode tokens are prepared but not yet implemented:

```css
/* Light mode (current) */
--background: 0 0% 100%;
--foreground: 166 80% 18%;

/* Dark mode (future) */
--background: 166 50% 10%;
--foreground: 166 10% 95%;
```

## Accessibility

1. Maintain 4.5:1 contrast ratio for text
2. Use semantic HTML elements
3. Add focus-visible styles for keyboard navigation
4. Include aria attributes for interactive elements
5. Ensure touch targets are at least 44x44px
