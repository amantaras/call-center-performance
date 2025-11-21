import { CallRecord, AgentPerformance, CriteriaAnalytics, SentimentLabel, RiskTier, CategorizedOutcome } from '@/types/call';
import { getActiveEvaluationCriteria } from '@/services/azure-openai';

// ============================================================================
// ADVANCED INSIGHTS ANALYTICS - Product, Risk, Nationality, Outcome, Borrower
// ============================================================================

export interface ProductAnalytics {
  productType: string;
  callCount: number;
  avgScore: number;
  avgPercentage: number;
  performanceFactors: Array<{ factor: string; count: number }>;
  recommendedApproaches: Array<{ approach: string; count: number }>;
  successRate: number;
}

export interface RiskAnalytics {
  riskTier: RiskTier;
  callCount: number;
  avgScore: number;
  avgPercentage: number;
  avgPaymentProbability: number;
  avgRiskScore: number;
  escalationCount: number;
  avgDaysPastDue: number;
  avgDueAmount: number;
}

export interface NationalityAnalytics {
  nationality: string;
  callCount: number;
  avgScore: number;
  avgPercentage: number;
  culturalFactors: Array<{ factor: string; count: number }>;
  avgLanguageEffectiveness: string;
  recommendedAdjustments: Array<{ adjustment: string; count: number }>;
}

export interface OutcomeAnalytics {
  categorizedOutcome: CategorizedOutcome;
  callCount: number;
  avgScore: number;
  avgPercentage: number;
  avgSuccessProbability: number;
  keyFactors: Array<{ factor: string; count: number }>;
  conversionRate: number;
}

export interface BorrowerAnalytics {
  interactionQuality: string;
  callCount: number;
  avgScore: number;
  avgPercentage: number;
  relationshipIndicators: Array<{ indicator: string; count: number }>;
  futureStrategies: Array<{ strategy: string; count: number }>;
}

/**
 * Aggregate product analytics from call insights
 */
