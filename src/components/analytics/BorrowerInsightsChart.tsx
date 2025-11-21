import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BorrowerAnalytics } from '@/lib/analytics';

interface BorrowerInsightsChartProps {
  data: BorrowerAnalytics[];
}

const QUALITY_COLORS: Record<string, string> = {
  'excellent': '#22c55e', // green
  'good': '#3b82f6',      // blue
  'fair': '#eab308',      // yellow
  'poor': '#ef4444',      // red
};

export function BorrowerInsightsChart({ data }: BorrowerInsightsChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Borrower Insights</CardTitle>
          <CardDescription>No borrower analytics data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const pieData = data.map((item) => ({
    name: item.interactionQuality.charAt(0).toUpperCase() + item.interactionQuality.slice(1),
    value: item.callCount,
    color: QUALITY_COLORS[item.interactionQuality] || '#6b7280',
  }));

  const barData = data.map((item) => ({
    quality: item.interactionQuality.charAt(0).toUpperCase() + item.interactionQuality.slice(1),
    'Avg Score': Math.round(item.avgPercentage),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Borrower Interaction Insights</CardTitle>
        <CardDescription>
          Interaction quality distribution and relationship patterns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Pie Chart - Quality Distribution */}
          <div>
            <h3 className="text-sm font-medium mb-4 text-center">Interaction Quality Distribution</h3>
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

          {/* Bar Chart - Performance by Quality */}
          <div>
            <h3 className="text-sm font-medium mb-4 text-center">Avg Score by Interaction Quality</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="quality" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Avg Score" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quality Details */}
        <div className="grid gap-4">
          {data.map((borrower) => (
            <div
              key={borrower.interactionQuality}
              className="border rounded-lg p-4 space-y-3"
              style={{
                borderLeftWidth: '4px',
                borderLeftColor: QUALITY_COLORS[borrower.interactionQuality] || '#6b7280',
              }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: QUALITY_COLORS[borrower.interactionQuality] || '#6b7280',
                    }}
                  />
                  {borrower.interactionQuality.charAt(0).toUpperCase() +
                    borrower.interactionQuality.slice(1)}{' '}
                  Interaction
                </h3>
                <Badge variant="outline">{borrower.callCount} calls</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Avg Score:</span>
                  <div className="font-medium text-lg">{borrower.avgPercentage.toFixed(1)}%</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Quality Level:</span>
                  <div className="font-medium text-lg">
                    {borrower.interactionQuality.toUpperCase()}
                  </div>
                </div>
              </div>

              {borrower.relationshipIndicators.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Relationship Indicators:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {borrower.relationshipIndicators.slice(0, 5).map((indicator) => (
                      <Badge key={indicator.indicator} variant="secondary">
                        {indicator.indicator} ({indicator.count})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {borrower.futureStrategies.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Recommended Future Strategies:
                  </p>
                  <div className="space-y-1">
                    {borrower.futureStrategies.slice(0, 2).map((strategy) => (
                      <p key={strategy.strategy} className="text-sm">
                        • {strategy.strategy}
                      </p>
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
