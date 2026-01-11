/**
 * Analytics Hooks
 * Custom hooks for fetching analytics data
 */

import useSWR from 'swr';

import type {
  TeamMetrics,
  ObjectionPatterns,
  AgentVariance,
  MilestoneEffectiveness,
  DashboardSummary,
  CallListItem,
  TimeRangePreset,
} from '@/services/analytics-service';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface UseAnalyticsOptions {
  preset?: TimeRangePreset;
  startDate?: string;
  endDate?: string;
  agentIds?: string[];
  outcomes?: string[];
  enabled?: boolean;
}

/**
 * Hook for fetching dashboard summary
 */
export function useDashboardSummary(options: UseAnalyticsOptions = {}) {
  const { preset = 'month', enabled = true } = options;
  const url = `/api/analytics/dashboard?preset=${preset}`;

  const { data, error, isLoading, mutate } = useSWR<{ data: DashboardSummary }>(
    enabled ? url : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    summary: data?.data,
    isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * Hook for fetching team metrics
 */
export function useTeamMetrics(options: UseAnalyticsOptions = {}) {
  const { preset, startDate, endDate, enabled = true } = options;

  const params = new URLSearchParams();
  if (preset) params.set('preset', preset);
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  params.set('includePrevious', 'true');

  const url = `/api/analytics/team?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<{ data: TeamMetrics }>(
    enabled ? url : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    metrics: data?.data,
    isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * Hook for fetching objection patterns
 */
export function useObjectionPatterns(options: UseAnalyticsOptions = {}) {
  const { preset = 'month', enabled = true } = options;
  const url = `/api/analytics/objections?preset=${preset}`;

  const { data, error, isLoading, mutate } = useSWR<{ data: ObjectionPatterns }>(
    enabled ? url : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    patterns: data?.data,
    isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * Hook for fetching agent variance
 */
export function useAgentVariance(options: UseAnalyticsOptions = {}) {
  const { preset = 'month', agentIds, enabled = true } = options;

  const params = new URLSearchParams();
  params.set('preset', preset);
  if (agentIds?.length) params.set('agentIds', agentIds.join(','));

  const url = `/api/analytics/agents?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<{ data: AgentVariance[] }>(
    enabled ? url : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    agents: data?.data,
    isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * Hook for fetching milestone effectiveness
 */
export function useMilestoneEffectiveness(options: UseAnalyticsOptions = {}) {
  const { preset = 'month', enabled = true } = options;
  const url = `/api/analytics/milestones?preset=${preset}`;

  const { data, error, isLoading, mutate } = useSWR<{ data: MilestoneEffectiveness[] }>(
    enabled ? url : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    milestones: data?.data,
    isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * Hook for fetching call list
 */
export function useCallList(
  options: UseAnalyticsOptions & { limit?: number; offset?: number } = {}
) {
  const { preset = 'month', agentIds, outcomes, limit = 50, offset = 0, enabled = true } = options;

  const params = new URLSearchParams();
  params.set('preset', preset);
  if (agentIds?.length) params.set('agentIds', agentIds.join(','));
  if (outcomes?.length) params.set('outcomes', outcomes.join(','));
  params.set('limit', limit.toString());
  params.set('offset', offset.toString());

  const url = `/api/analytics/calls?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<{
    data: CallListItem[];
    meta: { total: number; limit: number; offset: number; hasMore: boolean };
  }>(enabled ? url : null, fetcher, { revalidateOnFocus: false });

  return {
    calls: data?.data,
    meta: data?.meta,
    isLoading,
    error,
    refresh: mutate,
  };
}
