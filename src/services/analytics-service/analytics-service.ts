/**
 * Analytics Service
 * Aggregates call data for manager dashboard
 */

import { prisma } from '@/lib/db';
import {
  calculateConversionRate,
  calculatePercentageChange,
  calculateAverage,
  calculateResolutionRate,
  calculateExecutionScore,
  getPreviousPeriod,
  determineTrend,
} from './metrics-calculator';
import type {
  TeamMetrics,
  ObjectionPatterns,
  AgentVariance,
  MilestoneEffectiveness,
  AnalyticsQueryOptions,
  DashboardSummary,
  CallListItem,
  TimeRange,
} from './types';

/**
 * Analytics Service
 * Provides aggregated metrics for manager dashboard
 */
class AnalyticsService {
  /**
   * Get team performance metrics
   */
  async getTeamMetrics(options: AnalyticsQueryOptions): Promise<TeamMetrics> {
    const { organizationId, timeRange, agentIds, includePreviousPeriod } = options;

    // Build where clause
    const where = {
      organizationId,
      createdAt: {
        gte: timeRange.startDate,
        lte: timeRange.endDate,
      },
      ...(agentIds?.length && { agentId: { in: agentIds } }),
    };

    // DATA-002 FIX: First fetch call IDs, then use explicit filter for groupBy
    // This ensures proper multi-tenant isolation in groupBy operations
    const callIds = await prisma.callSession.findMany({
      where,
      select: { id: true },
    }).then((calls) => calls.map((c) => c.id));

    // Get call counts and outcomes using groupBy
    const [callStats, outcomeStats, callsByAgent] = await Promise.all([
      prisma.callSession.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      // Use explicit callSessionId filter instead of nested where
      prisma.callOutcome.groupBy({
        by: ['outcomeType'],
        where: {
          callSessionId: { in: callIds },
        },
        _count: { id: true },
      }),
      prisma.callSession.groupBy({
        by: ['agentId'],
        where: {
          ...where,
          status: 'completed',
        },
        _count: { id: true },
      }),
    ]);

    // Calculate totals
    const totalCalls = callStats.reduce((sum, s) => sum + s._count.id, 0);
    const completedCalls =
      callStats.find((s) => s.status === 'completed')?._count.id || 0;
    const cancelledCalls =
      callStats.find((s) => s.status === 'cancelled')?._count.id || 0;

    // Get outcome distribution
    const outcomeDistribution = {
      coachingClient:
        outcomeStats.find((s) => s.outcomeType === 'Coaching_Client')?._count.id || 0,
      followUpScheduled:
        outcomeStats.find((s) => s.outcomeType === 'Follow_up_Scheduled')?._count.id || 0,
      implementationOnly:
        outcomeStats.find((s) => s.outcomeType === 'Implementation_Only')?._count.id || 0,
      disqualified:
        outcomeStats.find((s) => s.outcomeType === 'Disqualified')?._count.id || 0,
    };

    // Calculate conversion rate
    const conversionRate = calculateConversionRate(
      outcomeDistribution.coachingClient,
      outcomeDistribution.followUpScheduled,
      outcomeDistribution.implementationOnly,
      outcomeDistribution.disqualified
    );

    // Calculate average duration from completed calls
    const completedCallsWithDuration = await prisma.callSession.findMany({
      where: {
        ...where,
        status: 'completed',
        startedAt: { not: null },
        endedAt: { not: null },
      },
      select: {
        startedAt: true,
        endedAt: true,
      },
    });

    const durations = completedCallsWithDuration
      .filter((c) => c.startedAt && c.endedAt)
      .map((c) => (c.endedAt!.getTime() - c.startedAt!.getTime()) / 60000); // Convert to minutes

    const avgCallDuration = calculateAverage(durations);

    // Build agent calls map
    const callsByAgentMap: Record<string, number> = {};
    for (const stat of callsByAgent) {
      callsByAgentMap[stat.agentId] = stat._count.id;
    }

    // Get period comparison if requested
    let periodComparison: TeamMetrics['periodComparison'];
    if (includePreviousPeriod) {
      const previousPeriod = getPreviousPeriod(timeRange);
      const previousMetrics = await this.getTeamMetrics({
        ...options,
        timeRange: previousPeriod,
        includePreviousPeriod: false,
      });

      periodComparison = {
        callsChange: calculatePercentageChange(totalCalls, previousMetrics.totalCalls),
        conversionChange: calculatePercentageChange(
          conversionRate * 100,
          previousMetrics.conversionRate * 100
        ),
        durationChange: calculatePercentageChange(avgCallDuration, previousMetrics.avgCallDuration),
      };
    }

    return {
      totalCalls,
      completedCalls,
      cancelledCalls,
      callsByAgent: callsByAgentMap,
      conversionRate,
      avgCallDuration,
      outcomeDistribution,
      periodComparison,
    };
  }

