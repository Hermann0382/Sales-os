'use client';

import Link from 'next/link';

import type { CallListItem } from '@/services/analytics-service';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/services/analytics-service';

interface CallsTableProps {
  calls: CallListItem[];
  isLoading?: boolean;
}

export function CallsTable({ calls, isLoading }: CallsTableProps) {
  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!calls?.length) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Recent Calls</h3>
        <div className="text-center py-8 text-muted-foreground">
          No calls in this period
        </div>
      </div>
    );
  }

  const outcomeColors: Record<string, string> = {
    coaching_client: 'bg-success/10 text-success',
    follow_up_scheduled: 'bg-primary/10 text-primary',
    implementation_only: 'bg-secondary/10 text-secondary',
    disqualified: 'bg-muted text-muted-foreground',
  };

  const outcomeLabels: Record<string, string> = {
    coaching_client: 'Coaching',
    follow_up_scheduled: 'Follow-up',
    implementation_only: 'Implementation',
    disqualified: 'Disqualified',
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Recent Calls</h3>
        <Link
          href="/manager/analytics"
          className="text-sm text-primary hover:underline"
        >
          View all
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                Prospect
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                Agent
              </th>
              <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                Duration
              </th>
              <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                Outcome
              </th>
              <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                Risks
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {calls.map((call) => (
              <tr
                key={call.id}
                className="border-b border-border/50 hover:bg-muted/50 transition-colors"
              >
                <td className="py-3 px-4">
                  <Link
                    href={`/manager/calls/${call.id}`}
                    className="text-sm font-medium text-foreground hover:text-primary"
                  >
                    {call.prospectName}
                  </Link>
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  {call.agentName}
                </td>
                <td className="py-3 px-4 text-center text-sm text-foreground">
                  {formatDuration(call.duration)}
                </td>
                <td className="py-3 px-4 text-center">
                  {call.outcome ? (
                    <span
                      className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        outcomeColors[call.outcome] || 'bg-muted text-muted-foreground'
                      )}
                    >
                      {outcomeLabels[call.outcome] || call.outcome}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  {call.riskFlagCount > 0 ? (
                    <span className="flex items-center justify-center gap-1 text-sm text-error">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                        <line x1="12" x2="12" y1="9" y2="13" />
                        <line x1="12" x2="12.01" y1="17" y2="17" />
                      </svg>
                      {call.riskFlagCount}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  {new Date(call.date).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
