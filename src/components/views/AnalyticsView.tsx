import { useState, useEffect, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { CallRecord } from '@/types/call';
import { SchemaDefinition, AnalyticsView as AnalyticsViewType } from '@/types/schema';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  aggregateTopicAnalytics,
  aggregateKeyPhraseAnalytics,
  calculateOverviewKPIs,
  formatDuration,
} from '@/lib/analytics';
import { CriteriaAnalyticsChart } from '@/components/analytics/CriteriaAnalyticsChart';
import { PerformanceTrendChart } from '@/components/analytics/PerformanceTrendChart';
import { ProductPerformanceChart } from '@/components/analytics/ProductPerformanceChart';
import { RiskSegmentationChart } from '@/components/analytics/RiskSegmentationChart';
import { NationalityAnalysisChart } from '@/components/analytics/NationalityAnalysisChart';
import { OutcomeCorrelationChart } from '@/components/analytics/OutcomeCorrelationChart';
import { BorrowerInsightsChart } from '@/components/analytics/BorrowerInsightsChart';
import { CustomAnalyticsChart } from '@/components/analytics/CustomAnalyticsChart';
import { KeyPhrasesCloud } from '@/components/analytics/KeyPhrasesCloud';
import { AnalyticsConfigWizard } from '@/components/AnalyticsConfigWizard';
import { getEvaluationCriteriaForSchema } from '@/services/azure-openai';
import { regenerateInsights } from '@/services/azure-openai';
import { Sparkles, Loader2, TrendingUp, TrendingDown, Minus, Phone, Clock, SmilePlus, Hash } from 'lucide-react';
import { toast } from 'sonner';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface AnalyticsViewProps {
  activeSchema: SchemaDefinition | null;
  schemaLoading: boolean;
}

