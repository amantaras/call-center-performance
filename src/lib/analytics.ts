import { CallRecord, AgentPerformance, CriteriaAnalytics, SentimentLabel, RiskTier, CategorizedOutcome, TopicInsight } from '@/types/call';
import { SchemaDefinition } from '@/types/schema';
import { getActiveEvaluationCriteria } from '@/services/azure-openai';
import { getActiveSchema } from '@/services/schema-manager';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract agent name from call metadata using schema
 * Falls back to hardcoded 'agentName' for backward compatibility
 */
export function getAgentNameFromCall(call: CallRecord): string {
  // Try to find the participant_1 field from the schema
  const schema = getActiveSchema();
  if (schema) {
    const agentField = schema.fields.find(f => f.semanticRole === 'participant_1');
    if (agentField && call.metadata[agentField.id]) {
      return String(call.metadata[agentField.id]);
    }
  }
  
  // Fallback to common field names
  if (call.metadata.agentName) {
    return String(call.metadata.agentName);
  }
  if (call.metadata.agent_name) {
    return String(call.metadata.agent_name);
  }
  if (call.metadata.Agent) {
    return String(call.metadata.Agent);
  }
  
  return 'Unknown Agent';
}

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
      const agent = getAgentNameFromCall(call);
      if (!agentMap.has(agent)) {
        agentMap.set(agent, []);
      }
      agentMap.get(agent)!.push(call);
    }
  });

  const performances: AgentPerformance[] = [];
  const activeCriteria = getActiveEvaluationCriteria();
  
  // Calculate team average for comparison
  const allEvaluatedCalls = calls.filter(c => c.evaluation);
  const teamAvgPercentage = allEvaluatedCalls.length > 0
    ? allEvaluatedCalls.reduce((sum, c) => sum + (c.evaluation?.percentage || 0), 0) / allEvaluatedCalls.length
    : 0;

  agentMap.forEach((agentCalls, agentName) => {
    const totalCalls = agentCalls.length;
    const scores = agentCalls.map(c => c.evaluation?.percentage || 0);
    const totalScore = agentCalls.reduce(
      (sum, call) => sum + (call.evaluation?.totalScore || 0),
      0
    );
    const totalPercentage = scores.reduce((sum, s) => sum + s, 0);
    const averagePercentage = totalPercentage / totalCalls;

    // Criteria scores
    const criteriaScores: Record<number, number> = {};
    let totalCriteriaPassed = 0;
    let totalCriteriaEvaluated = 0;
    
    activeCriteria.forEach((criterion) => {
      const results = agentCalls
        .map((call) => call.evaluation?.results.find((r) => r.criterionId === criterion.id))
        .filter(r => r !== undefined);
      
      const avgScore = results.length > 0
        ? results.reduce((sum, r) => sum + (r?.score || 0), 0) / results.length
        : 0;
      criteriaScores[criterion.id] = avgScore;
      
      totalCriteriaPassed += results.filter(r => r?.passed).length;
      totalCriteriaEvaluated += results.length;
    });

    const sortedCriteria = Object.entries(criteriaScores).sort(
      ([, a], [, b]) => b - a
    );
    const topStrengths = sortedCriteria.slice(0, 3).map(([id]) => parseInt(id));
    const topWeaknesses = sortedCriteria.slice(-3).map(([id]) => parseInt(id));

    // Sentiment analysis
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

    // Trend calculation
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

    // === ENHANCED METRICS ===
    
    // Call duration metrics
    let totalCallDuration = 0;
    agentCalls.forEach(call => {
      let duration = 0;
      if (call.metadata?.durationMs) {
        duration = call.metadata.durationMs;
      } else if (call.metadata?.duration) {
        duration = call.metadata.duration * 1000;
      } else if (call.transcriptDuration) {
        duration = call.transcriptDuration;
      } else if (call.sentimentSegments && call.sentimentSegments.length > 0) {
        const lastSegment = call.sentimentSegments[call.sentimentSegments.length - 1];
        duration = lastSegment.endMilliseconds || 0;
      }
      totalCallDuration += duration;
    });
    const avgCallDuration = totalCalls > 0 ? totalCallDuration / totalCalls : 0;
    
    // Pass rate
    const passRate = totalCriteriaEvaluated > 0 
      ? (totalCriteriaPassed / totalCriteriaEvaluated) * 100 
      : 0;
    
    // Perfect score calls (>= 95%)
    const perfectScoreCalls = agentCalls.filter(c => (c.evaluation?.percentage || 0) >= 95).length;
    
    // Failed calls (< 60%)
    const failedCalls = agentCalls.filter(c => (c.evaluation?.percentage || 0) < 60).length;
    
    // Topic performance
    const topicMap = new Map<string, { count: number; totalScore: number }>();
    agentCalls.forEach(call => {
      call.evaluation?.topicsInsight?.topics?.forEach(topic => {
        const existing = topicMap.get(topic.topicName) || { count: 0, totalScore: 0 };
        existing.count++;
        existing.totalScore += call.evaluation?.percentage || 0;
        topicMap.set(topic.topicName, existing);
      });
    });
    const topTopics = Array.from(topicMap.entries())
      .map(([topic, data]) => ({
        topic,
        count: data.count,
        avgScore: data.totalScore / data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // AI Insights aggregation from schemaInsights
    const insightSummary: Record<string, {
      categoryName: string;
      avgNumericValue?: number;
      mostCommonValue?: string;
      distribution?: Record<string, number>;
    }> = {};
    
    agentCalls.forEach(call => {
      const schemaInsights = call.evaluation?.schemaInsights;
      if (schemaInsights) {
        Object.entries(schemaInsights).forEach(([categoryId, insights]) => {
          if (!insightSummary[categoryId]) {
            insightSummary[categoryId] = {
              categoryName: categoryId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              distribution: {},
            };
          }
          
          // Aggregate numeric and categorical values
          Object.entries(insights).forEach(([fieldId, value]) => {
            if (typeof value === 'number') {
              if (insightSummary[categoryId].avgNumericValue === undefined) {
                insightSummary[categoryId].avgNumericValue = 0;
              }
              insightSummary[categoryId].avgNumericValue! += value / totalCalls;
            } else if (typeof value === 'string') {
              const dist = insightSummary[categoryId].distribution!;
              dist[value] = (dist[value] || 0) + 1;
            }
          });
        });
      }
    });
    
    // Find most common value for each insight
    Object.values(insightSummary).forEach(summary => {
      if (summary.distribution && Object.keys(summary.distribution).length > 0) {
        const sorted = Object.entries(summary.distribution).sort((a, b) => b[1] - a[1]);
        summary.mostCommonValue = sorted[0][0];
      }
    });
    
    // Performance by period (weekly)
    const periodMap = new Map<string, { totalScore: number; count: number }>();
    agentCalls.forEach(call => {
      const date = new Date(call.createdAt);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const periodKey = weekStart.toISOString().split('T')[0];
      
      const existing = periodMap.get(periodKey) || { totalScore: 0, count: 0 };
      existing.totalScore += call.evaluation?.percentage || 0;
      existing.count++;
      periodMap.set(periodKey, existing);
    });
    const performanceByPeriod = Array.from(periodMap.entries())
      .map(([period, data]) => ({
        period,
        avgScore: data.totalScore / data.count,
        callCount: data.count,
      }))
      .sort((a, b) => a.period.localeCompare(b.period))
      .slice(-8); // Last 8 weeks
    
    // Score consistency (standard deviation)
    const mean = averagePercentage;
    const squaredDiffs = scores.map(s => Math.pow(s - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / scores.length;
    const scoreStdDev = Math.sqrt(avgSquaredDiff);
    
    let consistencyRating: 'consistent' | 'variable' | 'inconsistent' = 'consistent';
    if (scoreStdDev > 20) consistencyRating = 'inconsistent';
    else if (scoreStdDev > 10) consistencyRating = 'variable';
    
    // Recent calls summary
    const recentCallsSummary = agentCalls
      .slice(-5)
      .map(c => ({
        callId: c.id,
        score: c.evaluation?.percentage || 0,
        date: c.createdAt,
      }))
      .reverse();

    performances.push({
      agentName,
      totalCalls,
      averageScore: totalScore / totalCalls,
      averagePercentage,
      criteriaScores,
      trend,
      topStrengths,
      topWeaknesses,
      sentimentDistribution,
      dominantSentiment,
      // Enhanced metrics
      avgCallDuration,
      totalCallDuration,
      passRate,
      perfectScoreCalls,
      failedCalls,
      topTopics,
      insightSummary: Object.keys(insightSummary).length > 0 ? insightSummary : undefined,
      performanceByPeriod,
      scoreStdDev,
      consistencyRating,
      recentCalls: recentCallsSummary,
      aboveAverage: averagePercentage > teamAvgPercentage,
    });
  });

  // Sort by performance and add rankings
  const sorted = performances.sort((a, b) => b.averagePercentage - a.averagePercentage);
  sorted.forEach((perf, index) => {
    perf.rankAmongAgents = index + 1;
    perf.percentileRank = Math.round(((sorted.length - index) / sorted.length) * 100);
  });
  
  return sorted;
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
    ? calls.filter((c) => getAgentNameFromCall(c) === agentName && c.evaluation)
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

// ============================================================================
// TOPICS AND KEY PHRASES ANALYTICS
// ============================================================================

export interface TopicAnalytics {
  topicId: string;
  topicName: string;
  callCount: number;
  avgConfidence: number;
  sentimentDistribution: Record<SentimentLabel, number>;
  dominantSentiment: SentimentLabel;
  avgHandlingTimeMs: number;
  avgScore: number;
  trend: 'up' | 'down' | 'stable';
}

export interface KeyPhraseAnalytics {
  phrase: string;
  count: number;
  frequency: number; // percentage of total calls
  avgSentiment: SentimentLabel;
  relatedTopics: string[];
}

export interface OverviewKPIs {
  totalCalls: number;
  evaluatedCalls: number;
  avgScore: number;
  avgHandlingTimeMs: number;
  satisfiedPercentage: number; // Calls with positive sentiment
  topTopics: TopicAnalytics[];
  topKeyPhrases: KeyPhraseAnalytics[];
  sentimentDistribution: Record<SentimentLabel, number>;
}

/**
 * Aggregate topic analytics from call insights
 */
export function aggregateTopicAnalytics(calls: CallRecord[]): TopicAnalytics[] {
  const callsWithTopics = calls.filter((c) => 
    c.evaluation?.topicsInsight?.topics && c.evaluation.topicsInsight.topics.length > 0
  );

  if (callsWithTopics.length === 0) {
    return [];
  }

  // Group calls by topic
  const topicMap = new Map<string, {
    topicName: string;
    calls: CallRecord[];
    confidences: number[];
    sentiments: SentimentLabel[];
    scores: number[];
  }>();

  callsWithTopics.forEach((call) => {
    call.evaluation!.topicsInsight!.topics.forEach((topic) => {
      const key = topic.topicId;
      if (!topicMap.has(key)) {
        topicMap.set(key, {
          topicName: topic.topicName,
          calls: [],
          confidences: [],
          sentiments: [],
          scores: [],
        });
      }
      const entry = topicMap.get(key)!;
      entry.calls.push(call);
      entry.confidences.push(topic.confidence);
      entry.sentiments.push(topic.sentiment);
      if (call.evaluation?.percentage) {
        entry.scores.push(call.evaluation.percentage);
      }
    });
  });

  const analytics: TopicAnalytics[] = [];

  topicMap.forEach((data, topicId) => {
    const callCount = data.calls.length;
    const avgConfidence = data.confidences.reduce((a, b) => a + b, 0) / data.confidences.length;

    // Calculate sentiment distribution
    const sentimentCounts: Record<SentimentLabel, number> = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };
    data.sentiments.forEach((s) => {
      sentimentCounts[s]++;
    });
    const totalSentiments = data.sentiments.length;
    const sentimentDistribution: Record<SentimentLabel, number> = {
      positive: (sentimentCounts.positive / totalSentiments) * 100,
      neutral: (sentimentCounts.neutral / totalSentiments) * 100,
      negative: (sentimentCounts.negative / totalSentiments) * 100,
    };

    // Dominant sentiment
    const dominantSentiment = (Object.entries(sentimentCounts)
      .sort(([, a], [, b]) => b - a)[0][0]) as SentimentLabel;

    // Calculate average handling time from call duration
    const avgHandlingTimeMs = data.calls.reduce((sum, call) => {
      // Try to get duration from metadata or calculate from segments
      let duration = 0;
      if (call.metadata.durationMs) {
        duration = call.metadata.durationMs;
      } else if (call.metadata.duration) {
        duration = call.metadata.duration * 1000; // assume seconds
      } else if (call.sentimentSegments && call.sentimentSegments.length > 0) {
        const lastSegment = call.sentimentSegments[call.sentimentSegments.length - 1];
        duration = lastSegment.endMilliseconds || 0;
      }
      return sum + duration;
    }, 0) / callCount;

    // Average score
    const avgScore = data.scores.length > 0
      ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length
      : 0;

    // Calculate trend (simple: compare first half vs second half)
    const halfPoint = Math.floor(data.calls.length / 2);
    const firstHalfAvg = data.scores.slice(0, halfPoint).reduce((a, b) => a + b, 0) / Math.max(halfPoint, 1);
    const secondHalfAvg = data.scores.slice(halfPoint).reduce((a, b) => a + b, 0) / Math.max(data.scores.length - halfPoint, 1);
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (secondHalfAvg > firstHalfAvg + 5) trend = 'up';
    else if (secondHalfAvg < firstHalfAvg - 5) trend = 'down';

    analytics.push({
      topicId,
      topicName: data.topicName,
      callCount,
      avgConfidence,
      sentimentDistribution,
      dominantSentiment,
      avgHandlingTimeMs,
      avgScore,
      trend,
    });
  });

  return analytics.sort((a, b) => b.callCount - a.callCount);
}

/**
 * Aggregate key phrase analytics from call insights
 */
export function aggregateKeyPhraseAnalytics(calls: CallRecord[], schema?: SchemaDefinition): KeyPhraseAnalytics[] {
  console.log(`🔍 aggregateKeyPhraseAnalytics: Processing ${calls.length} calls`);
  
  const callsWithPhrases = calls.filter((c) =>
    c.evaluation?.topicsInsight?.keyPhrases && c.evaluation.topicsInsight.keyPhrases.length > 0
  );

  console.log(`📊 Found ${callsWithPhrases.length} calls with key phrases`);

  if (callsWithPhrases.length === 0) {
    return [];
  }

  // Build a map of topic keywords for matching phrases to topics
  const topicKeywordMap = new Map<string, { topicId: string; topicName: string }>();
  if (schema?.topicTaxonomy) {
    const flattenTopics = (topics: typeof schema.topicTaxonomy): void => {
      topics?.forEach(topic => {
        // Add the topic name itself as a keyword
        topicKeywordMap.set(topic.name.toLowerCase(), { topicId: topic.id, topicName: topic.name });
        // Add all keywords
        topic.keywords?.forEach(kw => {
          topicKeywordMap.set(kw.toLowerCase(), { topicId: topic.id, topicName: topic.name });
        });
        // Process children recursively
        if (topic.children) {
          flattenTopics(topic.children);
        }
      });
    };
    flattenTopics(schema.topicTaxonomy);
  }

  // Count phrase occurrences and collect sentiment data per topic
  const phraseMap = new Map<string, {
    count: number;
    sentiments: SentimentLabel[];  // Sentiments from topic matches
    topicIds: Set<string>;
    matchedTopicNames: Set<string>;
  }>();

  callsWithPhrases.forEach((call) => {
    const phrases = call.evaluation!.topicsInsight!.keyPhrases;
    const callTopics = call.evaluation!.topicsInsight!.topics || [];

    // Create a map of topic sentiments for this call
    const topicSentimentMap = new Map<string, SentimentLabel>();
    callTopics.forEach(t => {
      topicSentimentMap.set(t.topicId, t.sentiment);
      topicSentimentMap.set(t.topicName.toLowerCase(), t.sentiment);
    });

    phrases.forEach((phrase) => {
      const normalized = phrase.toLowerCase().trim();
      if (!phraseMap.has(normalized)) {
        phraseMap.set(normalized, {
          count: 0,
          sentiments: [],
          topicIds: new Set(),
          matchedTopicNames: new Set(),
        });
      }
      const entry = phraseMap.get(normalized)!;
      entry.count++;

      // Try to match phrase to a topic and get its sentiment
      let matchedSentiment: SentimentLabel | null = null;
      
      // 1. Check if phrase matches any topic keyword from schema
      for (const [keyword, topicInfo] of topicKeywordMap) {
        if (normalized.includes(keyword) || keyword.includes(normalized)) {
          entry.topicIds.add(topicInfo.topicName);
          entry.matchedTopicNames.add(topicInfo.topicName);
          // Get sentiment from this call's topic
          const sentiment = topicSentimentMap.get(topicInfo.topicId) || topicSentimentMap.get(topicInfo.topicName.toLowerCase());
          if (sentiment) {
            matchedSentiment = sentiment;
            break;
          }
        }
      }

      // 2. Check if phrase matches any of the call's identified topics
      if (!matchedSentiment) {
        for (const topic of callTopics) {
          if (normalized.includes(topic.topicName.toLowerCase()) || 
              topic.topicName.toLowerCase().includes(normalized)) {
            entry.topicIds.add(topic.topicName);
            matchedSentiment = topic.sentiment;
            break;
          }
        }
      }

      // Store the sentiment (will be aggregated later)
      if (matchedSentiment) {
        entry.sentiments.push(matchedSentiment);
      } else {
        // Fallback: Use content-based analysis for unmatched phrases
        entry.sentiments.push(analyzePhraseSentiment(normalized));
      }

      // Also add all call topics as related
      callTopics.forEach((t) => entry.topicIds.add(t.topicName));
    });
  });

  const totalCalls = callsWithPhrases.length;
  const analytics: KeyPhraseAnalytics[] = [];

  phraseMap.forEach((data, phrase) => {
    // Calculate the most common sentiment for this phrase
    const sentimentCounts: Record<SentimentLabel, number> = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };
    data.sentiments.forEach((s) => sentimentCounts[s]++);
    const avgSentiment = (Object.entries(sentimentCounts)
      .sort(([, a], [, b]) => b - a)[0][0]) as SentimentLabel;

    analytics.push({
      phrase,
      count: data.count,
      frequency: (data.count / totalCalls) * 100,
      avgSentiment,
      relatedTopics: Array.from(data.topicIds).slice(0, 3),
    });
  });

  return analytics.sort((a, b) => b.count - a.count);
}

/**
 * Analyze the sentiment of a phrase based on its content
 * Used as fallback when phrase cannot be matched to a topic with known sentiment
 */
function analyzePhraseSentiment(phrase: string): SentimentLabel {
  const lowerPhrase = phrase.toLowerCase();
  
  // Negative indicators - complaints, problems, issues
  const negativeKeywords = [
    'complaint', 'dispute', 'problem', 'issue', 'error', 'wrong', 'incorrect',
    'missed', 'missing', 'lost', 'delay', 'delayed', 'late', 'cancel', 'cancelled',
    'refund', 'reimbursement', 'compensation', 'escalate', 'escalation', 'supervisor',
    'manager', 'frustrated', 'angry', 'upset', 'dissatisfied', 'unhappy', 'terrible',
    'awful', 'horrible', 'worst', 'fail', 'failed', 'failure', 'broken', 'damage',
    'damaged', 'overcharge', 'overcharged', 'billing error', 'unauthorized',
    'no-show', 'didn\'t arrive', 'not received', 'never received', 'still waiting',
    'churn', 'leaving', 'switching', 'competitor', 'disconnect', 'disconnection',
    'past due', 'overdue', 'delinquent', 'collection', 'debt', 'owe', 'owed',
    'denied', 'rejected', 'refused', 'unable', 'cannot', 'won\'t', 'can\'t',
    'emergency', 'urgent', 'critical', 'severe', 'serious'
  ];
  
  // Positive indicators - resolution, satisfaction, success
  const positiveKeywords = [
    'resolved', 'resolution', 'fixed', 'solved', 'solution', 'thank', 'thanks',
    'appreciate', 'appreciated', 'great', 'excellent', 'wonderful', 'amazing',
    'satisfied', 'happy', 'pleased', 'helpful', 'professional', 'efficient',
    'quick', 'fast', 'prompt', 'confirmation', 'confirmed', 'approved', 'success',
    'successful', 'complete', 'completed', 'processed', 'upgraded', 'bonus',
    'discount', 'savings', 'reward', 'loyalty', 'gold status', 'priority',
    'premium', 'vip', 'special offer', 'promotion', 'free', 'waived',
    'retained', 'retention', 'renewed', 'renewal', 'payment plan', 'arrangement',
    'accommodation', 'voucher', 'credit', 'miles', 'points'
  ];
  
  // Check for negative keywords first (they often override positive context)
  for (const keyword of negativeKeywords) {
    if (lowerPhrase.includes(keyword)) {
      return 'negative';
    }
  }
  
  // Check for positive keywords
  for (const keyword of positiveKeywords) {
    if (lowerPhrase.includes(keyword)) {
      return 'positive';
    }
  }
  
  // Default to neutral
  return 'neutral';
}

/**
 * Calculate overview KPIs for the dashboard
 */
export function calculateOverviewKPIs(calls: CallRecord[], schema?: SchemaDefinition): OverviewKPIs {
  const evaluatedCalls = calls.filter((c) => c.evaluation);
  const totalCalls = calls.length;

  // Average score
  const avgScore = evaluatedCalls.length > 0
    ? evaluatedCalls.reduce((sum, c) => sum + (c.evaluation?.percentage || 0), 0) / evaluatedCalls.length
    : 0;

  // Average handling time
  const avgHandlingTimeMs = calls.reduce((sum, call) => {
    let duration = 0;
    if (call.metadata.durationMs) {
      duration = call.metadata.durationMs;
    } else if (call.metadata.duration) {
      duration = call.metadata.duration * 1000;
    } else if (call.sentimentSegments && call.sentimentSegments.length > 0) {
      const lastSegment = call.sentimentSegments[call.sentimentSegments.length - 1];
      duration = lastSegment.endMilliseconds || 0;
    }
    return sum + duration;
  }, 0) / Math.max(totalCalls, 1);

  // Satisfied percentage (calls with positive overall sentiment)
  const sentimentOverview = calculateSentimentOverview(calls);
  const satisfiedPercentage = sentimentOverview.distribution.positive;

  // Top topics
  const topTopics = aggregateTopicAnalytics(calls).slice(0, 10);

  // Top key phrases - pass schema for topic-based sentiment matching
  const topKeyPhrases = aggregateKeyPhraseAnalytics(calls, schema).slice(0, 30);

  return {
    totalCalls,
    evaluatedCalls: evaluatedCalls.length,
    avgScore,
    avgHandlingTimeMs,
    satisfiedPercentage,
    topTopics,
    topKeyPhrases,
    sentimentDistribution: sentimentOverview.distribution,
  };
}

/**
 * Format milliseconds to human-readable duration
 */
export function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
