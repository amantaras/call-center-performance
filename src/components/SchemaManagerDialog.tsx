import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Database,
  Trash,
  Copy,
  Download,
  Upload,
  Plus,
  X,
  FloppyDisk,
  ArrowUp,
  ArrowDown,
  Sparkle,
  BookBookmark,
  Lightbulb,
  ArrowCounterClockwise,
} from '@phosphor-icons/react';
import { SchemaDefinition, FieldDefinition, RelationshipDefinition, SemanticRole, FieldType, TopicDefinition, FieldDependency, DependencyOperator, InsightCategoryConfig, InsightOutputField } from '@/types/schema';
import {
  getAllSchemas,
  getSchemaById,
  saveSchema,
  deleteSchema,
  duplicateSchema,
  exportSchema,
  importSchema,
  bumpVersion,
} from '@/services/schema-manager';
import { inferAllRelationships } from '@/services/relationship-inference';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { CallRecord } from '@/types/call';
import { toast } from 'sonner';
import { executeFormula } from '@/lib/formula-executor';
import { TopicTaxonomyWizard } from '@/components/TopicTaxonomyWizard';
import { SchemaTemplateSelector } from '@/components/SchemaTemplateSelector';
import { AISchemaEnhancer } from '@/components/AISchemaEnhancer';
import { SyntheticMetadataWizard } from '@/components/SyntheticMetadataWizard';
import { InsightCategoriesManager } from '@/components/InsightCategoriesManager';
import { SchemaTemplate, saveCustomTemplate, hasTemplateUpdate, getTemplateById } from '@/lib/schema-templates';
import { SchemaEvaluationRule } from '@/types/schema';

interface SchemaManagerDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  activeSchemaId?: string;
}

const SEMANTIC_ROLES: { value: SemanticRole; label: string; description: string }[] = [
  { value: 'participant_1', label: 'Participant 1', description: 'First conversation participant (e.g., Agent)' },
  { value: 'participant_2', label: 'Participant 2', description: 'Second conversation participant (e.g., Customer)' },
  { value: 'classification', label: 'Classification', description: 'Categorical field (e.g., Product, Status)' },
  { value: 'metric', label: 'Metric', description: 'Numeric measurement (e.g., Amount, Days)' },
  { value: 'dimension', label: 'Dimension', description: 'Grouping field (e.g., Region, Category)' },
  { value: 'identifier', label: 'Identifier', description: 'Unique identifier (e.g., Call ID)' },
  { value: 'timestamp', label: 'Timestamp', description: 'Date/time field' },
  { value: 'freeform', label: 'Freeform', description: 'Unstructured text field' },
];

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'select', label: 'Select' },
];

/**
 * SchemaManagerDialog Component
 * 
 * Comprehensive schema management interface with tabs for:
 * - Library: View, duplicate, delete schemas
 * - Fields: Add, edit, reorder fields
 * - Relationships: Manage field relationships
 * - Versioning: View history, bump versions
 * - Export/Import: JSON export/import
 */
