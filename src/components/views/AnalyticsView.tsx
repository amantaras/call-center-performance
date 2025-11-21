import { useLocalStorage } from '@/hooks/useLocalStorage';
import { CallRecord } from '@/types/call';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { calculateCriteriaAnalytics, calculateAgentPerformance } from '@/lib/analytics';
import { CriteriaAnalyticsChart } from '@/components/analytics/CriteriaAnalyticsChart';
import { PerformanceTrendChart } from '@/components/analytics/PerformanceTrendChart';
import { getCriterionById } from '@/lib/evaluation-criteria';

export function AnalyticsView() {
  const [calls] = useLocalStorage<CallRecord[]>('calls', []);

  const evaluatedCalls = (calls || []).filter((c) => c.evaluation);
  const criteriaAnalytics = calculateCriteriaAnalytics(calls || []);
  const agentPerformances = calculateAgentPerformance(calls || []);

  if (!evaluatedCalls.length) {
    return (
      <Card className="p-12 text-center">
        <div className="mx-auto max-w-md space-y-4">
          <div>
            <h3 className="text-lg font-semibold">No evaluations yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Upload and evaluate calls to see analytics and insights
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const totalEvaluations = evaluatedCalls.length;
  const avgScore =
    evaluatedCalls.reduce((sum, c) => sum + (c.evaluation?.percentage || 0), 0) /
    totalEvaluations;

  // Calculate overall sentiment distribution across all calls
  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
  const callsWithSentiment = (calls || []).filter(c => c.overallSentiment);
  callsWithSentiment.forEach(c => {
    if (c.overallSentiment) {
      sentimentCounts[c.overallSentiment]++;
    }
  });
  const totalWithSentiment = callsWithSentiment.length;

  const sortedCriteria = [...criteriaAnalytics].sort((a, b) => a.passRate - b.passRate);
  const weakestCriteria = sortedCriteria.slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Evaluations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalEvaluations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgScore.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{agentPerformances.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overall Sentiment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalWithSentiment > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-success text-xl">😊</span>
                  <span className="text-sm">{Math.round((sentimentCounts.positive / totalWithSentiment) * 100)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xl">😐</span>
                  <span className="text-sm">{Math.round((sentimentCounts.neutral / totalWithSentiment) * 100)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-destructive text-xl">😞</span>
                  <span className="text-sm">{Math.round((sentimentCounts.negative / totalWithSentiment) * 100)}%</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <PerformanceTrendChart calls={calls || []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Criteria Pass Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <CriteriaAnalyticsChart analytics={criteriaAnalytics} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Areas for Improvement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {weakestCriteria.map((analytics) => {
              const criterion = getCriterionById(analytics.criterionId);
              return (
                <div
                  key={analytics.criterionId}
                  className="flex items-start justify-between p-4 border border-border rounded-lg"
                >
                  <div className="space-y-1 flex-1">
                    <h4 className="font-medium">{criterion?.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Pass rate: {analytics.passRate.toFixed(1)}% ({analytics.totalEvaluations}{' '}
                      evaluations)
                    </p>
                    {analytics.commonIssues.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">Common issues:</p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground">
                          {analytics.commonIssues.slice(0, 2).map((issue, idx) => (
                            <li key={idx}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {analytics.passRate.toFixed(0)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
