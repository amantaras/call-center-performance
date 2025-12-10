import { useState, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { CallRecord, AgentPerformance } from '@/types/call';
import { SchemaDefinition } from '@/types/schema';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { calculateAgentPerformance, formatDuration } from '@/lib/analytics';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendUp, TrendDown, Minus, Trophy, Medal, 
  Clock, Phone, CheckCircle, Warning, ChartBar, Users, Target,
  SmileySticker, Gauge, ArrowUp, ArrowDown, Equals
} from '@phosphor-icons/react';
import { AgentDetailDialog } from '@/components/AgentDetailDialog';
import { cn } from '@/lib/utils';

interface AgentsViewProps {
  activeSchema: SchemaDefinition | null;
  schemaLoading: boolean;
}

// Helper to get rank badge
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" weight="fill" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" weight="fill" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" weight="fill" />;
  return <span className="text-sm font-medium text-muted-foreground">#{rank}</span>;
}

// Sentiment bar component
function SentimentBar({ distribution }: { distribution?: Record<string, number> }) {
  if (!distribution) return <span className="text-xs text-muted-foreground">No data</span>;
  
  return (
    <div className="flex h-2 w-full rounded-full overflow-hidden bg-muted">
      <div 
        className="bg-green-500 h-full" 
        style={{ width: `${distribution.positive || 0}%` }}
        title={`Positive: ${distribution.positive?.toFixed(1)}%`}
      />
      <div 
        className="bg-gray-400 h-full" 
        style={{ width: `${distribution.neutral || 0}%` }}
        title={`Neutral: ${distribution.neutral?.toFixed(1)}%`}
      />
      <div 
        className="bg-red-500 h-full" 
        style={{ width: `${distribution.negative || 0}%` }}
        title={`Negative: ${distribution.negative?.toFixed(1)}%`}
      />
    </div>
  );
}

// Mini sparkline for trend
function MiniTrend({ data }: { data?: Array<{ avgScore: number }> }) {
  if (!data || data.length < 2) return null;
  
  const max = Math.max(...data.map(d => d.avgScore));
  const min = Math.min(...data.map(d => d.avgScore));
  const range = max - min || 1;
  
  return (
    <div className="flex items-end gap-0.5 h-6">
      {data.slice(-6).map((d, i) => (
        <div
          key={i}
          className="w-1.5 bg-primary/60 rounded-t"
          style={{ height: `${((d.avgScore - min) / range) * 100}%`, minHeight: '4px' }}
        />
      ))}
    </div>
  );
}

