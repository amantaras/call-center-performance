/**
 * Schema Validation Service
 * Enforces mandatory field requirements and validates schema structure
 */

import type {
  SchemaDefinition,
  FieldDefinition,
  SchemaValidationResult,
  SemanticRole
} from '../types/schema';

/**
 * Validates metadata against a schema definition
 */
export function validateMetadata(
  metadata: Record<string, any>,
  schema: SchemaDefinition
): SchemaValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  const requiredFields = schema.fields.filter(f => f.required);
  for (const field of requiredFields) {
    const value = metadata[field.name];
    if (value === undefined || value === null || value === '') {
      errors.push(`Required field "${field.displayName}" (${field.name}) is missing`);
    }
  }

  // Validate semantic role requirements (2 participants + 1+ classification)
  const participant1Fields = schema.fields.filter(f => f.semanticRole === 'participant_1');
  const participant2Fields = schema.fields.filter(f => f.semanticRole === 'participant_2');
  const classificationFields = schema.fields.filter(f => f.semanticRole === 'classification');

  if (participant1Fields.length === 0) {
    errors.push('Schema must have at least one participant_1 field');
  }
  if (participant2Fields.length === 0) {
    errors.push('Schema must have at least one participant_2 field');
  }
  if (classificationFields.length === 0) {
    errors.push('Schema must have at least one classification field');
  }

  // Type validation
  for (const field of schema.fields) {
    const value = metadata[field.name];
    if (value === undefined || value === null) continue;

    switch (field.type) {
      case 'number':
        if (typeof value !== 'number' && isNaN(Number(value))) {
          errors.push(`Field "${field.displayName}" must be a number, got: ${typeof value}`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          warnings.push(`Field "${field.displayName}" should be boolean, got: ${typeof value}`);
        }
        break;
      case 'date':
        if (isNaN(Date.parse(value))) {
          errors.push(`Field "${field.displayName}" must be a valid date`);
        }
        break;
      case 'select':
        if (field.selectOptions && !field.selectOptions.includes(value)) {
          warnings.push(
            `Field "${field.displayName}" value "${value}" not in allowed options: ${field.selectOptions.join(', ')}`
          );
        }
        break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates a schema definition structure
 */
export function validateSchemaDefinition(schema: SchemaDefinition): SchemaValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic required properties
  if (!schema.id || schema.id.trim() === '') {
    errors.push('Schema ID is required');
  }
  if (!schema.name || schema.name.trim() === '') {
    errors.push('Schema name is required');
  }
  if (!schema.version || schema.version.trim() === '') {
    errors.push('Schema version is required');
  }
  if (!schema.businessContext || schema.businessContext.trim() === '') {
    errors.push('Business context is required');
  }
  if (!schema.fields || schema.fields.length === 0) {
    errors.push('Schema must have at least one field');
  }

  // Validate semantic role requirements
  const participant1Count = schema.fields.filter(f => f.semanticRole === 'participant_1').length;
  const participant2Count = schema.fields.filter(f => f.semanticRole === 'participant_2').length;
  const classificationCount = schema.fields.filter(f => f.semanticRole === 'classification').length;

  if (participant1Count === 0) {
    errors.push('Schema must have exactly one participant_1 field (first conversation participant)');
  } else if (participant1Count > 1) {
    errors.push(`Schema has ${participant1Count} participant_1 fields, but only one is allowed`);
  }

  if (participant2Count === 0) {
    errors.push('Schema must have exactly one participant_2 field (second conversation participant)');
  } else if (participant2Count > 1) {
    errors.push(`Schema has ${participant2Count} participant_2 fields, but only one is allowed`);
  }

  if (classificationCount === 0) {
    errors.push('Schema must have at least one classification field for categorization');
  }

  // Validate field definitions
  const fieldIds = new Set<string>();
  const fieldNames = new Set<string>();

  for (const field of schema.fields) {
    // Check for duplicate IDs
    if (fieldIds.has(field.id)) {
      errors.push(`Duplicate field ID: "${field.id}"`);
    }
    fieldIds.add(field.id);

    // Check for duplicate names
    if (fieldNames.has(field.name)) {
      errors.push(`Duplicate field name: "${field.name}"`);
    }
    fieldNames.add(field.name);

    // Validate field structure
    if (!field.id || field.id.trim() === '') {
      errors.push('Field ID is required');
    }
    if (!field.name || field.name.trim() === '') {
      errors.push('Field name is required');
    }
    if (!field.displayName || field.displayName.trim() === '') {
      errors.push(`Field "${field.name}" must have a display name`);
    }

    // Validate select options
    if (field.type === 'select' && (!field.selectOptions || field.selectOptions.length === 0)) {
      warnings.push(`Select field "${field.displayName}" has no options defined`);
    }

    // Validate participant labels
    if ((field.semanticRole === 'participant_1' || field.semanticRole === 'participant_2') &&
        (!field.participantLabel || field.participantLabel.trim() === '')) {
      warnings.push(`Participant field "${field.displayName}" should have a participant label (e.g., "Agent", "Customer")`);
    }
  }

  // Validate relationships
  if (schema.relationships) {
    for (const rel of schema.relationships) {
      if (!rel.id || rel.id.trim() === '') {
        errors.push('Relationship ID is required');
      }
      if (!rel.description || rel.description.trim() === '') {
        errors.push('Relationship description is required');
      }
      if (!rel.involvedFields || rel.involvedFields.length === 0) {
        warnings.push(`Relationship "${rel.id}" has no involved fields`);
      }

      // Check that involved fields exist
      for (const fieldId of rel.involvedFields) {
        if (!fieldIds.has(fieldId)) {
          errors.push(`Relationship "${rel.id}" references non-existent field: "${fieldId}"`);
        }
      }

      // Complex relationships should have formulas
      if (rel.type === 'complex' && (!rel.formula || rel.formula.trim() === '')) {
        warnings.push(`Complex relationship "${rel.id}" should have a formula defined`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates semantic role counts in a field list
 */
export function validateSemanticRoles(fields: FieldDefinition[]): SchemaValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const roleCounts: Record<SemanticRole, number> = {
    participant_1: 0,
    participant_2: 0,
    classification: 0,
    metric: 0,
    dimension: 0,
    identifier: 0,
    timestamp: 0,
    freeform: 0
  };

  for (const field of fields) {
    roleCounts[field.semanticRole]++;
  }

  // Enforce mandatory requirements
  if (roleCounts.participant_1 !== 1) {
    errors.push(`Must have exactly 1 participant_1 field (found ${roleCounts.participant_1})`);
  }
  if (roleCounts.participant_2 !== 1) {
    errors.push(`Must have exactly 1 participant_2 field (found ${roleCounts.participant_2})`);
  }
  if (roleCounts.classification < 1) {
    errors.push(`Must have at least 1 classification field (found ${roleCounts.classification})`);
  }

  // Warnings for missing recommended fields
  if (roleCounts.timestamp === 0) {
    warnings.push('Consider adding a timestamp field for temporal analytics');
  }
  if (roleCounts.identifier === 0) {
    warnings.push('Consider adding an identifier field for unique call tracking');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Checks if a schema can be safely deleted
 */
export function canDeleteSchema(schemaId: string, callCount: number): { allowed: boolean; reason?: string } {
  if (callCount > 0) {
    return {
      allowed: false,
      reason: `Cannot delete schema - ${callCount} call(s) exist. Switch to another schema and migrate/delete calls first.`
    };
  }
  return { allowed: true };
}
