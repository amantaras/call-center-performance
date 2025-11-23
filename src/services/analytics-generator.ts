/**
 * Analytics Views Generator Service
 * Generates analytics view configurations using Azure OpenAI
 */

import type { SchemaDefinition, AnalyticsView } from '../types/schema';
// These imports are for deprecated functions - use AnalyticsConfigWizard component instead
// import { preparePrompt, extractJsonFromResponse } from '../lib/prompt-loader';
// import { callAzureOpenAI } from '../lib/llmCaller';

/**
 * Generates analytics views tailored to schema and relationships
 */
export async function generateAnalyticsViews(
  schema: SchemaDefinition
): Promise<AnalyticsView[]> {
  try {
    const prompt = await preparePrompt('analytics-generation', {
      businessContext: schema.businessContext,
      schemaJson: JSON.stringify(schema, null, 2),
      relationshipsJson: JSON.stringify(schema.relationships || [], null, 2)
    });

    const response = await callAzureOpenAI(
      [{ role: 'user', content: prompt }],
      'json_object'
    );

    const result = extractJsonFromResponse(response);
    
    // Validate array
    if (!Array.isArray(result)) {
      throw new Error('LLM response is not an array of analytics views');
    }

    return result.map((view: any) => ({
      id: view.id || `view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: view.name || 'Unnamed View',
      description: view.description || '',
      chartType: view.chartType || 'bar',
      dimensionField: view.dimensionField,
      measureField: view.measureField,
      aggregation: view.aggregation || 'count',
      filters: view.filters || {},
      enabled: view.enabled !== false // Default to true
    }));
  } catch (error) {
    console.error('Error generating analytics views:', error);
    throw new Error(`Failed to generate analytics views: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Saves analytics views for a schema to localStorage
 */
export function saveAnalyticsViewsForSchema(schemaId: string, views: AnalyticsView[]): void {
  try {
    const key = `analytics-views-${schemaId}`;
    localStorage.setItem(key, JSON.stringify(views));
  } catch (error) {
    console.error('Error saving analytics views:', error);
    throw error;
  }
}

/**
 * Loads analytics views for a schema from localStorage
 */
export function loadAnalyticsViewsForSchema(schemaId: string): AnalyticsView[] | null {
  try {
    const key = `analytics-views-${schemaId}`;
    const json = localStorage.getItem(key);
    if (!json) return null;
    return JSON.parse(json);
  } catch (error) {
    console.error('Error loading analytics views:', error);
    return null;
  }
}

/**
 * Checks if analytics views exist for a schema
 */
export function hasAnalyticsViewsForSchema(schemaId: string): boolean {
  return loadAnalyticsViewsForSchema(schemaId) !== null;
}

/**
 * Deletes analytics views for a schema
 */
export function deleteAnalyticsViewsForSchema(schemaId: string): void {
  try {
    const key = `analytics-views-${schemaId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error deleting analytics views:', error);
  }
}

/**
 * Updates enabled status for a specific view
 */
export function updateViewEnabledStatus(
  schemaId: string,
  viewId: string,
  enabled: boolean
): void {
  const views = loadAnalyticsViewsForSchema(schemaId);
  if (!views) return;

  const updated = views.map(view => 
    view.id === viewId ? { ...view, enabled } : view
  );

  saveAnalyticsViewsForSchema(schemaId, updated);
}

/**
 * Attempts to map analytics views from old schema to new schema version
 */
export function migrateAnalyticsViews(
  oldSchemaId: string,
  newSchemaId: string,
  fieldMapping: Record<string, string>
): { success: boolean; migratedViews?: AnalyticsView[]; errors?: string[] } {
  try {
    const oldViews = loadAnalyticsViewsForSchema(oldSchemaId);
    if (!oldViews || oldViews.length === 0) {
      return { success: true, migratedViews: [] };
    }

    const errors: string[] = [];
    const migratedViews: AnalyticsView[] = [];

    for (const view of oldViews) {
      let dimensionField = view.dimensionField;
      let measureField = view.measureField;
      let migrationSuccessful = true;

      // Map dimension field if it exists in mapping
      if (dimensionField && fieldMapping[dimensionField]) {
        dimensionField = fieldMapping[dimensionField];
      } else if (dimensionField && !fieldMapping[dimensionField]) {
        errors.push(`View "${view.name}": dimension field "${dimensionField}" has no mapping`);
        migrationSuccessful = false;
      }

      // Map measure field if it exists in mapping
      if (measureField && fieldMapping[measureField]) {
        measureField = fieldMapping[measureField];
      } else if (measureField && !fieldMapping[measureField]) {
        errors.push(`View "${view.name}": measure field "${measureField}" has no mapping`);
        migrationSuccessful = false;
      }

      if (migrationSuccessful) {
        migratedViews.push({
          ...view,
          dimensionField,
          measureField
        });
      }
    }

    if (migratedViews.length > 0) {
      saveAnalyticsViewsForSchema(newSchemaId, migratedViews);
    }

    return {
      success: errors.length === 0,
      migratedViews,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    return {
      success: false,
      errors: [`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}
