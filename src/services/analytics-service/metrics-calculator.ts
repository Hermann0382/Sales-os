/**
 * Metrics Calculator
 * Utility functions for calculating analytics metrics
 */

import type { TimeRange } from './types';

/**
 * Calculate conversion rate from outcomes
 */
export function calculateConversionRate(
  coachingClient: number,
  followUpScheduled: number,
  implementationOnly: number,
  disqualified: number
): number {
  const total = coachingClient + followUpScheduled + implementationOnly + disqualified;
  if (total === 0) return 0;

  // Positive outcomes = Coaching Client + Follow-up Scheduled + Implementation Only
  const positive = coachingClient + followUpScheduled + implementationOnly;
  return Number((positive / total).toFixed(4));
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(
  current: number,
  previous: number
): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

/**
 * Calculate average from array of numbers
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return Number((sum / values.length).toFixed(2));
}

/**
 * Calculate standard deviation
 */
export function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;

  const avg = calculateAverage(values);
  const squareDiffs = values.map((val) => Math.pow(val - avg, 2));
  const avgSquareDiff = calculateAverage(squareDiffs);

  return Number(Math.sqrt(avgSquareDiff).toFixed(2));
}

/**
 * Get previous period time range
 */
export function getPreviousPeriod(timeRange: TimeRange): TimeRange {
  const durationMs = timeRange.endDate.getTime() - timeRange.startDate.getTime();

  return {
    startDate: new Date(timeRange.startDate.getTime() - durationMs),
    endDate: new Date(timeRange.startDate.getTime()),
  };
}

/**
 * Get time range from preset
 * DATA-008 FIX: Uses UTC consistently for timezone-independent behavior
 */
export function getTimeRangeFromPreset(
  preset: 'week' | 'month' | 'quarter' | 'year'
): TimeRange {
  const now = new Date();

  // Use UTC for consistent timezone-independent behavior
  const endDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    23, 59, 59, 999
  ));

  let startDate: Date;

  switch (preset) {
    case 'week':
      startDate = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - 7,
        0, 0, 0, 0
      ));
      break;
    case 'month':
      startDate = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() - 1,
        now.getUTCDate(),
        0, 0, 0, 0
      ));
      break;
    case 'quarter':
      startDate = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() - 3,
        now.getUTCDate(),
        0, 0, 0, 0
      ));
      break;
    case 'year':
      startDate = new Date(Date.UTC(
        now.getUTCFullYear() - 1,
        now.getUTCMonth(),
        now.getUTCDate(),
        0, 0, 0, 0
      ));
      break;
  }

  return { startDate, endDate };
}

/**
 * Parse date string to UTC Date object
 * Accepts ISO 8601 format: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS.sssZ
 */
export function parseDateToUTC(dateString: string, endOfDay = false): Date {
  // If already a full ISO timestamp, parse directly
  if (dateString.includes('T')) {
    return new Date(dateString);
  }

  // For date-only strings, create UTC timestamp at start/end of day
  const [year, month, day] = dateString.split('-').map(Number);

  if (endOfDay) {
    return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  }
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Determine trend direction from percentage change
 */
export function determineTrend(
  change: number,
  threshold = 5
): 'up' | 'down' | 'stable' {
  if (change > threshold) return 'up';
  if (change < -threshold) return 'down';
  return 'stable';
}

/**
 * Calculate execution score based on various metrics
 */
export function calculateExecutionScore(
  conversionRate: number,
  milestoneCompletionRate: number,
  objectionResolutionRate: number,
  riskFlagCount: number
): number {
  // Weighted components
  const conversionWeight = 0.35;
  const milestoneWeight = 0.25;
  const objectionWeight = 0.25;
  const riskWeight = 0.15;

  // Convert rates to percentages (0-100)
  const conversionScore = conversionRate * 100;
  const milestoneScore = milestoneCompletionRate * 100;
  const objectionScore = objectionResolutionRate * 100;

  // Risk score (lower is better)
  // 0 risks = 100, 1 risk = 80, 2 risks = 60, etc.
  const riskScore = Math.max(0, 100 - riskFlagCount * 20);

  const weightedScore =
    conversionScore * conversionWeight +
    milestoneScore * milestoneWeight +
    objectionScore * objectionWeight +
    riskScore * riskWeight;

  return Math.round(Math.max(0, Math.min(100, weightedScore)));
}

/**
 * Calculate resolution rate
 */
export function calculateResolutionRate(
  resolved: number,
  total: number
): number {
  if (total === 0) return 0;
  return Number((resolved / total).toFixed(4));
}

/**
 * Group items by a key and count
 */
export function groupAndCount<T>(
  items: T[],
  keyFn: (item: T) => string
): Record<string, number> {
  return items.reduce(
    (acc, item) => {
      const key = keyFn(item);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
}

/**
 * Format duration from seconds to readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes}m`
    : `${hours}h`;
}