// Agent card component
function AgentCard({ 
  agent, 
  onClick,
  teamAvg 
}: { 
  agent: AgentPerformance; 
  onClick: () => void;
  teamAvg: number;
}) {
  const vsTeamAvg = agent.averagePercentage - teamAvg;
  
  return (
    <Card
      className={cn(
        "cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]",
        agent.rankAmongAgents === 1 && "ring-2 ring-yellow-500/50"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <RankBadge rank={agent.rankAmongAgents || 0} />
            <div>
              <CardTitle className="text-lg">{agent.agentName}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <Phone size={12} />
                {agent.totalCalls} calls
                {agent.avgCallDuration ? (
                  <span className="flex items-center gap-1 ml-2">
                    <Clock size={12} />
                    avg {formatDuration(agent.avgCallDuration)}
                  </span>
                ) : null}
              </CardDescription>
            </div>
          </div>
          <Badge
            variant={
              agent.trend === 'up' ? 'default' :
              agent.trend === 'down' ? 'destructive' : 'secondary'
            }
            className="flex items-center gap-1"
          >
            {agent.trend === 'up' && <TrendUp size={14} />}
            {agent.trend === 'down' && <TrendDown size={14} />}
            {agent.trend === 'stable' && <Minus size={14} />}
            {agent.trend}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Score */}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-4xl font-bold">
              {agent.averagePercentage.toFixed(1)}%
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>vs team avg:</span>
              <span className={cn(
                "flex items-center font-medium",
                vsTeamAvg > 0 ? "text-green-600" : vsTeamAvg < 0 ? "text-red-600" : "text-muted-foreground"
              )}>
                {vsTeamAvg > 0 ? <ArrowUp size={12} /> : vsTeamAvg < 0 ? <ArrowDown size={12} /> : <Equals size={12} />}
                {Math.abs(vsTeamAvg).toFixed(1)}%
              </span>
            </div>
          </div>
          <MiniTrend data={agent.performanceByPeriod} />
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-muted/50 rounded-lg">
            <div className="text-lg font-semibold text-green-600">{agent.perfectScoreCalls || 0}</div>
            <div className="text-xs text-muted-foreground">Perfect</div>
          </div>
          <div className="p-2 bg-muted/50 rounded-lg">
            <div className="text-lg font-semibold">{agent.passRate?.toFixed(0) || 0}%</div>
            <div className="text-xs text-muted-foreground">Pass Rate</div>
          </div>
          <div className="p-2 bg-muted/50 rounded-lg">
            <div className="text-lg font-semibold text-red-600">{agent.failedCalls || 0}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
        </div>

        {/* Sentiment Distribution */}
        {agent.sentimentDistribution && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <SmileySticker size={12} /> Sentiment
              </span>
              <span className={cn(
                "font-medium",
                agent.dominantSentiment === 'positive' ? 'text-green-600' :
                agent.dominantSentiment === 'negative' ? 'text-red-600' : 'text-gray-500'
              )}>
                {agent.dominantSentiment}
              </span>
            </div>
            <SentimentBar distribution={agent.sentimentDistribution} />
          </div>
        )}

        {/* Consistency Badge */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Gauge size={12} /> Consistency
          </span>
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              agent.consistencyRating === 'consistent' ? 'border-green-500 text-green-600' :
              agent.consistencyRating === 'variable' ? 'border-yellow-500 text-yellow-600' :
              'border-red-500 text-red-600'
            )}
          >
            {agent.consistencyRating || 'N/A'}
          </Badge>
        </div>

        {/* Top Topics */}
        {agent.topTopics && agent.topTopics.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Target size={12} /> Top Topics
            </div>
            <div className="flex flex-wrap gap-1">
              {agent.topTopics.slice(0, 3).map((t, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {t.topic} ({t.count})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Strengths & Weaknesses Preview */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <div>
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <CheckCircle size={12} className="text-green-600" /> Strengths
            </div>
            <div className="text-xs text-green-600 font-medium">
              {agent.topStrengths.length} criteria
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Warning size={12} className="text-red-600" /> Improve
            </div>
            <div className="text-xs text-red-600 font-medium">
              {agent.topWeaknesses.length} criteria
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Team Overview Stats
function TeamOverview({ agents }: { agents: AgentPerformance[] }) {
  if (agents.length === 0) return null;
  
  const totalCalls = agents.reduce((sum, a) => sum + a.totalCalls, 0);
  const avgScore = agents.reduce((sum, a) => sum + a.averagePercentage, 0) / agents.length;
  const bestAgent = agents[0];
  const improvingAgents = agents.filter(a => a.trend === 'up').length;
  const avgPassRate = agents.reduce((sum, a) => sum + (a.passRate || 0), 0) / agents.length;
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Users size={16} />
            Agents
          </div>
          <div className="text-2xl font-bold">{agents.length}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Phone size={16} />
            Total Calls
          </div>
          <div className="text-2xl font-bold">{totalCalls}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <ChartBar size={16} />
            Team Avg
          </div>
          <div className="text-2xl font-bold">{avgScore.toFixed(1)}%</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Target size={16} />
            Pass Rate
          </div>
          <div className="text-2xl font-bold">{avgPassRate.toFixed(0)}%</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <TrendUp size={16} className="text-green-600" />
            Improving
          </div>
          <div className="text-2xl font-bold text-green-600">{improvingAgents}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Trophy size={16} className="text-yellow-500" />
            Top Agent
          </div>
          <div className="text-lg font-bold truncate" title={bestAgent?.agentName}>
            {bestAgent?.agentName || 'N/A'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Leaderboard View
function LeaderboardView({ agents, onSelectAgent }: { agents: AgentPerformance[]; onSelectAgent: (name: string) => void }) {
  const teamAvg = agents.length > 0 
    ? agents.reduce((sum, a) => sum + a.averagePercentage, 0) / agents.length 
    : 0;
    
  return (
    <div className="space-y-2">
      {agents.map((agent, index) => {
        const vsTeamAvg = agent.averagePercentage - teamAvg;
        return (
          <Card 
            key={agent.agentName}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => onSelectAgent(agent.agentName)}
          >
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-12">
                  <RankBadge rank={index + 1} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{agent.agentName}</div>
                  <div className="text-xs text-muted-foreground">
                    {agent.totalCalls} calls • {agent.passRate?.toFixed(0)}% pass rate
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {agent.sentimentDistribution && (
                    <div className="w-20 hidden md:block">
                      <SentimentBar distribution={agent.sentimentDistribution} />
                    </div>
                  )}
                  
                  <Badge
                    variant={agent.trend === 'up' ? 'default' : agent.trend === 'down' ? 'destructive' : 'secondary'}
                    className="w-16 justify-center"
                  >
                    {agent.trend === 'up' && <TrendUp size={12} className="mr-1" />}
                    {agent.trend === 'down' && <TrendDown size={12} className="mr-1" />}
                    {agent.trend}
                  </Badge>
                  
                  <div className="text-right w-20">
                    <div className="text-xl font-bold">{agent.averagePercentage.toFixed(1)}%</div>
                    <div className={cn(
                      "text-xs",
                      vsTeamAvg > 0 ? "text-green-600" : vsTeamAvg < 0 ? "text-red-600" : "text-muted-foreground"
                    )}>
                      {vsTeamAvg > 0 ? '+' : ''}{vsTeamAvg.toFixed(1)}% avg
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function AgentsView({ activeSchema, schemaLoading }: AgentsViewProps) {
  const [allCalls] = useLocalStorage<CallRecord[]>('calls', []);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'leaderboard'>('cards');

  // Filter calls by active schema
  const calls = useMemo(() => {
    if (!activeSchema) return allCalls || [];
    return (allCalls || []).filter(call => call.schemaId === activeSchema.id);
  }, [allCalls, activeSchema]);

  const agentPerformances = useMemo(() => calculateAgentPerformance(calls), [calls]);
  
  const teamAvg = useMemo(() => {
    if (agentPerformances.length === 0) return 0;
    return agentPerformances.reduce((sum, a) => sum + a.averagePercentage, 0) / agentPerformances.length;
  }, [agentPerformances]);

  if (!agentPerformances.length) {
    return (
      <Card className="p-12 text-center">
        <div className="mx-auto max-w-md space-y-4">
          <Users className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold">No agent data yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Evaluate calls to see comprehensive agent performance metrics, rankings, and insights
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Overview */}
      <TeamOverview agents={agentPerformances} />
      
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users size={20} />
          Agent Performance
        </h2>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'cards' | 'leaderboard')}>
          <TabsList>
            <TabsTrigger value="cards" className="flex items-center gap-1">
              <ChartBar size={14} />
              Cards
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex items-center gap-1">
              <Trophy size={14} />
              Leaderboard
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Agent Views */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agentPerformances.map((agent) => (
            <AgentCard
              key={agent.agentName}
              agent={agent}
              onClick={() => setSelectedAgent(agent.agentName)}
              teamAvg={teamAvg}
            />
          ))}
        </div>
      ) : (
        <LeaderboardView 
          agents={agentPerformances} 
          onSelectAgent={setSelectedAgent}
        />
      )}

      {/* Agent Detail Dialog */}
      {selectedAgent && (
        <AgentDetailDialog
          agentName={selectedAgent}
          calls={calls || []}
          open={!!selectedAgent}
          onOpenChange={(open) => !open && setSelectedAgent(null)}
          schemaId={activeSchema?.id}
        />
      )}
    </div>
  );
}
