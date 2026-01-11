'use client';

import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface TimerDisplayProps {
  startTime?: Date | null;
  estimatedMinutes?: number | null;
  showWarning?: boolean;
  warningThreshold?: number; // Percentage of estimated time to show warning
}

export function TimerDisplay({
  startTime,
  estimatedMinutes,
  showWarning = true,
  warningThreshold = 80,
}: TimerDisplayProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) return;

    // Calculate initial elapsed time
    const initialElapsed = Math.floor(
      (Date.now() - new Date(startTime).getTime()) / 1000
    );
    setElapsed(initialElapsed);

    // Update every second
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const elapsedMinutes = elapsed / 60;
  const estimatedSeconds = (estimatedMinutes || 0) * 60;
  const percentageUsed = estimatedSeconds
    ? (elapsed / estimatedSeconds) * 100
    : 0;
  const isOverTime = percentageUsed > 100;
  const isWarning = percentageUsed >= warningThreshold && !isOverTime;

  // Format time display
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!startTime) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span className="font-mono text-sm">--:--</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md px-3 py-1.5',
        isOverTime && 'bg-red-100 text-red-700',
        isWarning && 'bg-yellow-100 text-yellow-700',
        !isOverTime && !isWarning && 'bg-muted text-muted-foreground'
      )}
    >
      {isOverTime || isWarning ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <Clock className="h-4 w-4" />
      )}

      <div className="flex items-baseline gap-1">
        <span className="font-mono text-lg font-semibold">
          {formatTime(elapsed)}
        </span>
        {estimatedMinutes && (
          <span className="text-xs opacity-70">
            / {estimatedMinutes} min
          </span>
        )}
      </div>

      {isOverTime && showWarning && (
        <span className="text-xs font-medium">Over time!</span>
      )}
      {isWarning && showWarning && (
        <span className="text-xs font-medium">
          {Math.round(percentageUsed)}% used
        </span>
      )}
    </div>
  );
}
