'use client';

import { ArrowRight, FastForward, MessageSquare } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SuggestedResumePoint {
  type: 'milestone' | 'decision' | 'objection';
  label: string;
  milestoneNumber?: number;
  description: string;
}

export interface ResumePointSelection {
  type: 'from_milestone' | 'jump_to_decision' | 'address_objection';
  milestoneNumber?: number;
  objectionId?: string;
}

interface ResumePointSelectorProps {
  suggestedResumePoints: SuggestedResumePoint[];
  onSelect: (selection: ResumePointSelection) => void;
  selectedPoint?: ResumePointSelection | null;
  className?: string;
}

function getIcon(type: SuggestedResumePoint['type']) {
  switch (type) {
    case 'milestone':
      return ArrowRight;
    case 'decision':
      return FastForward;
    case 'objection':
      return MessageSquare;
  }
}

function mapToSelection(point: SuggestedResumePoint): ResumePointSelection {
  switch (point.type) {
    case 'milestone':
      return { type: 'from_milestone', milestoneNumber: point.milestoneNumber };
    case 'decision':
      return { type: 'jump_to_decision', milestoneNumber: 7 };
    case 'objection':
      return { type: 'address_objection' };
  }
}

function isSelected(
  point: SuggestedResumePoint,
  selected: ResumePointSelection | null | undefined
): boolean {
  if (!selected) return false;

  switch (point.type) {
    case 'milestone':
      return (
        selected.type === 'from_milestone' &&
        selected.milestoneNumber === point.milestoneNumber
      );
    case 'decision':
      return selected.type === 'jump_to_decision';
    case 'objection':
      return selected.type === 'address_objection';
  }
}

function ResumePointSelector({
  suggestedResumePoints,
  onSelect,
  selectedPoint,
  className,
}: ResumePointSelectorProps) {
  if (suggestedResumePoints.length === 0) {
    return (
      <div className={cn('rounded-lg border p-4', className)}>
        <p className="text-center text-sm text-muted-foreground">
          No resume points available. This appears to be a new call.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <h4 className="font-medium">Select Resume Point</h4>
        <p className="text-sm text-muted-foreground">
          Choose where to continue the conversation
        </p>
      </div>

      <div className="grid gap-3">
        {suggestedResumePoints.map((point, index) => {
          const Icon = getIcon(point.type);
          const selected = isSelected(point, selectedPoint);

          return (
            <Button
              key={`${point.type}-${index}`}
              variant={selected ? 'default' : 'outline'}
              className={cn(
                'h-auto flex-col items-start p-4 text-left',
                selected && 'ring-2 ring-primary ring-offset-2'
              )}
              onClick={() => onSelect(mapToSelection(point))}
            >
              <div className="flex w-full items-center gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    selected
                      ? 'bg-primary-foreground/20'
                      : 'bg-muted'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{point.label}</div>
                  <div
                    className={cn(
                      'text-sm',
                      selected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    )}
                  >
                    {point.description}
                  </div>
                </div>
                {point.type === 'milestone' && (
                  <span
                    className={cn(
                      'text-xs font-medium',
                      selected ? 'text-primary-foreground' : 'text-muted-foreground'
                    )}
                  >
                    Recommended
                  </span>
                )}
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export { ResumePointSelector };
