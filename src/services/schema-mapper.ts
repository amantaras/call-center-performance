import { SchemaDefinition, FieldDefinition } from '@/types/schema';
import { executeFormula } from '@/lib/formula-executor';

/**
 * Maps raw CSV/Excel rows to schema-compliant metadata objects
 */
export class SchemaMapper {
  /**
   * Map a single row to metadata using schema field definitions
   */
  static mapRow(
    row: Record<string, any>,
    schema: SchemaDefinition
  ): Record<string, any> {
    const metadata: Record<string, any> = {};

    // Map each field according to schema definition
    for (const field of schema.fields) {
      const value = this.extractFieldValue(row, field);
      metadata[field.id] = value;
    }

    // Calculate derived fields from relationships
    for (const relationship of schema.relationships || []) {
      if (relationship.type === 'calculated' && relationship.formula) {
        const result = executeFormula(relationship.formula, metadata);
        if (result.success && relationship.resultFieldId) {
          metadata[relationship.resultFieldId] = result.result;
        }
      }
    }

    return metadata;
  }

  /**
   * Extract field value from row using column mapping and type coercion
   */
  private static extractFieldValue(
    row: Record<string, any>,
    field: FieldDefinition
  ): any {
    // Get raw value from row using column mapping
    const rawValue = this.getRawValue(row, field.columnMapping);

    if (rawValue === undefined || rawValue === null || rawValue === '') {
      return field.defaultValue ?? this.getDefaultForType(field.dataType);
    }

    // Type coercion based on field data type
    return this.coerceValue(rawValue, field.dataType);
  }

  /**
   * Get raw value from row using flexible column name matching
   */
  private static getRawValue(
    row: Record<string, any>,
    columnMapping?: string | string[]
  ): any {
    if (!columnMapping) return undefined;

    const possibleKeys = Array.isArray(columnMapping) ? columnMapping : [columnMapping];

    // First try exact match
    for (const key of possibleKeys) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
        return row[key];
      }
    }

    // Then try case-insensitive match
    const rowKeysLower = Object.keys(row).reduce((acc, k) => {
      acc[k.toLowerCase().trim()] = k;
      return acc;
    }, {} as Record<string, string>);

    for (const key of possibleKeys) {
      const normalizedKey = key.toLowerCase().trim();
      const actualKey = rowKeysLower[normalizedKey];
      if (actualKey && row[actualKey] !== undefined && row[actualKey] !== null && row[actualKey] !== '') {
        return row[actualKey];
      }
    }

    return undefined;
  }

  /**
   * Coerce raw value to appropriate type
   */
  private static coerceValue(rawValue: any, dataType: FieldDefinition['dataType']): any {
    const strValue = String(rawValue).trim();

    switch (dataType) {
      case 'number':
        const num = parseFloat(strValue);
        return isNaN(num) ? 0 : num;

      case 'boolean':
        return strValue.toLowerCase() === 'true' || strValue === '1' || strValue === 'yes';

      case 'date':
        const date = new Date(strValue);
        return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();

      case 'string':
      case 'text':
      default:
        return strValue;
    }
  }

  /**
   * Get default value for data type
   */
  private static getDefaultForType(dataType: FieldDefinition['dataType']): any {
    switch (dataType) {
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'date':
        return new Date().toISOString();
      case 'string':
      case 'text':
      default:
        return '';
    }
  }

  /**
   * Calculate column match score for schema detection
   * Returns percentage of schema fields that can be mapped to row columns
   */
  static calculateMatchScore(
    row: Record<string, any>,
    schema: SchemaDefinition
  ): number {
    let matchCount = 0;
    const totalFields = schema.fields.length;

    for (const field of schema.fields) {
      const value = this.getRawValue(row, field.columnMapping);
      if (value !== undefined) {
        matchCount++;
      }
    }

    return totalFields > 0 ? (matchCount / totalFields) * 100 : 0;
  }

  /**
   * Detect best matching schema from available schemas
   * Returns schema with highest match score above threshold
   */
  static detectSchema(
    row: Record<string, any>,
    schemas: SchemaDefinition[],
    minMatchThreshold: number = 80
  ): SchemaDefinition | null {
    let bestMatch: SchemaDefinition | null = null;
    let bestScore = 0;

    for (const schema of schemas) {
      const score = this.calculateMatchScore(row, schema);
      if (score > bestScore && score >= minMatchThreshold) {
        bestScore = score;
        bestMatch = schema;
      }
    }

    return bestMatch;
  }

  /**
   * Extract column names from row data
   */
  static extractColumnNames(row: Record<string, any>): string[] {
    return Object.keys(row);
  }

  /**
   * Validate that row can be mapped to schema (has minimum required fields)
   */
  static validateRowMapping(
    row: Record<string, any>,
    schema: SchemaDefinition
  ): { valid: boolean; missingFields: string[] } {
    const missingFields: string[] = [];

    // Check required participant fields
    const participant1Field = schema.fields.find(f => f.semanticRole === 'participant_1');
    const participant2Field = schema.fields.find(f => f.semanticRole === 'participant_2');

    if (participant1Field) {
      const value = this.getRawValue(row, participant1Field.columnMapping);
      if (!value) {
        missingFields.push(participant1Field.displayName);
      }
    }

    if (participant2Field) {
      const value = this.getRawValue(row, participant2Field.columnMapping);
      if (!value) {
        missingFields.push(participant2Field.displayName);
      }
    }

    // Check at least one classification field
    const classificationFields = schema.fields.filter(f => f.semanticRole === 'classification');
    const hasClassification = classificationFields.some(field => {
      const value = this.getRawValue(row, field.columnMapping);
      return value !== undefined && value !== null && value !== '';
    });

    if (!hasClassification) {
      missingFields.push('At least one classification field');
    }

    return {
      valid: missingFields.length === 0,
      missingFields
    };
  }

  /**
   * Generate sample data statistics for schema discovery
   */
  static analyzeRowData(rows: Record<string, any>[]): Record<string, any> {
    if (rows.length === 0) return {};

    const columns = this.extractColumnNames(rows[0]);
    const stats: Record<string, any> = {};

    for (const col of columns) {
      const values = rows.map(r => r[col]).filter(v => v !== undefined && v !== null && v !== '');
      const uniqueValues = new Set(values);

      stats[col] = {
        totalRows: rows.length,
        nonEmptyRows: values.length,
        uniqueCount: uniqueValues.size,
        cardinality: values.length > 0 ? (uniqueValues.size / values.length) * 100 : 0,
        sampleValues: Array.from(uniqueValues).slice(0, 5),
        inferredType: this.inferColumnType(values)
      };
    }

    return stats;
  }

  /**
   * Infer data type from sample values
   */
  private static inferColumnType(values: any[]): 'number' | 'date' | 'boolean' | 'string' {
    if (values.length === 0) return 'string';

    let numCount = 0;
    let dateCount = 0;
    let boolCount = 0;

    for (const value of values.slice(0, 20)) { // Sample first 20 values
      const strValue = String(value).trim();

      if (!isNaN(Number(strValue)) && strValue !== '') {
        numCount++;
      }

      if (!isNaN(Date.parse(strValue))) {
        dateCount++;
      }

      if (['true', 'false', 'yes', 'no', '0', '1'].includes(strValue.toLowerCase())) {
        boolCount++;
      }
    }

    const sampleSize = Math.min(values.length, 20);
    if (numCount / sampleSize > 0.8) return 'number';
    if (dateCount / sampleSize > 0.8) return 'date';
    if (boolCount / sampleSize > 0.8) return 'boolean';

    return 'string';
  }
}
