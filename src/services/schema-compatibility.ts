/**
 * Schema Compatibility Service
 * Handles automatic migration of existing debt collection calls to the new schema system
 */

import type { CallRecord, CallMetadata } from '../types/call';
import type { SchemaDefinition, FieldDefinition } from '../types/schema';

const DEBT_COLLECTION_SCHEMA_ID = 'debt-collection-v1';
const DEBT_COLLECTION_SCHEMA_VERSION = '1.0.0';

/**
 * Generates the default Debt Collection schema from hardcoded CallMetadata
 */
export function generateDebtCollectionSchema(): SchemaDefinition {
  const fields: FieldDefinition[] = [
    // System fields
    {
      id: 'time',
      name: 'time',
      displayName: 'Call Time',
      type: 'string',
      semanticRole: 'timestamp',
      required: false,
      showInTable: true,
      useInPrompt: false,
      enableAnalytics: true,
      cardinalityHint: 'high'
    },
    {
      id: 'bill_id',
      name: 'billId',
      displayName: 'Bill ID',
      type: 'string',
      semanticRole: 'identifier',
      required: false,
      showInTable: false,
      useInPrompt: false,
      enableAnalytics: false,
      cardinalityHint: 'high'
    },
    {
      id: 'order_id',
      name: 'orderId',
      displayName: 'Order ID',
      type: 'string',
      semanticRole: 'identifier',
      required: false,
      showInTable: false,
      useInPrompt: false,
      enableAnalytics: false,
      cardinalityHint: 'high'
    },
    {
      id: 'user_id',
      name: 'userId',
      displayName: 'User ID',
      type: 'string',
      semanticRole: 'identifier',
      required: false,
      showInTable: false,
      useInPrompt: false,
      enableAnalytics: false,
      cardinalityHint: 'high'
    },
    {
      id: 'file_tag',
      name: 'fileTag',
      displayName: 'File Tag',
      type: 'string',
      semanticRole: 'identifier',
      required: false,
      showInTable: false,
      useInPrompt: false,
      enableAnalytics: false,
      cardinalityHint: 'high'
    },
    {
      id: 'audio_url',
      name: 'audioUrl',
      displayName: 'Audio URL',
      type: 'string',
      semanticRole: 'freeform',
      required: false,
      showInTable: false,
      useInPrompt: false,
      enableAnalytics: false
    },
    // Participant fields
    {
      id: 'agent_name',
      name: 'agentName',
      displayName: 'Agent Name',
      type: 'string',
      semanticRole: 'participant_1',
      participantLabel: 'Agent',
      required: true,
      showInTable: true,
      useInPrompt: true,
      enableAnalytics: true,
      cardinalityHint: 'low'
    },
    {
      id: 'borrower_name',
      name: 'borrowerName',
      displayName: 'Borrower Name',
      type: 'string',
      semanticRole: 'participant_2',
      participantLabel: 'Borrower',
      required: true,
      showInTable: true,
      useInPrompt: true,
      enableAnalytics: false,
      cardinalityHint: 'high'
    },
    // Classification fields
    {
      id: 'product',
      name: 'product',
      displayName: 'Product',
      type: 'select',
      semanticRole: 'classification',
      required: true,
      showInTable: true,
      useInPrompt: true,
      enableAnalytics: true,
      selectOptions: ['CashNow', 'SNPL', 'EasyCash'],
      cardinalityHint: 'low'
    },
    {
      id: 'customer_type',
      name: 'customerType',
      displayName: 'Customer Type',
      type: 'string',
      semanticRole: 'classification',
      required: false,
      showInTable: false,
      useInPrompt: true,
      enableAnalytics: true,
      cardinalityHint: 'low'
    },
    {
      id: 'follow_up_status',
      name: 'followUpStatus',
      displayName: 'Follow-up Status',
      type: 'string',
      semanticRole: 'classification',
      required: true,
      showInTable: true,
      useInPrompt: true,
      enableAnalytics: true,
      cardinalityHint: 'low'
    },
    // Dimension fields
    {
      id: 'nationality',
      name: 'nationality',
      displayName: 'Nationality',
      type: 'string',
      semanticRole: 'dimension',
      required: true,
      showInTable: true,
      useInPrompt: true,
      enableAnalytics: true,
      cardinalityHint: 'medium'
    },
    // Metric fields
    {
      id: 'days_past_due',
      name: 'daysPastDue',
      displayName: 'Days Past Due',
      type: 'number',
      semanticRole: 'metric',
      required: true,
      showInTable: true,
      useInPrompt: true,
      enableAnalytics: true,
      cardinalityHint: 'high'
    },
    {
      id: 'due_amount',
      name: 'dueAmount',
      displayName: 'Due Amount',
      type: 'number',
      semanticRole: 'metric',
      required: true,
      showInTable: true,
      useInPrompt: true,
      enableAnalytics: true,
      cardinalityHint: 'high'
    }
  ];

  const schema: SchemaDefinition = {
    id: DEBT_COLLECTION_SCHEMA_ID,
    name: 'Debt Collection',
    version: DEBT_COLLECTION_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    businessContext: 'Debt collection compliance and performance evaluation. Assess agent communication quality, regulatory compliance, and customer interaction effectiveness in collection calls.',
    fields,
    relationships: [
      {
        id: 'risk_calculation',
        type: 'complex',
        description: 'Risk score calculated from days past due and amount owed',
        formula: 'return (metadata.daysPastDue * metadata.dueAmount) / 1000;',
        involvedFields: ['days_past_due', 'due_amount']
      },
      {
        id: 'agent_performance',
        type: 'simple',
        description: 'Agent performance correlates with overall call score',
        involvedFields: ['agent_name']
      },
      {
        id: 'product_dynamics',
        type: 'simple',
        description: 'Product type affects call approach and success rates',
        involvedFields: ['product', 'follow_up_status']
      },
      {
        id: 'cultural_factors',
        type: 'simple',
        description: 'Nationality influences communication style and outcomes',
        involvedFields: ['nationality', 'follow_up_status']
      }
    ]
  };

  return schema;
}

