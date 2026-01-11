'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { cn } from '@/lib/utils';

export interface ChecklistItem {
  id: string;
  label: string;
  description?: string;
  required?: boolean;
  checked: boolean;
}

interface PreCallChecklistProps {
  items: ChecklistItem[];
  onItemToggle: (itemId: string) => void;
  onStartCall: () => void;
  prospectName?: string;
  className?: string;
}

export function PreCallChecklist({
  items,
  onItemToggle,
  onStartCall,
  prospectName,
  className,
}: PreCallChecklistProps) {
  const allRequiredComplete = items
    .filter((item) => item.required)
    .every((item) => item.checked);

  const completedCount = items.filter((item) => item.checked).length;
  const progress = Math.round((completedCount / items.length) * 100);

  return (
    <GlassCard className={cn('p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Pre-Call Checklist
          </h3>
          {prospectName && (
            <p className="text-sm text-muted-foreground">
              Preparing call with {prospectName}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">{progress}%</p>
          <p className="text-xs text-muted-foreground">
            {completedCount}/{items.length} complete
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
              item.checked
                ? 'bg-success/5 border-success/20'
                : 'bg-background border-border hover:border-primary/30'
            )}
            onClick={() => onItemToggle(item.id)}
            role="checkbox"
            aria-checked={item.checked}
            tabIndex={0}
          >
            <div
              className={cn(
                'mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors',
                item.checked
                  ? 'bg-success border-success'
                  : 'border-muted-foreground'
              )}
            >
              {item.checked && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'text-sm font-medium',
                    item.checked
                      ? 'text-success line-through'
                      : 'text-foreground'
                  )}
                >
                  {item.label}
                </span>
                {item.required && (
                  <span className="text-xs text-destructive">*Required</span>
                )}
              </div>
              {item.description && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <Button
        className="w-full"
        size="lg"
        disabled={!allRequiredComplete}
        onClick={onStartCall}
      >
        {allRequiredComplete ? 'Start Call' : 'Complete Required Items'}
      </Button>
      {!allRequiredComplete && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Complete all required items to start the call
        </p>
      )}
    </GlassCard>
  );
}
