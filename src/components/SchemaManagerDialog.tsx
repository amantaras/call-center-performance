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
} from '@phosphor-icons/react';
import { SchemaDefinition, FieldDefinition, RelationshipDefinition, SemanticRole, FieldType } from '@/types/schema';
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
import { toast } from 'sonner';

interface SchemaManagerDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
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
export function SchemaManagerDialog({ trigger, open, onOpenChange }: SchemaManagerDialogProps) {
  const [isOpen, setIsOpen] = useState(open ?? false);
  const [schemas, setSchemas] = useState<SchemaDefinition[]>([]);
  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null>(null);
  const [selectedSchema, setSelectedSchema] = useState<SchemaDefinition | null>(null);
  const [activeTab, setActiveTab] = useState('library');
  
  // Field editor state
  const [editingField, setEditingField] = useState<FieldDefinition | null>(null);
  const [isAddingField, setIsAddingField] = useState(false);
  
  // Relationship editor state
  const [editingRelationship, setEditingRelationship] = useState<RelationshipDefinition | null>(null);
  const [isAddingRelationship, setIsAddingRelationship] = useState(false);
  
  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'schema' | 'field' | 'relationship'; id: string } | null>(null);

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
    } else {
      setSelectedSchema(null);
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
      toast.success(isAddingRelationship ? 'Relationship added successfully' : 'Relationship updated successfully');
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
        <DialogContent className="!max-w-[50vw] w-[50vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Schema Manager
            </DialogTitle>
            <DialogDescription>
              Manage schemas, fields, relationships, and versioning
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="library">Library</TabsTrigger>
              <TabsTrigger value="fields" disabled={!selectedSchema}>Fields</TabsTrigger>
              <TabsTrigger value="relationships" disabled={!selectedSchema}>Relationships</TabsTrigger>
              <TabsTrigger value="versioning" disabled={!selectedSchema}>Versioning</TabsTrigger>
              <TabsTrigger value="export">Export/Import</TabsTrigger>
            </TabsList>

            {/* Library Tab */}
            <TabsContent value="library" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{schemas.length} schema(s) available</p>
                <Button onClick={handleImportSchema} variant="outline" size="sm">
                  <Upload className="mr-2 h-4 w-4" />
                  Import Schema
                </Button>
              </div>
              
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {schemas.map(schema => (
                    <Card
                      key={schema.id}
                      className={`cursor-pointer transition-all ${
                        selectedSchemaId === schema.id ? 'ring-2 ring-primary' : ''
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
                          <Badge variant="secondary">v{schema.version}</Badge>
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
                                </div>
                                <p className="text-sm text-muted-foreground">Field name: {field.name}</p>
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
      {editingField && (
        <FieldEditorDialog
          field={editingField}
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
    </>
  );
}

/* Field Editor Dialog Component */
interface FieldEditorDialogProps {
  field: FieldDefinition;
  isNew: boolean;
  onSave: (field: FieldDefinition) => void;
  onCancel: () => void;
}

function FieldEditorDialog({ field, isNew, onSave, onCancel }: FieldEditorDialogProps) {
  const [formData, setFormData] = useState(field);

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

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={() => onSave(formData)}>
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

          {formData.type === 'complex' && (
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
