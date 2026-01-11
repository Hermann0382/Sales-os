'use client';

import { AlertCircle, Calendar, Clock, User } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface PreviousCallSummary {
  date: Date | null;
  duration: number;
  agentName: string;
  outcome: string | null;
}

export interface UnresolvedObjection {
  id: string;
  type: string;
  previousOutcome: string;
  notes: string | null;
}

export interface QualificationFlags {
  clientCountMet: boolean;
  clientCount: number;
  mainPain: string | null;
  revenueVolatility: number | null;
}

export interface LastMilestoneCompleted {
  number: number;
  title: string;
}

export interface PreviousCallContextProps {
  previousCallSummary: PreviousCallSummary;
  lastMilestoneCompleted: LastMilestoneCompleted | null;
  unresolvedObjections: UnresolvedObjection[];
  qualificationFlags: QualificationFlags;
  prospectName: string;
  className?: string;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function formatDate(date: Date | null): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getOutcomeColor(outcome: string | null): string {
  if (!outcome) return 'text-muted-foreground';
  switch (outcome.toLowerCase()) {
    case 'sold':
    case 'proceed':
      return 'text-green-600';
    case 'follow_up':
    case 'pause':
      return 'text-yellow-600';
    case 'declined':
    case 'disqualified':
      return 'text-red-600';
    default:
      return 'text-muted-foreground';
  }
}

function PreviousCallContext({
  previousCallSummary,
  lastMilestoneCompleted,
  unresolvedObjections,
  qualificationFlags,
  prospectName,
  className,
}: PreviousCallContextProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="border-b pb-3">
        <h3 className="text-lg font-semibold">Previous Call Context</h3>
        <p className="text-sm text-muted-foreground">
          Follow-up for {prospectName}
        </p>
      </div>

      {/* Previous Call Summary */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <h4 className="mb-3 font-medium">Previous Call Summary</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formatDate(previousCallSummary.date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{formatDuration(previousCallSummary.duration)}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{previousCallSummary.agentName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Outcome:</span>
            <span className={cn('font-medium', getOutcomeColor(previousCallSummary.outcome))}>
              {previousCallSummary.outcome || 'In Progress'}
            </span>
          </div>
        </div>
      </div>

      {/* Last Milestone */}
      {lastMilestoneCompleted && (
        <div className="rounded-lg border p-4">
          <h4 className="mb-2 font-medium">Last Milestone Completed</h4>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {lastMilestoneCompleted.number}
            </span>
            <span className="text-sm">{lastMilestoneCompleted.title}</span>
          </div>
        </div>
      )}

      {/* Qualification Flags */}
      <div className="rounded-lg border p-4">
        <h4 className="mb-3 font-medium">Qualification Status</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Client Count</span>
            <span className={cn(
              'font-medium',
              qualificationFlags.clientCountMet ? 'text-green-600' : 'text-red-600'
            )}>
              {qualificationFlags.clientCount.toLocaleString()}
              {qualificationFlags.clientCountMet ? ' (Qualified)' : ' (Under 500)'}
            </span>
          </div>
          {qualificationFlags.mainPain && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Main Pain</span>
              <span className="font-medium">{qualificationFlags.mainPain}</span>
            </div>
          )}
          {qualificationFlags.revenueVolatility !== null && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Revenue Volatility</span>
              <span className="font-medium">{qualificationFlags.revenueVolatility}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Unresolved Objections */}
      {unresolvedObjections.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
              Unresolved Objections ({unresolvedObjections.length})
            </h4>
          </div>
          <div className="space-y-2">
            {unresolvedObjections.map((objection) => (
              <div
                key={objection.id}
                className="rounded border border-yellow-300 bg-white p-3 dark:border-yellow-800 dark:bg-yellow-900/50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-yellow-800 dark:text-yellow-200">
                    {objection.type}
                  </span>
                  <span className="text-xs text-yellow-600 dark:text-yellow-400">
                    {objection.previousOutcome}
                  </span>
                </div>
                {objection.notes && (
                  <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                    {objection.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export { PreviousCallContext };
