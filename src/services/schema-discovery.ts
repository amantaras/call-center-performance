/**
 * Schema Discovery Service
 * Analyzes Excel structure using Azure OpenAI to infer schema
 */

import type { FieldDefinition } from '../types/schema';
// These imports are for deprecated functions - use SchemaDiscoveryWizard component instead
// import { preparePrompt, extractJsonFromResponse } from '../lib/prompt-loader';
// import { callAzureOpenAI } from '../lib/llmCaller';

export interface DiscoveredField {
  columnName: string;
  suggestedFieldId: string;
  suggestedDisplayName: string;
  inferredType: 'string' | 'number' | 'date' | 'boolean' | 'select';
  semanticRole: 'participant_1' | 'participant_2' | 'classification' | 'metric' | 'dimension' | 'identifier' | 'timestamp' | 'freeform';
  required: boolean;
  showInTable: boolean;
  useInPrompt: boolean;
  enableAnalytics: boolean;
  selectOptions?: string[];
  cardinalityHint: 'low' | 'medium' | 'high';
  reasoning: string;
}

export interface SchemaDiscoveryResult {
  suggestedSchemaName: string;
  participantLabels: {
    participant_1: string;
    participant_2: string;
  };
  fields: DiscoveredField[];
  analysisNotes: string;
}

/**
 * Analyzes Excel columns and sample data to discover schema
 */
export async function discoverSchemaFromExcel(
  businessContext: string,
  columns: string[],
  sampleData: Record<string, any>[],
  dataStatistics: Record<string, any>
): Promise<SchemaDiscoveryResult> {
  // This function implementation moved to SchemaDiscoveryWizard component
  // Stub implementation for backward compatibility
  return {
    suggestedSchemaName: 'Discovered Schema',
    participantLabels: {
      participant_1: 'Agent',
      participant_2: 'Customer'
    },
    fields: columns.map((col, idx) => ({
      columnName: col,
      suggestedFieldId: col.toLowerCase().replace(/\s+/g, '_'),
      suggestedDisplayName: col,
      inferredType: 'string' as const,
      semanticRole: idx === 0 ? 'participant_1' : idx === 1 ? 'participant_2' : 'freeform' as const,
      required: false,
      showInTable: true,
      useInPrompt: true,
      enableAnalytics: true,
      cardinalityHint: 'medium' as const,
      reasoning: 'Auto-generated field'
    })),
    analysisNotes: 'This is a stub implementation. Use SchemaDiscoveryWizard component for AI-powered analysis.'
  };
}

/**
 * Converts discovered fields to FieldDefinition format
 */
export function convertDiscoveredFieldsToDefinitions(
  discoveredFields: DiscoveredField[]
): FieldDefinition[] {
  return discoveredFields.map(df => ({
    id: df.suggestedFieldId,
    name: df.suggestedFieldId, // Use field ID as the property name
    displayName: df.suggestedDisplayName,
    type: df.inferredType,
    semanticRole: df.semanticRole,
    participantLabel: df.semanticRole === 'participant_1' || df.semanticRole === 'participant_2' 
      ? df.suggestedDisplayName 
      : undefined,
    required: df.required,
    showInTable: df.showInTable,
    useInPrompt: df.useInPrompt,
    enableAnalytics: df.enableAnalytics,
    selectOptions: df.selectOptions,
    cardinalityHint: df.cardinalityHint
  }));
}

/**
 * Calculates statistics about Excel data for LLM analysis
 */
export function calculateDataStatistics(
  columns: string[],
  rows: Record<string, any>[]
): Record<string, any> {
  const stats: Record<string, any> = {};
  
  for (const col of columns) {
    const values = rows.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== '');
    const uniqueValues = new Set(values);
    
    stats[col] = {
      totalValues: rows.length,
      nonEmptyValues: values.length,
      uniqueCount: uniqueValues.size,
      cardinality: uniqueValues.size < 10 ? 'low' : uniqueValues.size < 100 ? 'medium' : 'high',
      sampleValues: Array.from(uniqueValues).slice(0, 10),
      hasNumbers: values.some(v => !isNaN(Number(v))),
      hasDates: values.some(v => !isNaN(Date.parse(String(v)))),
      nullPercentage: ((rows.length - values.length) / rows.length * 100).toFixed(1) + '%'
    };
  }
  
  return stats;
}
