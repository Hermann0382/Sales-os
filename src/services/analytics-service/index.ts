/**
 * Analytics Service Module
 * Exports all analytics-related services and utilities
 */

// Main analytics service
export { analyticsService } from './analytics-service';

// Metrics calculator utilities
export {
  calculateConversionRate,
  calculatePercentageChange,
  calculateAverage,
  calculateStdDev,
  getPreviousPeriod,
  getTimeRangeFromPreset,
  parseDateToUTC,
  determineTrend,
  calculateExecutionScore,
  calculateResolutionRate,
  groupAndCount,
  formatDuration,
} from './metrics-calculator';

// Types
export type {
  TimeRange,
  TimeRangePreset,
  TeamMetrics,
  ObjectionPatterns,
  AgentVariance,
  MilestoneEffectiveness,
  AnalyticsQueryOptions,
  DashboardSummary,
  CallListItem,
  AnalyticsExportOptions,
} from './types';
