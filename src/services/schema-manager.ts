/**
 * Schema Manager Service
 * CRUD operations for schema definitions with localStorage persistence
 */

import type { SchemaDefinition } from '../types/schema';
import { validateSchemaDefinition, canDeleteSchema } from './schema-validation';

const SCHEMAS_KEY = 'call-schemas';
const ACTIVE_SCHEMA_KEY = 'active-schema-id';

/**
 * Gets all schemas from localStorage
 */
export function getAllSchemas(): SchemaDefinition[] {
  try {
    const schemasJson = localStorage.getItem(SCHEMAS_KEY);
    if (!schemasJson) return [];
    return JSON.parse(schemasJson);
  } catch (error) {
    console.error('Error loading schemas:', error);
    return [];
  }
}

/**
 * Gets a schema by ID
 */
export function getSchemaById(id: string): SchemaDefinition | null {
  const schemas = getAllSchemas();
  return schemas.find(s => s.id === id) || null;
}

/**
 * Gets the active schema ID
 */
export function getActiveSchemaId(): string | null {
  return localStorage.getItem(ACTIVE_SCHEMA_KEY);
}

/**
 * Gets the active schema
 */
export function getActiveSchema(): SchemaDefinition | null {
  const activeId = getActiveSchemaId();
  if (!activeId) return null;
  return getSchemaById(activeId);
}

/**
 * Sets the active schema
 */
export function setActiveSchema(schemaId: string): { success: boolean; error?: string } {
  const schema = getSchemaById(schemaId);
  if (!schema) {
    return { success: false, error: `Schema with ID "${schemaId}" not found` };
  }
  
  try {
    localStorage.setItem(ACTIVE_SCHEMA_KEY, schemaId);
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: `Failed to set active schema: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Creates a new schema
 */
export function createSchema(schema: SchemaDefinition): { success: boolean; error?: string } {
  // Validate schema structure
  const validation = validateSchemaDefinition(schema);
  if (!validation.valid) {
    return { 
      success: false, 
      error: `Schema validation failed: ${validation.errors.join(', ')}` 
    };
  }

  // Check for duplicate ID
  const existing = getSchemaById(schema.id);
  if (existing) {
    return { success: false, error: `Schema with ID "${schema.id}" already exists` };
  }

  try {
    const schemas = getAllSchemas();
    schemas.push(schema);
    localStorage.setItem(SCHEMAS_KEY, JSON.stringify(schemas));
    
    // If this is the first schema, set it as active
    if (schemas.length === 1) {
      setActiveSchema(schema.id);
    }
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: `Failed to create schema: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Updates an existing schema
 */
export function updateSchema(schema: SchemaDefinition): { success: boolean; error?: string } {
  // Validate schema structure
  const validation = validateSchemaDefinition(schema);
  if (!validation.valid) {
    return { 
      success: false, 
      error: `Schema validation failed: ${validation.errors.join(', ')}` 
    };
  }

  try {
    const schemas = getAllSchemas();
    const index = schemas.findIndex(s => s.id === schema.id);
    
    if (index === -1) {
      return { success: false, error: `Schema with ID "${schema.id}" not found` };
    }

    // Update timestamp
    schema.updatedAt = new Date().toISOString();
    
    schemas[index] = schema;
    localStorage.setItem(SCHEMAS_KEY, JSON.stringify(schemas));
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: `Failed to update schema: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Deletes a schema (only if no calls exist)
 */
export function deleteSchema(schemaId: string, callCount: number): { success: boolean; error?: string } {
  // Check if deletion is allowed
  const deleteCheck = canDeleteSchema(schemaId, callCount);
  if (!deleteCheck.allowed) {
    return { success: false, error: deleteCheck.reason };
  }

  try {
    const schemas = getAllSchemas();
    const filtered = schemas.filter(s => s.id !== schemaId);
    
    if (filtered.length === schemas.length) {
      return { success: false, error: `Schema with ID "${schemaId}" not found` };
    }

    localStorage.setItem(SCHEMAS_KEY, JSON.stringify(filtered));
    
    // If deleted schema was active, clear active schema or set first available
    const activeId = getActiveSchemaId();
    if (activeId === schemaId) {
      if (filtered.length > 0) {
        setActiveSchema(filtered[0].id);
      } else {
        localStorage.removeItem(ACTIVE_SCHEMA_KEY);
      }
    }
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: `Failed to delete schema: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Checks if a schema name is unique
 */
export function isSchemaNameUnique(name: string, excludeId?: string): boolean {
  const schemas = getAllSchemas();
  return !schemas.some(s => s.name === name && s.id !== excludeId);
}

/**
 * Checks if a schema ID is unique
 */
export function isSchemaIdUnique(id: string): boolean {
  return getSchemaById(id) === null;
}

/**
 * Generates a unique schema ID from a name
 */
export function generateSchemaId(name: string): string {
  // Convert to lowercase, replace spaces with hyphens, remove special chars
  let baseId = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  
  // If not unique, append number
  let id = baseId;
  let counter = 1;
  while (!isSchemaIdUnique(id)) {
    id = `${baseId}-${counter}`;
    counter++;
  }
  
  return id;
}

/**
 * Increments schema version (semantic versioning)
 */
export function incrementVersion(currentVersion: string, type: 'major' | 'minor' | 'patch' = 'minor'): string {
  const parts = currentVersion.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return '1.0.0'; // Default if invalid
  }

  let [major, minor, patch] = parts;

  switch (type) {
    case 'major':
      major++;
      minor = 0;
      patch = 0;
      break;
    case 'minor':
      minor++;
      patch = 0;
      break;
    case 'patch':
      patch++;
      break;
  }

  return `${major}.${minor}.${patch}`;
}

/**
 * Creates a new version of an existing schema
 */
export function createSchemaVersion(
  sourceSchemaId: string,
  modifications: Partial<SchemaDefinition>
): { success: boolean; schema?: SchemaDefinition; error?: string } {
  const sourceSchema = getSchemaById(sourceSchemaId);
  if (!sourceSchema) {
    return { success: false, error: `Source schema "${sourceSchemaId}" not found` };
  }

  // Increment version
  const newVersion = incrementVersion(sourceSchema.version);
  
  // Create new schema with incremented version
  const newSchema: SchemaDefinition = {
    ...sourceSchema,
    ...modifications,
    version: newVersion,
    createdAt: new Date().toISOString(),
    updatedAt: undefined
  };

  const result = createSchema(newSchema);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, schema: newSchema };
}

/**
 * Exports schema as JSON
 */
export function exportSchemaAsJson(schemaId: string): string | null {
  const schema = getSchemaById(schemaId);
  if (!schema) return null;
  return JSON.stringify(schema, null, 2);
}

/**
 * Imports schema from JSON
 */
export function importSchemaFromJson(jsonString: string): { success: boolean; schema?: SchemaDefinition; error?: string } {
  try {
    const schema: SchemaDefinition = JSON.parse(jsonString);
    
    // Validate structure
    const validation = validateSchemaDefinition(schema);
    if (!validation.valid) {
      return { 
        success: false, 
        error: `Invalid schema: ${validation.errors.join(', ')}` 
      };
    }

    // Check if ID already exists
    if (getSchemaById(schema.id)) {
      // Generate new ID to avoid conflict
      const newId = generateSchemaId(schema.name);
      schema.id = newId;
    }

    // Create schema
    const result = createSchema(schema);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, schema };
  } catch (error) {
    return { 
      success: false, 
      error: `Failed to import schema: ${error instanceof Error ? error.message : 'Invalid JSON'}` 
    };
  }
}
