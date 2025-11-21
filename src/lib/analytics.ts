import { CallRecord, AgentPerformance, CriteriaAnalytics, SentimentLabel } from '@/types/call';
import { getActiveEvaluationCriteria } from '@/services/azure-openai';

export function calculateAgentPerformance(calls: CallRecord[]): AgentPerformance[] {
  const agentMap = new Map<string, CallRecord[]>();

  calls.forEach((call) => {
    if (call.evaluation) {
      const agent = call.metadata.agentName;
      if (!agentMap.has(agent)) {
        agentMap.set(agent, []);
      }
      agentMap.get(agent)!.push(call);
    }
  });

  const performances: AgentPerformance[] = [];
  const activeCriteria = getActiveEvaluationCriteria();

  agentMap.forEach((agentCalls, agentName) => {
    const totalCalls = agentCalls.length;
    const totalScore = agentCalls.reduce(
      (sum, call) => sum + (call.evaluation?.totalScore || 0),
      0
    );
    const totalPercentage = agentCalls.reduce(
      (sum, call) => sum + (call.evaluation?.percentage || 0),
      0
    );

    const criteriaScores: Record<number, number> = {};
    activeCriteria.forEach((criterion) => {
      const scores = agentCalls
        .map((call) => {
          const result = call.evaluation?.results.find(
            (r) => r.criterionId === criterion.id
          );
          return result?.score || 0;
        });
      criteriaScores[criterion.id] =
        scores.reduce((sum, s) => sum + s, 0) / scores.length;
    });

    const sortedCriteria = Object.entries(criteriaScores).sort(
      ([, a], [, b]) => b - a
    );
    const topStrengths = sortedCriteria.slice(0, 3).map(([id]) => parseInt(id));
    const topWeaknesses = sortedCriteria.slice(-3).map(([id]) => parseInt(id));

    const sentimentTotals: Record<SentimentLabel, number> = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };

    agentCalls.forEach((call) => {
      call.sentimentSegments?.forEach((segment) => {
        const duration = Math.max(0, (segment.endMilliseconds ?? 0) - (segment.startMilliseconds ?? 0));
        sentimentTotals[segment.sentiment ?? 'neutral'] += duration;
      });
    });

    const totalSentimentDuration = Object.values(sentimentTotals).reduce((sum, value) => sum + value, 0);
    let sentimentDistribution: Record<SentimentLabel, number> | undefined;
    let dominantSentiment: SentimentLabel | undefined;

    if (totalSentimentDuration > 0) {
      sentimentDistribution = {
        positive: Number(((sentimentTotals.positive / totalSentimentDuration) * 100).toFixed(1)),
        neutral: Number(((sentimentTotals.neutral / totalSentimentDuration) * 100).toFixed(1)),
        negative: Number(((sentimentTotals.negative / totalSentimentDuration) * 100).toFixed(1)),
      };
      dominantSentiment = (Object.entries(sentimentTotals).sort(([, a], [, b]) => b - a)[0][0] as SentimentLabel);
    }

    const recentCalls = agentCalls.slice(-5);
    const olderCalls = agentCalls.slice(0, -5);
    const recentAvg =
      recentCalls.reduce((sum, c) => sum + (c.evaluation?.percentage || 0), 0) /
      Math.max(recentCalls.length, 1);
    const olderAvg =
      olderCalls.length > 0
        ? olderCalls.reduce((sum, c) => sum + (c.evaluation?.percentage || 0), 0) /
          olderCalls.length
        : recentAvg;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (recentAvg > olderAvg + 5) trend = 'up';
    else if (recentAvg < olderAvg - 5) trend = 'down';

    performances.push({
      agentName,
      totalCalls,
      averageScore: totalScore / totalCalls,
      averagePercentage: totalPercentage / totalCalls,
      criteriaScores,
      trend,
      topStrengths,
      topWeaknesses,
      sentimentDistribution,
      dominantSentiment,
    });
  });

  return performances.sort((a, b) => b.averagePercentage - a.averagePercentage);
}

