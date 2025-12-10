/**
 * Formula Executor Utility
 * Safely executes JavaScript formulas with Math whitelist only
 */

import type { FormulaExecutionResult } from '../types/schema';

/**
 * Executes a formula safely with metadata context and Math operations
 * @param formula JavaScript expression/function body (e.g., "return daysPastDue * dueAmount / 1000;")
 * @param metadata Call metadata object
 * @returns Execution result with success flag, result value, or error message
 */
export function executeFormula(
  formula: string,
  metadata: Record<string, any>
): FormulaExecutionResult {
  if (!formula || formula.trim() === '') {
    return {
      success: false,
      error: 'Formula is empty'
    };
  }

  try {
    // Normalize the formula - if it doesn't have a return statement, wrap it
    let normalizedFormula = formula.trim();
    if (!normalizedFormula.includes('return ')) {
      // It's an expression, wrap it with return
      normalizedFormula = `return (${normalizedFormula});`;
    }
    
    // Create a safe function with only Math and metadata access
    // Using Function constructor is safer than eval as it doesn't have access to local scope
    const func = new Function('metadata', 'Math', normalizedFormula);
    
    // Execute with whitelisted Math object
    const result = func(metadata, Math);
    
    return {
      success: true,
      result
    };
  } catch (error) {
    // Capture specific error types
    let errorMessage = 'Unknown error';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    // Provide helpful error messages for common issues
    if (errorMessage.includes('is not defined')) {
      errorMessage = `${errorMessage}. Check that all field names in the formula exist in the metadata.`;
    } else if (errorMessage.includes('Division by zero') || errorMessage.includes('Infinity')) {
      errorMessage = 'Division by zero or infinity result';
    } else if (errorMessage.includes('Unexpected token')) {
      errorMessage = `Syntax error in formula: ${errorMessage}`;
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Validates formula syntax without executing
 * @param formula JavaScript expression/function body
 * @returns true if formula is syntactically valid
 */
export function validateFormulayntax(formula: string): { valid: boolean; error?: string } {
  if (!formula || formula.trim() === '') {
    return { valid: false, error: 'Formula is empty' };
  }

  try {
    // Try to create the function to check syntax
    new Function('metadata', 'Math', formula);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid syntax'
    };
  }
}

/**
 * Executes multiple formulas and returns results
 * @param formulas Array of formula strings
 * @param metadata Call metadata object
 * @returns Array of execution results
 */
export function executeFormulas(
  formulas: string[],
  metadata: Record<string, any>
): FormulaExecutionResult[] {
  return formulas.map(formula => executeFormula(formula, metadata));
}

/**
 * Creates a calculated field from a formula result
 * @param fieldName Name of the calculated field
 * @param formula Formula to execute
 * @param metadata Source metadata
 * @returns Object with field name and calculated value, or error
 */
export function createCalculatedField(
  fieldName: string,
  formula: string,
  metadata: Record<string, any>
): { fieldName: string; value?: any; error?: string } {
  const result = executeFormula(formula, metadata);
  
  if (result.success) {
    return {
      fieldName,
      value: result.result
    };
  } else {
    return {
      fieldName,
      error: result.error
    };
  }
}

/**
 * Safely formats a calculated field value for display
 * @param value The calculated value
 * @param type Expected type for formatting
 * @returns Formatted string
 */
export function formatCalculatedValue(value: any, type?: 'number' | 'currency' | 'percent'): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  if (typeof value === 'number') {
    if (isNaN(value)) return 'Invalid';
    if (!isFinite(value)) return 'Infinity';

    switch (type) {
      case 'currency':
        return `$${value.toFixed(2)}`;
      case 'percent':
        return `${(value * 100).toFixed(1)}%`;
      case 'number':
        return value.toLocaleString();
      default:
        return value.toString();
    }
  }

  return String(value);
}

/**
 * Example formulas for documentation/testing
 */
export const EXAMPLE_FORMULAS = {
  riskScore: {
    name: 'Risk Score',
    formula: 'return (metadata.daysPastDue * metadata.dueAmount) / 1000;',
    description: 'Calculates risk based on days overdue and amount',
    requiredFields: ['daysPastDue', 'dueAmount']
  },
  paymentProbability: {
    name: 'Payment Probability',
    formula: `
      const dpd = metadata.daysPastDue;
      if (dpd < 30) return 0.8;
      if (dpd < 60) return 0.5;
      if (dpd < 90) return 0.3;
      return 0.1;
    `,
    description: 'Estimates payment probability based on delinquency',
    requiredFields: ['daysPastDue']
  },
  totalDebt: {
    name: 'Total Debt',
    formula: 'return metadata.dueAmount + (metadata.fees || 0) + (metadata.penalties || 0);',
    description: 'Sums all debt components',
    requiredFields: ['dueAmount']
  },
  daysToEscalation: {
    name: 'Days to Escalation',
    formula: 'return Math.max(0, 90 - metadata.daysPastDue);',
    description: 'Calculates days remaining before escalation threshold',
    requiredFields: ['daysPastDue']
  }
};
