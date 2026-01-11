'use client';

import Link from 'next/link';

import type { AgentVariance } from '@/services/analytics-service';
import { cn } from '@/lib/utils';

interface AgentTableProps {
  agents: AgentVariance[];
  isLoading?: boolean;
}

export function AgentTable({ agents, isLoading }: AgentTableProps) {
  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/4" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!agents?.length) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Agent Performance</h3>
        <div className="text-center py-8 text-muted-foreground">
          No agent data available
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Agent Performance</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                Agent
              </th>
              <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                Calls
              </th>
              <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                Conversion
              </th>
              <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                Avg Duration
              </th>
              <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                Score
              </th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => (
              <tr
                key={agent.agentId}
                className="border-b border-border/50 hover:bg-muted/50 transition-colors"
              >
                <td className="py-3 px-4">
                  <Link
                    href={`/manager/agents/${agent.agentId}`}
                    className="text-sm font-medium text-foreground hover:text-primary"
                  >
                    {agent.agentName}
                  </Link>
                </td>
                <td className="py-3 px-4 text-center text-sm text-foreground">
                  {agent.totalCalls}
                </td>
                <td className="py-3 px-4 text-center">
                  <span
                    className={cn(
                      'text-sm font-medium',
                      agent.conversionRate >= 0.7 && 'text-success',
                      agent.conversionRate >= 0.5 && agent.conversionRate < 0.7 && 'text-warning',
                      agent.conversionRate < 0.5 && 'text-error'
                    )}
                  >
                    {(agent.conversionRate * 100).toFixed(0)}%
                  </span>
                </td>
                <td className="py-3 px-4 text-center text-sm text-foreground">
                  {Math.round(agent.avgCallDuration)}m
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold',
                        agent.executionScore >= 80 && 'bg-success/10 text-success',
                        agent.executionScore >= 60 && agent.executionScore < 80 && 'bg-warning/10 text-warning',
                        agent.executionScore < 60 && 'bg-error/10 text-error'
                      )}
                    >
                      {agent.executionScore}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
