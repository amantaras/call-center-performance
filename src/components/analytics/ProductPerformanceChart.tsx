import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ProductAnalytics } from '@/lib/analytics';

interface ProductPerformanceChartProps {
  data: ProductAnalytics[];
}

export function ProductPerformanceChart({ data }: ProductPerformanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Product Performance</CardTitle>
          <CardDescription>No product analytics data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    name: item.productType,
    'Avg Score': Math.round(item.avgPercentage),
    'Success Rate': Math.round(item.successRate),
    calls: item.callCount,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Performance Analysis</CardTitle>
        <CardDescription>
          Performance breakdown by product type ({data.length} products analyzed)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Avg Score" fill="hsl(var(--primary))" />
            <Bar dataKey="Success Rate" fill="hsl(var(--success))" />
          </BarChart>
        </ResponsiveContainer>

        <div className="space-y-4">
          {data.map((product) => (
            <div key={product.productType} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">{product.productType}</h3>
                <Badge variant="outline">{product.callCount} calls</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Avg Score:</span>
                  <span className="font-medium ml-2">{product.avgPercentage.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Success Rate:</span>
                  <span className="font-medium ml-2">{product.successRate.toFixed(1)}%</span>
                </div>
              </div>

              {product.performanceFactors.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Performance Factors:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {product.performanceFactors.slice(0, 5).map((factor) => (
                      <Badge key={factor.factor} variant="secondary">
                        {factor.factor} ({factor.count})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {product.recommendedApproaches.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Recommended Approaches:
                  </p>
                  <div className="space-y-1">
                    {product.recommendedApproaches.slice(0, 2).map((approach) => (
                      <p key={approach.approach} className="text-sm">
                        • {approach.approach}
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
