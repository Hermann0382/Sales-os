/**
 * Analytics Service Types
 * Type definitions for manager dashboard analytics
 */

/**
 * Time range for analytics queries
 */
export interface TimeRange {
  /** Start date */
  startDate: Date;
  /** End date */
  endDate: Date;
}

/**
 * Predefined time range options
 */
export type TimeRangePreset = 'week' | 'month' | 'quarter' | 'year' | 'custom';

/**
 * Team performance metrics
 */
export interface TeamMetrics {
  /** Total calls in period */
  totalCalls: number;
  /** Calls completed (not cancelled) */
  completedCalls: number;
  /** Calls cancelled */
  cancelledCalls: number;
  /** Calls by agent */
  callsByAgent: Record<string, number>;
  /** Conversion rate (positive outcomes / completed calls) */
  conversionRate: number;
  /** Average call duration in minutes */
  avgCallDuration: number;
  /** Outcome distribution */
  outcomeDistribution: {
    coachingClient: number;
    followUpScheduled: number;
    implementationOnly: number;
    disqualified: number;
  };
  /** Comparison to previous period */
  periodComparison?: {
    callsChange: number;
    conversionChange: number;
    durationChange: number;
  };
}

/**
 * Objection pattern analysis
 */
export interface ObjectionPatterns {
  /** Stats by objection type */
  byType: Record<
    string,
    {
      /** Total count of this objection type */
      count: number;
      /** Resolution rate (resolved / total) */
      resolutionRate: number;
      /** Average time to resolve in seconds */
      avgTimeToResolve: number;
      /** Deferred count */
      deferredCount: number;
      /** Disqualified count */
      disqualifiedCount: number;
    }
  >;
  /** Milestones that trigger most objections */
  topTriggerMilestones: Array<{
    milestoneId: string;
    milestoneTitle: string;
    objectionCount: number;
  }>;
  /** Total objections */
  totalObjections: number;
  /** Overall resolution rate */
  overallResolutionRate: number;
}

/**
 * Agent performance variance
 */
export interface AgentVariance {
  /** Agent ID */
  agentId: string;
  /** Agent name */
  agentName: string;
  /** Total calls */
  totalCalls: number;
  /** Conversion rate */
  conversionRate: number;
  /** Average call duration */
  avgCallDuration: number;
  /** Milestone timing averages */
  milestoneTiming: Record<string, number>;
  /** Objection handling stats */
  objectionHandling: {
    totalObjections: number;
    resolutionRate: number;
    avgTimePerObjection: number;
  };
  /** Risk flag count */
  riskFlagCount: number;
  /** Execution score (0-100) */
  executionScore: number;
}

/**
 * Milestone effectiveness analysis
 */
export interface MilestoneEffectiveness {
  /** Milestone ID */
  milestoneId: string;
  /** Milestone title */
  title: string;
  /** Order in call flow */
  orderIndex: number;
  /** Completion rate */
  completionRate: number;
  /** Skip rate */
  skipRate: number;
  /** Average duration */
  avgDuration: number;
  /** Number of objections raised at this milestone */
  objectionCount: number;
  /** Impact on conversion (correlation) */
  conversionImpact: number;
}

/**
 * Analytics query options
 */
export interface AnalyticsQueryOptions {
  /** Organization ID (required) */
  organizationId: string;
  /** Time range */
  timeRange: TimeRange;
  /** Filter by agent IDs */
  agentIds?: string[];
  /** Filter by outcome types */
  outcomeTypes?: string[];
  /** Include comparison to previous period */
  includePreviousPeriod?: boolean;
}

/**
 * Dashboard summary for quick overview
 */
export interface DashboardSummary {
  /** Team metrics */
  teamMetrics: TeamMetrics;
  /** Top performing agent */
  topAgent?: {
    id: string;
    name: string;
    conversionRate: number;
  };
  /** Most common objection */
  mostCommonObjection?: {
    type: string;
    count: number;
  };
  /** Recent high-risk calls */
  recentRiskCalls: Array<{
    callId: string;
    agentName: string;
    riskCount: number;
    date: Date;
  }>;
  /** Trend indicators */
  trends: {
    callsTrend: 'up' | 'down' | 'stable';
    conversionTrend: 'up' | 'down' | 'stable';
    riskTrend: 'up' | 'down' | 'stable';
  };
}

/**
 * Call list item for dashboard tables
 */
export interface CallListItem {
  id: string;
  agentId: string;
  agentName: string;
  prospectName: string;
  date: Date;
  duration: number;
  outcome?: string;
  riskFlagCount: number;
  hasRecording: boolean;
  hasAnalysis: boolean;
}

/**
 * Analytics export options
 */
export interface AnalyticsExportOptions {
  /** Export format */
  format: 'csv' | 'json' | 'pdf';
  /** Which metrics to include */
  include: {
    teamMetrics: boolean;
    agentVariance: boolean;
    objectionPatterns: boolean;
    milestoneEffectiveness: boolean;
  };
  /** Time range */
  timeRange: TimeRange;
}
