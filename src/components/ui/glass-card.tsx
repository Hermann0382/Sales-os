'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  blur?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  opacity?: number;
  borderOpacity?: number;
  hoverEffect?: boolean;
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      className,
      blur = 'xl',
      opacity = 0.7,
      borderOpacity = 0.3,
      hoverEffect = false,
      children,
      ...props
    },
    ref
  ) => {
    const blurClasses = {
      sm: 'backdrop-blur-sm',
      md: 'backdrop-blur-md',
      lg: 'backdrop-blur-lg',
      xl: 'backdrop-blur-xl',
      '2xl': 'backdrop-blur-2xl',
      '3xl': 'backdrop-blur-3xl',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl border shadow-glass',
          blurClasses[blur],
          hoverEffect && 'transition-shadow hover:shadow-glass-lg',
          className
        )}
        style={{
          backgroundColor: `rgba(255, 255, 255, ${opacity})`,
          borderColor: `rgba(255, 255, 255, ${borderOpacity})`,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
GlassCard.displayName = 'GlassCard';

export { GlassCard };
