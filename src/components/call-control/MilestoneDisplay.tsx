'use client';

import { Clock, Target } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface MilestoneDisplayProps {
  milestoneNumber: number;
  title: string;
  objective: string;
  estimatedMinutes?: number | null;
  isActive?: boolean;
  status?: 'pending' | 'in_progress' | 'completed' | 'skipped';
}

export function MilestoneDisplay({
  milestoneNumber,
  title,
  objective,
  estimatedMinutes,
  isActive = false,
  status = 'pending',
}: MilestoneDisplayProps) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-all',
        isActive && 'border-primary bg-primary/5 shadow-sm',
        status === 'completed' && 'bg-green-50 border-green-200',
        status === 'skipped' && 'bg-yellow-50 border-yellow-200 opacity-75'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
              status === 'completed' && 'bg-green-500 text-white',
              status === 'skipped' && 'bg-yellow-500 text-white',
              status === 'in_progress' && 'bg-primary text-primary-foreground',
              status === 'pending' && 'bg-muted text-muted-foreground'
            )}
          >
            {milestoneNumber}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{title}</h3>
            {status === 'skipped' && (
              <span className="text-xs text-yellow-600">(Skipped)</span>
            )}
          </div>
        </div>

        {estimatedMinutes && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{estimatedMinutes} min</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-start gap-2">
        <Target className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
        <p className="text-sm text-muted-foreground">{objective}</p>
      </div>
    </div>
  );
}
