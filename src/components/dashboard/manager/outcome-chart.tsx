'use client';

import { cn } from '@/lib/utils';

interface OutcomeChartProps {
  data: {
    coachingClient: number;
    followUpScheduled: number;
    implementationOnly: number;
    disqualified: number;
  };
  isLoading?: boolean;
}

export function OutcomeChart({ data, isLoading }: OutcomeChartProps) {
  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const total = data.coachingClient + data.followUpScheduled + data.implementationOnly + data.disqualified;
  if (total === 0) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Outcome Distribution</h3>
        <div className="text-center py-8 text-muted-foreground">
          No outcome data available
        </div>
      </div>
    );
  }

  const outcomes = [
    {
      label: 'Coaching Client',
      value: data.coachingClient,
      percentage: (data.coachingClient / total) * 100,
      color: 'bg-success',
    },
    {
      label: 'Follow-up Scheduled',
      value: data.followUpScheduled,
      percentage: (data.followUpScheduled / total) * 100,
      color: 'bg-primary',
    },
    {
      label: 'Implementation Only',
      value: data.implementationOnly,
      percentage: (data.implementationOnly / total) * 100,
      color: 'bg-secondary',
    },
    {
      label: 'Disqualified',
      value: data.disqualified,
      percentage: (data.disqualified / total) * 100,
      color: 'bg-muted-foreground',
    },
  ];

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Outcome Distribution</h3>

      {/* Stacked bar */}
      <div className="h-8 flex rounded-lg overflow-hidden mb-6">
        {outcomes.map((outcome) => (
          outcome.percentage > 0 && (
            <div
              key={outcome.label}
              className={cn('transition-all', outcome.color)}
              style={{ width: `${outcome.percentage}%` }}
              title={`${outcome.label}: ${outcome.value} (${outcome.percentage.toFixed(1)}%)`}
            />
          )
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-4">
        {outcomes.map((outcome) => (
          <div key={outcome.label} className="flex items-center gap-3">
            <div className={cn('w-3 h-3 rounded-full', outcome.color)} />
            <div>
              <p className="text-sm text-muted-foreground">{outcome.label}</p>
              <p className="text-lg font-semibold text-foreground">
                {outcome.value}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  ({outcome.percentage.toFixed(0)}%)
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
