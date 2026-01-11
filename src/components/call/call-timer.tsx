'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CallTimerProps {
  startTime: Date | null;
  isActive: boolean;
  targetMinutes?: number;
  className?: string;
}

export function CallTimer({
  startTime,
  isActive,
  targetMinutes = 75,
  className,
}: CallTimerProps) {
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    if (!isActive || !startTime) {
      setElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setElapsed(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, startTime]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const progress = Math.min((minutes / targetMinutes) * 100, 100);

  const getStatusColor = () => {
    if (minutes < targetMinutes * 0.8) return 'bg-success';
    if (minutes < targetMinutes) return 'bg-warning';
    return 'bg-destructive';
  };

  const getStatusText = () => {
    if (minutes < targetMinutes * 0.8) return 'On Track';
    if (minutes < targetMinutes) return 'Approaching Target';
    return 'Over Target';
  };

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className="text-center">
        <p className="text-3xl font-mono font-bold text-foreground">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </p>
        <p className="text-xs text-muted-foreground">
          Target: {targetMinutes} min
        </p>
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <Badge
            variant={
              minutes < targetMinutes * 0.8
                ? 'success'
                : minutes < targetMinutes
                  ? 'warning'
                  : 'destructive'
            }
            className="text-xs"
          >
            {getStatusText()}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-1000',
              getStatusColor()
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
