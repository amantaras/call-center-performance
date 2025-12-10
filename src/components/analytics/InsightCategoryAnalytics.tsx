import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CallRecord } from '@/types/call';
import { InsightCategoryConfig, InsightOutputField } from '@/types/schema';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface InsightCategoryAnalyticsProps {
  category: InsightCategoryConfig;
  calls: CallRecord[];
}

interface AggregatedFieldData {
  field: InsightOutputField;
  // For enum/string fields
  distribution?: { value: string; count: number; percentage: number }[];
  // For number fields
  average?: number;
  min?: number;
  max?: number;
  // For boolean fields
  trueCount?: number;
  falseCount?: number;
  truePercentage?: number;
  // For tags fields
  tagCounts?: { tag: string; count: number }[];
  // Common
  totalValues: number;
}

function aggregateFieldData(
  calls: CallRecord[],
  categoryId: string,
  field: InsightOutputField
): AggregatedFieldData {
  const values: any[] = [];
  
  calls.forEach(call => {
    const categoryInsights = call.evaluation?.schemaInsights?.[categoryId];
    if (categoryInsights && categoryInsights[field.id] !== undefined) {
      values.push(categoryInsights[field.id]);
    }
  });

  const result: AggregatedFieldData = {
    field,
    totalValues: values.length,
  };

  if (values.length === 0) return result;

  switch (field.type) {
    case 'enum':
    case 'string': {
      const countMap = new Map<string, number>();
      values.forEach(v => {
        const key = String(v);
        countMap.set(key, (countMap.get(key) || 0) + 1);
      });
      result.distribution = Array.from(countMap.entries())
        .map(([value, count]) => ({
          value,
          count,
          percentage: (count / values.length) * 100,
        }))
        .sort((a, b) => b.count - a.count);
      break;
    }

    case 'number': {
      const numValues = values.filter(v => typeof v === 'number') as number[];
      if (numValues.length > 0) {
        result.average = numValues.reduce((a, b) => a + b, 0) / numValues.length;
        result.min = Math.min(...numValues);
        result.max = Math.max(...numValues);
      }
      break;
    }

    case 'boolean': {
      const trueCount = values.filter(v => v === true).length;
      result.trueCount = trueCount;
      result.falseCount = values.length - trueCount;
      result.truePercentage = (trueCount / values.length) * 100;
      break;
    }

    case 'tags': {
      const tagMap = new Map<string, number>();
      values.forEach(v => {
        const tags = Array.isArray(v) ? v : [v];
        tags.forEach(tag => {
          if (tag) {
            tagMap.set(String(tag), (tagMap.get(String(tag)) || 0) + 1);
          }
        });
      });
      result.tagCounts = Array.from(tagMap.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);
      break;
    }
  }

  return result;
}

