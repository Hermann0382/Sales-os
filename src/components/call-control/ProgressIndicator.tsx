'use client';

import { CheckCircle2, Circle, PlayCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface MilestoneProgress {
  milestoneId: string;
  milestoneNumber: number;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  progress: number;
}

export interface ProgressIndicatorProps {
  milestones: MilestoneProgress[];
  currentMilestoneId?: string;
}

export function ProgressIndicator({
  milestones,
  currentMilestoneId,
}: ProgressIndicatorProps) {
  const completedCount = milestones.filter(
    (m) => m.status === 'completed' || m.status === 'skipped'
  ).length;
  const totalCount = milestones.length;
  const progressPercentage = (completedCount / totalCount) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Progress: {completedCount}/{totalCount} milestones
        </span>
        <span className="text-sm text-muted-foreground">
          {Math.round(progressPercentage)}% complete
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Milestone Steps */}
      <div className="flex items-center justify-between">
        {milestones.map((milestone, index) => {
          const isActive = milestone.milestoneId === currentMilestoneId;
          const isCompleted =
            milestone.status === 'completed' || milestone.status === 'skipped';

          return (
            <div key={milestone.milestoneId} className="flex items-center">
              <div
                className={cn(
                  'relative flex flex-col items-center',
                  isActive && 'scale-110'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
                    isCompleted && 'bg-green-500 border-green-500 text-white',
                    isActive &&
                      !isCompleted &&
                      'bg-primary border-primary text-primary-foreground animate-pulse',
                    !isActive &&
                      !isCompleted &&
                      'bg-background border-muted-foreground/30 text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : isActive ? (
                    <PlayCircle className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={cn(
                    'mt-1 text-xs whitespace-nowrap',
                    isActive && 'font-semibold text-primary',
                    isCompleted && 'text-green-600',
                    !isActive && !isCompleted && 'text-muted-foreground'
                  )}
                >
                  M{milestone.milestoneNumber}
                </span>
              </div>

              {/* Connector Line */}
              {index < milestones.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 w-8 mx-1',
                    isCompleted ? 'bg-green-500' : 'bg-muted'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
