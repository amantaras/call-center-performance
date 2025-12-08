import { SchemaDefinition, FieldDefinition, DependencyOperator } from '@/types/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  User,
  UserCircle,
  Tag,
  ChartBar,
  FunnelSimple,
  Hash,
  Calendar,
  TextAlignLeft,
} from '@phosphor-icons/react';

interface DynamicDetailViewProps {
  metadata: Record<string, any>;
  schema: SchemaDefinition;
  className?: string;
}

/**
 * Evaluates whether a field's dependency condition is met
 */
function evaluateDependencyCondition(
  dependsOn: { fieldId: string; operator: DependencyOperator; value?: any } | undefined,
  metadata: Record<string, any>,
  schema: SchemaDefinition
): boolean {
  if (!dependsOn) return true; // No dependency = always show
  
  // Find the dependent field to get its value from metadata
  const dependentField = schema.fields.find(f => f.id === dependsOn.fieldId);
  if (!dependentField) return true; // Can't find field = show anyway
  
  const fieldValue = metadata[dependentField.id] ?? metadata[dependentField.name];
  const targetValue = dependsOn.value;
  
  switch (dependsOn.operator) {
    case 'equals':
      return fieldValue === targetValue || String(fieldValue) === String(targetValue);
    case 'notEquals':
      return fieldValue !== targetValue && String(fieldValue) !== String(targetValue);
    case 'contains':
      return String(fieldValue || '').toLowerCase().includes(String(targetValue || '').toLowerCase());
    case 'greaterThan':
      return Number(fieldValue) > Number(targetValue);
    case 'lessThan':
      return Number(fieldValue) < Number(targetValue);
    case 'isEmpty':
      return fieldValue === undefined || fieldValue === null || fieldValue === '';
    case 'isNotEmpty':
      return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
    default:
      return true;
  }
}

/**
 * Filters fields based on their dependency conditions
 */
function getVisibleFields(fields: FieldDefinition[], metadata: Record<string, any>, schema: SchemaDefinition): FieldDefinition[] {
  return fields.filter(field => {
    // If field has no dependency, always show
    if (!field.dependsOn) return true;
    
    // If behavior is 'require', the field is always visible but becomes required when condition is met
    // For 'show' behavior, only show when condition is met
    if (field.dependsOnBehavior === 'require') {
      return true; // Always visible, but required status changes
    }
    
    // Default behavior is 'show' - only display when condition is met
    return evaluateDependencyCondition(field.dependsOn, metadata, schema);
  });
}

/**
 * DynamicDetailView Component
 * 
 * Renders call metadata dynamically based on active schema field definitions.
 * Groups fields by semantic role and displays with appropriate formatting.
 */
