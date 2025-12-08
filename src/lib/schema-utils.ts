/**
 * Schema Utilities
 * Helper functions for schema operations including field dependency evaluation
 */

import { 
  FieldDefinition, 
  FieldDependency, 
  DependencyOperator,
  SchemaDefinition 
} from '@/types/schema';

/**
 * Evaluate if a field dependency condition is met
 * @param dependency The dependency condition to evaluate
 * @param fieldValues Current values of all fields (keyed by field ID)
 * @returns true if the dependency condition is satisfied
 */
export function evaluateFieldDependency(
  dependency: FieldDependency,
  fieldValues: Record<string, unknown>
): boolean {
  const { fieldId, operator, value: expectedValue } = dependency;
  const actualValue = fieldValues[fieldId];

  switch (operator) {
    case 'equals':
      return actualValue === expectedValue;
      
    case 'notEquals':
      return actualValue !== expectedValue;
      
    case 'contains':
      if (typeof actualValue === 'string' && typeof expectedValue === 'string') {
        return actualValue.toLowerCase().includes(expectedValue.toLowerCase());
      }
      if (Array.isArray(actualValue)) {
        return actualValue.includes(expectedValue);
      }
      return false;
      
    case 'greaterThan':
      if (typeof actualValue === 'number' && typeof expectedValue === 'number') {
        return actualValue > expectedValue;
      }
      return false;
      
    case 'lessThan':
      if (typeof actualValue === 'number' && typeof expectedValue === 'number') {
        return actualValue < expectedValue;
      }
      return false;
      
    case 'isEmpty':
      return actualValue === undefined || 
             actualValue === null || 
             actualValue === '' ||
             (Array.isArray(actualValue) && actualValue.length === 0);
      
    case 'isNotEmpty':
      return actualValue !== undefined && 
             actualValue !== null && 
             actualValue !== '' &&
             !(Array.isArray(actualValue) && actualValue.length === 0);
      
    default:
      console.warn(`Unknown dependency operator: ${operator}`);
      return true; // Default to showing the field if operator is unknown
  }
}

/**
 * Get all visible fields based on current field values and dependencies
 * @param fields All field definitions
 * @param fieldValues Current values of all fields
 * @returns Array of fields that should be visible
 */
export function getVisibleFields(
  fields: FieldDefinition[],
  fieldValues: Record<string, unknown>
): FieldDefinition[] {
  return fields.filter(field => {
    // If no dependency, field is always visible
    if (!field.dependsOn) return true;
    
    // If dependency behavior is 'require', field is always visible but may be required
    // If behavior is 'show', field visibility depends on the condition
    if (field.dependsOnBehavior === 'require') return true;
    
    // Default behavior is 'show' - evaluate the dependency
    return evaluateFieldDependency(field.dependsOn, fieldValues);
  });
}

/**
 * Check if a field is required based on dependencies
 * @param field The field to check
 * @param fieldValues Current values of all fields
 * @returns true if the field is required (either always or conditionally)
 */
export function isFieldRequired(
  field: FieldDefinition,
  fieldValues: Record<string, unknown>
): boolean {
  // If field is marked as always required
  if (field.required) return true;
  
  // Check conditional requirement
  if (field.dependsOn && field.dependsOnBehavior === 'require') {
    return evaluateFieldDependency(field.dependsOn, fieldValues);
  }
  
  return false;
}

/**
 * Validate field values against schema requirements
 * @param schema The schema definition
 * @param fieldValues The field values to validate
 * @returns Object with isValid flag and array of validation errors
 */
