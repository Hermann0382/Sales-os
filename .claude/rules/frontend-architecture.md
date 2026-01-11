# Frontend Architecture Rules

## Overview

CallOS uses Next.js 14 with App Router, React 18, TypeScript, and Tailwind CSS. State management is handled by Zustand with React hooks for component-level state.

## Directory Structure

```
app/
├── (auth)/           # Authentication routes
│   ├── sign-in/
│   └── sign-up/
├── (agent)/          # Agent dashboard routes
│   ├── dashboard/
│   └── call/
├── (manager)/        # Manager dashboard routes
│   └── dashboard/
├── (admin)/          # Admin configuration routes
│   └── dashboard/
├── api/              # API routes
└── layout.tsx        # Root layout
src/
├── components/
│   ├── ui/           # Design system primitives
│   ├── call/         # Call-specific components
│   └── layout/       # Layout components
├── hooks/            # Custom React hooks
├── stores/           # Zustand stores
└── lib/
    ├── types/        # TypeScript definitions
    └── utils.ts      # Utility functions
```

## Component Patterns

### File Naming

All component files use kebab-case:
- `glass-card.tsx` (not `GlassCard.tsx`)
- `milestone-sidebar.tsx` (not `MilestoneSidebar.tsx`)

### Component Structure

```tsx
'use client'; // Only if needed

import * as React from 'react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface ComponentProps {
  // Props interface
}

export function Component({ prop1, prop2 }: ComponentProps) {
  // Hooks first
  const [state, setState] = React.useState();

  // Effects
  React.useEffect(() => {}, []);

  // Handlers
  const handleClick = () => {};

  // Render
  return (
    <div className={cn('base-classes', conditionalClasses)}>
      {/* Content */}
    </div>
  );
}
```

### Client vs Server Components

```tsx
// Server Component (default) - no 'use client'
export default function Page() {
  // Can fetch data directly
  const data = await fetchData();
  return <div>{data}</div>;
}

// Client Component - requires 'use client'
'use client';
export function InteractiveComponent() {
  const [state, setState] = React.useState();
  // Can use hooks, events, browser APIs
}
```

## State Management

### Zustand Store Pattern

```typescript
// src/stores/example-store.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface ExampleState {
  items: Item[];
  selectedId: string | null;
  setSelected: (id: string | null) => void;
  addItem: (item: Item) => void;
}

export const useExampleStore = create<ExampleState>()(
  devtools(
    persist(
      (set) => ({
        items: [],
        selectedId: null,
        setSelected: (id) => set({ selectedId: id }),
        addItem: (item) => set((state) => ({
          items: [...state.items, item]
        })),
      }),
      { name: 'example-storage' }
    )
  )
);
```

### Using Stores in Components

```tsx
'use client';

import { useCallStore } from '@/stores/call-store';

export function CallPanel() {
  const { activeCall, setActiveCall } = useCallStore();
  // ...
}
```

## Custom Hooks

### Hook Pattern

```typescript
// src/hooks/use-example.ts
import * as React from 'react';

export function useExample(param: string) {
  const [state, setState] = React.useState<State | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchData(param);
        setState(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [param]);

  return { state, loading, error };
}
```

## Styling

### Tailwind CSS Classes

Use the design system tokens defined in `tailwind.config.js`:

```tsx
// Colors
className="text-primary bg-surface border-border"
className="text-success text-warning text-destructive"

// Shadows
className="shadow-glass shadow-glass-lg"

// Spacing
className="p-4 m-2 gap-3"
```

### Glass Card Pattern

```tsx
import { GlassCard } from '@/components/ui/glass-card';

<GlassCard className="p-6" blur="xl" opacity={0.7}>
  Content with glassmorphism effect
</GlassCard>
```

### Responsive Design

```tsx
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
className="hidden md:block"
className="text-sm md:text-base lg:text-lg"
```

## Import Rules

### Import Order

1. React and external libraries
2. Internal components (with @/ alias)
3. Styles (if any)

```tsx
import * as React from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useCallStore } from '@/stores/call-store';
import { cn } from '@/lib/utils';
```

### Barrel Imports

Use index files for cleaner imports:

```tsx
// Instead of:
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Use:
import { Button, Card } from '@/components/ui';
```

## Layout Patterns

### Route Groups

```
app/
├── (auth)/           # No layout inheritance
├── (agent)/          # Agent layout with sidebar
├── (manager)/        # Manager layout with different nav
└── (admin)/          # Admin layout with config nav
```

### Layout with Role Protection

```tsx
'use client';

import { useUserRole } from '@/hooks';
import { useRouter } from 'next/navigation';

export default function ProtectedLayout({ children }) {
  const router = useRouter();
  const { isAdmin } = useUserRole();

  React.useEffect(() => {
    if (!isAdmin) router.push('/dashboard');
  }, [isAdmin, router]);

  if (!isAdmin) return null;

  return <div>{children}</div>;
}
```

## Performance Guidelines

1. Use Server Components by default
2. Only add 'use client' when necessary (state, effects, events)
3. Lazy load heavy components with `React.lazy`
4. Use `React.memo` for expensive pure components
5. Avoid inline object/array creation in render
6. Use the `key` prop correctly for lists

## Common Pitfalls

1. Missing 'use client' when using hooks
2. Importing server-only code in client components
3. Using relative imports instead of @/ alias
4. Not handling loading/error states
5. Creating components in render functions
6. Mutating state directly instead of using setter
