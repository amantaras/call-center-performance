import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { RiskAnalytics } from '@/lib/analytics';
import { RiskTier } from '@/types/call';

interface RiskSegmentationChartProps {
  data: RiskAnalytics[];
}

const RISK_COLORS: Record<RiskTier, string> = {
  Low: '#22c55e',      // green
  Medium: '#eab308',   // yellow
  High: '#f97316',     // orange
  Critical: '#ef4444', // red
};

export function RiskSegmentationChart({ data }: RiskSegmentationChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Risk Segmentation</CardTitle>
          <CardDescription>No risk analytics data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const pieData = data.map((item) => ({
    name: item.riskTier,
    value: item.callCount,
    color: RISK_COLORS[item.riskTier],
  }));

  const barData = data.map((item) => ({
    tier: item.riskTier,
    'Payment Probability': Math.round(item.avgPaymentProbability),
    'Avg Score': Math.round(item.avgPercentage),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Segmentation Analysis</CardTitle>
        <CardDescription>
          Risk tier distribution and performance metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Pie Chart - Call Distribution */}
          <div>
            <h3 className="text-sm font-medium mb-4 text-center">Call Distribution by Risk Tier</h3>
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

          {/* Bar Chart - Payment Probability */}
          <div>
            <h3 className="text-sm font-medium mb-4 text-center">Performance by Risk Tier</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tier" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Payment Probability" fill="#3b82f6" />
                <Bar dataKey="Avg Score" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Tier Details */}
        <div className="grid gap-4">
          {data.map((risk) => (
            <div
              key={risk.riskTier}
              className="border rounded-lg p-4 space-y-3"
              style={{ borderLeftWidth: '4px', borderLeftColor: RISK_COLORS[risk.riskTier] }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: RISK_COLORS[risk.riskTier] }}
                  />
                  {risk.riskTier} Risk
                </h3>
                <Badge variant="outline">{risk.callCount} calls</Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Avg Score:</span>
                  <div className="font-medium text-lg">{risk.avgPercentage.toFixed(1)}%</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Payment Prob:</span>
                  <div className="font-medium text-lg">{risk.avgPaymentProbability.toFixed(1)}%</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg DPD:</span>
                  <div className="font-medium text-lg">{Math.round(risk.avgDaysPastDue)} days</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg Due:</span>
                  <div className="font-medium text-lg">${risk.avgDueAmount.toFixed(2)}</div>
                </div>
              </div>

              {risk.escalationCount > 0 && (
                <Badge variant="destructive" className="w-full justify-center">
                  ⚠ {risk.escalationCount} escalations recommended
                </Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
