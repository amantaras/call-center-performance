/**
 * Prompt Template Loader
 * Loads prompt templates from the prompts folder and performs variable substitution
 */

/**
 * Loads a prompt template from file
 */
export async function loadPromptTemplate(templateName: string): Promise<string> {
  try {
    const response = await fetch(`/src/prompts/${templateName}.prompt.md`);
    if (!response.ok) {
      throw new Error(`Failed to load prompt template: ${templateName}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`Error loading prompt template ${templateName}:`, error);
    throw new Error(`Could not load prompt template: ${templateName}`);
  }
}

/**
 * Substitutes variables in a prompt template
 * Variables are in format {{variableName}}
 */
export function substitutePromptVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  }
  
  return result;
}

/**
 * Loads and prepares a prompt with variable substitution
 */
export async function preparePrompt(
  templateName: string,
  variables: Record<string, string>
): Promise<string> {
  const template = await loadPromptTemplate(templateName);
  return substitutePromptVariables(template, variables);
}

/**
 * Extracts JSON from LLM response (handles markdown code blocks)
 */
export function extractJsonFromResponse(response: string): any {
  // Try to parse as-is first
  try {
    return JSON.parse(response);
  } catch {
    // Look for JSON in markdown code blocks
    const jsonBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      return JSON.parse(jsonBlockMatch[1]);
    }
    
    // Look for JSON without markdown
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Could not extract JSON from LLM response');
  }
}
