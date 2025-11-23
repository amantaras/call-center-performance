import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  FileArrowUp,
  MagicWand,
  Eye,
  FloppyDisk,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Warning,
  Sparkle,
} from '@phosphor-icons/react';
import { SchemaDefinition, FieldDefinition, SemanticRole, FieldType } from '@/types/schema';
import { readExcelFile, parseCSV, readFileAsText, extractColumnNames } from '@/lib/csv-parser';
import {
  discoverSchemaFromExcel,
  calculateDataStatistics,
  convertDiscoveredFieldsToDefinitions,
  type DiscoveredField,
  type SchemaDiscoveryResult,
} from '@/services/schema-discovery';
import { SchemaMapper } from '@/services/schema-mapper';
import { createSchema } from '@/services/schema-manager';
import { toast } from 'sonner';

interface SchemaDiscoveryWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchemaCreated?: (schema: SchemaDefinition) => void;
}

type WizardStep = 'upload' | 'analyze' | 'review' | 'save';

const SEMANTIC_ROLES: { value: SemanticRole; label: string; description: string }[] = [
  { value: 'participant_1', label: 'Participant 1', description: 'First participant (e.g., Agent)' },
  { value: 'participant_2', label: 'Participant 2', description: 'Second participant (e.g., Customer)' },
  { value: 'classification', label: 'Classification', description: 'Categorical field' },
  { value: 'metric', label: 'Metric', description: 'Numeric measurement' },
  { value: 'dimension', label: 'Dimension', description: 'Grouping field' },
  { value: 'identifier', label: 'Identifier', description: 'Unique identifier' },
  { value: 'timestamp', label: 'Timestamp', description: 'Date/time field' },
  { value: 'freeform', label: 'Freeform', description: 'Unstructured text' },
];

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'select', label: 'Select' },
];

/**
 * SchemaDiscoveryWizard Component
 * 
 * Multi-step wizard for creating schemas from uploaded Excel files:
 * 1. Upload: Select Excel/CSV file and provide business context
 * 2. Analyze: LLM analyzes structure and infers schema
 * 3. Review: User reviews and edits discovered fields
 * 4. Save: Creates schema with semantic versioning
 */
