import { useState, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { CallRecord } from '@/types/call';
import { SchemaDefinition } from '@/types/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { calculateAgentPerformance } from '@/lib/analytics';
import { Badge } from '@/components/ui/badge';
import { TrendUp, TrendDown, Minus } from '@phosphor-icons/react';
import { AgentDetailDialog } from '@/components/AgentDetailDialog';

interface AgentsViewProps {
  activeSchema: SchemaDefinition | null;
  schemaLoading: boolean;
}

export function AgentsView({ activeSchema, schemaLoading }: AgentsViewProps) {
  const [allCalls] = useLocalStorage<CallRecord[]>('calls', []);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // Filter calls by active schema
  const calls = useMemo(() => {
    if (!activeSchema) return allCalls || [];
    return (allCalls || []).filter(call => call.schemaId === activeSchema.id);
  }, [allCalls, activeSchema]);

  const agentPerformances = calculateAgentPerformance(calls);

  if (!agentPerformances.length) {
    return (
      <Card className="p-12 text-center">
        <div className="mx-auto max-w-md space-y-4">
          <div>
            <h3 className="text-lg font-semibold">No agent data yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Evaluate calls to see agent performance metrics
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agentPerformances.map((agent) => (
          <Card
            key={agent.agentName}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedAgent(agent.agentName)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{agent.agentName}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {agent.totalCalls} {agent.totalCalls === 1 ? 'call' : 'calls'}
                  </p>
                </div>
                <Badge
                  variant={
                    agent.trend === 'up'
                      ? 'default'
                      : agent.trend === 'down'
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {agent.trend === 'up' && <TrendUp className="mr-1" size={14} />}
                  {agent.trend === 'down' && <TrendDown className="mr-1" size={14} />}
                  {agent.trend === 'stable' && <Minus className="mr-1" size={14} />}
                  {agent.trend}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-3xl font-bold">
                    {agent.averagePercentage.toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                </div>

                <div className="pt-3 border-t border-border">
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    Top Strengths
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {agent.topStrengths.slice(0, 2).map((criterionId) => (
                      <Badge key={criterionId} variant="outline" className="text-xs">
                        #{criterionId}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    Areas to Improve
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {agent.topWeaknesses.slice(0, 2).map((criterionId) => (
                      <Badge
                        key={criterionId}
                        variant="outline"
                        className="text-xs bg-destructive/10"
                      >
                        #{criterionId}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedAgent && (
        <AgentDetailDialog
          agentName={selectedAgent}
          calls={calls || []}
          open={!!selectedAgent}
          onOpenChange={(open) => !open && setSelectedAgent(null)}
        />
      )}
    </div>
  );
}