  /**
   * Get objection pattern analysis
   */
  async getObjectionPatterns(options: AnalyticsQueryOptions): Promise<ObjectionPatterns> {
    const { organizationId, timeRange } = options;

    // Get all objection responses with related data
    const objectionResponses = await prisma.objectionResponse.findMany({
      where: {
        callSession: {
          organizationId,
          createdAt: {
            gte: timeRange.startDate,
            lte: timeRange.endDate,
          },
        },
      },
      include: {
        objection: {
          select: {
            objectionType: true,
          },
        },
        milestone: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Group by objection type
    const byTypeMap: Record<
      string,
      {
        count: number;
        resolved: number;
        deferred: number;
        disqualified: number;
        durations: number[];
      }
    > = {};

    const milestoneObjections: Record<string, { id: string; title: string; count: number }> = {};

    for (const response of objectionResponses) {
      const type = response.objection.objectionType;

      if (!byTypeMap[type]) {
        byTypeMap[type] = {
          count: 0,
          resolved: 0,
          deferred: 0,
          disqualified: 0,
          durations: [],
        };
      }

      byTypeMap[type].count++;

      if (response.outcome === 'Resolved') {
        byTypeMap[type].resolved++;
      } else if (response.outcome === 'Deferred') {
        byTypeMap[type].deferred++;
      } else if (response.outcome === 'Disqualified') {
        byTypeMap[type].disqualified++;
      }

      // Track milestone triggers
      const milestoneId = response.milestone.id;
      if (!milestoneObjections[milestoneId]) {
        milestoneObjections[milestoneId] = {
          id: milestoneId,
          title: response.milestone.title,
          count: 0,
        };
      }
      milestoneObjections[milestoneId].count++;
    }

    // Build byType result
    const byType: ObjectionPatterns['byType'] = {};
    for (const [type, data] of Object.entries(byTypeMap)) {
      byType[type] = {
        count: data.count,
        resolutionRate: calculateResolutionRate(data.resolved, data.count),
        avgTimeToResolve: calculateAverage(data.durations),
        deferredCount: data.deferred,
        disqualifiedCount: data.disqualified,
      };
    }

    // Get top trigger milestones
    const topTriggerMilestones = Object.values(milestoneObjections)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((m) => ({
        milestoneId: m.id,
        milestoneTitle: m.title,
        objectionCount: m.count,
      }));

    // Calculate totals
    const totalObjections = objectionResponses.length;
    const resolvedCount = objectionResponses.filter(
      (r) => r.outcome === 'Resolved'
    ).length;
    const overallResolutionRate = calculateResolutionRate(resolvedCount, totalObjections);

    return {
      byType,
      topTriggerMilestones,
      totalObjections,
      overallResolutionRate,
    };
  }

  /**
   * Get per-agent variance analysis
   * OPTIMIZED: Single query instead of N+1 pattern
   */
  async getAgentVariance(options: AnalyticsQueryOptions): Promise<AgentVariance[]> {
    const { organizationId, timeRange, agentIds } = options;

    // OPTIMIZATION: Fetch all agents and their calls in a single query with includes
    const agents = await prisma.user.findMany({
      where: {
        organizationId,
        role: 'agent',
        ...(agentIds?.length && { id: { in: agentIds } }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        // Include calls directly in the agent query
        callSessions: {
          where: {
            organizationId,
            createdAt: {
              gte: timeRange.startDate,
              lte: timeRange.endDate,
            },
            status: 'completed',
          },
          include: {
            callOutcome: true,
            milestoneResponses: {
              include: {
                milestone: true,
              },
            },
            objectionResponses: true,
            aiAnalysis: {
              select: {
                riskFlags: true,
              },
            },
          },
        },
      },
    });

    const variances: AgentVariance[] = [];

    // Process all agents in memory (no additional DB queries)
    for (const agent of agents) {
      const calls = agent.callSessions;
      const totalCalls = calls.length;

      if (totalCalls === 0) {
        continue; // Skip agents with no calls in period
      }

      // Calculate conversion rate
      const outcomes = calls.filter((c) => c.callOutcome);
      const positiveOutcomes = outcomes.filter(
        (c) => c.callOutcome?.outcomeType !== 'Disqualified'
      ).length;
      const conversionRate =
        outcomes.length > 0 ? positiveOutcomes / outcomes.length : 0;

      // Calculate average call duration
      const durations = calls
        .filter((c) => c.startedAt && c.endedAt)
        .map((c) => (c.endedAt!.getTime() - c.startedAt!.getTime()) / 60000);
      const avgCallDuration = calculateAverage(durations);

      // Calculate milestone timing
      const milestoneTiming: Record<string, number> = {};
      const milestoneDurations: Record<string, number[]> = {};

      for (const call of calls) {
        for (const mr of call.milestoneResponses) {
          const title = mr.milestone.title;
          if (mr.startedAt && mr.completedAt) {
            const duration =
              (mr.completedAt.getTime() - mr.startedAt.getTime()) / 1000;
            if (!milestoneDurations[title]) {
              milestoneDurations[title] = [];
            }
            milestoneDurations[title].push(duration);
          }
        }
      }

      for (const [title, durs] of Object.entries(milestoneDurations)) {
        milestoneTiming[title] = calculateAverage(durs);
      }

      // Calculate objection handling
      const allObjections = calls.flatMap((c) => c.objectionResponses);
      const totalObjections = allObjections.length;
      const resolvedObjections = allObjections.filter(
        (o) => o.outcome === 'Resolved'
      ).length;
      const resolutionRate =
        totalObjections > 0 ? resolvedObjections / totalObjections : 0;

      // Count risk flags
      let riskFlagCount = 0;
      for (const call of calls) {
        if (call.aiAnalysis?.riskFlags) {
          const flags = call.aiAnalysis.riskFlags as unknown as Array<unknown>;
          riskFlagCount += Array.isArray(flags) ? flags.length : 0;
        }
      }

      // Calculate milestone completion rate for execution score
      const allMilestones = calls.flatMap((c) => c.milestoneResponses);
      const completedMilestones = allMilestones.filter(
        (m) => m.status === 'completed'
      ).length;
      const milestoneCompletionRate =
        allMilestones.length > 0 ? completedMilestones / allMilestones.length : 0;

      const executionScore = calculateExecutionScore(
        conversionRate,
        milestoneCompletionRate,
        resolutionRate,
        riskFlagCount
      );

      variances.push({
        agentId: agent.id,
        agentName: agent.name || agent.email,
        totalCalls,
        conversionRate,
        avgCallDuration,
        milestoneTiming,
        objectionHandling: {
          totalObjections,
          resolutionRate,
          avgTimePerObjection: 0,
        },
        riskFlagCount,
        executionScore,
      });
    }

    // Sort by execution score descending
    return variances.sort((a, b) => b.executionScore - a.executionScore);
  }

  /**
   * Get milestone effectiveness analysis
   * OPTIMIZED: Batch queries instead of N+1 pattern
   */
  async getMilestoneEffectiveness(
    options: AnalyticsQueryOptions
  ): Promise<MilestoneEffectiveness[]> {
    const { organizationId, timeRange } = options;

    // OPTIMIZATION: Fetch milestones with responses in a single query
    const milestones = await prisma.milestone.findMany({
      where: { organizationId },
      orderBy: { orderIndex: 'asc' },
      include: {
        milestoneResponses: {
          where: {
            callSession: {
              organizationId,
              createdAt: {
                gte: timeRange.startDate,
                lte: timeRange.endDate,
              },
              status: 'completed',
            },
          },
          include: {
            callSession: {
              include: {
                callOutcome: true,
              },
            },
          },
        },
      },
    });

    // OPTIMIZATION: Batch fetch objection counts grouped by milestoneId
    const objectionCounts = await prisma.objectionResponse.groupBy({
      by: ['milestoneId'],
      where: {
        milestoneId: { in: milestones.map((m) => m.id) },
        callSession: {
          organizationId,
          createdAt: {
            gte: timeRange.startDate,
            lte: timeRange.endDate,
          },
        },
      },
      _count: { id: true },
    });

    // Build objection count map for O(1) lookup
    const objectionCountMap = new Map(
      objectionCounts.map((oc) => [oc.milestoneId, oc._count.id])
    );

    const effectiveness: MilestoneEffectiveness[] = [];

    // Process all milestones in memory (no additional DB queries)
    for (const milestone of milestones) {
      const responses = milestone.milestoneResponses;
      const total = responses.length;

      if (total === 0) {
        effectiveness.push({
          milestoneId: milestone.id,
          title: milestone.title,
          orderIndex: milestone.orderIndex,
          completionRate: 0,
          skipRate: 0,
          avgDuration: 0,
          objectionCount: 0,
          conversionImpact: 0,
        });
        continue;
      }

      const completed = responses.filter((r) => r.status === 'completed').length;
      const skipped = responses.filter((r) => r.status === 'skipped').length;

      // Calculate durations
      const durations = responses
        .filter((r) => r.startedAt && r.completedAt)
        .map((r) => (r.completedAt!.getTime() - r.startedAt.getTime()) / 1000);
      const avgDuration = calculateAverage(durations);

      // Get objection count from pre-fetched map
      const objectionCount = objectionCountMap.get(milestone.id) || 0;

      // Calculate conversion impact (correlation between completion and positive outcome)
      const completedWithPositive = responses.filter(
        (r) =>
          r.status === 'completed' &&
          r.callSession.callOutcome &&
          r.callSession.callOutcome.outcomeType !== 'Disqualified'
      ).length;

      const conversionImpact =
        completed > 0 ? completedWithPositive / completed : 0;

      effectiveness.push({
        milestoneId: milestone.id,
        title: milestone.title,
        orderIndex: milestone.orderIndex,
        completionRate: completed / total,
        skipRate: skipped / total,
        avgDuration,
        objectionCount,
        conversionImpact,
      });
    }

    return effectiveness;
  }

  /**
   * Get dashboard summary for quick overview
   */
  async getDashboardSummary(options: AnalyticsQueryOptions): Promise<DashboardSummary> {
    const [teamMetrics, agentVariance, objectionPatterns] = await Promise.all([
      this.getTeamMetrics({ ...options, includePreviousPeriod: true }),
      this.getAgentVariance(options),
      this.getObjectionPatterns(options),
    ]);

    // Find top agent
    const topAgent = agentVariance[0]
      ? {
          id: agentVariance[0].agentId,
          name: agentVariance[0].agentName,
          conversionRate: agentVariance[0].conversionRate,
        }
      : undefined;

    // Find most common objection
    const objectionTypes = Object.entries(objectionPatterns.byType).sort(
      ([, a], [, b]) => b.count - a.count
    );
    const mostCommonObjection = objectionTypes[0]
      ? {
          type: objectionTypes[0][0],
          count: objectionTypes[0][1].count,
        }
      : undefined;

    // Get recent calls with risk flags
    const recentRiskCalls = await prisma.callSession.findMany({
      where: {
        organizationId: options.organizationId,
        createdAt: {
          gte: options.timeRange.startDate,
          lte: options.timeRange.endDate,
        },
        aiAnalysis: {
          riskFlags: { not: { equals: null } },
        },
      },
      include: {
        agent: {
          select: { name: true },
        },
        aiAnalysis: {
          select: { riskFlags: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const recentRiskCallsList = recentRiskCalls
      .filter((c) => {
        const flags = c.aiAnalysis?.riskFlags as unknown as Array<unknown>;
        return Array.isArray(flags) && flags.length > 0;
      })
      .map((c) => ({
        callId: c.id,
        agentName: c.agent.name || 'Unknown',
        riskCount: (c.aiAnalysis?.riskFlags as unknown as Array<unknown>).length,
        date: c.createdAt,
      }));

    // Determine trends
    const trends = {
      callsTrend: determineTrend(teamMetrics.periodComparison?.callsChange || 0),
      conversionTrend: determineTrend(teamMetrics.periodComparison?.conversionChange || 0),
      riskTrend: 'stable' as const, // TODO: Calculate from previous period
    };

    return {
      teamMetrics,
      topAgent,
      mostCommonObjection,
      recentRiskCalls: recentRiskCallsList,
      trends,
    };
  }

  /**
   * Get list of calls for dashboard table
   */
  async getCallList(
    options: AnalyticsQueryOptions & {
      limit?: number;
      offset?: number;
      sortBy?: 'date' | 'duration' | 'riskCount';
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{ calls: CallListItem[]; total: number }> {
    const {
      organizationId,
      timeRange,
      agentIds,
      limit = 20,
      offset = 0,
      sortOrder = 'desc',
    } = options;

    const where = {
      organizationId,
      createdAt: {
        gte: timeRange.startDate,
        lte: timeRange.endDate,
      },
      status: 'completed' as const,
      ...(agentIds?.length && { agentId: { in: agentIds } }),
    };

    const [calls, total] = await Promise.all([
      prisma.callSession.findMany({
        where,
        include: {
          agent: {
            select: { id: true, name: true },
          },
          prospect: {
            select: { name: true },
          },
          callOutcome: {
            select: { outcomeType: true },
          },
          aiAnalysis: {
            select: { riskFlags: true },
          },
        },
        orderBy: { createdAt: sortOrder },
        take: limit,
        skip: offset,
      }),
      prisma.callSession.count({ where }),
    ]);

    const callList: CallListItem[] = calls.map((c) => {
      const riskFlags = c.aiAnalysis?.riskFlags as unknown as Array<unknown>;
      const duration = c.startedAt && c.endedAt
        ? (c.endedAt.getTime() - c.startedAt.getTime()) / 1000
        : 0;

      return {
        id: c.id,
        agentId: c.agent.id,
        agentName: c.agent.name || 'Unknown',
        prospectName: c.prospect.name,
        date: c.createdAt,
        duration,
        outcome: c.callOutcome?.outcomeType,
        riskFlagCount: Array.isArray(riskFlags) ? riskFlags.length : 0,
        hasRecording: !!c.recordingReference,
        hasAnalysis: !!c.aiAnalysis,
      };
    });

    return { calls: callList, total };
  }
}

/**
 * Singleton instance of the analytics service
 */
export const analyticsService = new AnalyticsService();
