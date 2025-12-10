import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CallRecord } from '@/types/call';
import { calculateAgentPerformance, getPerformanceTrend, getAgentNameFromCall, formatDuration } from '@/lib/analytics';
import { getEvaluationCriteriaForSchema } from '@/services/azure-openai';
import { PerformanceTrendChart } from '@/components/analytics/PerformanceTrendChart';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  Trophy, TrendUp, TrendDown, Minus, Clock, Phone, Target, 
  CheckCircle, XCircle, Warning, ChartBar, Gauge, SmileySticker,
  ArrowUp, ArrowDown, Star, CalendarBlank
} from '@phosphor-icons/react';

interface AgentDetailDialogProps {
  agentName: string;
  calls: CallRecord[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schemaId?: string;
}

// Sentiment bar component
function SentimentBar({ distribution, showLabels = false }: { distribution?: Record<string, number>; showLabels?: boolean }) {
  if (!distribution) return null;
  
  return (
    <div className="space-y-1">
      <div className="flex h-3 w-full rounded-full overflow-hidden bg-muted">
        <div 
          className="bg-green-500 h-full transition-all" 
          style={{ width: `${distribution.positive || 0}%` }}
        />
        <div 
          className="bg-gray-400 h-full transition-all" 
          style={{ width: `${distribution.neutral || 0}%` }}
        />
        <div 
          className="bg-red-500 h-full transition-all" 
          style={{ width: `${distribution.negative || 0}%` }}
        />
      </div>
      {showLabels && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="text-green-600">Positive {distribution.positive?.toFixed(0)}%</span>
          <span>Neutral {distribution.neutral?.toFixed(0)}%</span>
          <span className="text-red-600">Negative {distribution.negative?.toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
}

export function AgentDetailDialog({
  agentName,
  calls,
  open,
  onOpenChange,
  schemaId,
}: AgentDetailDialogProps) {
  const agentCalls = calls.filter((c) => getAgentNameFromCall(c) === agentName);
  
  // Load schema-specific evaluation criteria
  const schemaCriteria = schemaId ? getEvaluationCriteriaForSchema(schemaId) : [];
  const performances = calculateAgentPerformance(agentCalls);
  const performance = performances[0];

  if (!performance) {
    return null;
  }

  // Sort criteria by score for display
  const sortedCriteria = Object.entries(performance.criteriaScores)
    .map(([id, score]) => {
      // Match by index since criteria IDs may be string like "rule_xxx_0"
      const criterionIndex = parseInt(id);
      const criterion = schemaCriteria[criterionIndex] || schemaCriteria.find(c => c.id === criterionIndex);
      return { id: criterionIndex, score, criterion };
    })
    .filter(item => item.criterion)
    .sort((a, b) => b.score - a.score);

  // Calculate additional stats
  const allPerformances = calculateAgentPerformance(calls);
  const teamAvg = allPerformances.length > 0
    ? allPerformances.reduce((sum, a) => sum + a.averagePercentage, 0) / allPerformances.length
    : 0;
  const vsTeamAvg = performance.averagePercentage - teamAvg;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {performance.rankAmongAgents === 1 && <Trophy className="h-6 w-6 text-yellow-500" weight="fill" />}
            <div>
              <DialogTitle className="text-2xl">{agentName}</DialogTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Phone size={14} />
                {performance.totalCalls} calls evaluated
                {performance.rankAmongAgents && (
                  <Badge variant="outline" className="ml-2">
                    Rank #{performance.rankAmongAgents} of {allPerformances.length}
                  </Badge>
                )}
              </p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="criteria">Criteria</TabsTrigger>
              <TabsTrigger value="insights">AI Insights</TabsTrigger>
              <TabsTrigger value="history">Call History</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              {/* Key Metrics Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Average Score</div>
                    <div className="text-3xl font-bold">{performance.averagePercentage.toFixed(1)}%</div>
                    <div className={cn(
                      "text-xs flex items-center gap-1",
                      vsTeamAvg > 0 ? "text-green-600" : vsTeamAvg < 0 ? "text-red-600" : "text-muted-foreground"
                    )}>
                      {vsTeamAvg > 0 ? <ArrowUp size={12} /> : vsTeamAvg < 0 ? <ArrowDown size={12} /> : null}
                      {vsTeamAvg > 0 ? '+' : ''}{vsTeamAvg.toFixed(1)}% vs team
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Pass Rate</div>
                    <div className="text-3xl font-bold">{performance.passRate?.toFixed(0) || 0}%</div>
                    <div className="text-xs text-muted-foreground">criteria passed</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Trend</div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          performance.trend === 'up' ? 'default' :
                          performance.trend === 'down' ? 'destructive' : 'secondary'
                        }
                        className="text-lg px-3 py-1"
                      >
                        {performance.trend === 'up' && <TrendUp size={16} className="mr-1" />}
                        {performance.trend === 'down' && <TrendDown size={16} className="mr-1" />}
                        {performance.trend === 'stable' && <Minus size={16} className="mr-1" />}
                        {performance.trend}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Consistency</div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-lg px-3 py-1",
                        performance.consistencyRating === 'consistent' ? 'border-green-500 text-green-600' :
                        performance.consistencyRating === 'variable' ? 'border-yellow-500 text-yellow-600' :
                        'border-red-500 text-red-600'
                      )}
                    >
                      <Gauge size={16} className="mr-1" />
                      {performance.consistencyRating || 'N/A'}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              {/* Second Row - Calls breakdown */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <Star className="h-8 w-8 mx-auto text-yellow-500 mb-2" weight="fill" />
                    <div className="text-2xl font-bold text-green-600">{performance.perfectScoreCalls || 0}</div>
                    <div className="text-sm text-muted-foreground">Perfect Scores (≥95%)</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4 text-center">
                    <Clock className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                    <div className="text-2xl font-bold">{formatDuration(performance.avgCallDuration || 0)}</div>
                    <div className="text-sm text-muted-foreground">Avg Call Duration</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4 text-center">
                    <Warning className="h-8 w-8 mx-auto text-red-500 mb-2" />
                    <div className="text-2xl font-bold text-red-600">{performance.failedCalls || 0}</div>
                    <div className="text-sm text-muted-foreground">Failed Calls (&lt;60%)</div>
                  </CardContent>
                </Card>
              </div>

              {/* Sentiment Distribution */}
              {performance.sentimentDistribution && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <SmileySticker size={18} />
                      Customer Sentiment Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SentimentBar distribution={performance.sentimentDistribution} showLabels />
                  </CardContent>
                </Card>
              )}

              {/* Performance Trend Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ChartBar size={18} />
                    Performance Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PerformanceTrendChart calls={agentCalls} agentName={agentName} />
                </CardContent>
              </Card>

              {/* Top Topics */}
              {performance.topTopics && performance.topTopics.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target size={18} />
                      Top Call Topics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {performance.topTopics.map((topic, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{topic.topic}</Badge>
                            <span className="text-sm text-muted-foreground">{topic.count} calls</span>
                          </div>
                          <span className={cn(
                            "text-sm font-medium",
                            topic.avgScore >= 80 ? "text-green-600" :
                            topic.avgScore >= 60 ? "text-yellow-600" : "text-red-600"
                          )}>
                            {topic.avgScore.toFixed(0)}% avg
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Criteria Tab */}
            <TabsContent value="criteria" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Criteria Performance</CardTitle>
                  <CardDescription>Performance breakdown by evaluation criteria</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sortedCriteria.map(({ id, score, criterion }) => {
                    if (!criterion) return null;

                    const maxScore = criterion.scoringStandard?.passed || 10;
                    const percentage = (score / maxScore) * 100;
                    const isStrength = performance.topStrengths.includes(id);
                    const isWeakness = performance.topWeaknesses.includes(id);

                    return (
                      <div key={id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isStrength ? (
                              <CheckCircle size={18} className="text-green-600" weight="fill" />
                            ) : isWeakness ? (
                              <XCircle size={18} className="text-red-600" weight="fill" />
                            ) : (
                              <Minus size={18} className="text-muted-foreground" />
                            )}
                            <span className="text-sm font-medium">{criterion.name}</span>
                            {isStrength && (
                              <Badge variant="outline" className="text-xs bg-green-500/10 border-green-500">
                                Strength
                              </Badge>
                            )}
                            {isWeakness && (
                              <Badge variant="outline" className="text-xs bg-red-500/10 border-red-500">
                                Needs Work
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm font-semibold">
                            {score.toFixed(1)} / {maxScore}
                          </span>
                        </div>
                        <Progress 
                          value={percentage} 
                          className={cn(
                            "h-2",
                            isStrength && "[&>div]:bg-green-500",
                            isWeakness && "[&>div]:bg-red-500"
                          )} 
                        />
                        <p className="text-xs text-muted-foreground">{criterion.definition}</p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI Insights Tab */}
            <TabsContent value="insights" className="space-y-4">
              {performance.insightSummary && Object.keys(performance.insightSummary).length > 0 ? (
                Object.entries(performance.insightSummary).map(([categoryId, summary]) => (
                  <Card key={categoryId}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{summary.categoryName}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {summary.avgNumericValue !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Average Score</span>
                            <span className="font-medium">{summary.avgNumericValue.toFixed(1)}</span>
                          </div>
                        )}
                        {summary.mostCommonValue && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Most Common</span>
                            <Badge variant="secondary">{summary.mostCommonValue}</Badge>
                          </div>
                        )}
                        {summary.distribution && Object.keys(summary.distribution).length > 0 && (
                          <div className="pt-2">
                            <div className="text-sm text-muted-foreground mb-2">Distribution</div>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(summary.distribution)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 5)
                                .map(([value, count]) => (
                                  <Badge key={value} variant="outline">
                                    {value}: {count}
                                  </Badge>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="p-8 text-center">
                  <div className="text-muted-foreground">
                    No AI insights available yet. Evaluate more calls to see aggregated insights.
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* Call History Tab */}
            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarBlank size={18} />
                    Recent Calls
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {performance.recentCalls && performance.recentCalls.length > 0 ? (
                    <div className="space-y-2">
                      {performance.recentCalls.map((call, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                          <div>
                            <div className="text-sm font-medium truncate max-w-[200px]">{call.callId}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(call.date).toLocaleDateString()}
                            </div>
                          </div>
                          <Badge 
                            variant={call.score >= 80 ? 'default' : call.score >= 60 ? 'secondary' : 'destructive'}
                          >
                            {call.score.toFixed(0)}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      No recent calls available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Weekly Performance */}
              {performance.performanceByPeriod && performance.performanceByPeriod.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Weekly Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {performance.performanceByPeriod.map((period, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Week of {new Date(period.period).toLocaleDateString()}
                          </span>
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-muted-foreground">{period.callCount} calls</span>
                            <span className={cn(
                              "font-medium",
                              period.avgScore >= 80 ? "text-green-600" :
                              period.avgScore >= 60 ? "text-yellow-600" : "text-red-600"
                            )}>
                              {period.avgScore.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
