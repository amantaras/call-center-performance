import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { NationalityAnalytics } from '@/lib/analytics';

interface NationalityAnalysisChartProps {
  data: NationalityAnalytics[];
}

export function NationalityAnalysisChart({ data }: NationalityAnalysisChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nationality Analysis</CardTitle>
          <CardDescription>No nationality analytics data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    name: item.nationality,
    'Avg Score': Math.round(item.avgPercentage),
    calls: item.callCount,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cultural & Nationality Analysis</CardTitle>
        <CardDescription>
          Performance patterns across customer nationalities ({data.length} nationalities analyzed)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Avg Score" fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>

        <div className="space-y-4">
          {data.map((nationality) => (
            <div key={nationality.nationality} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">{nationality.nationality}</h3>
                <Badge variant="outline">{nationality.callCount} calls</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Avg Score:</span>
                  <span className="font-medium ml-2">{nationality.avgPercentage.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Language Effectiveness:</span>
                  <span className="font-medium ml-2">{nationality.avgLanguageEffectiveness}</span>
                </div>
              </div>

              {nationality.culturalFactors.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Cultural Factors:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {nationality.culturalFactors.slice(0, 5).map((factor) => (
                      <Badge key={factor.factor} variant="secondary">
                        {factor.factor} ({factor.count})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {nationality.recommendedAdjustments.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Recommended Adjustments:
                  </p>
                  <div className="space-y-1">
                    {nationality.recommendedAdjustments.slice(0, 2).map((adjustment) => (
                      <p key={adjustment.adjustment} className="text-sm">
                        • {adjustment.adjustment}
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