/**
 * Detects if existing calls need migration
 */
export function needsMigration(calls: CallRecord[]): boolean {
  if (!calls || calls.length === 0) return false;
  
  // Check if any call lacks schemaId (old format)
  return calls.some(call => !call.schemaId || !call.schemaVersion);
}

/**
 * Migrates a single call from old format to new schema format
 */
export function migrateCall(call: CallRecord): CallRecord {
  // If already migrated, return as-is
  if (call.schemaId && call.schemaVersion) {
    return call;
  }

  // Create migrated call with schema metadata
  const migratedCall: CallRecord = {
    ...call,
    schemaId: DEBT_COLLECTION_SCHEMA_ID,
    schemaVersion: DEBT_COLLECTION_SCHEMA_VERSION,
    // Metadata is already in correct format (Record<string, any>)
    // but we ensure it's properly structured
    metadata: call.metadata as Record<string, any>
  };

  return migratedCall;
}

/**
 * Migrates all calls and returns migration summary
 */
export function migrateAllCalls(calls: CallRecord[]): {
  migratedCalls: CallRecord[];
  count: number;
  schemaId: string;
  schemaVersion: string;
} {
  const migratedCalls = calls.map(call => migrateCall(call));
  const count = migratedCalls.filter(call => 
    call.schemaId === DEBT_COLLECTION_SCHEMA_ID
  ).length;

  return {
    migratedCalls,
    count,
    schemaId: DEBT_COLLECTION_SCHEMA_ID,
    schemaVersion: DEBT_COLLECTION_SCHEMA_VERSION
  };
}

/**
 * Checks if the Debt Collection schema exists in localStorage
 */
export function hasDebtCollectionSchema(): boolean {
  try {
    const schemasJson = localStorage.getItem('call-schemas');
    if (!schemasJson) return false;
    
    const schemas: SchemaDefinition[] = JSON.parse(schemasJson);
    return schemas.some(s => s.id === DEBT_COLLECTION_SCHEMA_ID);
  } catch (error) {
    console.error('Error checking for Debt Collection schema:', error);
    return false;
  }
}

/**
 * Saves the Debt Collection schema to localStorage
 */
export function saveDebtCollectionSchema(): void {
  try {
    const schema = generateDebtCollectionSchema();
    const schemasJson = localStorage.getItem('call-schemas');
    const schemas: SchemaDefinition[] = schemasJson ? JSON.parse(schemasJson) : [];
    
    // Only add if it doesn't exist
    if (!schemas.some(s => s.id === DEBT_COLLECTION_SCHEMA_ID)) {
      schemas.push(schema);
      localStorage.setItem('call-schemas', JSON.stringify(schemas));
      console.log('Debt Collection schema created:', schema.id);
    }
  } catch (error) {
    console.error('Error saving Debt Collection schema:', error);
    throw error;
  }
}

/**
 * Sets Debt Collection as the active schema
 */
export function setDebtCollectionAsActive(): void {
  try {
    localStorage.setItem('active-schema-id', DEBT_COLLECTION_SCHEMA_ID);
    console.log('Set active schema:', DEBT_COLLECTION_SCHEMA_ID);
  } catch (error) {
    console.error('Error setting active schema:', error);
    throw error;
  }
}

/**
 * Main migration function - runs the complete migration process
 */
export function runMigration(calls: CallRecord[]): {
  success: boolean;
  message: string;
  migratedCalls?: CallRecord[];
  count?: number;
} {
  try {
    // Check if migration is needed
    if (!needsMigration(calls)) {
      return {
        success: true,
        message: 'No migration needed - all calls already use schema system'
      };
    }

    // Generate and save Debt Collection schema if it doesn't exist
    if (!hasDebtCollectionSchema()) {
      saveDebtCollectionSchema();
    }

    // Set as active schema
    setDebtCollectionAsActive();

    // Migrate all calls
    const result = migrateAllCalls(calls);

    return {
      success: true,
      message: `Successfully migrated ${result.count} call(s) to schema "${DEBT_COLLECTION_SCHEMA_ID}" v${DEBT_COLLECTION_SCHEMA_VERSION}`,
      migratedCalls: result.migratedCalls,
      count: result.count
    };
  } catch (error) {
    console.error('Migration failed:', error);
    return {
      success: false,
      message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