export function aggregateProductAnalytics(calls: CallRecord[]): ProductAnalytics[] {
  const callsWithInsights = calls.filter((c) => c.evaluation?.productInsight);
  const productMap = new Map<string, CallRecord[]>();

  callsWithInsights.forEach((call) => {
    const productType = call.evaluation!.productInsight!.productType;
    if (!productMap.has(productType)) {
      productMap.set(productType, []);
    }
    productMap.get(productType)!.push(call);
  });

  const analytics: ProductAnalytics[] = [];

  productMap.forEach((productCalls, productType) => {
    const callCount = productCalls.length;
    const avgScore = productCalls.reduce((sum, c) => sum + (c.evaluation?.totalScore || 0), 0) / callCount;
    const avgPercentage = productCalls.reduce((sum, c) => sum + (c.evaluation?.percentage || 0), 0) / callCount;

    // Collect performance factors
    const factorsMap = new Map<string, number>();
    productCalls.forEach((call) => {
      call.evaluation?.productInsight?.performanceFactors.forEach((factor) => {
        factorsMap.set(factor, (factorsMap.get(factor) || 0) + 1);
      });
    });
    const performanceFactors = Array.from(factorsMap.entries())
      .map(([factor, count]) => ({ factor, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Collect recommended approaches
    const approachesMap = new Map<string, number>();
    productCalls.forEach((call) => {
      const approach = call.evaluation?.productInsight?.recommendedApproach;
      if (approach) {
        approachesMap.set(approach, (approachesMap.get(approach) || 0) + 1);
      }
    });
    const recommendedApproaches = Array.from(approachesMap.entries())
      .map(([approach, count]) => ({ approach, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Calculate success rate from outcome insights
    const successCount = productCalls.filter(
      (c) => c.evaluation?.outcomeInsight?.categorizedOutcome === 'success'
    ).length;
    const successRate = callCount > 0 ? (successCount / callCount) * 100 : 0;

    analytics.push({
      productType,
      callCount,
      avgScore,
      avgPercentage,
      performanceFactors,
      recommendedApproaches,
      successRate,
    });
  });

  return analytics.sort((a, b) => b.callCount - a.callCount);
}

/**
 * Aggregate risk analytics from call insights
 */
export function aggregateRiskAnalytics(calls: CallRecord[]): RiskAnalytics[] {
  const callsWithInsights = calls.filter((c) => c.evaluation?.riskInsight);
  const riskMap = new Map<RiskTier, CallRecord[]>();

  callsWithInsights.forEach((call) => {
    const riskTier = call.evaluation!.riskInsight!.riskTier;
    if (!riskMap.has(riskTier)) {
      riskMap.set(riskTier, []);
    }
    riskMap.get(riskTier)!.push(call);
  });

  const analytics: RiskAnalytics[] = [];
  const tierOrder: RiskTier[] = ['Low', 'Medium', 'High', 'Critical'];

  tierOrder.forEach((riskTier) => {
    const tierCalls = riskMap.get(riskTier) || [];
    if (tierCalls.length === 0) return;

    const callCount = tierCalls.length;
    const avgScore = tierCalls.reduce((sum, c) => sum + (c.evaluation?.totalScore || 0), 0) / callCount;
    const avgPercentage = tierCalls.reduce((sum, c) => sum + (c.evaluation?.percentage || 0), 0) / callCount;
    const avgPaymentProbability = tierCalls.reduce(
      (sum, c) => sum + (c.evaluation?.riskInsight?.paymentProbability || 0),
      0
    ) / callCount;
    const avgRiskScore = tierCalls.reduce(
      (sum, c) => sum + (c.evaluation?.riskInsight?.riskScore || 0),
      0
    ) / callCount;
    const escalationCount = tierCalls.filter(
      (c) => c.evaluation?.riskInsight?.escalationRecommended
    ).length;
    const avgDaysPastDue = tierCalls.reduce((sum, c) => sum + c.metadata.daysPastDue, 0) / callCount;
    const avgDueAmount = tierCalls.reduce((sum, c) => sum + c.metadata.dueAmount, 0) / callCount;

    analytics.push({
      riskTier,
      callCount,
      avgScore,
      avgPercentage,
      avgPaymentProbability,
      avgRiskScore,
      escalationCount,
      avgDaysPastDue,
      avgDueAmount,
    });
  });

  return analytics;
}

/**
 * Aggregate nationality analytics from call insights
 */
export function aggregateNationalityAnalytics(calls: CallRecord[]): NationalityAnalytics[] {
  const callsWithInsights = calls.filter((c) => c.evaluation?.nationalityInsight);
  const nationalityMap = new Map<string, CallRecord[]>();

  callsWithInsights.forEach((call) => {
    const nationality = call.metadata.nationality;
    if (!nationalityMap.has(nationality)) {
      nationalityMap.set(nationality, []);
    }
    nationalityMap.get(nationality)!.push(call);
  });

  const analytics: NationalityAnalytics[] = [];

  nationalityMap.forEach((nationalityCalls, nationality) => {
    const callCount = nationalityCalls.length;
    const avgScore = nationalityCalls.reduce((sum, c) => sum + (c.evaluation?.totalScore || 0), 0) / callCount;
    const avgPercentage = nationalityCalls.reduce((sum, c) => sum + (c.evaluation?.percentage || 0), 0) / callCount;

    // Collect cultural factors
    const factorsMap = new Map<string, number>();
    nationalityCalls.forEach((call) => {
      call.evaluation?.nationalityInsight?.culturalFactors.forEach((factor) => {
        factorsMap.set(factor, (factorsMap.get(factor) || 0) + 1);
      });
    });
    const culturalFactors = Array.from(factorsMap.entries())
      .map(([factor, count]) => ({ factor, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Collect recommended adjustments
    const adjustmentsMap = new Map<string, number>();
    nationalityCalls.forEach((call) => {
      const adjustment = call.evaluation?.nationalityInsight?.recommendedAdjustments;
      if (adjustment) {
        adjustmentsMap.set(adjustment, (adjustmentsMap.get(adjustment) || 0) + 1);
      }
    });
    const recommendedAdjustments = Array.from(adjustmentsMap.entries())
      .map(([adjustment, count]) => ({ adjustment, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Average language effectiveness (just take most common)
    const effectivenessMap = new Map<string, number>();
    nationalityCalls.forEach((call) => {
      const effectiveness = call.evaluation?.nationalityInsight?.languageEffectiveness;
      if (effectiveness) {
        effectivenessMap.set(effectiveness, (effectivenessMap.get(effectiveness) || 0) + 1);
      }
    });
    const avgLanguageEffectiveness = Array.from(effectivenessMap.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    analytics.push({
      nationality,
      callCount,
      avgScore,
      avgPercentage,
      culturalFactors,
      avgLanguageEffectiveness,
      recommendedAdjustments,
    });
  });

  return analytics.sort((a, b) => b.callCount - a.callCount);
}

/**
 * Aggregate outcome analytics from call insights
 */
export function aggregateOutcomeAnalytics(calls: CallRecord[]): OutcomeAnalytics[] {
  const callsWithInsights = calls.filter((c) => c.evaluation?.outcomeInsight);
  const outcomeMap = new Map<CategorizedOutcome, CallRecord[]>();

  callsWithInsights.forEach((call) => {
    const outcome = call.evaluation!.outcomeInsight!.categorizedOutcome;
    if (!outcomeMap.has(outcome)) {
      outcomeMap.set(outcome, []);
    }
    outcomeMap.get(outcome)!.push(call);
  });

  const analytics: OutcomeAnalytics[] = [];
  const outcomeOrder: CategorizedOutcome[] = ['success', 'promise-to-pay', 'callback-needed', 'no-contact', 'refused', 'other'];

  outcomeOrder.forEach((categorizedOutcome) => {
    const outcomeCalls = outcomeMap.get(categorizedOutcome) || [];
    if (outcomeCalls.length === 0) return;

    const callCount = outcomeCalls.length;
    const avgScore = outcomeCalls.reduce((sum, c) => sum + (c.evaluation?.totalScore || 0), 0) / callCount;
    const avgPercentage = outcomeCalls.reduce((sum, c) => sum + (c.evaluation?.percentage || 0), 0) / callCount;
    const avgSuccessProbability = outcomeCalls.reduce(
      (sum, c) => sum + (c.evaluation?.outcomeInsight?.successProbability || 0),
      0
    ) / callCount;

    // Collect key factors
    const factorsMap = new Map<string, number>();
    outcomeCalls.forEach((call) => {
      call.evaluation?.outcomeInsight?.keyFactors.forEach((factor) => {
        factorsMap.set(factor, (factorsMap.get(factor) || 0) + 1);
      });
    });
    const keyFactors = Array.from(factorsMap.entries())
      .map(([factor, count]) => ({ factor, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate conversion rate (how many of these turned into success)
    const conversionRate = categorizedOutcome === 'success' ? 100 : 0;

    analytics.push({
      categorizedOutcome,
      callCount,
      avgScore,
      avgPercentage,
      avgSuccessProbability,
      keyFactors,
      conversionRate,
    });
  });

  return analytics;
}

/**
 * Aggregate borrower analytics from call insights
 */
export function aggregateBorrowerAnalytics(calls: CallRecord[]): BorrowerAnalytics[] {
  const callsWithInsights = calls.filter((c) => c.evaluation?.borrowerInsight);
  const qualityMap = new Map<string, CallRecord[]>();

  callsWithInsights.forEach((call) => {
    const quality = call.evaluation!.borrowerInsight!.interactionQuality;
    if (!qualityMap.has(quality)) {
      qualityMap.set(quality, []);
    }
    qualityMap.get(quality)!.push(call);
  });

  const analytics: BorrowerAnalytics[] = [];
  const qualityOrder = ['excellent', 'good', 'fair', 'poor'];

  qualityOrder.forEach((interactionQuality) => {
    const qualityCalls = qualityMap.get(interactionQuality) || [];
    if (qualityCalls.length === 0) return;

    const callCount = qualityCalls.length;
    const avgScore = qualityCalls.reduce((sum, c) => sum + (c.evaluation?.totalScore || 0), 0) / callCount;
    const avgPercentage = qualityCalls.reduce((sum, c) => sum + (c.evaluation?.percentage || 0), 0) / callCount;

    // Collect relationship indicators
    const indicatorsMap = new Map<string, number>();
    qualityCalls.forEach((call) => {
      call.evaluation?.borrowerInsight?.relationshipIndicators.forEach((indicator) => {
        indicatorsMap.set(indicator, (indicatorsMap.get(indicator) || 0) + 1);
      });
    });
    const relationshipIndicators = Array.from(indicatorsMap.entries())
      .map(([indicator, count]) => ({ indicator, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Collect future strategies
    const strategiesMap = new Map<string, number>();
    qualityCalls.forEach((call) => {
      const strategy = call.evaluation?.borrowerInsight?.futureStrategy;
      if (strategy) {
        strategiesMap.set(strategy, (strategiesMap.get(strategy) || 0) + 1);
      }
    });
    const futureStrategies = Array.from(strategiesMap.entries())
      .map(([strategy, count]) => ({ strategy, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    analytics.push({
      interactionQuality,
      callCount,
      avgScore,
      avgPercentage,
      relationshipIndicators,
      futureStrategies,
    });
  });

  return analytics;
}

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
