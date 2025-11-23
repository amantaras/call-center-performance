/**
 * Evaluation Rules Generator Service
 * Generates schema-specific evaluation rules using Azure OpenAI
 */

import type { SchemaDefinition, SchemaEvaluationRule } from '../types/schema';
// import { preparePrompt, extractJsonFromResponse } from '../lib/prompt-loader';
// import { callAzureOpenAI } from '../lib/llmCaller';

/**
 * Generates evaluation rules tailored to schema
 */
export async function generateEvaluationRules(
  schema: SchemaDefinition,
  sampleCallDescriptions?: string[]
): Promise<SchemaEvaluationRule[]> {
  // This function is deprecated - use EvaluationRulesWizard component instead
  throw new Error('Use EvaluationRulesWizard component for rule generation');
  /* try {
    // Get participant info
    const participant1Field = schema.fields.find(f => f.semanticRole === 'participant_1');
    const participant2Field = schema.fields.find(f => f.semanticRole === 'participant_2');
    
    if (!participant1Field || !participant2Field) {
      throw new Error('Schema must have participant_1 and participant_2 fields');
    }

    const prompt = await preparePrompt('rules-generation', {
      businessContext: schema.businessContext,
      schemaJson: JSON.stringify(schema, null, 2),
      participant1Label: participant1Field.participantLabel || participant1Field.displayName,
      participant1FieldName: participant1Field.name,
      participant2Label: participant2Field.participantLabel || participant2Field.displayName,
      participant2FieldName: participant2Field.name,
      sampleCallDescriptions: sampleCallDescriptions 
        ? sampleCallDescriptions.map((desc, idx) => `${idx + 1}. ${desc}`).join('\n')
        : 'No sample call descriptions provided'
    });

    const response = await callAzureOpenAI(
      [{ role: 'user', content: prompt }],
      'json_object'
    );

    const result = extractJsonFromResponse(response);
    
    // Validate array
    if (!Array.isArray(result)) {
      throw new Error('LLM response is not an array of rules');
    }

    return result.map((rule: any) => ({
      id: rule.id || Date.now() + Math.random(),
      type: rule.type || 'Must Do',
      name: rule.name || 'Unnamed Rule',
      definition: rule.definition || '',
      evaluationCriteria: rule.evaluationCriteria || '',
      scoringStandard: rule.scoringStandard || { passed: 10, failed: 0 },
      examples: rule.examples || []
    }));
  } catch (error) {
    console.error('Error generating evaluation rules:', error);
    throw new Error(`Failed to generate evaluation rules: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } */
}

/**
 * Saves evaluation rules for a schema to localStorage
 */
export function saveRulesForSchema(schemaId: string, rules: SchemaEvaluationRule[]): void {
  try {
    const key = `evaluation-criteria-${schemaId}`;
    localStorage.setItem(key, JSON.stringify(rules));
  } catch (error) {
    console.error('Error saving evaluation rules:', error);
    throw error;
  }
}

/**
 * Loads evaluation rules for a schema from localStorage
 */
export function loadRulesForSchema(schemaId: string): SchemaEvaluationRule[] | null {
  try {
    const key = `evaluation-criteria-${schemaId}`;
    const json = localStorage.getItem(key);
    if (!json) return null;
    return JSON.parse(json);
  } catch (error) {
    console.error('Error loading evaluation rules:', error);
    return null;
  }
}

/**
 * Checks if evaluation rules exist for a schema
 */
export function hasRulesForSchema(schemaId: string): boolean {
  return loadRulesForSchema(schemaId) !== null;
}

/**
 * Deletes evaluation rules for a schema
 */
export function deleteRulesForSchema(schemaId: string): void {
  try {
    const key = `evaluation-criteria-${schemaId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error deleting evaluation rules:', error);
  }
}

/**
 * Generates a single new rule based on user input
 */
export async function generateSingleRule(
  schema: SchemaDefinition,
  ruleName: string,
  userGuidance?: string
): Promise<SchemaEvaluationRule> {
  // This function is deprecated - use EvaluationRulesWizard component instead
  throw new Error('Use EvaluationRulesWizard component for rule generation');
  /* try {
    const participant1Field = schema.fields.find(f => f.semanticRole === 'participant_1');
    const participant2Field = schema.fields.find(f => f.semanticRole === 'participant_2');

    const prompt = `You are an expert QA framework designer. Generate a single detailed evaluation rule for a call quality system.

Business Context: ${schema.businessContext}

Participants:
- ${participant1Field?.participantLabel || 'Participant 1'}: ${participant1Field?.displayName}
- ${participant2Field?.participantLabel || 'Participant 2'}: ${participant2Field?.displayName}

Rule Name: ${ruleName}
${userGuidance ? `User Guidance: ${userGuidance}` : ''}

Generate a complete evaluation rule with the following JSON structure:

{
  "type": "Must Do" or "Must Not Do",
  "name": "${ruleName}",
  "definition": "Clear 1-2 sentence description of what this rule evaluates",
  "evaluationCriteria": "Detailed criteria with bullet points on how to assess compliance",
  "scoringStandard": {
    "passed": 10,
    "partial": 5,
    "failed": 0
  },
  "examples": [
    "Positive example",
    "Negative example",
    "Edge case example"
  ]
}

Ensure the rule is specific, measurable, and relevant to the business context.`;

    const response = await callAzureOpenAI(
      [{ role: 'user', content: prompt }],
      'json_object'
    );

    const result = extractJsonFromResponse(response);
    
    return {
      id: Date.now(),
      type: result.type || 'Must Do',
      name: result.name || ruleName,
      definition: result.definition || '',
      evaluationCriteria: result.evaluationCriteria || '',
      scoringStandard: result.scoringStandard || { passed: 10, failed: 0 },
      examples: result.examples || []
    };
  } catch (error) {
    console.error('Error generating single rule:', error);
    throw new Error(`Failed to generate rule: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } */
}
