'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

export interface FloatingOrbsProps extends React.HTMLAttributes<HTMLDivElement> {
  orbCount?: number;
  primaryColor?: string;
  secondaryColor?: string;
  animated?: boolean;
}

const FloatingOrbs = React.forwardRef<HTMLDivElement, FloatingOrbsProps>(
  (
    {
      className,
      orbCount = 3,
      primaryColor = 'var(--color-primary)',
      secondaryColor = 'var(--color-secondary)',
      animated = true,
      ...props
    },
    ref
  ) => {
    const orbs = React.useMemo(() => {
      return Array.from({ length: orbCount }, (_, i) => ({
        id: i,
        size: 200 + Math.random() * 300,
        x: Math.random() * 100,
        y: Math.random() * 100,
        duration: 15 + Math.random() * 10,
        delay: Math.random() * 5,
        color: i % 2 === 0 ? primaryColor : secondaryColor,
      }));
    }, [orbCount, primaryColor, secondaryColor]);

    return (
      <div
        ref={ref}
        className={cn(
          'pointer-events-none absolute inset-0 overflow-hidden',
          className
        )}
        {...props}
      >
        {orbs.map((orb) => (
          <div
            key={orb.id}
            className={cn('absolute rounded-full opacity-20 blur-3xl', {
              'animate-float': animated,
            })}
            style={{
              width: orb.size,
              height: orb.size,
              left: `${orb.x}%`,
              top: `${orb.y}%`,
              backgroundColor: orb.color,
              animationDuration: `${orb.duration}s`,
              animationDelay: `${orb.delay}s`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </div>
    );
  }
);
FloatingOrbs.displayName = 'FloatingOrbs';

export { FloatingOrbs };