function EnumFieldChart({ data }: { data: AggregatedFieldData }) {
  if (!data.distribution || data.distribution.length === 0) {
    return <div className="text-sm text-muted-foreground">No data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={data.distribution.slice(0, 8)}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" domain={[0, 'auto']} />
        <YAxis 
          type="category" 
          dataKey="value" 
          width={75}
          tick={{ fontSize: 12 }}
        />
        <Tooltip 
          formatter={(value: number, name: string) => [
            name === 'count' ? `${value} calls` : `${value.toFixed(1)}%`,
            name === 'count' ? 'Count' : 'Percentage'
          ]}
        />
        <Bar dataKey="count" fill="#3b82f6" name="count" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function BooleanFieldChart({ data }: { data: AggregatedFieldData }) {
  if (data.trueCount === undefined) {
    return <div className="text-sm text-muted-foreground">No data available</div>;
  }

  const chartData = [
    { name: 'Yes', value: data.trueCount, color: '#22c55e' },
    { name: 'No', value: data.falseCount || 0, color: '#ef4444' },
  ];

  return (
    <div className="flex items-center gap-6">
      <ResponsiveContainer width={120} height={120}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={30}
            outerRadius={50}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm">Yes: {data.trueCount} ({data.truePercentage?.toFixed(1)}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-sm">No: {data.falseCount} ({(100 - (data.truePercentage || 0)).toFixed(1)}%)</span>
        </div>
      </div>
    </div>
  );
}

function NumberFieldDisplay({ data }: { data: AggregatedFieldData }) {
  if (data.average === undefined) {
    return <div className="text-sm text-muted-foreground">No data available</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-blue-600">{data.min?.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">Min</div>
        </div>
        <div>
          <div className="text-3xl font-bold">{data.average.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">Average</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-blue-600">{data.max?.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">Max</div>
        </div>
      </div>
      {data.min !== undefined && data.max !== undefined && data.max > data.min && (
        <div className="space-y-1">
          <Progress 
            value={((data.average - data.min) / (data.max - data.min)) * 100} 
            className="h-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{data.min.toFixed(1)}</span>
            <span>{data.max.toFixed(1)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function TagsFieldDisplay({ data }: { data: AggregatedFieldData }) {
  if (!data.tagCounts || data.tagCounts.length === 0) {
    return <div className="text-sm text-muted-foreground">No data available</div>;
  }

  const maxCount = data.tagCounts[0]?.count || 1;

  return (
    <div className="flex flex-wrap gap-2">
      {data.tagCounts.slice(0, 15).map(({ tag, count }) => {
        const intensity = Math.max(0.4, count / maxCount);
        return (
          <Badge
            key={tag}
            variant="secondary"
            className="text-sm"
            style={{
              backgroundColor: `rgba(59, 130, 246, ${intensity})`,
              color: intensity > 0.6 ? 'white' : 'inherit',
            }}
          >
            {tag} ({count})
          </Badge>
        );
      })}
    </div>
  );
}

function StringFieldDisplay({ data }: { data: AggregatedFieldData }) {
  if (!data.distribution || data.distribution.length === 0) {
    return <div className="text-sm text-muted-foreground">No data available</div>;
  }

  // For string fields with many values, show as a list instead of chart
  if (data.distribution.length > 10) {
    return (
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {data.distribution.slice(0, 20).map(({ value, count, percentage }) => (
          <div key={value} className="flex items-center justify-between text-sm">
            <span className="truncate max-w-[200px]">{value}</span>
            <span className="text-muted-foreground">{count} ({percentage.toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    );
  }

  return <EnumFieldChart data={data} />;
}

export function InsightCategoryAnalytics({ category, calls }: InsightCategoryAnalyticsProps) {
  const aggregatedData = useMemo(() => {
    return category.outputFields.map(field => 
      aggregateFieldData(calls, category.id, field)
    );
  }, [calls, category]);

  const callsWithInsights = useMemo(() => {
    return calls.filter(c => c.evaluation?.schemaInsights?.[category.id]);
  }, [calls, category.id]);

  if (callsWithInsights.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="text-muted-foreground">
          <div className="text-4xl mb-4">{category.icon}</div>
          <h3 className="font-medium mb-2">No {category.name} Data</h3>
          <p className="text-sm">
            Re-evaluate calls to generate insights for this category.
            <br />
            Use the "Regenerate Insights" button above.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <span className="text-3xl">{category.icon}</span>
        <div>
          <h3 className="font-semibold">{category.name}</h3>
          <p className="text-sm text-muted-foreground">
            {callsWithInsights.length} of {calls.filter(c => c.evaluation).length} calls analyzed
          </p>
        </div>
      </div>

      {/* Field Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {aggregatedData.map((data) => (
          <Card key={data.field.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{data.field.name}</CardTitle>
              <CardDescription className="text-xs">
                {data.field.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.totalValues === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  No data collected for this field
                </div>
              ) : (
                <>
                  {data.field.type === 'enum' && <EnumFieldChart data={data} />}
                  {data.field.type === 'boolean' && <BooleanFieldChart data={data} />}
                  {data.field.type === 'number' && <NumberFieldDisplay data={data} />}
                  {data.field.type === 'tags' && <TagsFieldDisplay data={data} />}
                  {(data.field.type === 'string' || data.field.type === 'text') && (
                    <StringFieldDisplay data={data} />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
