/**
 * Schema System Type Definitions
 * Defines the structure for dynamic, LLM-powered schema configuration
 */

/**
 * Semantic roles that fields can have in the schema
 */
export type SemanticRole =
  | 'participant_1'      // First conversation participant (e.g., Agent, Sales Rep)
  | 'participant_2'      // Second conversation participant (e.g., Caller, Customer)
  | 'classification'     // Categorical classification field (e.g., Product, Outcome, Status)
  | 'metric'            // Numeric measurement field (e.g., Amount, Days, Score)
  | 'dimension'         // Grouping/segmentation field (e.g., Region, Nationality, Category)
  | 'identifier'        // Unique identifier field (e.g., Call ID, Order ID)
  | 'timestamp'         // Date/time field
  | 'freeform';         // Unstructured text field

/**
 * Field data types
 */
export type FieldType = 'string' | 'number' | 'date' | 'boolean' | 'select';

/**
 * Relationship types discovered by LLM
 */
export type RelationshipType = 'simple' | 'complex';

/**
 * Individual field definition within a schema
 */
export interface FieldDefinition {
  id: string;                      // Unique field identifier (e.g., "agent_name")
  name: string;                    // Field name in metadata object
  displayName: string;             // Human-readable name (e.g., "Agent Name")
  type: FieldType;                 // Data type
  semanticRole: SemanticRole;      // Purpose of this field
  participantLabel?: string;       // Custom label for participants (e.g., "Sales Rep", "Support Agent")
  required: boolean;               // Whether field is mandatory
  showInTable: boolean;            // Display in calls table
  useInPrompt: boolean;            // Include in AI evaluation prompts
  enableAnalytics: boolean;        // Allow as analytics dimension
  selectOptions?: string[];        // Options for select type fields
  cardinalityHint?: 'low' | 'medium' | 'high';  // Approximate unique value count
  defaultValue?: any;              // Default value if not provided
}

/**
 * Discovered relationship between fields
 */
export interface RelationshipDefinition {
  id: string;                      // Unique relationship identifier
  type: RelationshipType;          // Simple (correlative) or Complex (calculable)
  description: string;             // Natural language explanation (e.g., "Agent performance affects score")
  formula?: string;                // JavaScript formula for complex relationships (e.g., "daysPastDue * dueAmount / 1000")
  involvedFields: string[];        // Field IDs involved in this relationship
}

/**
 * Complete schema definition
 */
export interface SchemaDefinition {
  id: string;                      // Unique schema identifier (e.g., "debt-collection-v1")
  name: string;                    // Human-readable name (e.g., "Debt Collection")
  version: string;                 // Semantic version (e.g., "1.0.0")
  createdAt: string;               // ISO timestamp
  updatedAt?: string;              // ISO timestamp of last update
  businessContext: string;         // User-provided description of use case
  excelFileName?: string;          // Original Excel file reference
  fields: FieldDefinition[];       // Field definitions
  relationships: RelationshipDefinition[];  // Discovered relationships
}

/**
 * Evaluation rule linked to a schema
 */
export interface SchemaEvaluationRule {
  id: number;
  type: 'Must Do' | 'Must Not Do';
  name: string;
  definition: string;
  evaluationCriteria: string;
  scoringStandard: {
    passed: number;
    failed: number;
    partial?: number;
  };
  examples: string[];
}

/**
 * Analytics view configuration linked to a schema
 */
export interface AnalyticsView {
  id: string;
  name: string;
  description: string;
  chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'trend';
  dimensionField?: string;         // Field ID to group by
  measureField?: string;           // Field ID to measure
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  filters?: Record<string, any>;
  enabled: boolean;
}

/**
 * Complete schema bundle for export/import
 */
export interface SchemaBundle {
  schema: SchemaDefinition;
  evaluationRules: SchemaEvaluationRule[];
  analyticsViews: AnalyticsView[];
  exportDate: string;              // ISO timestamp
  bundleVersion: string;           // Bundle format version
}

/**
 * Schema validation result
 */
export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Formula execution result
 */
export interface FormulaExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
}

/**
 * Field mapping for schema version migration
 */
export interface FieldMapping {
  oldFieldId: string;
  newFieldId: string;
  confidence: 'exact' | 'fuzzy' | 'manual';
  similarityScore?: number;
}

/**
 * Schema migration configuration
 */
export interface SchemaMigrationConfig {
  fromSchemaId: string;
  fromVersion: string;
  toSchemaId: string;
  toVersion: string;
  fieldMappings: FieldMapping[];
  affectedCallCount: number;
  removedFields: string[];
  addedFields: string[];
  modifiedFields: string[];
}
