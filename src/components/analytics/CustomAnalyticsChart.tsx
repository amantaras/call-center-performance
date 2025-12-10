import { useMemo } from 'react';
import { CallRecord } from '@/types/call';
import { SchemaDefinition, AnalyticsView } from '@/types/schema';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ZAxis } from 'recharts';

interface CustomAnalyticsChartProps {
  view: AnalyticsView;
  calls: CallRecord[];
  schema: SchemaDefinition;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'];

export function CustomAnalyticsChart({ view, calls, schema }: CustomAnalyticsChartProps) {
  const chartData = useMemo(() => {
    console.log('🔍 CustomAnalyticsChart - Processing view:', {
      viewName: view.name,
      dimensionField: view.dimensionField,
      measureField: view.measureField,
      aggregation: view.aggregation,
      callsCount: calls.length
    });

    // Helper to get field value from call (checks metadata first, then direct properties)
    const getFieldValue = (call: CallRecord, fieldId: string) => {
      if (call.metadata && call.metadata[fieldId] !== undefined) {
        return call.metadata[fieldId];
      }
      return (call as any)[fieldId];
    };

    if (!view.dimensionField && !view.measureField) {
      // Count only
      return [{ name: 'Total', value: calls.length }];
    }

    const dimensionField = schema.fields.find(f => f.id === view.dimensionField);
    const measureField = schema.fields.find(f => f.id === view.measureField);

    console.log('📊 Fields:', {
      dimensionField: dimensionField ? `${dimensionField.displayName} (${dimensionField.id})` : 'none',
      measureField: measureField ? `${measureField.displayName} (${measureField.id})` : 'none'
    });

    if (!dimensionField) {
      // No dimension, just aggregate measure
      if (!measureField) return [];
      
      const values = calls
        .map(c => {
          const val = getFieldValue(c, measureField.id);
          const num = parseFloat(val);
          return isNaN(num) ? 0 : num;
        })
        .filter(v => v !== 0);

      console.log('📈 Measure values:', values.slice(0, 5), '... total:', values.length);

      let aggregatedValue = 0;
      if (view.aggregation === 'sum') {
        aggregatedValue = values.reduce((sum, v) => sum + v, 0);
      } else if (view.aggregation === 'avg') {
        aggregatedValue = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
      } else if (view.aggregation === 'count') {
        aggregatedValue = calls.length;
      } else if (view.aggregation === 'min') {
        aggregatedValue = values.length > 0 ? Math.min(...values) : 0;
      } else if (view.aggregation === 'max') {
        aggregatedValue = values.length > 0 ? Math.max(...values) : 0;
      }

      return [{ name: measureField.displayName, value: aggregatedValue }];
    }

    // Group by dimension
    const grouped = new Map<string, { count: number; values: number[] }>();
    
    calls.forEach(call => {
      const dimValue = String(getFieldValue(call, dimensionField.id) || 'Unknown');
      
      if (!grouped.has(dimValue)) {
        grouped.set(dimValue, { count: 0, values: [] });
      }

      const group = grouped.get(dimValue)!;
      group.count++;

      if (measureField) {
        const measureValue = getFieldValue(call, measureField.id);
        const num = parseFloat(measureValue);
        if (!isNaN(num)) {
          group.values.push(num);
        }
      }
    });

    console.log('📦 Grouped data:', Array.from(grouped.entries()).slice(0, 3));

    // Aggregate
    const result = Array.from(grouped.entries()).map(([dimValue, group]) => {
      let aggregatedValue = 0;

      if (view.aggregation === 'count') {
        aggregatedValue = group.count;
      } else if (view.aggregation === 'sum') {
        aggregatedValue = group.values.reduce((sum, v) => sum + v, 0);
      } else if (view.aggregation === 'avg') {
        aggregatedValue = group.values.length > 0 ? group.values.reduce((sum, v) => sum + v, 0) / group.values.length : 0;
      } else if (view.aggregation === 'min') {
        aggregatedValue = group.values.length > 0 ? Math.min(...group.values) : 0;
      } else if (view.aggregation === 'max') {
        aggregatedValue = group.values.length > 0 ? Math.max(...group.values) : 0;
      }

      return {
        name: dimValue,
        value: Math.round(aggregatedValue * 100) / 100, // Round to 2 decimals
      };
    });

    console.log('✅ Final chart data:', result);

    // Sort by value descending
    return result.sort((a, b) => b.value - a.value);
  }, [view, calls, schema]);

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  const measureField = schema.fields.find(f => f.id === view.measureField);
  const yAxisLabel = measureField?.displayName || view.aggregation;

  if (view.chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
          <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Bar dataKey="value" fill="#0088FE" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (view.chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
          <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="value" stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (view.chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
          <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Area type="monotone" dataKey="value" stroke="#82ca9d" fill="#82ca9d" />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (view.chartType === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (view.chartType === 'scatter') {
    // For scatter, we need x and y values - use dimension as x index and measure as y
    const scatterData = chartData.map((item, index) => ({
      x: index + 1,
      y: item.value,
      name: item.name,
      z: item.value // Size of bubble
    }));

    const dimensionField = schema.fields.find(f => f.id === view.dimensionField);
    const xAxisLabel = dimensionField?.displayName || 'Category';

    return (
      <ResponsiveContainer width="100%" height={250}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            type="number" 
            dataKey="x" 
            name={xAxisLabel}
            label={{ value: xAxisLabel, position: 'bottom', offset: 40 }}
          />
          <YAxis 
            type="number" 
            dataKey="y" 
            name={yAxisLabel}
            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }}
          />
          <ZAxis type="number" dataKey="z" range={[60, 400]} />
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-background border rounded p-2 shadow-lg">
                    <p className="font-medium">{data.name}</p>
                    <p className="text-sm text-muted-foreground">{yAxisLabel}: {data.y}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Scatter 
            name={view.name} 
            data={scatterData} 
            fill="#8884d8"
          >
            {scatterData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  // Handle 'trend' as line chart (alias)
  if (view.chartType === 'trend') {
    return (
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
          <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} dot={{ fill: '#8884d8' }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <div className="h-64 flex items-center justify-center text-muted-foreground">
      Unsupported chart type: {view.chartType}
    </div>
  );
}