export function calculateCriteriaAnalytics(calls: CallRecord[]): CriteriaAnalytics[] {
  const evaluatedCalls = calls.filter((c) => c.evaluation);
  const activeCriteria = getActiveEvaluationCriteria();

  const analytics: CriteriaAnalytics[] = activeCriteria.map((criterion) => {
    const results = evaluatedCalls
      .map((call) =>
        call.evaluation?.results.find((r) => r.criterionId === criterion.id)
      )
      .filter((r) => r !== undefined);

    const totalEvaluations = results.length;
    const passedCount = results.filter((r) => r?.passed).length;
    const passRate = totalEvaluations > 0 ? (passedCount / totalEvaluations) * 100 : 0;
    const averageScore =
      totalEvaluations > 0
        ? results.reduce((sum, r) => sum + (r?.score || 0), 0) / totalEvaluations
        : 0;

    const failedResults = results.filter((r) => !r?.passed);
    const commonIssues = failedResults
      .map((r) => r?.reasoning)
      .filter((r) => r)
      .slice(0, 3) as string[];

    return {
      criterionId: criterion.id,
      totalEvaluations,
      passRate,
      averageScore,
      commonIssues,
    };
  });

  return analytics;
}

export function getPerformanceTrend(calls: CallRecord[], agentName?: string): Array<{
  date: string;
  score: number;
  count: number;
}> {
  const filteredCalls = agentName
    ? calls.filter((c) => c.metadata.agentName === agentName && c.evaluation)
    : calls.filter((c) => c.evaluation);

  const dateMap = new Map<string, { total: number; count: number }>();

  filteredCalls.forEach((call) => {
    const date = new Date(call.createdAt).toISOString().split('T')[0];
    if (!dateMap.has(date)) {
      dateMap.set(date, { total: 0, count: 0 });
    }
    const entry = dateMap.get(date)!;
    entry.total += call.evaluation?.percentage || 0;
    entry.count += 1;
  });

  return Array.from(dateMap.entries())
    .map(([date, { total, count }]) => ({
      date,
      score: Math.round(total / count),
      count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface SentimentOverview {
  totalSegments: number;
  totalDurationMilliseconds: number;
  distribution: Record<SentimentLabel, number>;
  averageConfidence: number;
}

export function calculateSentimentOverview(calls: CallRecord[]): SentimentOverview {
  const totals: Record<SentimentLabel, number> = {
    positive: 0,
    neutral: 0,
    negative: 0,
  };

  let totalSegments = 0;
  let totalDuration = 0;
  let confidenceSum = 0;
  let confidenceCount = 0;

  calls.forEach((call) => {
    call.sentimentSegments?.forEach((segment) => {
      const start = segment.startMilliseconds ?? 0;
      const end = segment.endMilliseconds ?? start;
      const duration = Math.max(0, end - start);
      const sentiment = segment.sentiment ?? 'neutral';

      totals[sentiment] += duration;
      totalSegments += 1;
      totalDuration += duration;

      if (typeof segment.confidence === 'number') {
        confidenceSum += segment.confidence;
        confidenceCount += 1;
      }
    });
  });

  const distribution = totalDuration
    ? (Object.entries(totals).reduce((acc, [key, value]) => {
        acc[key as SentimentLabel] = Number(((value / totalDuration) * 100).toFixed(1));
        return acc;
      }, {} as Record<SentimentLabel, number>))
    : {
        positive: 0,
        neutral: 0,
        negative: 0,
      };

  const averageConfidence = confidenceCount > 0 ? confidenceSum / confidenceCount : 0;

  return {
    totalSegments,
    totalDurationMilliseconds: totalDuration,
    distribution,
    averageConfidence: Number((averageConfidence * 100).toFixed(1)) / 100,
  };
}
