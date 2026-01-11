'use client';

import * as React from 'react';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface CheckboxProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, checked = false, onCheckedChange, disabled, ...props }, ref) => {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        data-state={checked ? 'checked' : 'unchecked'}
        disabled={disabled}
        ref={ref}
        className={cn(
          'peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          checked && 'bg-primary text-primary-foreground',
          className
        )}
        onClick={() => onCheckedChange?.(!checked)}
        {...props}
      >
        {checked && <Check className="h-3 w-3 m-auto" />}
      </button>
    );
  }
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
