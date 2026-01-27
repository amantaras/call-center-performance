/**
 * Relationship Inference Service
 * Uses Azure OpenAI to discover relationships between schema fields
 */

import type { SchemaDefinition, RelationshipDefinition } from '../types/schema';
import { preparePrompt } from '../lib/prompt-loader';
import { LLMCaller } from '../llmCaller';
import { loadAzureConfigFromCookie } from '../lib/azure-config-storage';
import { BrowserConfigManager } from './browser-config-manager';

/**
 * Infers simple correlative relationships from field names and types
 */
export async function inferSimpleRelationships(
  schema: SchemaDefinition
): Promise<RelationshipDefinition[]> {
  try {
    const config = loadAzureConfigFromCookie();
    if (!config || !config.openAI?.endpoint) {
      throw new Error('Azure OpenAI configuration not found');
    }
    
    // Check for valid auth - either API key or Entra ID
    const hasValidAuth = config.openAI.authType === 'entraId' || config.openAI.apiKey;
    if (!hasValidAuth) {
      throw new Error('Azure OpenAI authentication not configured');
    }

    const configManager = new BrowserConfigManager({
      endpoint: config.openAI.endpoint,
      apiKey: config.openAI.apiKey,
      deploymentName: config.openAI.deploymentName,
      apiVersion: config.openAI.apiVersion,
      authType: config.openAI.authType || 'apiKey',
      tenantId: config.openAI.tenantId,
      reasoningEffort: config.openAI.reasoningEffort
    });

    const llmCaller = new LLMCaller(configManager);

    const prompt = await preparePrompt('relationship-inference-simple', {
      businessContext: schema.businessContext,
      schemaFieldsJson: JSON.stringify(schema.fields, null, 2)
    });

    const schema_def = {
      name: 'SimpleRelationships',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          relationships: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: { type: 'string', enum: ['simple'] },
                description: { type: 'string' },
                involvedFields: {
                  type: 'array',
                  items: { type: 'string' }
                },
                reasoning: { type: 'string' }
              },
              required: ['id', 'type', 'description', 'involvedFields', 'reasoning'],
              additionalProperties: false
            }
          }
        },
        required: ['relationships'],
        additionalProperties: false
      }
    };

    const response = await llmCaller.callWithJsonValidation<{ relationships: RelationshipDefinition[] }>(
      [{ role: 'user', content: prompt }],
      { structuredOutputSchema: schema_def }
    );

    const result = response.parsed.relationships;
    
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
  
  /* DEPRECATED CODE
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
    const config = loadAzureConfigFromCookie();
    if (!config || !config.openAI?.endpoint) {
      throw new Error('Azure OpenAI configuration not found');
    }
    
    // Check for valid auth - either API key or Entra ID
    const hasValidAuth = config.openAI.authType === 'entraId' || config.openAI.apiKey;
    if (!hasValidAuth) {
      throw new Error('Azure OpenAI authentication not configured');
    }

    const configManager = new BrowserConfigManager({
      endpoint: config.openAI.endpoint,
      apiKey: config.openAI.apiKey,
      deploymentName: config.openAI.deploymentName,
      apiVersion: config.openAI.apiVersion,
      authType: config.openAI.authType || 'apiKey',
      tenantId: config.openAI.tenantId,
      reasoningEffort: config.openAI.reasoningEffort
    });

    const llmCaller = new LLMCaller(configManager);

    const prompt = await preparePrompt('relationship-inference-complex', {
      businessContext: schema.businessContext,
      schemaFieldsJson: JSON.stringify(schema.fields, null, 2),
      sampleRowCount: sampleData.length.toString(),
      sampleDataJson: JSON.stringify(sampleData.slice(0, 10), null, 2) // Limit to 10 samples
    });

    const schema_def = {
      name: 'ComplexRelationships',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          relationships: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: { type: 'string', enum: ['complex'] },
                description: { type: 'string' },
                formula: { type: 'string' },
                involvedFields: {
                  type: 'array',
                  items: { type: 'string' }
                },
                reasoning: { type: 'string' },
                outputType: { type: 'string', enum: ['number', 'string', 'boolean'] },
                exampleResult: { type: 'string' }
              },
              required: ['id', 'type', 'description', 'formula', 'involvedFields', 'reasoning', 'outputType', 'exampleResult'],
              additionalProperties: false
            }
          }
        },
        required: ['relationships'],
        additionalProperties: false
      }
    };

    const response = await llmCaller.callWithJsonValidation<{ relationships: RelationshipDefinition[] }>(
      [{ role: 'user', content: prompt }],
      { structuredOutputSchema: schema_def }
    );

    const result = response.parsed.relationships;
    
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
  
  /* DEPRECATED CODE
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
