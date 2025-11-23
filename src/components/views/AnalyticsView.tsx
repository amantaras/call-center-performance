import { useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { CallRecord } from '@/types/call';
import { SchemaDefinition } from '@/types/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  calculateCriteriaAnalytics,
  calculateAgentPerformance,
  aggregateProductAnalytics,
  aggregateRiskAnalytics,
  aggregateNationalityAnalytics,
  aggregateOutcomeAnalytics,
  aggregateBorrowerAnalytics,
} from '@/lib/analytics';
import { CriteriaAnalyticsChart } from '@/components/analytics/CriteriaAnalyticsChart';
import { PerformanceTrendChart } from '@/components/analytics/PerformanceTrendChart';
import { ProductPerformanceChart } from '@/components/analytics/ProductPerformanceChart';
import { RiskSegmentationChart } from '@/components/analytics/RiskSegmentationChart';
import { NationalityAnalysisChart } from '@/components/analytics/NationalityAnalysisChart';
import { OutcomeCorrelationChart } from '@/components/analytics/OutcomeCorrelationChart';
import { BorrowerInsightsChart } from '@/components/analytics/BorrowerInsightsChart';
import { AnalyticsConfigWizard } from '@/components/AnalyticsConfigWizard';
import { getCriterionById } from '@/lib/evaluation-criteria';
import { regenerateInsights } from '@/services/azure-openai';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AnalyticsViewProps {
  activeSchema: SchemaDefinition | null;
  schemaLoading: boolean;
}

export function AnalyticsView({ activeSchema, schemaLoading }: AnalyticsViewProps) {
  const [calls, setCalls] = useLocalStorage<CallRecord[]>('calls', []);
  const [regenerationMode, setRegenerationMode] = useState<'missing' | 'all'>('missing');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerationProgress, setRegenerationProgress] = useState({ current: 0, total: 0, callId: '' });
  const [showRegenerationDialog, setShowRegenerationDialog] = useState(false);

  const evaluatedCalls = (calls || []).filter((c) => c.evaluation);
  const criteriaAnalytics = calculateCriteriaAnalytics(calls || []);
  const agentPerformances = calculateAgentPerformance(calls || []);

  // Advanced analytics aggregations
  const productAnalytics = aggregateProductAnalytics(calls || []);
  const riskAnalytics = aggregateRiskAnalytics(calls || []);
  const nationalityAnalytics = aggregateNationalityAnalytics(calls || []);
  const outcomeAnalytics = aggregateOutcomeAnalytics(calls || []);
  const borrowerAnalytics = aggregateBorrowerAnalytics(calls || []);

  const handleRegenerateInsights = async () => {
    setIsRegenerating(true);
    setRegenerationProgress({ current: 0, total: 0, callId: '' });

    try {
      const updatedCalls = await regenerateInsights(
        calls || [],
        regenerationMode,
        (current, total, callId) => {
          setRegenerationProgress({ current, total, callId });
        }
      );

      setCalls(updatedCalls);
      toast.success(`Successfully regenerated insights for ${regenerationProgress.current} calls`);
    } catch (error) {
      console.error('Failed to regenerate insights:', error);
      toast.error('Failed to regenerate insights. Please try again.');
    } finally {
      setIsRegenerating(false);
      setShowRegenerationDialog(false);
      setRegenerationProgress({ current: 0, total: 0, callId: '' });
    }
  };

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
  const callsWithSentiment = (calls || []).filter((c) => c.overallSentiment);
  callsWithSentiment.forEach((c) => {
    if (c.overallSentiment) {
      sentimentCounts[c.overallSentiment]++;
    }
  });
  const totalWithSentiment = callsWithSentiment.length;

  const sortedCriteria = [...criteriaAnalytics].sort((a, b) => a.passRate - b.passRate);
  const weakestCriteria = sortedCriteria.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Analytics Configuration */}
      <div className="flex justify-end">
        <AnalyticsConfigWizard activeSchema={activeSchema} />
      </div>

      {/* Summary Cards */}
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
                  <span className="text-sm">
                    {Math.round((sentimentCounts.positive / totalWithSentiment) * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xl">😐</span>
                  <span className="text-sm">
                    {Math.round((sentimentCounts.neutral / totalWithSentiment) * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-destructive text-xl">😞</span>
                  <span className="text-sm">
                    {Math.round((sentimentCounts.negative / totalWithSentiment) * 100)}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Analytics */}
      <Tabs defaultValue="performance" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="grid grid-cols-7 w-full max-w-4xl">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="product">Product</TabsTrigger>
            <TabsTrigger value="risk">Risk</TabsTrigger>
            <TabsTrigger value="nationality">Nationality</TabsTrigger>
            <TabsTrigger value="outcome">Outcome</TabsTrigger>
            <TabsTrigger value="borrower">Borrower</TabsTrigger>
            <TabsTrigger value="improvement">Improvement</TabsTrigger>
          </TabsList>

          <Button
            onClick={() => setShowRegenerationDialog(true)}
            disabled={isRegenerating || evaluatedCalls.length === 0}
            variant="outline"
            className="ml-4"
          >
            {isRegenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Regenerate Insights
              </>
            )}
          </Button>
        </div>

        {/* Performance Tab (existing analytics) */}
        <TabsContent value="performance" className="space-y-6">
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
        </TabsContent>

        {/* Product Analytics */}
        <TabsContent value="product">
          <ProductPerformanceChart data={productAnalytics} />
        </TabsContent>

        {/* Risk Segmentation */}
        <TabsContent value="risk">
          <RiskSegmentationChart data={riskAnalytics} />
        </TabsContent>

        {/* Nationality Analysis */}
        <TabsContent value="nationality">
          <NationalityAnalysisChart data={nationalityAnalytics} />
        </TabsContent>

        {/* Outcome Correlation */}
        <TabsContent value="outcome">
          <OutcomeCorrelationChart data={outcomeAnalytics} />
        </TabsContent>

        {/* Borrower Insights */}
        <TabsContent value="borrower">
          <BorrowerInsightsChart data={borrowerAnalytics} />
        </TabsContent>

        {/* Areas for Improvement (existing) */}
        <TabsContent value="improvement">
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
        </TabsContent>
      </Tabs>

      {/* Regeneration Dialog */}
      <Dialog open={showRegenerationDialog} onOpenChange={setShowRegenerationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate AI Insights</DialogTitle>
            <DialogDescription>
              Generate advanced analytics insights for your evaluated calls.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <RadioGroup value={regenerationMode} onValueChange={(v: any) => setRegenerationMode(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="missing" id="missing" />
                <Label htmlFor="missing" className="cursor-pointer">
                  Only Missing Insights (faster)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="cursor-pointer">
                  All Evaluated Calls (regenerate everything)
                </Label>
              </div>
            </RadioGroup>

            {isRegenerating && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>
                    Processing call: <span className="font-mono">{regenerationProgress.callId}</span>
                  </span>
                  <span>
                    {regenerationProgress.current} / {regenerationProgress.total}
                  </span>
                </div>
                <Progress
                  value={
                    regenerationProgress.total > 0
                      ? (regenerationProgress.current / regenerationProgress.total) * 100
                      : 0
                  }
                />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowRegenerationDialog(false)}
                disabled={isRegenerating}
              >
                Cancel
              </Button>
              <Button onClick={handleRegenerateInsights} disabled={isRegenerating}>
                {isRegenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  'Start Regeneration'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
