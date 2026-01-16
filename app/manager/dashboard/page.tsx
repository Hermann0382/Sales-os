'use client';

import { useState } from 'react';
import Link from 'next/link';

import { useDashboardSummary, useAgentVariance, useCallList } from '@/hooks';
import {
  MetricsCard,
  TimeRangeSelector,
  AgentTable,
  CallsTable,
  OutcomeChart,
} from '@/components/dashboard/manager';

type TimeRange = 'week' | 'month' | 'quarter' | 'year';

export default function ManagerDashboardPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');

  const { summary, isLoading: summaryLoading } = useDashboardSummary({
    preset: timeRange,
  });

  const { agents, isLoading: agentsLoading } = useAgentVariance({
    preset: timeRange,
  });

  const { calls, isLoading: callsLoading } = useCallList({
    preset: timeRange,
    limit: 10,
  });

  const isLoading = summaryLoading || agentsLoading || callsLoading;

  // Format percentage for display
  const formatPercent = (value: number) => `${(value * 100).toFixed(0)}%`;

  // Get trend label
  const getTrendValue = (change?: number) => {
    if (change === undefined) return undefined;
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Overview</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your team&apos;s performance and call metrics
          </p>
        </div>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricsCard
          title="Total Calls"
          value={summary?.teamMetrics.totalCalls ?? '-'}
          trend={summary?.trends.callsTrend}
          trendValue={getTrendValue(summary?.teamMetrics.periodComparison?.callsChange)}
          subtitle={`${summary?.teamMetrics.completedCalls ?? 0} completed`}
        />
        <MetricsCard
          title="Conversion Rate"
          value={summary ? formatPercent(summary.teamMetrics.conversionRate) : '-'}
          trend={summary?.trends.conversionTrend}
          trendValue={getTrendValue(summary?.teamMetrics.periodComparison?.conversionChange)}
          variant={
            summary?.teamMetrics.conversionRate
              ? summary.teamMetrics.conversionRate >= 0.7
                ? 'success'
                : summary.teamMetrics.conversionRate >= 0.5
                  ? 'warning'
                  : 'danger'
              : 'default'
          }
        />
        <MetricsCard
          title="Avg Duration"
          value={summary ? `${Math.round(summary.teamMetrics.avgCallDuration)}m` : '-'}
          trendValue={getTrendValue(summary?.teamMetrics.periodComparison?.durationChange)}
        />
        <MetricsCard
          title="Active Agents"
          value={agents?.length ?? '-'}
          subtitle={
            summary?.topAgent
              ? `Top: ${summary.topAgent.name}`
              : undefined
          }
        />
      </div>

      {/* Risk Alerts */}
      {summary?.recentRiskCalls && summary.recentRiskCalls.length > 0 && (
        <div className="glass-card p-4 mb-8 border-l-4 border-warning">
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-warning flex-shrink-0 mt-0.5"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" x2="12" y1="9" y2="13" />
              <line x1="12" x2="12.01" y1="17" y2="17" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {summary.recentRiskCalls.length} calls flagged for review
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Recent calls with risk flags detected. Review recommended.
              </p>
              <div className="flex gap-2 mt-2">
                {summary.recentRiskCalls.slice(0, 3).map((call) => (
                  <Link
                    key={call.callId}
                    href={`/manager/calls/${call.callId}`}
                    className="text-xs text-primary hover:underline"
                  >
                    {call.agentName} ({call.riskCount} flags)
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Outcome Chart - Takes 1 column */}
        <OutcomeChart
          data={
            summary?.teamMetrics.outcomeDistribution ?? {
              coachingClient: 0,
              followUpScheduled: 0,
              implementationOnly: 0,
              disqualified: 0,
            }
          }
          isLoading={isLoading}
        />

        {/* Top Objection and Quick Stats - Takes 2 columns */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <div className="glass-card p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Most Common Objection
            </h3>
            {summary?.mostCommonObjection ? (
              <div>
                <p className="text-lg font-semibold text-foreground capitalize">
                  {summary.mostCommonObjection.type.replace(/_/g, ' ')}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {summary.mostCommonObjection.count} occurrences
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No objection data</p>
            )}
          </div>

          <div className="glass-card p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Top Performer
            </h3>
            {summary?.topAgent ? (
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {summary.topAgent.name}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatPercent(summary.topAgent.conversionRate)} conversion
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No data</p>
            )}
          </div>

          <div className="glass-card p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Completed Calls
            </h3>
            <p className="text-2xl font-bold text-foreground">
              {summary?.teamMetrics.completedCalls ?? 0}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {summary?.teamMetrics.cancelledCalls ?? 0} cancelled
            </p>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Risk Trend
            </h3>
            <div className="flex items-center gap-2">
              {summary?.trends.riskTrend === 'up' && (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-error"
                  >
                    <polyline points="18,15 12,9 6,15" />
                  </svg>
                  <span className="text-lg font-semibold text-error">Increasing</span>
                </>
              )}
              {summary?.trends.riskTrend === 'down' && (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-success"
                  >
                    <polyline points="6,9 12,15 18,9" />
                  </svg>
                  <span className="text-lg font-semibold text-success">Decreasing</span>
                </>
              )}
              {summary?.trends.riskTrend === 'stable' && (
                <span className="text-lg font-semibold text-muted-foreground">Stable</span>
              )}
              {!summary && <span className="text-muted-foreground">-</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Agent Performance Table */}
      <div className="mb-8">
        <AgentTable agents={agents ?? []} isLoading={agentsLoading} />
      </div>

      {/* Recent Calls Table */}
      <CallsTable calls={calls ?? []} isLoading={callsLoading} />
    </div>
  );
}
