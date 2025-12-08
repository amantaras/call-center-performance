import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { CallRecord, EvaluationCriterion } from '@/types/call';
import { calculateAgentPerformance, getPerformanceTrend, getAgentNameFromCall } from '@/lib/analytics';
import { getCriterionById } from '@/lib/evaluation-criteria';
import { PerformanceTrendChart } from '@/components/analytics/PerformanceTrendChart';
import { Progress } from '@/components/ui/progress';

interface AgentDetailDialogProps {
  agentName: string;
  calls: CallRecord[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentDetailDialog({
  agentName,
  calls,
  open,
  onOpenChange,
}: AgentDetailDialogProps) {
  const agentCalls = calls.filter((c) => getAgentNameFromCall(c) === agentName);
  const performances = calculateAgentPerformance(agentCalls);
  const performance = performances[0];

  if (!performance) {
    return null;
  }

  const sortedCriteria = Object.entries(performance.criteriaScores)
    .map(([id, score]) => ({ id: parseInt(id), score }))
    .sort((a, b) => b.score - a.score);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{agentName}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {performance.totalCalls} {performance.totalCalls === 1 ? 'call' : 'calls'} evaluated
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {performance.averagePercentage.toFixed(1)}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Calls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{performance.totalCalls}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge
                  variant={
                    performance.trend === 'up'
                      ? 'default'
                      : performance.trend === 'down'
                        ? 'destructive'
                        : 'secondary'
                  }
                  className="text-base"
                >
                  {performance.trend}
                </Badge>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceTrendChart calls={agentCalls} agentName={agentName} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Criteria Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sortedCriteria.map(({ id, score }) => {
                const criterion = getCriterionById(id);
                if (!criterion) return null;

                const percentage = (score / criterion.scoringStandard.passed) * 100;
                const isStrength = performance.topStrengths.includes(id);
                const isWeakness = performance.topWeaknesses.includes(id);

                return (
                  <div key={id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{criterion.name}</span>
                        {isStrength && (
                          <Badge variant="outline" className="text-xs bg-success/10">
                            Strength
                          </Badge>
                        )}
                        {isWeakness && (
                          <Badge variant="outline" className="text-xs bg-destructive/10">
                            Needs Work
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm font-semibold">
                        {score.toFixed(1)} / {criterion.scoringStandard.passed}
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