export function AnalyticsView({ activeSchema, schemaLoading }: AnalyticsViewProps) {
  const [allCalls, setAllCalls] = useLocalStorage<CallRecord[]>('calls', []);
  const [regenerationMode, setRegenerationMode] = useState<'missing' | 'all'>('missing');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerationProgress, setRegenerationProgress] = useState({ current: 0, total: 0, callId: '' });
  const [showRegenerationDialog, setShowRegenerationDialog] = useState(false);
  const [customViews, setCustomViews] = useState<any[]>([]);
  const [viewsRefreshKey, setViewsRefreshKey] = useState(0);

  // Filter calls by active schema
  const calls = useMemo(() => {
    if (!activeSchema) return allCalls || [];
    return (allCalls || []).filter(call => call.schemaId === activeSchema.id);
  }, [allCalls, activeSchema]);

  const evaluatedCalls = calls.filter((c) => c.evaluation);
  const criteriaAnalytics = calculateCriteriaAnalytics(calls);
  const agentPerformances = calculateAgentPerformance(calls);

  // Advanced analytics aggregations - use schema-filtered calls
  const productAnalytics = useMemo(() => aggregateProductAnalytics(calls), [calls]);
  const riskAnalytics = useMemo(() => aggregateRiskAnalytics(calls), [calls]);
  const nationalityAnalytics = useMemo(() => aggregateNationalityAnalytics(calls), [calls]);
  const outcomeAnalytics = useMemo(() => aggregateOutcomeAnalytics(calls), [calls]);
  const borrowerAnalytics = useMemo(() => aggregateBorrowerAnalytics(calls), [calls]);

  // Topic and key phrase analytics - pass schema for topic-based sentiment matching
  const topicAnalytics = useMemo(() => aggregateTopicAnalytics(calls), [calls]);
  const keyPhraseAnalytics = useMemo(() => aggregateKeyPhraseAnalytics(calls, activeSchema || undefined), [calls, activeSchema]);
  const overviewKPIs = useMemo(() => calculateOverviewKPIs(calls, activeSchema || undefined), [calls, activeSchema]);

  // Load custom analytics views from localStorage
  useEffect(() => {
    if (activeSchema) {
      const storageKey = `analytics-views-${activeSchema.id}`;
      const savedViews = localStorage.getItem(storageKey);
      if (savedViews) {
        try {
          const parsed: AnalyticsViewType[] = JSON.parse(savedViews);
          setCustomViews(parsed.filter(v => v.enabled));
        } catch (error) {
          console.error('Failed to load custom analytics views:', error);
        }
      } else {
        setCustomViews([]);
      }
    }
  }, [activeSchema, viewsRefreshKey]);

  const handleViewsSaved = () => {
    setViewsRefreshKey(prev => prev + 1);
  };

  const handleRegenerateInsights = async () => {
    if (!activeSchema) {
      toast.error('No active schema available');
      return;
    }

    setIsRegenerating(true);
    setRegenerationProgress({ current: 0, total: 0, callId: '' });

    try {
      const updatedCalls = await regenerateInsights(
        calls,
        activeSchema,
        regenerationMode,
        (current, total, callId) => {
          setRegenerationProgress({ current, total, callId });
        }
      );

      // Update calls in storage - merge with calls from other schemas
      setAllCalls(prevCalls => {
        const otherSchemaCalls = (prevCalls || []).filter(c => c.schemaId !== activeSchema?.id);
        return [...otherSchemaCalls, ...updatedCalls];
      });
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
        <AnalyticsConfigWizard activeSchema={activeSchema} onViewsSaved={handleViewsSaved} />
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
      <Tabs defaultValue="overview" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="grid grid-cols-8 w-full max-w-5xl">
            <TabsTrigger value="overview">Overview</TabsTrigger>
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

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <SmilePlus className="h-4 w-4" />
                  Satisfied %
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {overviewKPIs.satisfiedPercentage.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Positive sentiment calls
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Total Calls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{overviewKPIs.totalCalls}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {overviewKPIs.evaluatedCalls} evaluated
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Avg Handling Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatDuration(overviewKPIs.avgHandlingTimeMs)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(overviewKPIs.avgHandlingTimeMs / 1000)}s average
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Avg Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{overviewKPIs.avgScore.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Quality score
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row - Topics Overview + Handling Time By Topic */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Topics Overview Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Topics Overview</CardTitle>
                <CardDescription>
                  Distribution of calls by topic sentiment
                </CardDescription>
              </CardHeader>
              <CardContent>
                {topicAnalytics.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Positive', value: overviewKPIs.sentimentDistribution.positive, color: '#22c55e' },
                          { name: 'Neutral', value: overviewKPIs.sentimentDistribution.neutral, color: '#3b82f6' },
                          { name: 'Negative', value: overviewKPIs.sentimentDistribution.negative, color: '#ef4444' },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                      >
                        {[
                          { name: 'Positive', color: '#22c55e' },
                          { name: 'Neutral', color: '#3b82f6' },
                          { name: 'Negative', color: '#ef4444' },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No topic data available. Re-evaluate calls with a topic taxonomy defined.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Avg Handling Time By Topic Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Avg Handling Time By Topic</CardTitle>
                <CardDescription>
                  Average call duration per topic (in seconds)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {topicAnalytics.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      layout="vertical"
                      data={topicAnalytics.slice(0, 8).map((t) => ({
                        topic: t.topicName.length > 20 ? t.topicName.slice(0, 20) + '...' : t.topicName,
                        duration: Math.round(t.avgHandlingTimeMs / 1000),
                        calls: t.callCount,
                      }))}
                      margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" unit="s" />
                      <YAxis type="category" dataKey="topic" width={90} />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          name === 'duration' ? `${value}s` : value,
                          name === 'duration' ? 'Avg Duration' : 'Calls',
                        ]}
                      />
                      <Bar dataKey="duration" fill="#8884d8" name="duration" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No topic data available. Re-evaluate calls with a topic taxonomy defined.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Trending Topics Table + Key Phrases Cloud */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trending Topics Table */}
            <Card>
              <CardHeader>
                <CardTitle>Trending Topics</CardTitle>
                <CardDescription>
                  Most frequently discussed topics across all calls
                </CardDescription>
              </CardHeader>
              <CardContent>
                {topicAnalytics.length > 0 ? (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {topicAnalytics.slice(0, 10).map((topic, idx) => (
                        <div
                          key={topic.topicId}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground font-mono text-sm w-6">
                              #{idx + 1}
                            </span>
                            <div>
                              <div className="font-medium">{topic.topicName}</div>
                              <div className="text-xs text-muted-foreground">
                                {topic.callCount} calls • {topic.avgConfidence.toFixed(0)}% confidence
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                topic.dominantSentiment === 'positive'
                                  ? 'default'
                                  : topic.dominantSentiment === 'negative'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {topic.dominantSentiment}
                            </Badge>
                            {topic.trend === 'up' && (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            )}
                            {topic.trend === 'down' && (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                            {topic.trend === 'stable' && (
                              <Minus className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No topic data available. Re-evaluate calls with a topic taxonomy defined.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Key Phrases Word Cloud */}
            <KeyPhrasesCloud
              phrases={keyPhraseAnalytics}
              maxPhrases={30}
              title="Key Phrases"
              description="Most frequently mentioned phrases across all calls"
            />
          </div>
        </TabsContent>

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
              <CriteriaAnalyticsChart analytics={criteriaAnalytics} schemaId={activeSchema?.id} />
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
                  const schemaCriteria = activeSchema ? getEvaluationCriteriaForSchema(activeSchema.id) : [];
                  const criterion = schemaCriteria.find(c => c.id === analytics.criterionId);
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

      {/* Custom Analytics Views */}
      {customViews.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Custom Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {customViews.map((view) => (
                <Card key={view.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{view.name}</CardTitle>
                    {view.description && (
                      <p className="text-sm text-muted-foreground">{view.description}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <CustomAnalyticsChart view={view} calls={calls} schema={activeSchema!} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
