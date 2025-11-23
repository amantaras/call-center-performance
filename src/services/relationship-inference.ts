/**
 * Relationship Inference Service
 * Uses Azure OpenAI to discover relationships between schema fields
 */

import type { SchemaDefinition, RelationshipDefinition } from '../types/schema';
import { preparePrompt, extractJsonFromResponse } from '../lib/prompt-loader';
import { callAzureOpenAI } from '../lib/llmCaller';

/**
 * Infers simple correlative relationships from field names and types
 */
export async function inferSimpleRelationships(
  schema: SchemaDefinition
): Promise<RelationshipDefinition[]> {
  try {
    const prompt = await preparePrompt('relationship-inference-simple', {
      businessContext: schema.businessContext,
      schemaFieldsJson: JSON.stringify(schema.fields, null, 2)
    });

    const response = await callAzureOpenAI(
      [{ role: 'user', content: prompt }],
      'json_object'
    );

    const result = extractJsonFromResponse(response);
    
    // Validate and return relationships
    if (Array.isArray(result)) {
      return result.map((rel: any) => ({
        id: rel.id || `simple_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'simple' as const,
        description: rel.description || '',
        involvedFields: rel.involvedFields || []
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error inferring simple relationships:', error);
    throw new Error(`Failed to infer simple relationships: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Infers complex calculable relationships from field data and patterns
 */
export async function inferComplexRelationships(
  schema: SchemaDefinition,
  sampleData: Record<string, any>[]
): Promise<RelationshipDefinition[]> {
  try {
    const prompt = await preparePrompt('relationship-inference-complex', {
      businessContext: schema.businessContext,
      schemaFieldsJson: JSON.stringify(schema.fields, null, 2),
      sampleRowCount: sampleData.length.toString(),
      sampleDataJson: JSON.stringify(sampleData, null, 2)
    });

    const response = await callAzureOpenAI(
      [{ role: 'user', content: prompt }],
      'json_object'
    );

    const result = extractJsonFromResponse(response);
    
    // Validate and return relationships
    if (Array.isArray(result)) {
      return result.map((rel: any) => ({
        id: rel.id || `complex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'complex' as const,
        description: rel.description || '',
        formula: rel.formula || '',
        involvedFields: rel.involvedFields || []
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error inferring complex relationships:', error);
    throw new Error(`Failed to infer complex relationships: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Infers both simple and complex relationships
 */
export async function inferAllRelationships(
  schema: SchemaDefinition,
  sampleData?: Record<string, any>[]
): Promise<{
  simple: RelationshipDefinition[];
  complex: RelationshipDefinition[];
  all: RelationshipDefinition[];
}> {
  const simple = await inferSimpleRelationships(schema);
  
  let complex: RelationshipDefinition[] = [];
  if (sampleData && sampleData.length > 0) {
    complex = await inferComplexRelationships(schema, sampleData);
  }
  
  return {
    simple,
    complex,
    all: [...simple, ...complex]
  };
}