export function SchemaManagerDialog({ trigger, open, onOpenChange, activeSchemaId }: SchemaManagerDialogProps) {
  const [isOpen, setIsOpen] = useState(open ?? false);
  const [schemas, setSchemas] = useState<SchemaDefinition[]>([]);
  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null>(null);
  const [selectedSchema, setSelectedSchema] = useState<SchemaDefinition | null>(null);
  const [activeTab, setActiveTab] = useState('library');
  const [calls, setCalls] = useLocalStorage<CallRecord[]>('calls', []);
  
  // Field editor state
  const [editingField, setEditingField] = useState<FieldDefinition | null>(null);
  const [isAddingField, setIsAddingField] = useState(false);
  
  // Relationship editor state
  const [editingRelationship, setEditingRelationship] = useState<RelationshipDefinition | null>(null);
  const [isAddingRelationship, setIsAddingRelationship] = useState(false);
  const [isDiscoveringRelationships, setIsDiscoveringRelationships] = useState(false);
  
  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'schema' | 'field' | 'relationship'; id: string } | null>(null);

  // Template update notification
  const [templateUpdate, setTemplateUpdate] = useState<{ templateId: string; currentVersion: string; latestVersion: string } | null>(null);

  // Create from template dialog
  const [showCreateFromTemplate, setShowCreateFromTemplate] = useState(false);
  
  // Synthetic metadata wizard
  const [showSyntheticWizard, setShowSyntheticWizard] = useState(false);
  
  // Apply template confirmation (when overwriting existing schema)
  const [pendingTemplateApply, setPendingTemplateApply] = useState<{
    schema: SchemaDefinition;
    rules: Omit<SchemaEvaluationRule, 'id'>[];
    templateName: string;
  } | null>(null);

  // Migration confirmation when creating from template with existing calls
  const [pendingCallsMigration, setPendingCallsMigration] = useState<{
    newSchemaId: string;
    newSchemaName: string;
    callCount: number;
  } | null>(null);

  useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);

  useEffect(() => {
    if (isOpen) {
      loadSchemas();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedSchemaId) {
      const schema = getSchemaById(selectedSchemaId);
      setSelectedSchema(schema);
      
      // Check for template updates if schema is based on a template
      if (schema?.templateId && schema?.templateVersion) {
        const hasUpdate = hasTemplateUpdate(schema.templateId, schema.templateVersion);
        if (hasUpdate) {
          const latestTemplate = getTemplateById(schema.templateId);
          setTemplateUpdate({
            templateId: schema.templateId,
            currentVersion: schema.templateVersion,
            latestVersion: latestTemplate?.version || 'unknown',
          });
        } else {
          setTemplateUpdate(null);
        }
      } else {
        setTemplateUpdate(null);
      }
    } else {
      setSelectedSchema(null);
      setTemplateUpdate(null);
    }
  }, [selectedSchemaId]);

  const loadSchemas = () => {
    const allSchemas = getAllSchemas();
    setSchemas(allSchemas);
    if (!selectedSchemaId && allSchemas.length > 0) {
      setSelectedSchemaId(allSchemas[0].id);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const handleDuplicateSchema = (schemaId: string) => {
    try {
      const newSchema = duplicateSchema(schemaId);
      loadSchemas();
      setSelectedSchemaId(newSchema.id);
      toast.success('Schema duplicated successfully');
    } catch (error) {
      toast.error('Failed to duplicate schema');
      console.error(error);
    }
  };

  const handleDeleteSchema = (schemaId: string) => {
    setItemToDelete({ type: 'schema', id: schemaId });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === 'schema') {
        deleteSchema(itemToDelete.id, 0); // TODO: Pass actual call count
        loadSchemas();
        if (selectedSchemaId === itemToDelete.id) {
          setSelectedSchemaId(schemas[0]?.id || null);
        }
        toast.success('Schema deleted successfully');
      } else if (itemToDelete.type === 'field' && selectedSchema) {
        const updatedSchema = {
          ...selectedSchema,
          fields: selectedSchema.fields.filter(f => f.id !== itemToDelete.id),
          updatedAt: new Date().toISOString(),
        };
        saveSchema(updatedSchema);
        setSelectedSchema(updatedSchema);
        loadSchemas();
        toast.success('Field deleted successfully');
      } else if (itemToDelete.type === 'relationship' && selectedSchema) {
        const updatedSchema = {
          ...selectedSchema,
          relationships: selectedSchema.relationships.filter(r => r.id !== itemToDelete.id),
          updatedAt: new Date().toISOString(),
        };
        saveSchema(updatedSchema);
        setSelectedSchema(updatedSchema);
        loadSchemas();
        toast.success('Relationship deleted successfully');
      }
    } catch (error) {
      toast.error(`Failed to delete ${itemToDelete.type}`);
      console.error(error);
    } finally {
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  const handleExportSchema = (schemaId: string) => {
    try {
      exportSchema(schemaId);
      toast.success('Schema exported successfully');
    } catch (error) {
      toast.error('Failed to export schema');
      console.error(error);
    }
  };

  /**
   * Recalculate formulas for all calls matching a schema
   * Used when relationships are added after CSV import
   */
  // Helper to fix old formulas that use bare field names instead of metadata.fieldName
  const fixFormulaFieldReferences = (formula: string, metadataKeys: string[]): string => {
    let fixedFormula = formula;
    
    // Sort by length descending to replace longer field names first (avoid partial replacements)
    const sortedKeys = [...metadataKeys].sort((a, b) => b.length - a.length);
    
    for (const key of sortedKeys) {
      // Match bare field name that isn't already prefixed with "metadata."
      // Negative lookbehind for "metadata." and word boundaries
      const regex = new RegExp(`(?<!metadata\\.)\\b${key}\\b(?!\\s*:)`, 'g');
      fixedFormula = fixedFormula.replace(regex, `metadata.${key}`);
    }
    
    return fixedFormula;
  };

  const recalculateCallMetadata = (schema: SchemaDefinition, callsToUpdate: CallRecord[]) => {
    const complexRelationships = schema.relationships.filter(
      rel => rel.type === 'complex' && rel.formula
    );

    console.log('Recalculate: Found complex relationships:', complexRelationships.length);
    console.log('Recalculate: Relationships:', complexRelationships.map(r => ({ id: r.id, formula: r.formula })));

    if (complexRelationships.length === 0) return callsToUpdate;

    const updatedCalls = callsToUpdate.map(call => {
      if (call.schemaId !== schema.id) return call;

      const updatedMetadata = { ...call.metadata };
      const metadataKeys = Object.keys(updatedMetadata);

      // Calculate each formula
      for (const rel of complexRelationships) {
        try {
          // Auto-fix old formulas that don't use metadata. prefix
          let formula = rel.formula!;
          if (!formula.includes('metadata.')) {
            console.log(`Recalculate: Auto-fixing formula for ${rel.id}`);
            formula = fixFormulaFieldReferences(formula, metadataKeys);
            console.log(`Recalculate: Fixed formula:`, formula);
          }
          
          console.log(`Recalculate: Executing formula for ${rel.id} with metadata:`, metadataKeys);
          const result = executeFormula(formula, updatedMetadata);
          console.log(`Recalculate: Result for ${rel.id}:`, result);
          if (result.success) {
            updatedMetadata[`calc_${rel.id}`] = result.result;
          }
        } catch (error) {
          console.warn(`Failed to calculate formula for ${rel.id}:`, error);
        }
      }

      return {
        ...call,
        metadata: updatedMetadata
      };
    });

    return updatedCalls;
  };

  const handleDiscoverRelationships = async () => {
    if (!selectedSchema) return;

    setIsDiscoveringRelationships(true);
    try {
      // Filter calls that match this schema
      const schemaCalls = calls.filter(
        call => call.schemaId === selectedSchema.id
      );

      // Extract metadata samples (max 10)
      const sampleData = schemaCalls
        .slice(0, 10)
        .map(call => call.metadata);

      toast.info('Analyzing schema fields...', { duration: 2000 });

      // Discover relationships
      const { all: discoveredRelationships } = await inferAllRelationships(
        selectedSchema,
        sampleData.length > 0 ? sampleData : undefined
      );

      if (discoveredRelationships.length === 0) {
        toast.info('No new relationships discovered');
        return;
      }

      // Filter out relationships that already exist
      const existingIds = new Set(selectedSchema.relationships.map(r => r.id));
      const existingDescriptions = new Set(
        selectedSchema.relationships.map(r => r.description.toLowerCase())
      );

      const newRelationships = discoveredRelationships.filter(
        rel => !existingIds.has(rel.id) && 
               !existingDescriptions.has(rel.description.toLowerCase())
      );

      if (newRelationships.length === 0) {
        toast.info('All discovered relationships already exist');
        return;
      }

      // Add new relationships to schema
      const updatedSchema = {
        ...selectedSchema,
        relationships: [...selectedSchema.relationships, ...newRelationships],
        updatedAt: new Date().toISOString(),
      };

      saveSchema(updatedSchema);
      setSelectedSchema(updatedSchema);
      loadSchemas();

      // Recalculate formulas for existing calls
      const complexRelationships = newRelationships.filter(
        rel => rel.type === 'complex' && rel.formula
      );

      if (complexRelationships.length > 0 && schemaCalls.length > 0) {
        toast.info('Recalculating formulas for existing calls...', { duration: 2000 });
        const updatedCalls = recalculateCallMetadata(updatedSchema, calls);
        setCalls(updatedCalls);
      }

      toast.success(
        `Discovered ${newRelationships.length} new relationship${newRelationships.length > 1 ? 's' : ''}!`,
        { duration: 3000 }
      );
    } catch (error) {
      console.error('Error discovering relationships:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to discover relationships'
      );
    } finally {
      setIsDiscoveringRelationships(false);
    }
  };

  const handleImportSchema = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const schema = JSON.parse(text);
        importSchema(schema);
        loadSchemas();
        toast.success('Schema imported successfully');
      } catch (error) {
        toast.error('Failed to import schema');
        console.error(error);
      }
    };
    input.click();
  };

  const handleBumpVersion = (type: 'major' | 'minor' | 'patch') => {
    if (!selectedSchema) return;

    try {
      const newSchema = bumpVersion(selectedSchema.id, type);
      setSelectedSchema(newSchema);
      loadSchemas();
      toast.success(`Version bumped to ${newSchema.version}`);
    } catch (error) {
      toast.error('Failed to bump version');
      console.error(error);
    }
  };

  const handleSaveTopics = (topics: TopicDefinition[]) => {
    if (!selectedSchema) return;

    try {
      const updatedSchema = {
        ...selectedSchema,
        topicTaxonomy: topics,
        updatedAt: new Date().toISOString(),
      };
      saveSchema(updatedSchema);
      setSelectedSchema(updatedSchema);
      loadSchemas();
      toast.success('Topic taxonomy saved successfully');
    } catch (error) {
      toast.error('Failed to save topics');
      console.error(error);
    }
  };

  const handleSaveInsightCategories = (categories: InsightCategoryConfig[]) => {
    if (!selectedSchema) return;

    try {
      const updatedSchema = {
        ...selectedSchema,
        insightCategories: categories,
        updatedAt: new Date().toISOString(),
      };
      saveSchema(updatedSchema);
      setSelectedSchema(updatedSchema);
      loadSchemas();
      toast.success('AI insight categories saved successfully');
    } catch (error) {
      toast.error('Failed to save insight categories');
      console.error(error);
    }
  };

  const handleApplyTemplate = (template: SchemaTemplate) => {
    if (!selectedSchema) return;

    try {
      const updatedSchema: SchemaDefinition = {
        ...selectedSchema,
        fields: template.schema.fields,
        relationships: template.schema.relationships || [],
        topicTaxonomy: template.schema.topicTaxonomy || [],
        templateId: template.id,
        templateVersion: template.version,
        updatedAt: new Date().toISOString(),
      };
      
      saveSchema(updatedSchema);
      setSelectedSchema(updatedSchema);
      loadSchemas();
      setTemplateUpdate(null);
      toast.success(`Applied "${template.name}" template successfully`);
    } catch (error) {
      toast.error('Failed to apply template');
      console.error(error);
    }
  };

  const handleSaveAsTemplate = () => {
    if (!selectedSchema) return;

    try {
      // Get evaluation rules from localStorage if available
      const rulesKey = `evaluation-criteria-${selectedSchema.id}`;
      const storedRules = localStorage.getItem(rulesKey);
      const evaluationRules: Omit<SchemaEvaluationRule, 'id'>[] = storedRules 
        ? JSON.parse(storedRules).map((r: SchemaEvaluationRule) => {
            const { id, ...rest } = r;
            return rest;
          })
        : [];
      
      saveCustomTemplate(
        selectedSchema,
        evaluationRules,
        `${selectedSchema.name} Template`,
        selectedSchema.businessContext || 'Custom template based on existing schema'
      );
      toast.success('Schema saved as custom template');
    } catch (error) {
      toast.error('Failed to save as template');
      console.error(error);
    }
  };

  // Create a new schema from a template
  const handleCreateFromTemplate = (
    templateSchema: SchemaDefinition,
    rules: Omit<SchemaEvaluationRule, 'id'>[],
    templateName: string
  ) => {
    try {
      // Create new schema with unique ID
      const newSchema: SchemaDefinition = {
        ...templateSchema,
        id: `schema_${Date.now()}`,
        name: `${templateName} Schema`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      saveSchema(newSchema);
      
      // Save evaluation rules
      if (rules.length > 0) {
        const rulesKey = `evaluation-criteria-${newSchema.id}`;
        const rulesWithIds = rules.map((r, i) => ({
          ...r,
          id: `rule_${Date.now()}_${i}`,
        }));
        localStorage.setItem(rulesKey, JSON.stringify(rulesWithIds));
      }
      
      loadSchemas();
      setSelectedSchemaId(newSchema.id);
      setShowCreateFromTemplate(false);
      toast.success(`Created new schema from "${templateName}" template`);
      
      // Check if there are existing calls that need migration
      const existingCalls = calls || [];
      const callsToMigrate = existingCalls.filter(call => 
        call.schemaId && call.schemaId !== newSchema.id
      );
      
      if (callsToMigrate.length > 0) {
        // Ask user if they want to migrate existing calls
        setPendingCallsMigration({
          newSchemaId: newSchema.id,
          newSchemaName: newSchema.name,
          callCount: callsToMigrate.length
        });
      }
    } catch (error) {
      toast.error('Failed to create schema from template');
      console.error(error);
    }
  };

  // Apply template to existing schema (with confirmation)
  const handleApplyTemplateToExisting = (
    templateSchema: SchemaDefinition,
    rules: Omit<SchemaEvaluationRule, 'id'>[],
    templateName: string
  ) => {
    // Show confirmation dialog
    setPendingTemplateApply({ schema: templateSchema, rules, templateName });
  };

  // Confirm applying template to existing schema
  const confirmApplyTemplate = () => {
    if (!pendingTemplateApply || !selectedSchema) return;

    const { schema: templateSchema, rules, templateName } = pendingTemplateApply;

    const updatedSchema: SchemaDefinition = {
      ...selectedSchema,
      fields: templateSchema.fields,
      relationships: templateSchema.relationships || [],
      topicTaxonomy: templateSchema.topicTaxonomy || [],
      templateId: templateSchema.templateId,
      templateVersion: templateSchema.templateVersion,
      businessContext: templateSchema.businessContext || selectedSchema.businessContext,
      updatedAt: new Date().toISOString(),
    };

    saveSchema(updatedSchema);
    setSelectedSchema(updatedSchema);
    loadSchemas();

    // Save evaluation rules
    if (rules.length > 0) {
      const rulesKey = `evaluation-criteria-${selectedSchema.id}`;
      const rulesWithIds = rules.map((r, i) => ({
        ...r,
        id: `rule_${Date.now()}_${i}`,
      }));
      localStorage.setItem(rulesKey, JSON.stringify(rulesWithIds));
    }

    setTemplateUpdate(null);
    setPendingTemplateApply(null);
    toast.success(`Applied "${templateName}" template successfully`);
  };

  const handleApplyAISuggestions = (
    fields: FieldDefinition[],
    rules: Omit<SchemaEvaluationRule, 'id'>[],
    topics: TopicDefinition[],
    relationships: RelationshipDefinition[]
  ) => {
    if (!selectedSchema) return;

    try {
      let updatedFields = [...selectedSchema.fields];
      let updatedTopics = [...(selectedSchema.topicTaxonomy || [])];
      let updatedRelationships = [...(selectedSchema.relationships || [])];

      // Add new fields (avoid duplicates by name)
      if (fields && fields.length > 0) {
        const existingFieldNames = new Set(selectedSchema.fields.map(f => f.name.toLowerCase()));
        const newFields = fields.filter(
          f => !existingFieldNames.has(f.name.toLowerCase())
        );
        updatedFields = [...updatedFields, ...newFields];
      }

      // Add new topics (avoid duplicates by id)
      if (topics && topics.length > 0) {
        const existingTopicIds = new Set((selectedSchema.topicTaxonomy || []).map(t => t.id.toLowerCase()));
        const newTopics = topics.filter(
          t => !existingTopicIds.has(t.id.toLowerCase())
        );
        updatedTopics = [...updatedTopics, ...newTopics];
      }

      // Add new relationships (avoid duplicates by id)
      if (relationships && relationships.length > 0) {
        const existingRelIds = new Set((selectedSchema.relationships || []).map(r => r.id.toLowerCase()));
        const newRels = relationships.filter(
          r => !existingRelIds.has(r.id.toLowerCase())
        );
        updatedRelationships = [...updatedRelationships, ...newRels];
      }

      const updatedSchema = {
        ...selectedSchema,
        fields: updatedFields,
        topicTaxonomy: updatedTopics,
        relationships: updatedRelationships,
        updatedAt: new Date().toISOString(),
      };

      saveSchema(updatedSchema);
      setSelectedSchema(updatedSchema);
      loadSchemas();

      // Save evaluation rules separately if provided
      if (rules && rules.length > 0) {
        const rulesKey = `evaluation-criteria-${selectedSchema.id}`;
        const existingRules = localStorage.getItem(rulesKey);
        const existingRulesList: SchemaEvaluationRule[] = existingRules ? JSON.parse(existingRules) : [];
        const newRulesWithIds = rules.map((r, i) => ({
          ...r,
          id: `rule_${Date.now()}_${i}`,
        }));
        localStorage.setItem(rulesKey, JSON.stringify([...existingRulesList, ...newRulesWithIds]));
      }

      const addedCount = 
        (fields?.length || 0) + 
        (topics?.length || 0) +
        (relationships?.length || 0) +
        (rules?.length || 0);
      toast.success(`Applied ${addedCount} AI suggestion(s) to schema`);
    } catch (error) {
      toast.error('Failed to apply AI suggestions');
      console.error(error);
    }
  };

  const handleUpdateToLatestTemplate = () => {
    if (!selectedSchema || !templateUpdate) return;

    const latestTemplate = getTemplateById(templateUpdate.templateId);
    if (latestTemplate) {
      handleApplyTemplate(latestTemplate);
      toast.success(`Updated to template version ${latestTemplate.version}`);
    }
  };

  // Handle synthetic records generated
  const handleSyntheticRecordsGenerated = (newRecords: CallRecord[]) => {
    // Add new records to existing calls
    setCalls(prev => [...prev, ...newRecords]);
  };

  const handleSaveField = (field: FieldDefinition) => {
    if (!selectedSchema) return;

    try {
      let updatedFields: FieldDefinition[];
      if (isAddingField) {
        updatedFields = [...selectedSchema.fields, field];
      } else {
        updatedFields = selectedSchema.fields.map(f => f.id === field.id ? field : f);
      }

      const updatedSchema = {
        ...selectedSchema,
        fields: updatedFields,
        updatedAt: new Date().toISOString(),
      };
      saveSchema(updatedSchema);
      setSelectedSchema(updatedSchema);
      loadSchemas();
      setEditingField(null);
      setIsAddingField(false);
      toast.success(isAddingField ? 'Field added successfully' : 'Field updated successfully');
    } catch (error) {
      toast.error('Failed to save field');
      console.error(error);
    }
  };

  const handleSaveRelationship = (relationship: RelationshipDefinition) => {
    if (!selectedSchema) return;

    try {
      let updatedRelationships: RelationshipDefinition[];
      const isNew = isAddingRelationship;
      const isComplexWithFormula = relationship.type === 'complex' && relationship.formula;
      
      if (isAddingRelationship) {
        updatedRelationships = [...selectedSchema.relationships, relationship];
      } else {
        updatedRelationships = selectedSchema.relationships.map(r => r.id === relationship.id ? relationship : r);
      }

      const updatedSchema = {
        ...selectedSchema,
        relationships: updatedRelationships,
        updatedAt: new Date().toISOString(),
      };
      saveSchema(updatedSchema);
      setSelectedSchema(updatedSchema);
      loadSchemas();
      setEditingRelationship(null);
      setIsAddingRelationship(false);

      // Recalculate formulas for existing calls if this is a complex relationship
      if (isComplexWithFormula) {
        const schemaCalls = calls.filter(call => call.schemaId === selectedSchema.id);
        if (schemaCalls.length > 0) {
          toast.info('Recalculating formulas for existing calls...', { duration: 1500 });
          const updatedCalls = recalculateCallMetadata(updatedSchema, calls);
          setCalls(updatedCalls);
        }
      }

      toast.success(isNew ? 'Relationship added successfully' : 'Relationship updated successfully');
    } catch (error) {
      toast.error('Failed to save relationship');
      console.error(error);
    }
  };

  const handleMoveField = (fieldId: string, direction: 'up' | 'down') => {
    if (!selectedSchema) return;

    const index = selectedSchema.fields.findIndex(f => f.id === fieldId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === selectedSchema.fields.length - 1) return;

    const newFields = [...selectedSchema.fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];

    const updatedSchema = {
      ...selectedSchema,
      fields: newFields,
      updatedAt: new Date().toISOString(),
    };
    saveSchema(updatedSchema);
    setSelectedSchema(updatedSchema);
    loadSchemas();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent className="!max-w-[70vw] w-[70vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Schema Manager
              {selectedSchema && (
                <Badge 
                  variant={selectedSchema.id === activeSchemaId ? "default" : "secondary"}
                  className={`ml-auto font-normal text-sm ${
                    selectedSchema.id === activeSchemaId 
                      ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' 
                      : ''
                  }`}
                >
                  {selectedSchema.id === activeSchemaId && '✓ '}{selectedSchema.name}
                  <span className={selectedSchema.id === activeSchemaId ? 'ml-1.5 text-green-100' : 'ml-1.5 text-muted-foreground'}>v{selectedSchema.version}</span>
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Manage schemas, fields, relationships, and versioning
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-8">
              <TabsTrigger value="library">Library</TabsTrigger>
              <TabsTrigger value="templates">
                <BookBookmark className="h-4 w-4 mr-1" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="fields" disabled={!selectedSchema}>Fields</TabsTrigger>
              <TabsTrigger value="relationships" disabled={!selectedSchema}>Relationships</TabsTrigger>
              <TabsTrigger value="topics" disabled={!selectedSchema}>Topics</TabsTrigger>
              <TabsTrigger value="insights" disabled={!selectedSchema}>
                <Lightbulb className="h-4 w-4 mr-1" />
                AI Insights
              </TabsTrigger>
              <TabsTrigger value="versioning" disabled={!selectedSchema}>Versioning</TabsTrigger>
              <TabsTrigger value="export">Export/Import</TabsTrigger>
            </TabsList>

            {/* Library Tab */}
            <TabsContent value="library" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{schemas.length} schema(s) available</p>
                <div className="flex gap-2">
                  <Button onClick={() => setShowCreateFromTemplate(true)} size="sm">
                    <BookBookmark className="mr-2 h-4 w-4" />
                    Create from Template
                  </Button>
                  <Button 
                    onClick={() => setShowSyntheticWizard(true)} 
                    variant="outline" 
                    size="sm"
                    disabled={!selectedSchema}
                    title={selectedSchema ? 'Generate synthetic metadata' : 'Select a schema first'}
                  >
                    <Sparkle className="mr-2 h-4 w-4" />
                    Synthetic Data
                  </Button>
                  <Button onClick={handleImportSchema} variant="outline" size="sm">
                    <Upload className="mr-2 h-4 w-4" />
                    Import Schema
                  </Button>
                </div>
              </div>
              
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {schemas.map(schema => (
                    <Card
                      key={schema.id}
                      className={`cursor-pointer transition-all ${
                        selectedSchemaId === schema.id 
                          ? schema.id === activeSchemaId
                            ? 'ring-2 ring-green-600 bg-green-50/50'
                            : 'ring-2 ring-primary'
                          : schema.id === activeSchemaId
                            ? 'border-green-600 border-2'
                            : ''
                      }`}
                      onClick={() => setSelectedSchemaId(schema.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{schema.name}</CardTitle>
                            <CardDescription className="mt-1 line-clamp-2">
                              {schema.businessContext}
                            </CardDescription>
                          </div>
                          <div className="flex gap-1.5">
                            {schema.id === activeSchemaId && (
                              <Badge className="bg-green-600 hover:bg-green-700 text-white text-xs">Active</Badge>
                            )}
                            <Badge variant="secondary">v{schema.version}</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex gap-4">
                            <span>{schema.fields.length} fields</span>
                            <span>{schema.relationships.length} relationships</span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateSchema(schema.id);
                              }}
                              title="Duplicate"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExportSchema(schema.id);
                              }}
                              title="Export"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSchema(schema.id);
                              }}
                              title="Delete"
                            >
                              <Trash className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Templates Tab */}
            <TabsContent value="templates" className="space-y-4">
              {/* Template Update Notification */}
              {templateUpdate && selectedSchema && (
                <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkle className="h-4 w-4 text-amber-600" />
                        <div>
                          <p className="font-medium text-sm text-amber-900 dark:text-amber-100">
                            Template Update Available
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            v{templateUpdate.currentVersion} → v{templateUpdate.latestVersion}
                          </p>
                        </div>
                      </div>
                      <Button onClick={handleUpdateToLatestTemplate} variant="outline" size="sm"
                        className="border-amber-500 text-amber-700 hover:bg-amber-100">
                        Update Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-4">
                {/* Template Selector - Left Side */}
                <div className="flex-1 border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <BookBookmark className="h-4 w-4" />
                    <h3 className="font-semibold text-sm">Apply Template to Current Schema</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {selectedSchema 
                      ? `Replace fields, rules, and topics in "${selectedSchema.name}" with template content`
                      : 'Select a schema from the Library tab first'}
                  </p>
                  {selectedSchema ? (
                    <>
                      <SchemaTemplateSelector
                        currentTemplateId={selectedSchema?.templateId}
                        onSelectTemplate={handleApplyTemplateToExisting}
                        onCancel={() => {}}
                      />
                      
                      <div className="flex gap-2 mt-3">
                        <Button variant="outline" size="sm" className="flex-1" onClick={handleSaveAsTemplate}>
                          <FloppyDisk className="h-3 w-3 mr-1.5" />
                          Save Schema as Reusable Template
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        This saves your current schema configuration for reuse in other projects
                      </p>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No schema selected</p>
                      <p className="text-xs">Go to Library tab and select or create a schema</p>
                    </div>
                  )}
                </div>

                {/* AI Schema Enhancer - Right Side */}
                <div className="w-[340px] shrink-0 border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkle className="h-4 w-4" />
                    <h3 className="font-semibold text-sm">AI Schema Enhancement</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Get AI-powered suggestions to improve your schema
                  </p>
                  {selectedSchema ? (
                    <AISchemaEnhancer
                      schema={selectedSchema}
                      existingRules={(() => {
                        const rulesKey = `evaluation-criteria-${selectedSchema.id}`;
                        const stored = localStorage.getItem(rulesKey);
                        return stored ? JSON.parse(stored).map((r: SchemaEvaluationRule) => {
                          const { id, ...rest } = r;
                          return rest;
                        }) : [];
                      })()}
                      onApplySuggestions={handleApplyAISuggestions}
                      onSkip={() => {}}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Select a schema from the Library tab first
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Fields Tab */}
            <TabsContent value="fields" className="space-y-4">
              {selectedSchema && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {selectedSchema.fields.length} field(s) in {selectedSchema.name}
                    </p>
                    <Button
                      onClick={() => {
                        setIsAddingField(true);
                        setEditingField({
                          id: `field_${Date.now()}`,
                          name: '',
                          displayName: '',
                          type: 'string',
                          semanticRole: 'freeform',
                          required: false,
                          showInTable: true,
                          useInPrompt: true,
                          enableAnalytics: true,
                        });
                      }}
                      size="sm"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Field
                    </Button>
                  </div>

                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-2">
                      {selectedSchema.fields.map((field, index) => (
                        <Card key={field.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-medium">{field.displayName}</span>
                                  <Badge variant="outline">{field.type}</Badge>
                                  <Badge variant="secondary">{field.semanticRole}</Badge>
                                  {field.required && <Badge variant="destructive">Required</Badge>}
                                  {field.dependsOn && (
                                    <Badge variant="outline" className="border-amber-500 text-amber-600">
                                      Conditional
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">Field name: {field.name}</p>
                                {field.dependsOn && (
                                  <p className="text-xs text-amber-600 mt-1">
                                    Depends on: {selectedSchema.fields.find(f => f.id === field.dependsOn?.fieldId)?.displayName || field.dependsOn.fieldId}
                                  </p>
                                )}
                                <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                                  {field.showInTable && <span>✓ Table</span>}
                                  {field.useInPrompt && <span>✓ Prompt</span>}
                                  {field.enableAnalytics && <span>✓ Analytics</span>}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleMoveField(field.id, 'up')}
                                  disabled={index === 0}
                                  title="Move up"
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleMoveField(field.id, 'down')}
                                  disabled={index === selectedSchema.fields.length - 1}
                                  title="Move down"
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setIsAddingField(false);
                                    setEditingField(field);
                                  }}
                                  title="Edit"
                                >
                                  <FloppyDisk className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setItemToDelete({ type: 'field', id: field.id });
                                    setDeleteConfirmOpen(true);
                                  }}
                                  title="Delete"
                                >
                                  <Trash className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </TabsContent>

            {/* Relationships Tab */}
            <TabsContent value="relationships" className="space-y-4">
              {selectedSchema && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {selectedSchema.relationships.length} relationship(s) in {selectedSchema.name}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          // Include calls that either match the schema or have no schemaId (legacy calls)
                          const schemaCalls = calls.filter(call => 
                            call.schemaId === selectedSchema.id || !call.schemaId
                          );
                          console.log('Recalculate: Total calls:', calls.length);
                          console.log('Recalculate: Schema ID:', selectedSchema.id);
                          console.log('Recalculate: Matching calls:', schemaCalls.length);
                          console.log('Recalculate: Call schemaIds:', calls.map(c => c.schemaId));
                          
                          if (schemaCalls.length === 0) {
                            toast.info('No calls to recalculate');
                            return;
                          }
                          toast.info('Recalculating formulas for all calls...', { duration: 1500 });
                          const updatedCalls = recalculateCallMetadata(selectedSchema, calls);
                          setCalls(updatedCalls);
                          toast.success(`Recalculated formulas for ${schemaCalls.length} calls`);
                        }}
                        size="sm"
                        variant="outline"
                        title="Recalculate all formulas for existing calls"
                      >
                        <ArrowCounterClockwise className="mr-2 h-4 w-4" />
                        Recalculate All
                      </Button>
                      <Button
                        onClick={handleDiscoverRelationships}
                        size="sm"
                        variant="outline"
                        disabled={isDiscoveringRelationships}
                      >
                        {isDiscoveringRelationships ? (
                          <>
                            <span className="mr-2 h-4 w-4 animate-spin">✨</span>
                            Discovering...
                          </>
                        ) : (
                          <>
                            <span className="mr-2 animate-pulse">✨</span>
                            Discover with AI
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => {
                          setIsAddingRelationship(true);
                          setEditingRelationship({
                            id: `rel_${Date.now()}`,
                            type: 'simple',
                            description: '',
                            involvedFields: [],
                          });
                        }}
                        size="sm"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Relationship
                      </Button>
                    </div>
                  </div>

                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-2">
                      {selectedSchema.relationships.map(rel => (
                        <Card key={rel.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant={rel.type === 'complex' ? 'default' : 'secondary'}>
                                    {rel.type}
                                  </Badge>
                                </div>
                                <p className="text-sm mb-2">{rel.description}</p>
                                {rel.formula && (
                                  <code className="text-xs bg-muted px-2 py-1 rounded">
                                    {rel.formula}
                                  </code>
                                )}
                                <p className="text-xs text-muted-foreground mt-2">
                                  Fields: {rel.involvedFields.join(', ')}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setIsAddingRelationship(false);
                                    setEditingRelationship(rel);
                                  }}
                                  title="Edit"
                                >
                                  <FloppyDisk className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setItemToDelete({ type: 'relationship', id: rel.id });
                                    setDeleteConfirmOpen(true);
                                  }}
                                  title="Delete"
                                >
                                  <Trash className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </TabsContent>

            {/* Topics Tab */}
            <TabsContent value="topics" className="space-y-4">
              {selectedSchema && (
                <TopicTaxonomyWizard
                  schema={selectedSchema}
                  onSave={handleSaveTopics}
                />
              )}
            </TabsContent>

            {/* AI Insights Tab */}
            <TabsContent value="insights" className="space-y-4">
              {selectedSchema && (
                <InsightCategoriesManager
                  schema={selectedSchema}
                  onSave={handleSaveInsightCategories}
                />
              )}
            </TabsContent>

            {/* Versioning Tab */}
            <TabsContent value="versioning" className="space-y-4">
              {selectedSchema && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Current Version</CardTitle>
                      <CardDescription>
                        Manage semantic versioning for {selectedSchema.name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold">v{selectedSchema.version}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Created: {new Date(selectedSchema.createdAt).toLocaleDateString()}
                          </p>
                          {selectedSchema.updatedAt && (
                            <p className="text-sm text-muted-foreground">
                              Updated: {new Date(selectedSchema.updatedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <p className="text-sm font-medium">Bump Version</p>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleBumpVersion('major')}
                            variant="outline"
                            className="flex-1"
                          >
                            Major
                            <span className="ml-2 text-xs text-muted-foreground">
                              Breaking changes
                            </span>
                          </Button>
                          <Button
                            onClick={() => handleBumpVersion('minor')}
                            variant="outline"
                            className="flex-1"
                          >
                            Minor
                            <span className="ml-2 text-xs text-muted-foreground">
                              New features
                            </span>
                          </Button>
                          <Button
                            onClick={() => handleBumpVersion('patch')}
                            variant="outline"
                            className="flex-1"
                          >
                            Patch
                            <span className="ml-2 text-xs text-muted-foreground">
                              Bug fixes
                            </span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Export/Import Tab */}
            <TabsContent value="export" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Export Schema</CardTitle>
                  <CardDescription>
                    Download schema as JSON file for backup or sharing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedSchema ? (
                    <Button onClick={() => handleExportSchema(selectedSchema.id)}>
                      <Download className="mr-2 h-4 w-4" />
                      Export {selectedSchema.name}
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Select a schema from the Library tab to export
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Import Schema</CardTitle>
                  <CardDescription>
                    Upload a JSON schema file to add to your library
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleImportSchema}>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Schema File
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Field Editor Dialog */}
      {editingField && selectedSchema && (
        <FieldEditorDialog
          field={editingField}
          schema={selectedSchema}
          isNew={isAddingField}
          onSave={handleSaveField}
          onCancel={() => {
            setEditingField(null);
            setIsAddingField(false);
          }}
        />
      )}

      {/* Relationship Editor Dialog */}
      {editingRelationship && selectedSchema && (
        <RelationshipEditorDialog
          relationship={editingRelationship}
          schema={selectedSchema}
          isNew={isAddingRelationship}
          onSave={handleSaveRelationship}
          onCancel={() => {
            setEditingRelationship(null);
            setIsAddingRelationship(false);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {itemToDelete?.type}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Apply Template Confirmation Dialog */}
      <AlertDialog open={!!pendingTemplateApply} onOpenChange={() => setPendingTemplateApply(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Template to Schema?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will replace the current fields, evaluation rules, and topics in 
                <strong> "{selectedSchema?.name}"</strong> with content from the 
                <strong> "{pendingTemplateApply?.templateName}"</strong> template.
              </p>
              <p className="text-amber-600 dark:text-amber-400">
                ⚠️ This action will overwrite your current schema configuration.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApplyTemplate}>
              Apply Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Migrate Existing Calls Dialog */}
      <AlertDialog open={!!pendingCallsMigration} onOpenChange={() => setPendingCallsMigration(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Migrate Existing Calls?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You have <strong>{pendingCallsMigration?.callCount} existing call(s)</strong> from a previous schema.
              </p>
              <p>
                Would you like to migrate them to <strong>"{pendingCallsMigration?.newSchemaName}"</strong>?
              </p>
              <p className="text-muted-foreground text-sm">
                If you don't migrate, the calls will be hidden until you migrate them later.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingCallsMigration(null)}>
              Keep Separate
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (pendingCallsMigration) {
                // Migrate all calls to the new schema
                setCalls((prev) => 
                  (prev || []).map((call) => ({
                    ...call,
                    schemaId: pendingCallsMigration.newSchemaId,
                    updatedAt: new Date().toISOString()
                  }))
                );
                toast.success(`Migrated ${pendingCallsMigration.callCount} call(s) to ${pendingCallsMigration.newSchemaName}`);
              }
              setPendingCallsMigration(null);
            }}>
              Migrate Calls
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Schema from Template Dialog */}
      <Dialog open={showCreateFromTemplate} onOpenChange={setShowCreateFromTemplate}>
        <DialogContent className="!max-w-[900px] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookBookmark className="h-5 w-5" />
              Create New Schema from Template
            </DialogTitle>
            <DialogDescription>
              Choose a template to create a new schema with pre-configured fields, rules, and topics
            </DialogDescription>
          </DialogHeader>
          <SchemaTemplateSelector
            onSelectTemplate={handleCreateFromTemplate}
            onCancel={() => setShowCreateFromTemplate(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Synthetic Metadata Wizard */}
      {selectedSchema && (
        <SyntheticMetadataWizard
          open={showSyntheticWizard}
          onOpenChange={setShowSyntheticWizard}
          schema={selectedSchema}
          existingCalls={calls}
          onRecordsGenerated={handleSyntheticRecordsGenerated}
        />
      )}
    </>
  );
}

/* Field Editor Dialog Component */
interface FieldEditorDialogProps {
  field: FieldDefinition;
  schema: SchemaDefinition;
  isNew: boolean;
  onSave: (field: FieldDefinition) => void;
  onCancel: () => void;
}

const DEPENDENCY_OPERATORS: { value: DependencyOperator; label: string; description: string }[] = [
  { value: 'equals', label: 'Equals', description: 'Field value equals specified value' },
  { value: 'notEquals', label: 'Not Equals', description: 'Field value does not equal specified value' },
  { value: 'contains', label: 'Contains', description: 'Field value contains specified text' },
  { value: 'greaterThan', label: 'Greater Than', description: 'Field value is greater than specified value' },
  { value: 'lessThan', label: 'Less Than', description: 'Field value is less than specified value' },
  { value: 'isEmpty', label: 'Is Empty', description: 'Field has no value' },
  { value: 'isNotEmpty', label: 'Is Not Empty', description: 'Field has a value' },
];

function FieldEditorDialog({ field, schema, isNew, onSave, onCancel }: FieldEditorDialogProps) {
  const [formData, setFormData] = useState(field);
  const [hasDependency, setHasDependency] = useState(!!field.dependsOn);
  const [dependsOnFieldId, setDependsOnFieldId] = useState(field.dependsOn?.fieldId || '');
  const [dependsOnOperator, setDependsOnOperator] = useState<DependencyOperator>(field.dependsOn?.operator || 'equals');
  const [dependsOnValue, setDependsOnValue] = useState<string | number | boolean>(field.dependsOn?.value ?? '');
  const [dependsOnBehavior, setDependsOnBehavior] = useState<'show' | 'require'>(field.dependsOnBehavior || 'show');
  
  // Get available fields for dependency (exclude current field)
  const availableFields = schema.fields.filter(f => f.id !== field.id);
  const selectedDependentField = availableFields.find(f => f.id === dependsOnFieldId);

  const handleSave = () => {
    let updatedField = { ...formData };
    
    if (hasDependency && dependsOnFieldId) {
      updatedField.dependsOn = {
        fieldId: dependsOnFieldId,
        operator: dependsOnOperator,
        value: dependsOnValue,
      };
      updatedField.dependsOnBehavior = dependsOnBehavior;
    } else {
      delete updatedField.dependsOn;
      delete updatedField.dependsOnBehavior;
    }
    
    onSave(updatedField);
  };

  // Determine if operator needs a value input
  const operatorNeedsValue = !['isEmpty', 'isNotEmpty'].includes(dependsOnOperator);

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Add New Field' : 'Edit Field'}</DialogTitle>
          <DialogDescription>Configure field properties and behavior</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="Agent Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Field Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="agentName"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Field Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: FieldType) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="semanticRole">Semantic Role</Label>
              <Select
                value={formData.semanticRole}
                onValueChange={(value: SemanticRole) => setFormData({ ...formData, semanticRole: value })}
              >
                <SelectTrigger id="semanticRole">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEMANTIC_ROLES.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(formData.semanticRole === 'participant_1' || formData.semanticRole === 'participant_2') && (
            <div className="space-y-2">
              <Label htmlFor="participantLabel">Participant Label</Label>
              <Input
                id="participantLabel"
                value={formData.participantLabel || ''}
                onChange={(e) => setFormData({ ...formData, participantLabel: e.target.value })}
                placeholder="e.g., Sales Representative, Support Agent"
              />
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="required">Required Field</Label>
              <Switch
                id="required"
                checked={formData.required}
                onCheckedChange={(checked) => setFormData({ ...formData, required: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showInTable">Show in Table</Label>
              <Switch
                id="showInTable"
                checked={formData.showInTable}
                onCheckedChange={(checked) => setFormData({ ...formData, showInTable: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="useInPrompt">Use in AI Prompts</Label>
              <Switch
                id="useInPrompt"
                checked={formData.useInPrompt}
                onCheckedChange={(checked) => setFormData({ ...formData, useInPrompt: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="enableAnalytics">Enable Analytics</Label>
              <Switch
                id="enableAnalytics"
                checked={formData.enableAnalytics}
                onCheckedChange={(checked) => setFormData({ ...formData, enableAnalytics: checked })}
              />
            </div>
          </div>

          {/* Field Dependency Section */}
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="hasDependency" className="text-base font-semibold">
                  Conditional Field
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Show or require this field based on another field's value
                </p>
              </div>
              <Switch
                id="hasDependency"
                checked={hasDependency}
                onCheckedChange={(checked) => {
                  setHasDependency(checked);
                  if (!checked) {
                    setDependsOnFieldId('');
                    setDependsOnOperator('equals');
                    setDependsOnValue('');
                  }
                }}
              />
            </div>

            {hasDependency && (
              <Card className="border-dashed">
                <CardContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Depends On Field</Label>
                      <Select
                        value={dependsOnFieldId}
                        onValueChange={setDependsOnFieldId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a field..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFields.map(f => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.displayName} ({f.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Condition</Label>
                      <Select
                        value={dependsOnOperator}
                        onValueChange={(v) => setDependsOnOperator(v as DependencyOperator)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DEPENDENCY_OPERATORS.map(op => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {operatorNeedsValue && (
                    <div className="space-y-2">
                      <Label>Value</Label>
                      {selectedDependentField?.type === 'boolean' ? (
                        <Select
                          value={String(dependsOnValue)}
                          onValueChange={(v) => setDependsOnValue(v === 'true')}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select value..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">True</SelectItem>
                            <SelectItem value="false">False</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : selectedDependentField?.type === 'select' && selectedDependentField.selectOptions ? (
                        <Select
                          value={String(dependsOnValue)}
                          onValueChange={setDependsOnValue}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select value..." />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedDependentField.selectOptions.map(opt => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : selectedDependentField?.type === 'number' ? (
                        <Input
                          type="number"
                          value={dependsOnValue as number}
                          onChange={(e) => setDependsOnValue(parseFloat(e.target.value) || 0)}
                          placeholder="Enter a number..."
                        />
                      ) : (
                        <Input
                          value={String(dependsOnValue)}
                          onChange={(e) => setDependsOnValue(e.target.value)}
                          placeholder="Enter value..."
                        />
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Behavior When Condition Is Met</Label>
                    <Select
                      value={dependsOnBehavior}
                      onValueChange={(v) => setDependsOnBehavior(v as 'show' | 'require')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="show">
                          Show Field - Display this field when condition is true
                        </SelectItem>
                        <SelectItem value="require">
                          Require Field - Make this field required when condition is true
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {dependsOnFieldId && (
                    <div className="bg-muted/50 rounded-md p-3 text-sm">
                      <span className="font-medium">Preview: </span>
                      <span className="text-muted-foreground">
                        This field will be {dependsOnBehavior === 'show' ? 'shown' : 'required'} when "
                        {availableFields.find(f => f.id === dependsOnFieldId)?.displayName}"
                        {' '}{dependsOnOperator}{' '}
                        {operatorNeedsValue ? `"${dependsOnValue}"` : ''}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <FloppyDisk className="mr-2 h-4 w-4" />
              {isNew ? 'Add Field' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* Relationship Editor Dialog Component */
interface RelationshipEditorDialogProps {
  relationship: RelationshipDefinition;
  schema: SchemaDefinition;
  isNew: boolean;
  onSave: (relationship: RelationshipDefinition) => void;
  onCancel: () => void;
}

function RelationshipEditorDialog({ relationship, schema, isNew, onSave, onCancel }: RelationshipEditorDialogProps) {
  const [formData, setFormData] = useState(relationship);

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Add New Relationship' : 'Edit Relationship'}</DialogTitle>
          <DialogDescription>Define relationships between fields</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rel-type">Relationship Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'simple' | 'complex') => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger id="rel-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simple">Simple (Correlative)</SelectItem>
                <SelectItem value="complex">Complex (Calculable)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the relationship between fields..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name (Optional)</Label>
            <Input
              id="displayName"
              value={formData.displayName || ''}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="Human-readable name for this relationship"
            />
            <p className="text-xs text-muted-foreground">
              If not provided, the relationship ID will be used
            </p>
          </div>

          {formData.type === 'complex' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="formula">Formula</Label>
                <Input
                  id="formula"
                  value={formData.formula || ''}
                  onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                  placeholder="e.g., daysPastDue * dueAmount / 1000"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Use field names as variables. Only Math operations are allowed.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="outputType">Output Type</Label>
                <Select
                  value={formData.outputType || 'number'}
                  onValueChange={(value: 'number' | 'string' | 'boolean') => 
                    setFormData({ ...formData, outputType: value })
                  }
                >
                  <SelectTrigger id="outputType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="string">String</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Expected data type of the calculated result
                </p>
              </div>

              <div className="space-y-3 border-t pt-3">
                <Label className="text-sm font-semibold">Display & Usage Options</Label>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="displayInTable" className="text-sm font-normal">
                      Display in Table
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Show as a column in the calls table
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    id="displayInTable"
                    checked={formData.displayInTable || false}
                    onChange={(e) => setFormData({ ...formData, displayInTable: e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enableAnalytics" className="text-sm font-normal">
                      Enable for Analytics
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Available as a measure in custom analytics
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    id="enableAnalytics"
                    checked={formData.enableAnalytics || false}
                    onChange={(e) => setFormData({ ...formData, enableAnalytics: e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="useInPrompt" className="text-sm font-normal">
                      Use in AI Prompts
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Include calculated value in AI analysis
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    id="useInPrompt"
                    checked={formData.useInPrompt || false}
                    onChange={(e) => setFormData({ ...formData, useInPrompt: e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Involved Fields</Label>
            <div className="border rounded-md p-3 space-y-2">
              {schema.fields.map(field => (
                <div key={field.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`field-${field.id}`}
                    checked={formData.involvedFields.includes(field.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          involvedFields: [...formData.involvedFields, field.id],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          involvedFields: formData.involvedFields.filter(id => id !== field.id),
                        });
                      }
                    }}
                    className="rounded"
                  />
                  <label
                    htmlFor={`field-${field.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {field.displayName} ({field.name})
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={() => onSave(formData)}>
              <FloppyDisk className="mr-2 h-4 w-4" />
              {isNew ? 'Add Relationship' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
