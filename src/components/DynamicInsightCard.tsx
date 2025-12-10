import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { InsightCategoryConfig, InsightOutputField } from '@/types/schema';
import ReactMarkdown from 'react-markdown';
import {
  ChartBar,
  TrendUp,
  TrendDown,
  Warning,
  CheckCircle,
  XCircle,
  Info,
  Star,
  Heart,
  Shield,
  Target,
  Lightbulb,
  Brain,
  Gauge,
  Clock,
  Users,
  CurrencyDollar,
  Phone,
  ChatCircle,
  Percent,
} from '@phosphor-icons/react';

// Map icon names to actual icon components
const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string; color?: string }>> = {
  ChartBar,
  TrendUp,
  TrendDown,
  Warning,
  CheckCircle,
  XCircle,
  Info,
  Star,
  Heart,
  Shield,
  Target,
  Lightbulb,
  Brain,
  Gauge,
  Clock,
  Users,
  CurrencyDollar,
  Phone,
  ChatCircle,
  Percent,
};

interface DynamicInsightCardProps {
  category: InsightCategoryConfig;
  data: Record<string, any>;
  compact?: boolean;
}

/**
 * Renders a single output field based on its type and value
 */
function renderOutputField(field: InsightOutputField, value: any): React.ReactNode {
  if (value === undefined || value === null) {
    return null;
  }

  switch (field.type) {
    case 'number':
      // Render numeric values with progress bar if 0-100 scale
      const numValue = Number(value);
      const showProgress = numValue >= 0 && numValue <= 100;
      return (
        <div>
          <p className="text-xs text-muted-foreground mb-1">{field.name}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold">{numValue}{showProgress ? '%' : ''}</span>
          </div>
          {showProgress && <Progress value={numValue} className="h-1.5 mt-1" />}
        </div>
      );

    case 'boolean':
      return (
        <Badge
          variant={value ? 'default' : 'secondary'}
          className={`${value ? 'bg-green-500' : 'bg-gray-400'} text-xs`}
        >
          {field.name}: {value ? 'Yes' : 'No'}
        </Badge>
      );

    case 'enum':
      const enumValue = String(value);
      // Determine badge variant based on value position in enumValues
      const valueIndex = field.enumValues?.indexOf(enumValue) ?? -1;
      const totalOptions = field.enumValues?.length ?? 1;
      const isPositive = valueIndex < totalOptions / 3;
      const isNegative = valueIndex >= (totalOptions * 2) / 3;
      
      return (
        <div>
          <p className="text-xs text-muted-foreground mb-1">{field.name}</p>
          <Badge
            variant={isPositive ? 'default' : isNegative ? 'destructive' : 'secondary'}
            className={
              isPositive
                ? 'bg-green-500'
                : isNegative
                ? 'bg-red-500'
                : 'bg-yellow-500'
            }
          >
            {enumValue}
          </Badge>
        </div>
      );

    case 'tags':
      const tags = Array.isArray(value) ? value : [value];
      return (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">{field.name}:</p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag, idx) => (
              <Badge key={idx} variant="outline" className="text-[11px] px-2 py-1 whitespace-normal break-words">
                {String(tag)}
              </Badge>
            ))}
          </div>
        </div>
      );

    case 'text':
      return (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">{field.name}:</p>
          <div className="text-xs leading-relaxed prose prose-sm max-w-none">
            <ReactMarkdown>{String(value)}</ReactMarkdown>
          </div>
        </div>
      );

    case 'string':
    default:
      return (
        <div>
          <p className="text-xs text-muted-foreground mb-1">{field.name}</p>
          <p className="text-sm font-medium">{String(value)}</p>
        </div>
      );
  }
}

/**
 * DynamicInsightCard renders insight data based on the category's output field definitions.
 * This allows for schema-driven dynamic UI rather than hardcoded insight cards.
 */
export function DynamicInsightCard({ category, data, compact = false }: DynamicInsightCardProps) {
  const IconComponent = iconMap[category.icon] || Lightbulb;

  // Group fields by type for layout optimization
  const numericFields = category.outputFields.filter(f => f.type === 'number');
  const booleanFields = category.outputFields.filter(f => f.type === 'boolean');
  const enumFields = category.outputFields.filter(f => f.type === 'enum');
  const tagFields = category.outputFields.filter(f => f.type === 'tags');
  const textFields = category.outputFields.filter(f => f.type === 'text' || f.type === 'string');

  // Get primary value (first numeric or enum field) for header display
  const primaryField = numericFields[0] || enumFields[0];
  const primaryValue = primaryField ? data[primaryField.id] : null;

  return (
    <Card className={compact ? '' : ''}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded flex items-center justify-center"
              style={{ backgroundColor: `${category.color}20` }}
            >
              <IconComponent size={14} color={category.color} />
            </div>
            <span>{category.name}</span>
          </div>
          {primaryValue !== null && primaryField?.type === 'enum' && (
            <Badge
              style={{
                backgroundColor: category.color,
                color: 'white',
              }}
            >
              {String(primaryValue)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Numeric fields in a grid */}
        {numericFields.length > 0 && (
          <div className={`grid gap-3 ${numericFields.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {numericFields.map(field => (
              <div key={field.id}>
                {renderOutputField(field, data[field.id])}
              </div>
            ))}
          </div>
        )}

        {/* Boolean fields as inline badges */}
        {booleanFields.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {booleanFields.map(field => (
              <div key={field.id}>
                {renderOutputField(field, data[field.id])}
              </div>
            ))}
          </div>
        )}

        {/* Enum fields (excluding primary if shown in header) */}
        {enumFields.filter(f => f !== primaryField).map(field => (
          <div key={field.id}>
            {renderOutputField(field, data[field.id])}
          </div>
        ))}

        {/* Tag fields */}
        {tagFields.map(field => (
          <div key={field.id}>
            {renderOutputField(field, data[field.id])}
          </div>
        ))}

        {/* Text/String fields */}
        {textFields.map(field => (
          <div key={field.id}>
            {renderOutputField(field, data[field.id])}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * DynamicInsightGrid renders all schema insights in a responsive grid layout
 */
interface DynamicInsightGridProps {
  categories: InsightCategoryConfig[];
  insightData: Record<string, Record<string, any>>;
}

export function DynamicInsightGrid({ categories, insightData }: DynamicInsightGridProps) {
  // Filter to only enabled categories that have data
  const activeCategories = categories.filter(cat => 
    cat.enabled && insightData[cat.id] && Object.keys(insightData[cat.id]).length > 0
  );

  if (activeCategories.length === 0) {
    return null;
  }

  // Determine grid layout based on number of cards
  const getGridClass = (count: number) => {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    return 'grid-cols-2 lg:grid-cols-3';
  };

  return (
    <div className={`grid gap-3 ${getGridClass(activeCategories.length)}`}>
      {activeCategories.map(category => (
        <DynamicInsightCard
          key={category.id}
          category={category}
          data={insightData[category.id]}
        />
      ))}
    </div>
  );
}
