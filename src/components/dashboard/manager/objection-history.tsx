'use client';

import { cn } from '@/lib/utils';
import { formatDuration } from '@/services/analytics-service';

interface Objection {
  id: string;
  type: string;
  status: 'raised' | 'resolved' | 'deferred' | 'disqualified';
  raisedAt: Date;
  resolvedAt?: Date;
  response?: string;
  duration?: number;
}

interface ObjectionHistoryProps {
  objections: Objection[];
  isLoading?: boolean;
}

export function ObjectionHistory({ objections, isLoading }: ObjectionHistoryProps) {
  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!objections?.length) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Objections</h3>
        <div className="text-center py-8 text-muted-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-4 opacity-50"
          >
            <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z" />
            <path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
          </svg>
          <p>No objections raised during this call</p>
        </div>
      </div>
    );
  }

  const resolvedCount = objections.filter((o) => o.status === 'resolved').length;
  const resolutionRate = ((resolvedCount / objections.length) * 100).toFixed(0);

  const statusColors = {
    raised: 'bg-primary/10 text-primary',
    resolved: 'bg-success/10 text-success',
    deferred: 'bg-warning/10 text-warning',
    disqualified: 'bg-error/10 text-error',
  };

  const statusLabels = {
    raised: 'In Progress',
    resolved: 'Resolved',
    deferred: 'Deferred',
    disqualified: 'Led to DQ',
  };

  const typeLabels: Record<string, string> = {
    price: 'Price Concern',
    timing: 'Timing Issue',
    authority: 'Decision Authority',
    need: 'Need Clarification',
    trust: 'Trust/Credibility',
    competitor: 'Competitor Mention',
    other: 'Other',
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Objections</h3>
        <div className="text-right">
          <p className="text-lg font-bold text-foreground">{resolutionRate}%</p>
          <p className="text-xs text-muted-foreground">
            {resolvedCount}/{objections.length} resolved
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {objections.map((objection) => (
          <div
            key={objection.id}
            className="border border-border rounded-lg p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-foreground capitalize">
                  {typeLabels[objection.type] || objection.type.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Raised at {new Date(objection.raisedAt).toLocaleTimeString()}
                  {objection.duration !== undefined && objection.duration > 0 && (
                    <> - {formatDuration(objection.duration)} to resolve</>
                  )}
                </p>
              </div>
              <span
                className={cn(
                  'px-2 py-1 rounded-full text-xs font-medium',
                  statusColors[objection.status]
                )}
              >
                {statusLabels[objection.status]}
              </span>
            </div>

            {objection.response && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Response Used:</p>
                <p className="text-sm text-foreground">{objection.response}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