export function validateFieldValues(
  schema: SchemaDefinition,
  fieldValues: Record<string, unknown>
): { isValid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  
  for (const field of schema.fields) {
    // Skip fields that aren't visible
    if (field.dependsOn && field.dependsOnBehavior === 'show') {
      if (!evaluateFieldDependency(field.dependsOn, fieldValues)) {
        continue; // Skip validation for hidden fields
      }
    }
    
    const value = fieldValues[field.id];
    const required = isFieldRequired(field, fieldValues);
    
    // Check required fields
    if (required) {
      if (value === undefined || value === null || value === '') {
        errors.push({
          fieldId: field.id,
          fieldName: field.displayName,
          type: 'required',
          message: `${field.displayName} is required`,
        });
        continue;
      }
    }
    
    // Skip further validation if value is empty and not required
    if (value === undefined || value === null || value === '') {
      continue;
    }
    
    // Type-specific validation
    switch (field.type) {
      case 'number':
        if (typeof value !== 'number' && isNaN(Number(value))) {
          errors.push({
            fieldId: field.id,
            fieldName: field.displayName,
            type: 'type',
            message: `${field.displayName} must be a number`,
          });
        }
        break;
        
      case 'select':
        if (field.selectOptions && !field.selectOptions.includes(value as string)) {
          errors.push({
            fieldId: field.id,
            fieldName: field.displayName,
            type: 'invalid',
            message: `${field.displayName} has an invalid value`,
          });
        }
        break;
        
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push({
            fieldId: field.id,
            fieldName: field.displayName,
            type: 'type',
            message: `${field.displayName} must be true or false`,
          });
        }
        break;
        
      case 'date':
        if (!(value instanceof Date) && isNaN(Date.parse(value as string))) {
          errors.push({
            fieldId: field.id,
            fieldName: field.displayName,
            type: 'type',
            message: `${field.displayName} must be a valid date`,
          });
        }
        break;
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export interface ValidationError {
  fieldId: string;
  fieldName: string;
  type: 'required' | 'type' | 'invalid';
  message: string;
}

/**
 * Get the display label for a dependency operator
 */
export function getDependencyOperatorLabel(operator: DependencyOperator): string {
  const labels: Record<DependencyOperator, string> = {
    equals: 'equals',
    notEquals: 'does not equal',
    contains: 'contains',
    greaterThan: 'is greater than',
    lessThan: 'is less than',
    isEmpty: 'is empty',
    isNotEmpty: 'is not empty',
  };
  return labels[operator] || operator;
}

/**
 * Get all available dependency operators
 */
export function getDependencyOperators(): { value: DependencyOperator; label: string }[] {
  return [
    { value: 'equals', label: 'equals' },
    { value: 'notEquals', label: 'does not equal' },
    { value: 'contains', label: 'contains' },
    { value: 'greaterThan', label: 'is greater than' },
    { value: 'lessThan', label: 'is less than' },
    { value: 'isEmpty', label: 'is empty' },
    { value: 'isNotEmpty', label: 'is not empty' },
  ];
}

/**
 * Get operators valid for a specific field type
 */
export function getValidOperatorsForFieldType(
  fieldType: FieldDefinition['type']
): DependencyOperator[] {
  switch (fieldType) {
    case 'number':
      return ['equals', 'notEquals', 'greaterThan', 'lessThan', 'isEmpty', 'isNotEmpty'];
    case 'boolean':
      return ['equals', 'notEquals'];
    case 'select':
      return ['equals', 'notEquals', 'isEmpty', 'isNotEmpty'];
    case 'string':
      return ['equals', 'notEquals', 'contains', 'isEmpty', 'isNotEmpty'];
    case 'date':
      return ['equals', 'notEquals', 'isEmpty', 'isNotEmpty'];
    default:
      return ['equals', 'notEquals', 'isEmpty', 'isNotEmpty'];
  }
}

/**
 * Generate a human-readable description of a field dependency
 */
export function describeDependency(
  dependency: FieldDependency,
  fields: FieldDefinition[]
): string {
  const sourceField = fields.find(f => f.id === dependency.fieldId);
  const fieldName = sourceField?.displayName || dependency.fieldId;
  const operatorLabel = getDependencyOperatorLabel(dependency.operator);
  
  // For isEmpty/isNotEmpty, don't show value
  if (dependency.operator === 'isEmpty' || dependency.operator === 'isNotEmpty') {
    return `${fieldName} ${operatorLabel}`;
  }
  
  // Format the value for display
  let valueDisplay: string;
  if (typeof dependency.value === 'boolean') {
    valueDisplay = dependency.value ? 'Yes' : 'No';
  } else {
    valueDisplay = String(dependency.value);
  }
  
  return `${fieldName} ${operatorLabel} "${valueDisplay}"`;
}

/**
 * Get fields that can be used as dependency sources for a given field
 * (excludes the field itself and fields that depend on it to avoid circular dependencies)
 */
export function getAvailableDependencySourceFields(
  targetFieldId: string,
  fields: FieldDefinition[]
): FieldDefinition[] {
  // Get IDs of fields that depend on the target field (directly or indirectly)
  const dependentFieldIds = new Set<string>();
  
  function findDependents(fieldId: string) {
    for (const field of fields) {
      if (field.dependsOn?.fieldId === fieldId && !dependentFieldIds.has(field.id)) {
        dependentFieldIds.add(field.id);
        findDependents(field.id);
      }
    }
  }
  
  findDependents(targetFieldId);
  
  // Return fields that:
  // 1. Are not the target field itself
  // 2. Don't depend on the target field (directly or indirectly)
  return fields.filter(field => 
    field.id !== targetFieldId &&
    !dependentFieldIds.has(field.id)
  );
}