export function SchemaDiscoveryWizard({ open, onOpenChange, onSchemaCreated }: SchemaDiscoveryWizardProps) {
  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [isProcessing, setIsProcessing] = useState(false);

  // Upload step
  const [file, setFile] = useState<File | null>(null);
  const [sheetName, setSheetName] = useState('Sheet1');
  const [businessContext, setBusinessContext] = useState('');
  const [parsedRows, setParsedRows] = useState<Record<string, any>[] | null>(null);
  const [columns, setColumns] = useState<string[]>([]);

  // Analysis step
  const [discoveryResult, setDiscoveryResult] = useState<SchemaDiscoveryResult | null>(null);
  const [dataStats, setDataStats] = useState<Record<string, any> | null>(null);

  // Review step
  const [schemaName, setSchemaName] = useState('');
  const [participant1Label, setParticipant1Label] = useState('');
  const [participant2Label, setParticipant2Label] = useState('');
  const [editableFields, setEditableFields] = useState<DiscoveredField[]>([]);
  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | null>(null);

  const resetWizard = () => {
    setCurrentStep('upload');
    setIsProcessing(false);
    setFile(null);
    setBusinessContext('');
    setParsedRows(null);
    setColumns([]);
    setDiscoveryResult(null);
    setDataStats(null);
    setSchemaName('');
    setParticipant1Label('');
    setParticipant2Label('');
    setEditableFields([]);
    setSelectedFieldIndex(null);
  };

  const handleFileUpload = async (selectedFile: File) => {
    try {
      setIsProcessing(true);
      setFile(selectedFile);

      const isExcel = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls');
      let rows: any[];

      if (isExcel) {
        rows = await readExcelFile(selectedFile, sheetName);
      } else {
        const csvText = await readFileAsText(selectedFile);
        rows = parseCSV(csvText);
      }

      if (rows.length === 0) {
        throw new Error('No data found in file');
      }

      // Take first 20 rows for analysis
      const sampleRows = rows.slice(0, 20);
      setParsedRows(sampleRows);
      
      const cols = extractColumnNames(sampleRows);
      setColumns(cols);

      toast.success(`File loaded: ${cols.length} columns, ${rows.length} rows`);
    } catch (error) {
      console.error('File upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load file');
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!parsedRows || !businessContext.trim()) {
      toast.error('Please provide business context');
      return;
    }

    try {
      setIsProcessing(true);
      setCurrentStep('analyze');

      // Calculate data statistics
      const stats = calculateDataStatistics(columns, parsedRows);
      setDataStats(stats);

      // Call LLM for schema discovery
      const result = await discoverSchemaFromExcel(
        businessContext,
        columns,
        parsedRows,
        stats
      );

      setDiscoveryResult(result);
      setSchemaName(result.suggestedSchemaName);
      setParticipant1Label(result.participantLabels.participant_1);
      setParticipant2Label(result.participantLabels.participant_2);
      setEditableFields(result.fields);

      toast.success('Schema discovered successfully!');
      setCurrentStep('review');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze schema');
      setCurrentStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveSchema = async () => {
    if (!schemaName.trim()) {
      toast.error('Please provide a schema name');
      return;
    }

    // Validation
    const participant1Fields = editableFields.filter(f => f.semanticRole === 'participant_1');
    const participant2Fields = editableFields.filter(f => f.semanticRole === 'participant_2');
    const classificationFields = editableFields.filter(f => f.semanticRole === 'classification');

    if (participant1Fields.length !== 1) {
      toast.error('Schema must have exactly one Participant 1 field');
      return;
    }

    if (participant2Fields.length !== 1) {
      toast.error('Schema must have exactly one Participant 2 field');
      return;
    }

    if (classificationFields.length === 0) {
      toast.error('Schema must have at least one Classification field');
      return;
    }

    try {
      setIsProcessing(true);

      // Convert discovered fields to FieldDefinition format
      const fieldDefinitions: FieldDefinition[] = editableFields.map(df => ({
        id: df.suggestedFieldId,
        name: df.suggestedFieldId,
        displayName: df.suggestedDisplayName,
        dataType: df.inferredType,
        semanticRole: df.semanticRole,
        columnMapping: df.columnName,
        required: df.required,
        showInTable: df.showInTable,
        useInPrompt: df.useInPrompt,
        enableAnalytics: df.enableAnalytics,
        selectOptions: df.selectOptions,
        cardinalityHint: df.cardinalityHint,
      }));

      // Create schema
      const newSchema: Omit<SchemaDefinition, 'id' | 'createdAt' | 'updatedAt'> = {
        name: schemaName,
        version: '1.0.0',
        businessContext: businessContext,
        participantLabels: {
          participant_1: participant1Label,
          participant_2: participant2Label,
        },
        fields: fieldDefinitions,
        relationships: [],
        analyticsViews: [],
      };

      const savedSchema = await createSchema(newSchema);
      
      toast.success(`Schema "${schemaName}" created successfully!`);
      
      if (onSchemaCreated) {
        onSchemaCreated(savedSchema);
      }

      onOpenChange(false);
      resetWizard();
    } catch (error) {
      console.error('Save schema error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save schema');
    } finally {
      setIsProcessing(false);
    }
  };

  const updateField = (index: number, updates: Partial<DiscoveredField>) => {
    setEditableFields(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'upload':
        return 'Upload Excel File';
      case 'analyze':
        return 'Analyzing Structure...';
      case 'review':
        return 'Review & Edit Schema';
      case 'save':
        return 'Save Schema';
      default:
        return 'Schema Discovery';
    }
  };

  const getStepProgress = () => {
    switch (currentStep) {
      case 'upload':
        return 25;
      case 'analyze':
        return 50;
      case 'review':
        return 75;
      case 'save':
        return 100;
      default:
        return 0;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetWizard();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkle size={24} weight="duotone" className="text-blue-500" />
            {getStepTitle()}
          </DialogTitle>
          <DialogDescription>
            Create a new schema by uploading an Excel file. Our AI will analyze the structure and suggest optimal field configurations.
          </DialogDescription>
          <Progress value={getStepProgress()} className="mt-4" />
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {/* Step 1: Upload */}
          {currentStep === 'upload' && (
            <div className="space-y-6 py-4">
              <Card>
                <CardHeader>
                  <CardTitle>Upload Data File</CardTitle>
                  <CardDescription>
                    Select an Excel or CSV file containing sample data for schema discovery
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="file-upload">Excel or CSV File</Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => {
                        const selectedFile = e.target.files?.[0];
                        if (selectedFile) handleFileUpload(selectedFile);
                      }}
                      disabled={isProcessing}
                    />
                    {file && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle size={16} className="text-green-500" />
                        {file.name} ({columns.length} columns, {parsedRows?.length || 0} rows)
                      </div>
                    )}
                  </div>

                  {file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) && (
                    <div className="space-y-2">
                      <Label htmlFor="sheet-name">Sheet Name</Label>
                      <Input
                        id="sheet-name"
                        value={sheetName}
                        onChange={(e) => setSheetName(e.target.value)}
                        placeholder="Sheet1"
                      />
                    </div>
                  )}

                  {file && columns.length > 0 && (
                    <div className="space-y-2">
                      <Label>Detected Columns</Label>
                      <div className="flex flex-wrap gap-2">
                        {columns.map((col, idx) => (
                          <Badge key={idx} variant="secondary">{col}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Business Context</CardTitle>
                  <CardDescription>
                    Describe the purpose and domain of this data to help the AI make better inferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={businessContext}
                    onChange={(e) => setBusinessContext(e.target.value)}
                    placeholder="Example: This is call center data for a debt collection agency. Agents contact borrowers about overdue payments. We track call outcomes, borrower information, and payment status."
                    rows={5}
                    className="resize-none"
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Analyzing */}
          {currentStep === 'analyze' && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-4">
                <MagicWand size={48} weight="duotone" className="mx-auto text-blue-500 animate-pulse" />
                <h3 className="text-lg font-semibold">Analyzing Your Data...</h3>
                <p className="text-sm text-muted-foreground">
                  Our AI is examining column names, data types, and sample values to discover the optimal schema structure.
                </p>
                <Progress value={undefined} className="w-64 mx-auto" />
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {currentStep === 'review' && discoveryResult && (
            <div className="space-y-6 py-4">
              <Card>
                <CardHeader>
                  <CardTitle>Schema Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="schema-name">Schema Name</Label>
                    <Input
                      id="schema-name"
                      value={schemaName}
                      onChange={(e) => setSchemaName(e.target.value)}
                      placeholder="My Schema"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="participant-1">Participant 1 Label</Label>
                      <Input
                        id="participant-1"
                        value={participant1Label}
                        onChange={(e) => setParticipant1Label(e.target.value)}
                        placeholder="Agent"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="participant-2">Participant 2 Label</Label>
                      <Input
                        id="participant-2"
                        value={participant2Label}
                        onChange={(e) => setParticipant2Label(e.target.value)}
                        placeholder="Customer"
                      />
                    </div>
                  </div>

                  {discoveryResult.analysisNotes && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        <strong>AI Analysis:</strong> {discoveryResult.analysisNotes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Discovered Fields ({editableFields.length})</CardTitle>
                  <CardDescription>
                    Review and edit the field mappings. Click a field to edit its properties.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {editableFields.map((field, idx) => (
                      <div
                        key={idx}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedFieldIndex === idx
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                            : 'border-border hover:bg-accent'
                        }`}
                        onClick={() => setSelectedFieldIndex(idx === selectedFieldIndex ? null : idx)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{field.suggestedDisplayName}</span>
                                <Badge variant="outline" className="text-xs">
                                  {field.columnName}
                                </Badge>
                              </div>
                              {selectedFieldIndex !== idx && (
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="secondary" className="text-xs">
                                    {SEMANTIC_ROLES.find(r => r.value === field.semanticRole)?.label}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {FIELD_TYPES.find(t => t.value === field.inferredType)?.label}
                                  </Badge>
                                  {field.required && (
                                    <Badge variant="destructive" className="text-xs">Required</Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          {selectedFieldIndex === idx && (
                            <Badge variant="default" className="ml-2">Editing</Badge>
                          )}
                        </div>

                        {/* Expanded Edit Form */}
                        {selectedFieldIndex === idx && (
                          <div className="mt-4 pt-4 border-t space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Display Name</Label>
                                <Input
                                  value={field.suggestedDisplayName}
                                  onChange={(e) => updateField(idx, { suggestedDisplayName: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Field ID</Label>
                                <Input
                                  value={field.suggestedFieldId}
                                  onChange={(e) => updateField(idx, { suggestedFieldId: e.target.value })}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Semantic Role</Label>
                                <Select
                                  value={field.semanticRole}
                                  onValueChange={(value) => updateField(idx, { semanticRole: value as SemanticRole })}
                                >
                                  <SelectTrigger>
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
                              <div className="space-y-2">
                                <Label>Data Type</Label>
                                <Select
                                  value={field.inferredType}
                                  onValueChange={(value) => updateField(idx, { inferredType: value as FieldType })}
                                >
                                  <SelectTrigger>
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
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex items-center justify-between">
                                <Label>Required</Label>
                                <Switch
                                  checked={field.required}
                                  onCheckedChange={(checked) => updateField(idx, { required: checked })}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <Label>Show in Table</Label>
                                <Switch
                                  checked={field.showInTable}
                                  onCheckedChange={(checked) => updateField(idx, { showInTable: checked })}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex items-center justify-between">
                                <Label>Use in AI Prompts</Label>
                                <Switch
                                  checked={field.useInPrompt}
                                  onCheckedChange={(checked) => updateField(idx, { useInPrompt: checked })}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <Label>Enable Analytics</Label>
                                <Switch
                                  checked={field.enableAnalytics}
                                  onCheckedChange={(checked) => updateField(idx, { enableAnalytics: checked })}
                                />
                              </div>
                            </div>

                            <div className="p-3 bg-muted rounded-md">
                              <p className="text-xs text-muted-foreground">
                                <strong>AI Reasoning:</strong> {field.reasoning}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          {currentStep === 'upload' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAnalyze}
                disabled={!file || !businessContext.trim() || isProcessing}
              >
                <MagicWand className="mr-2" size={18} />
                Analyze with AI
              </Button>
            </>
          )}

          {currentStep === 'analyze' && (
            <Button variant="outline" disabled>
              <Progress value={undefined} className="w-24 h-4" />
            </Button>
          )}

          {currentStep === 'review' && (
            <>
              <Button variant="outline" onClick={() => setCurrentStep('upload')}>
                <ArrowLeft className="mr-2" size={18} />
                Back
              </Button>
              <Button onClick={handleSaveSchema} disabled={isProcessing}>
                <FloppyDisk className="mr-2" size={18} />
                {isProcessing ? 'Saving...' : 'Save Schema'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
