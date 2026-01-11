'use client';

import { cn } from '@/lib/utils';
import { formatDuration } from '@/services/analytics-service';

interface Milestone {
  id: string;
  title: string;
  status: 'pending' | 'active' | 'completed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  skippedAt?: Date;
  duration?: number;
}

interface MilestoneProgressProps {
  milestones: Milestone[];
  isLoading?: boolean;
}

export function MilestoneProgress({ milestones, isLoading }: MilestoneProgressProps) {
  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-8 h-8 bg-muted rounded-full" />
              <div className="flex-1 h-4 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!milestones?.length) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Milestone Progress</h3>
        <div className="text-center py-8 text-muted-foreground">
          No milestones recorded
        </div>
      </div>
    );
  }

  const completedCount = milestones.filter((m) => m.status === 'completed').length;
  const skippedCount = milestones.filter((m) => m.status === 'skipped').length;
  const completionRate = ((completedCount / milestones.length) * 100).toFixed(0);

  const statusColors = {
    pending: 'bg-muted border-muted-foreground',
    active: 'bg-primary border-primary animate-pulse',
    completed: 'bg-success border-success',
    skipped: 'bg-warning/50 border-warning',
  };

  const statusIcons = {
    pending: null,
    active: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="6,3 20,12 6,21 6,3" />
      </svg>
    ),
    completed: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20,6 9,17 4,12" />
      </svg>
    ),
    skipped: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m5 4 10 8-10 8V4Z" />
        <line x1="19" x2="19" y1="5" y2="19" />
      </svg>
    ),
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Milestone Progress</h3>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">{completionRate}%</p>
          <p className="text-xs text-muted-foreground">
            {completedCount}/{milestones.length} completed
            {skippedCount > 0 && `, ${skippedCount} skipped`}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {milestones.map((milestone, index) => (
          <div key={milestone.id} className="relative">
            {/* Connector line */}
            {index < milestones.length - 1 && (
              <div
                className={cn(
                  'absolute left-4 top-8 w-0.5 h-8 -translate-x-1/2',
                  milestone.status === 'completed' ? 'bg-success' : 'bg-muted'
                )}
              />
            )}

            <div className="flex items-start gap-4">
              {/* Status indicator */}
              <div
                className={cn(
                  'w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                  statusColors[milestone.status]
                )}
              >
                {statusIcons[milestone.status]}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p
                    className={cn(
                      'font-medium',
                      milestone.status === 'completed' && 'text-foreground',
                      milestone.status === 'skipped' && 'text-muted-foreground line-through',
                      milestone.status === 'pending' && 'text-muted-foreground',
                      milestone.status === 'active' && 'text-primary'
                    )}
                  >
                    {milestone.title}
                  </p>
                  {milestone.duration !== undefined && milestone.duration > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(milestone.duration)}
                    </span>
                  )}
                </div>
                {milestone.completedAt && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Completed at {new Date(milestone.completedAt).toLocaleTimeString()}
                  </p>
                )}
                {milestone.skippedAt && (
                  <p className="text-xs text-warning mt-0.5">
                    Skipped at {new Date(milestone.skippedAt).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
