/**
 * Insight Type Generator Service
 * Generates custom insight categories tailored to schema
 */

import type { SchemaDefinition } from '../types/schema';
// These imports are for deprecated functions - not currently used
// import { preparePrompt, extractJsonFromResponse } from '../lib/prompt-loader';
// import { callAzureOpenAI } from '../lib/llmCaller';

export interface InsightCategory {
  id: string;
  name: string;
  description: string;
  basedOnFields: string[];
  outputStructure: Record<string, string>;
  analysisPrompt: string;
}

export interface GeneratedInsights {
  insightCategories: InsightCategory[];
  recommendedUsage: string;
}

/**
 * Generates custom insight types from schema definition
 */
export async function generateFromSchema(
  schema: SchemaDefinition
): Promise<GeneratedInsights> {
  try {
    const prompt = await preparePrompt('insight-generation', {
      businessContext: schema.businessContext,
      schemaJson: JSON.stringify(schema, null, 2)
    });

    const response = await callAzureOpenAI(
      [{ role: 'user', content: prompt }],
      'json_object'
    );

    const result = extractJsonFromResponse(response);
    
    // Validate structure
    if (!result.insightCategories || !Array.isArray(result.insightCategories)) {
      throw new Error('Invalid response: missing insightCategories array');
    }

    return {
      insightCategories: result.insightCategories,
      recommendedUsage: result.recommendedUsage || ''
    };
  } catch (error) {
    console.error('Error generating insights:', error);
    throw new Error(`Failed to generate insight types: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Saves generated insights to localStorage for a schema
 */
export function saveInsightsForSchema(schemaId: string, insights: GeneratedInsights): void {
  try {
    const key = `insights-${schemaId}`;
    localStorage.setItem(key, JSON.stringify(insights));
  } catch (error) {
    console.error('Error saving insights:', error);
    throw error;
  }
}

/**
 * Loads insights for a schema from localStorage
 */
export function loadInsightsForSchema(schemaId: string): GeneratedInsights | null {
  try {
    const key = `insights-${schemaId}`;
    const json = localStorage.getItem(key);
    if (!json) return null;
    return JSON.parse(json);
  } catch (error) {
    console.error('Error loading insights:', error);
    return null;
  }
}

/**
 * Checks if insights exist for a schema
 */
export function hasInsightsForSchema(schemaId: string): boolean {
  return loadInsightsForSchema(schemaId) !== null;
}

/**
 * Deletes insights for a schema
 */
export function deleteInsightsForSchema(schemaId: string): void {
  try {
    const key = `insights-${schemaId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error deleting insights:', error);
  }
}
