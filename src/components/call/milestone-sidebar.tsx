'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface MilestoneItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: 'pending' | 'current' | 'completed' | 'skipped';
}

interface MilestoneSidebarProps {
  milestones: MilestoneItem[];
  currentMilestone: string;
  onMilestoneClick?: (milestoneCode: string) => void;
  className?: string;
}

const statusConfig = {
  pending: {
    badge: 'muted',
    dot: 'bg-muted-foreground',
    text: 'text-muted-foreground',
  },
  current: {
    badge: 'default',
    dot: 'bg-primary animate-pulse',
    text: 'text-foreground font-medium',
  },
  completed: {
    badge: 'success',
    dot: 'bg-success',
    text: 'text-success',
  },
  skipped: {
    badge: 'warning',
    dot: 'bg-warning',
    text: 'text-warning',
  },
} as const;

export function MilestoneSidebar({
  milestones,
  currentMilestone,
  onMilestoneClick,
  className,
}: MilestoneSidebarProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        Call Progress
      </h3>
      {milestones.map((milestone, index) => {
        const config = statusConfig[milestone.status];
        const isLast = index === milestones.length - 1;

        return (
          <div
            key={milestone.id}
            className="relative flex items-start gap-3"
            onClick={() => onMilestoneClick?.(milestone.code)}
            role={onMilestoneClick ? 'button' : undefined}
            tabIndex={onMilestoneClick ? 0 : undefined}
          >
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-[11px] top-6 h-full w-0.5 bg-border" />
            )}

            {/* Status dot */}
            <div
              className={cn(
                'relative z-10 mt-1 h-6 w-6 rounded-full flex items-center justify-center',
                milestone.status === 'current'
                  ? 'bg-primary/10'
                  : 'bg-background'
              )}
            >
              <div className={cn('h-3 w-3 rounded-full', config.dot)} />
            </div>

            {/* Content */}
            <div
              className={cn(
                'flex-1 pb-4',
                onMilestoneClick && 'cursor-pointer hover:opacity-80'
              )}
            >
              <div className="flex items-center gap-2">
                <Badge
                  variant={config.badge as 'default' | 'success' | 'muted' | 'warning'}
                  className="text-xs"
                >
                  {milestone.code}
                </Badge>
                <span className={cn('text-sm', config.text)}>
                  {milestone.name}
                </span>
              </div>
              {milestone.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {milestone.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
