import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { OutcomeAnalytics } from '@/lib/analytics';
import { CategorizedOutcome } from '@/types/call';

interface OutcomeCorrelationChartProps {
  data: OutcomeAnalytics[];
}

const OUTCOME_COLORS: Record<CategorizedOutcome, string> = {
  'success': '#22c55e',          // green
  'promise-to-pay': '#3b82f6',   // blue
  'callback-needed': '#eab308',  // yellow
  'no-contact': '#94a3b8',       // gray
  'refused': '#ef4444',          // red
  'other': '#6b7280',            // gray
};

const OUTCOME_LABELS: Record<CategorizedOutcome, string> = {
  'success': 'Success',
  'promise-to-pay': 'Promise to Pay',
  'callback-needed': 'Callback Needed',
  'no-contact': 'No Contact',
  'refused': 'Refused',
  'other': 'Other',
};

export function OutcomeCorrelationChart({ data }: OutcomeCorrelationChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Outcome Analysis</CardTitle>
          <CardDescription>No outcome analytics data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const pieData = data.map((item) => ({
    name: OUTCOME_LABELS[item.categorizedOutcome],
    value: item.callCount,
    color: OUTCOME_COLORS[item.categorizedOutcome],
  }));

  const barData = data.map((item) => ({
    outcome: OUTCOME_LABELS[item.categorizedOutcome],
    'Success Probability': Math.round(item.avgSuccessProbability),
    'Avg Score': Math.round(item.avgPercentage),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Outcome Correlation Analysis</CardTitle>
        <CardDescription>
          Call outcomes and success probability patterns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Pie Chart - Outcome Distribution */}
          <div>
            <h3 className="text-sm font-medium mb-4 text-center">Outcome Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart - Success Probability */}
          <div>
            <h3 className="text-sm font-medium mb-4 text-center">Success Probability by Outcome</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="outcome" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Success Probability" fill="#3b82f6" />
                <Bar dataKey="Avg Score" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Outcome Details */}
        <div className="grid gap-4">
          {data.map((outcome) => (
            <div
              key={outcome.categorizedOutcome}
              className="border rounded-lg p-4 space-y-3"
              style={{ borderLeftWidth: '4px', borderLeftColor: OUTCOME_COLORS[outcome.categorizedOutcome] }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: OUTCOME_COLORS[outcome.categorizedOutcome] }}
                  />
                  {OUTCOME_LABELS[outcome.categorizedOutcome]}
                </h3>
                <Badge variant="outline">{outcome.callCount} calls</Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Avg Score:</span>
                  <div className="font-medium text-lg">{outcome.avgPercentage.toFixed(1)}%</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Success Probability:</span>
                  <div className="font-medium text-lg">{outcome.avgSuccessProbability.toFixed(1)}%</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Conversion Rate:</span>
                  <div className="font-medium text-lg">{outcome.conversionRate.toFixed(1)}%</div>
                </div>
              </div>

              {outcome.keyFactors.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Key Contributing Factors:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {outcome.keyFactors.slice(0, 5).map((factor) => (
                      <Badge key={factor.factor} variant="secondary">
                        {factor.factor} ({factor.count})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
