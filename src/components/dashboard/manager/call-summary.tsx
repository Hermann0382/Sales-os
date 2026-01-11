'use client';

import { Badge } from '@/components/ui/badge';
import { formatDuration } from '@/services/analytics-service';
import { cn } from '@/lib/utils';

interface CallSummaryProps {
  call: {
    id: string;
    prospectName: string;
    agentName: string;
    date: Date;
    duration: number;
    outcome?: string;
    status: string;
    zoomLink?: string;
  };
  isLoading?: boolean;
}

export function CallSummary({ call, isLoading }: CallSummaryProps) {
  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-2/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const outcomeColors: Record<string, string> = {
    coaching_client: 'bg-success text-white',
    follow_up_scheduled: 'bg-primary text-white',
    implementation_only: 'bg-secondary text-white',
    disqualified: 'bg-muted-foreground text-white',
  };

  const outcomeLabels: Record<string, string> = {
    coaching_client: 'Coaching Client',
    follow_up_scheduled: 'Follow-up Scheduled',
    implementation_only: 'Implementation Only',
    disqualified: 'Disqualified',
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{call.prospectName}</h1>
          <p className="text-muted-foreground mt-1">
            Call with {call.agentName} on {new Date(call.date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        {call.outcome && (
          <Badge className={cn(outcomeColors[call.outcome])}>
            {outcomeLabels[call.outcome] || call.outcome}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Duration</p>
          <p className="text-lg font-semibold text-foreground mt-1">
            {formatDuration(call.duration)}
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Status</p>
          <p className="text-lg font-semibold text-foreground mt-1 capitalize">
            {call.status.replace(/_/g, ' ')}
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Time</p>
          <p className="text-lg font-semibold text-foreground mt-1">
            {new Date(call.date).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Recording</p>
          <p className="text-lg font-semibold text-foreground mt-1">
            {call.zoomLink ? 'Available' : 'None'}
          </p>
        </div>
      </div>
    </div>
  );
}