export function DynamicDetailView({ metadata, schema, className = '' }: DynamicDetailViewProps) {
  const getFieldIcon = (field: FieldDefinition) => {
    const iconProps = { size: 16, className: 'text-muted-foreground' };
    
    switch (field.semanticRole) {
      case 'participant_1':
        return <User {...iconProps} />;
      case 'participant_2':
        return <UserCircle {...iconProps} />;
      case 'classification':
        return <Tag {...iconProps} />;
      case 'metric':
        return <ChartBar {...iconProps} />;
      case 'dimension':
        return <FunnelSimple {...iconProps} />;
      case 'identifier':
        return <Hash {...iconProps} />;
      case 'timestamp':
        return <Calendar {...iconProps} />;
      case 'freeform':
        return <TextAlignLeft {...iconProps} />;
      default:
        return null;
    }
  };

  const formatFieldValue = (value: any, field: FieldDefinition): string => {
    if (value === null || value === undefined || value === '') {
      return '—';
    }

    switch (field.type) {
      case 'date':
        try {
          const date = new Date(value);
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
        } catch {
          return String(value);
        }

      case 'number':
        const num = Number(value);
        if (isNaN(num)) return String(value);
        
        // Check if field name suggests currency
        const isCurrency = field.name.toLowerCase().includes('amount') ||
                          field.name.toLowerCase().includes('price') ||
                          field.name.toLowerCase().includes('cost') ||
                          field.displayName.toLowerCase().includes('amount');
        
        if (isCurrency) {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(num);
        }
        
        return num.toLocaleString();

      case 'boolean':
        return value ? 'Yes' : 'No';

      case 'select':
        return String(value);

      case 'string':
      default:
        return String(value);
    }
  };

  const getFieldBadgeVariant = (field: FieldDefinition): 'default' | 'secondary' | 'outline' | 'destructive' => {
    if (field.semanticRole === 'participant_1' || field.semanticRole === 'participant_2') {
      return 'default';
    }
    if (field.semanticRole === 'classification') {
      return 'secondary';
    }
    return 'outline';
  };

  // Group fields by semantic role for organized display, filtering by dependencies
  const visibleFields = getVisibleFields(schema.fields, metadata, schema);
  
  const participantFields = visibleFields.filter(
    f => f.semanticRole === 'participant_1' || f.semanticRole === 'participant_2'
  );
  const classificationFields = visibleFields.filter(f => f.semanticRole === 'classification');
  const metricFields = visibleFields.filter(f => f.semanticRole === 'metric');
  const dimensionFields = visibleFields.filter(f => f.semanticRole === 'dimension');
  const identifierFields = visibleFields.filter(f => f.semanticRole === 'identifier');
  const timestampFields = visibleFields.filter(f => f.semanticRole === 'timestamp');
  const freeformFields = visibleFields.filter(f => f.semanticRole === 'freeform');

  const renderFieldGroup = (fields: FieldDefinition[], title: string) => {
    if (fields.length === 0) return null;

    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          {getFieldIcon(fields[0])}
          {title}
        </h4>
        <div className="grid grid-cols-2 gap-4">
          {fields.map((field) => {
            const value = metadata[field.id];
            const formattedValue = formatFieldValue(value, field);
            const shouldHighlight = field.semanticRole === 'participant_1' || 
                                   field.semanticRole === 'participant_2' ||
                                   field.semanticRole === 'classification';
            
            // Check if field is conditionally required
            const isConditionallyRequired = field.dependsOn && 
              field.dependsOnBehavior === 'require' &&
              evaluateDependencyCondition(field.dependsOn, metadata, schema);

            return (
              <div
                key={field.id}
                className={`space-y-1 ${
                  field.type === 'string' && formattedValue.length > 50 ? 'col-span-2' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <h5 className="text-xs font-medium text-muted-foreground">
                    {field.displayName}
                  </h5>
                  {(field.required || isConditionallyRequired) && (
                    <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                      Required
                    </Badge>
                  )}
                  {field.dependsOn && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-amber-400 text-amber-600">
                      Conditional
                    </Badge>
                  )}
                </div>
                {shouldHighlight ? (
                  <Badge variant={getFieldBadgeVariant(field)} className="font-medium">
                    {formattedValue}
                  </Badge>
                ) : (
                  <p className="text-sm font-medium text-foreground">
                    {formattedValue}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardContent className="p-6 space-y-6">
        {/* Participants Section (highlighted) */}
        {participantFields.length > 0 && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            {renderFieldGroup(participantFields, 'Conversation Participants')}
          </div>
        )}

        {/* Classifications Section */}
        {renderFieldGroup(classificationFields, 'Classifications')}

        {/* Metrics Section */}
        {renderFieldGroup(metricFields, 'Metrics')}

        {/* Dimensions Section */}
        {renderFieldGroup(dimensionFields, 'Dimensions')}

        {/* Identifiers Section */}
        {renderFieldGroup(identifierFields, 'Identifiers')}

        {/* Timestamps Section */}
        {renderFieldGroup(timestampFields, 'Timestamps')}

        {/* Freeform Text Section */}
        {freeformFields.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              {getFieldIcon(freeformFields[0])}
              Additional Information
            </h4>
            <div className="space-y-4">
              {freeformFields.map((field) => {
                const value = metadata[field.id];
                const formattedValue = formatFieldValue(value, field);

                return (
                  <div key={field.id} className="space-y-1">
                    <h5 className="text-xs font-medium text-muted-foreground">
                      {field.displayName}
                    </h5>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {formattedValue}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Schema Information Footer */}
        <div className="pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>Schema: {schema.name}</span>
          <span>v{schema.version}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * DynamicDetailSummary Component
 * 
 * Compact summary view showing key participant and classification fields.
 * Useful for headers and quick previews.
 */
export function DynamicDetailSummary({ metadata, schema }: DynamicDetailViewProps) {
  const participant1Field = schema.fields.find(f => f.semanticRole === 'participant_1');
  const participant2Field = schema.fields.find(f => f.semanticRole === 'participant_2');
  const primaryClassification = schema.fields.find(f => f.semanticRole === 'classification');

  const formatValue = (value: any): string => {
    if (value === null || value === undefined || value === '') return 'Unknown';
    return String(value);
  };

  return (
    <div className="flex items-center gap-3 text-sm">
      {participant1Field && (
        <div className="flex items-center gap-2">
          <Badge variant="default" className="text-xs">
            {participant1Field.participantLabel || participant1Field.displayName}
          </Badge>
          <span className="font-medium">{formatValue(metadata[participant1Field.name])}</span>
        </div>
      )}
      
      {participant1Field && participant2Field && (
        <span className="text-muted-foreground">→</span>
      )}
      
      {participant2Field && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {participant2Field.participantLabel || participant2Field.displayName}
          </Badge>
          <span className="font-medium">{formatValue(metadata[participant2Field.name])}</span>
        </div>
      )}

      {primaryClassification && metadata[primaryClassification.name] && (
        <>
          <span className="text-muted-foreground">•</span>
          <Badge variant="outline" className="text-xs">
            {formatValue(metadata[primaryClassification.name])}
          </Badge>
        </>
      )}
    </div>
  );
}
