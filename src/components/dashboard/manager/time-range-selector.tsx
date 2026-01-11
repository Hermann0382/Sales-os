'use client';

import { cn } from '@/lib/utils';

type TimeRange = 'week' | 'month' | 'quarter' | 'year';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  className?: string;
}

const ranges: { value: TimeRange; label: string }[] = [
  { value: 'week', label: '7 Days' },
  { value: 'month', label: '30 Days' },
  { value: 'quarter', label: '90 Days' },
  { value: 'year', label: '1 Year' },
];

export function TimeRangeSelector({
  value,
  onChange,
  className,
}: TimeRangeSelectorProps) {
  return (
    <div className={cn('flex items-center gap-1 bg-muted rounded-lg p-1', className)}>
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            value === range.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
