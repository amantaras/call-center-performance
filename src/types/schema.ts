/**
 * Schema System Type Definitions
 * Defines the structure for dynamic, LLM-powered schema configuration
 */

/**
 * Output field definition for AI insight categories
 */
export interface InsightOutputField {
  id: string;                      // Unique field identifier
  name: string;                    // Display name
  type: 'string' | 'number' | 'enum' | 'text' | 'tags' | 'boolean';
  enumValues?: string[];           // For enum type - list of possible values
  description: string;             // Description for LLM to understand expected output
}

/**
 * AI Insight category configuration
 * Defines how insights are generated and displayed for a specific analysis area
 */
export interface InsightCategoryConfig {
  id: string;                      // Unique identifier (e.g., "risk-assessment")
  name: string;                    // Display name (e.g., "Risk Assessment")
  description: string;             // Description of what this insight analyzes
  icon: string;                    // Emoji icon for display
  color: string;                   // Hex color for card styling
  promptInstructions: string;      // Detailed prompt instructions for LLM
  outputFields: InsightOutputField[];  // Expected output structure
  enabled: boolean;                // Whether this insight is active
}

/**
 * Topic definition for call categorization taxonomy
 */
export interface TopicDefinition {
  id: string;                      // Unique topic identifier
  name: string;                    // Topic name (e.g., "Billing Issues")
  description: string;             // Description to help LLM classify
  keywords?: string[];             // Optional keywords to improve matching
  parentId?: string;               // Parent topic ID for hierarchy
  children?: TopicDefinition[];    // Child topics (for nested display)
  color?: string;                  // Optional color for visualization
}

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
 * Dependency operators for conditional field display
 */
export type DependencyOperator = 
  | 'equals' 
  | 'notEquals' 
  | 'contains' 
  | 'greaterThan' 
  | 'lessThan' 
  | 'isEmpty' 
  | 'isNotEmpty';

/**
 * Field dependency configuration for conditional display/validation
 */
export interface FieldDependency {
  fieldId: string;                 // ID of the field this depends on
  operator: DependencyOperator;    // Comparison operator
  value: any;                      // Value to compare against (ignored for isEmpty/isNotEmpty)
}

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
  
  // Conditional field dependencies (single-level)
  dependsOn?: FieldDependency;     // Condition for when this field is visible
  dependsOnBehavior?: 'show' | 'require';  // 'show' = visibility only, 'require' = also makes field required when visible
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
  
  // Display and behavior properties
  displayName?: string;            // Human-readable name for UI display (defaults to id if not provided)
  displayInTable?: boolean;        // Show as virtual column in calls table (for complex relationships)
  enableAnalytics?: boolean;       // Allow using calculated value as analytics measure/dimension
  useInPrompt?: boolean;           // Include relationship context in AI evaluation prompts
  outputType?: 'number' | 'string' | 'boolean';  // Expected output type for complex formulas
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
  audioFolderPath?: string;        // Schema-specific audio folder path (e.g., "/audio/debt-collection")
  fields: FieldDefinition[];       // Field definitions
  relationships: RelationshipDefinition[];  // Discovered relationships
  topicTaxonomy?: TopicDefinition[];  // Hierarchical topic taxonomy for call classification
  insightCategories?: InsightCategoryConfig[];  // AI insight categories for call analysis
  
  // Template tracking for versioning and updates
  templateId?: string;             // ID of the template this schema was created from
  templateVersion?: string;        // Version of the template when schema was created
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
  chartType: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'trend';
  dimensionField?: string;         // Field ID to group by
  measureField?: string;           // Field ID to measure
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  filters?: Record<string, any>;
  enabled: boolean;
}

/**
 * Get audio folder path for a schema
 * Returns schema-specific subfolder path
 */
export function getSchemaAudioPath(schema: SchemaDefinition): string {
  // If schema has custom audio path, use it
  if (schema.audioFolderPath) {
    return schema.audioFolderPath;
  }
  
  // Generate path from schema ID: /audio/{schema-id}
  const sanitizedId = schema.id.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  return `/audio/${sanitizedId}`;
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
