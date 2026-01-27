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
import { readExcelFile, parseCSV, readFileAsText, extractColumnNames, getExcelSheetNames } from '@/lib/csv-parser';
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
import { LLMCaller } from '@/llmCaller';
import type { AzureOpenAIConfig } from '@/configManager';
import { loadAzureConfigFromCookie } from '@/lib/azure-config-storage';
import { BrowserConfigManager } from '@/services/browser-config-manager';

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
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
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
  const [participant1Field, setParticipant1Field] = useState<string>(''); // Field ID for participant 1
  const [participant2Field, setParticipant2Field] = useState<string>(''); // Field ID for participant 2
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
        // Get available sheet names
        const sheets = await getExcelSheetNames(selectedFile);
        setAvailableSheets(sheets);
        
        // Use first sheet if current sheetName doesn't exist
        const targetSheet = sheets.includes(sheetName) ? sheetName : sheets[0];
        setSheetName(targetSheet);
        
        rows = await readExcelFile(selectedFile, targetSheet);
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

    // Validation - Check semantic roles assigned by AI
    const participant1Fields = editableFields.filter(f => f.semanticRole === 'participant_1');
    const participant2Fields = editableFields.filter(f => f.semanticRole === 'participant_2');
    const classificationFields = editableFields.filter(f => f.semanticRole === 'classification');

    console.log('=== PARTICIPANT VALIDATION ===');
    console.log('Participant 1 fields:', participant1Fields.length, participant1Fields.map(f => f.suggestedDisplayName));
    console.log('Participant 2 fields:', participant2Fields.length, participant2Fields.map(f => f.suggestedDisplayName));
    console.log('All fields with roles:', editableFields.map(f => ({ name: f.suggestedDisplayName, role: f.semanticRole })));

    // Smart validation: Check if AI already assigned participant roles correctly
    const hasValidParticipant1 = participant1Fields.length === 1;
    const hasValidParticipant2 = participant2Fields.length === 1;

    if (!hasValidParticipant1) {
      toast.error(`Schema must have exactly one Participant 1 field. Found ${participant1Fields.length}. Please review the field roles in the table below.`);
      return;
    }

    if (!hasValidParticipant2) {
      toast.error(`Schema must have exactly one Participant 2 field. Found ${participant2Fields.length}. Please review the field roles in the table below.`);
      return;
    }

    // Check if user selected fields match AI assignments (if user made selections)
    if (participant1Field && participant1Field !== '__generate__') {
      const userSelectedP1 = editableFields.find(f => f.suggestedFieldId === participant1Field);
      const aiAssignedP1 = participant1Fields[0];
      
      if (userSelectedP1 && userSelectedP1.suggestedFieldId !== aiAssignedP1.suggestedFieldId) {
        toast.warning(
          `Note: You selected "${userSelectedP1.suggestedDisplayName}" as Participant 1, but AI assigned this role to "${aiAssignedP1.suggestedDisplayName}". Using AI assignment. Please review the field roles in the table.`,
          { duration: 6000 }
        );
      }
    }

    if (participant2Field && participant2Field !== '__generate__') {
      const userSelectedP2 = editableFields.find(f => f.suggestedFieldId === participant2Field);
      const aiAssignedP2 = participant2Fields[0];
      
      if (userSelectedP2 && userSelectedP2.suggestedFieldId !== aiAssignedP2.suggestedFieldId) {
        toast.warning(
          `Note: You selected "${userSelectedP2.suggestedDisplayName}" as Participant 2, but AI assigned this role to "${aiAssignedP2.suggestedDisplayName}". Using AI assignment. Please review the field roles in the table.`,
          { duration: 6000 }
        );
      }
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
        name: df.columnName, // Use original Excel column name for matching
        displayName: df.suggestedDisplayName,
        type: df.inferredType,
        semanticRole: df.semanticRole,
        participantLabel: df.semanticRole === 'participant_1' ? participant1Label : 
                         df.semanticRole === 'participant_2' ? participant2Label : 
                         undefined,
        required: df.required,
        showInTable: df.showInTable,
        useInPrompt: df.useInPrompt,
        enableAnalytics: df.enableAnalytics,
        selectOptions: df.selectOptions,
        cardinalityHint: df.cardinalityHint,
      }));

      // Create schema
      const schemaId = `schema-${Date.now()}`;
      const sanitizedId = schemaId.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
      
      const newSchema: SchemaDefinition = {
        id: schemaId,
        name: schemaName,
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        businessContext: businessContext,
        excelFileName: file?.name,
        audioFolderPath: `/audio/${sanitizedId}`,
        fields: fieldDefinitions,
        relationships: [],
      };

      const result = createSchema(newSchema);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create schema');
      }
      
      toast.success(`Schema "${schemaName}" created successfully!`);
      
      if (onSchemaCreated) {
        onSchemaCreated(newSchema);
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
      <DialogContent className="max-w-6xl h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkle size={24} weight="duotone" className="text-blue-500" />
            {getStepTitle()}
          </DialogTitle>
          <DialogDescription>
            Create a new schema by uploading an Excel file. Our AI will analyze the structure and suggest optimal field configurations.
          </DialogDescription>
          <Progress value={getStepProgress()} className="mt-4" />
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 min-h-0">
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

                  {file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) && availableSheets.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="sheet-name">Sheet Name</Label>
                      <Select
                        value={sheetName}
                        onValueChange={async (value) => {
                          setSheetName(value);
                          // Reload data from selected sheet
                          if (file) {
                            setIsProcessing(true);
                            try {
                              const rows = await readExcelFile(file, value);
                              const sampleRows = rows.slice(0, 20);
                              setParsedRows(sampleRows);
                              const cols = extractColumnNames(sampleRows);
                              setColumns(cols);
                              toast.success(`Loaded sheet: ${value}`);
                            } catch (error) {
                              console.error('Sheet reload error:', error);
                              toast.error('Failed to load sheet');
                            } finally {
                              setIsProcessing(false);
                            }
                          }
                        }}
                      >
                        <SelectTrigger id="sheet-name">
                          <SelectValue placeholder="Select sheet..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSheets.map((sheet) => (
                            <SelectItem key={sheet} value={sheet}>
                              {sheet}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-purple-500 text-purple-600 hover:bg-purple-50 hover:text-purple-700"
                      onClick={async () => {
                        if (!columns || columns.length === 0) {
                          toast.error('No column data available');
                          return;
                        }
                        setIsProcessing(true);
                        try {
                          // Load Azure OpenAI config from cookie (same as rest of app)
                          const azureServicesConfig = loadAzureConfigFromCookie();
                          if (!azureServicesConfig?.openAI?.endpoint || !azureServicesConfig?.openAI?.apiKey || !azureServicesConfig?.openAI?.deploymentName) {
                            toast.error('Azure OpenAI not configured. Please configure in settings.');
                            setIsProcessing(false);
                            return;
                          }

                          const configManager = new BrowserConfigManager(azureServicesConfig.openAI);
                          const llmCaller = new LLMCaller(configManager);

                          const prompt = `Based on these column names from a dataset, generate a concise business context description (2-3 sentences) explaining what this data is about, what domain it belongs to, and what purpose it serves:

Column names: ${columns.join(', ')}

Provide only the business context description without any additional explanation or formatting.`;

                          const response = await llmCaller.call([{ role: 'user', content: prompt }]);

                          if (response) {
                            setBusinessContext(response.trim());
                            toast.success('Business context generated');
                          }
                        } catch (error) {
                          console.error('Context generation error:', error);
                          toast.error('Failed to generate context');
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                      disabled={isProcessing || !columns || columns.length === 0}
                    >
                      <Sparkle className="mr-2 h-4 w-4" />
                      Suggest Context with AI
                    </Button>
                    {isProcessing && (
                      <span className="text-xs text-muted-foreground">Generating...</span>
                    )}
                  </div>
                  <Textarea
                    value={businessContext}
                    onChange={(e) => setBusinessContext(e.target.value)}
                    placeholder="Example: This is call center data for a debt collection agency. Agents contact borrowers about overdue payments. We track call outcomes, borrower information, and payment status."
                    rows={6}
                    className="resize-none max-h-40 overflow-y-auto"
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
                      placeholder="e.g., Debt Collection - ACME Corp"
                      className="font-medium"
                    />
                    <p className="text-xs text-muted-foreground">
                      Give your schema a descriptive name to identify its use case, project, or client.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="participant-1-label">Participant 1 Label</Label>
                      <Input
                        id="participant-1-label"
                        value={participant1Label}
                        onChange={(e) => setParticipant1Label(e.target.value)}
                        placeholder="Agent"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="participant-2-label">Participant 2 Label</Label>
                      <Input
                        id="participant-2-label"
                        value={participant2Label}
                        onChange={(e) => setParticipant2Label(e.target.value)}
                        placeholder="Customer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="participant-1-field">Participant 1 Field (Agent Name)</Label>
                      <Select
                        value={participant1Field}
                        onValueChange={setParticipant1Field}
                      >
                        <SelectTrigger id="participant-1-field" className="w-full">
                          <SelectValue placeholder="Select field..." />
                        </SelectTrigger>
                        <SelectContent className="max-w-[400px]">
                          <SelectItem value="__generate__">
                            🎲 Generate Names
                          </SelectItem>
                          {editableFields
                            .filter(f => f.semanticRole === 'participant_1' || f.inferredType === 'string')
                            .map((field) => (
                              <SelectItem key={field.suggestedFieldId} value={field.suggestedFieldId}>
                                <span className="truncate">{field.suggestedDisplayName}</span>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {participant1Field === '__generate__' && (
                        <p className="text-xs text-muted-foreground">
                          AI will generate 5 random agent names
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="participant-2-field">Participant 2 Field (Caller Name)</Label>
                      <Select
                        value={participant2Field}
                        onValueChange={setParticipant2Field}
                      >
                        <SelectTrigger id="participant-2-field" className="w-full">
                          <SelectValue placeholder="Select field..." />
                        </SelectTrigger>
                        <SelectContent className="max-w-[400px]">
                          <SelectItem value="__generate__">
                            🎲 Generate Names
                          </SelectItem>
                          {editableFields
                            .filter(f => f.semanticRole === 'participant_2' || f.inferredType === 'string')
                            .map((field) => (
                              <SelectItem key={field.suggestedFieldId} value={field.suggestedFieldId}>
                                <span className="truncate">{field.suggestedDisplayName}</span>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {participant2Field === '__generate__' && (
                        <p className="text-xs text-muted-foreground">
                          AI will generate 5 random caller names
                        </p>
                      )}
                    </div>
                  </div>

                  {discoveryResult.analysisNotes && !discoveryResult.analysisNotes.includes('stub implementation') && (
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
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Discovered Fields ({editableFields.length})</CardTitle>
                      <CardDescription>
                        Review and edit the field mappings. Click a field to edit its properties.
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-purple-500 text-purple-600 hover:bg-purple-50 hover:text-purple-700"
                      onClick={async () => {
                        if (!participant1Field || !participant2Field || participant1Field === '__generate__' || participant2Field === '__generate__') {
                          toast.error('Please select Participant 1 and Participant 2 fields before configuring with AI. All calls expect at least 2 participants.');
                          return;
                        }
                        
                        setIsProcessing(true);
                        try {
                          const azureServicesConfig = loadAzureConfigFromCookie();
                          if (!azureServicesConfig?.openAI?.endpoint || !azureServicesConfig?.openAI?.apiKey || !azureServicesConfig?.openAI?.deploymentName) {
                            toast.error('Azure OpenAI not configured');
                            setIsProcessing(false);
                            return;
                          }

                          const configManager = new BrowserConfigManager(azureServicesConfig.openAI);
                          const llmCaller = new LLMCaller(configManager);

                          // Find selected participant fields
                          const p1FieldName = editableFields.find(f => f.suggestedFieldId === participant1Field)?.suggestedDisplayName || 'Participant 1';
                          const p2FieldName = editableFields.find(f => f.suggestedFieldId === participant2Field)?.suggestedDisplayName || 'Participant 2';

                          // Prepare field list for context
                          const fieldList = editableFields.map(f => 
                            `- ${f.suggestedDisplayName} (${f.columnName}): current role=${f.semanticRole}, type=${f.inferredType}`
                          ).join('\n');

                          const prompt = `Given this business context and list of data fields, analyze each field and configure its properties optimally.

Business Context:
${businessContext}

IMPORTANT: The user has selected these participant fields:
- Participant 1 (${participant1Label}): ${p1FieldName}
- Participant 2 (${participant2Label}): ${p2FieldName}

You MUST assign semanticRole="participant_1" to "${p1FieldName}" and semanticRole="participant_2" to "${p2FieldName}".

Fields:
${fieldList}

For each field, provide:
1. description: 1-2 sentences explaining what it represents
2. semanticRole: one of [participant_1, participant_2, classification, metric, dimension, identifier, timestamp, freeform]
   - participant_1/participant_2: People involved (agent, customer)
   - classification: Categorical status/outcome
   - metric: Numeric measurement
   - dimension: Grouping/analysis field
   - identifier: Unique ID
   - timestamp: Date/time
   - freeform: Unstructured text
3. inferredType: one of [string, number, date, boolean, select]
4. required: true if field is essential
5. showInTable: true if should display in data tables
6. useInPrompt: true if useful for AI analysis
7. enableAnalytics: true if suitable for charts/reports

Return JSON array:
[
  {
    "fieldId": "field_name",
    "description": "...",
    "semanticRole": "metric",
    "inferredType": "number",
    "required": true,
    "showInTable": true,
    "useInPrompt": true,
    "enableAnalytics": true
  }
]`;

                          interface FieldConfig {
                            fieldId: string;
                            description: string;
                            semanticRole: SemanticRole;
                            inferredType: FieldType;
                            required: boolean;
                            showInTable: boolean;
                            useInPrompt: boolean;
                            enableAnalytics: boolean;
                          }

                          const response = await llmCaller.callWithJsonValidation<FieldConfig[]>(
                            [{ role: 'user', content: prompt }],
                            { useJsonMode: false, maxRetries: 2 }
                          );

                          if (response.parsed && Array.isArray(response.parsed)) {
                            console.log('Parsed field configurations:', response.parsed);
                            console.log('Current fields:', editableFields.map(f => ({ id: f.suggestedFieldId, display: f.suggestedDisplayName, column: f.columnName })));
                            
                            // Validate semantic roles and field types
                            const validSemanticRoles = new Set<SemanticRole>([
                              'participant_1', 'participant_2', 'classification', 'metric', 
                              'dimension', 'identifier', 'timestamp', 'freeform'
                            ]);
                            const validFieldTypes = new Set<FieldType>([
                              'string', 'number', 'date', 'boolean', 'select'
                            ]);
                            
                            // Update fields with ALL properties - flexible matching
                            const updatedFields = editableFields.map(field => {
                              const match = response.parsed.find((d: FieldConfig) => {
                                const fieldIdLower = (d.fieldId || '').toLowerCase();
                                const suggestedIdLower = field.suggestedFieldId.toLowerCase();
                                const columnNameLower = field.columnName.toLowerCase();
                                const displayNameLower = field.suggestedDisplayName.toLowerCase();
                                
                                // Match by exact ID, column name, display name, or if fieldId contains the column name
                                return fieldIdLower === suggestedIdLower ||
                                       fieldIdLower === columnNameLower ||
                                       fieldIdLower === displayNameLower ||
                                       fieldIdLower.includes(columnNameLower) ||
                                       columnNameLower.includes(fieldIdLower.replace(/\s*\(.*?\)\s*/g, '').trim());
                              });
                              
                              if (match) {
                                console.log(`Matched field ${field.suggestedDisplayName} - configuring all properties`);
                                
                                // Validate and apply all properties
                                const semanticRole = validSemanticRoles.has(match.semanticRole) 
                                  ? match.semanticRole 
                                  : field.semanticRole;
                                const inferredType = validFieldTypes.has(match.inferredType)
                                  ? match.inferredType
                                  : field.inferredType;

                                return {
                                  ...field,
                                  description: match.description,
                                  semanticRole,
                                  inferredType,
                                  required: match.required,
                                  showInTable: match.showInTable,
                                  useInPrompt: match.useInPrompt,
                                  enableAnalytics: match.enableAnalytics
                                };
                              }
                              
                              return field;
                            });
                            setEditableFields(updatedFields);
                            toast.success('All field properties configured by AI');
                          }
                        } catch (error) {
                          console.error('Description generation error:', error);
                          toast.error('Failed to generate descriptions');
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                      disabled={isProcessing || !businessContext.trim() || !participant1Field || !participant2Field || participant1Field === '__generate__' || participant2Field === '__generate__'}
                      title={(!participant1Field || !participant2Field || participant1Field === '__generate__' || participant2Field === '__generate__') 
                        ? 'Please select Participant 1 and Participant 2 fields first. All calls expect at least 2 participants.' 
                        : !businessContext.trim() 
                        ? 'Please provide business context first' 
                        : 'Use AI to configure all field properties'}
                    >
                      <Sparkle className={`mr-2 h-4 w-4 ${isProcessing ? 'animate-pulse' : 'animate-pulse'}`} />
                      Configure All Fields with AI
                    </Button>
                  </div>
                  {(!participant1Field || !participant2Field || participant1Field === '__generate__' || participant2Field === '__generate__') && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                      ⚠️ Participant field mapping is mandatory. All calls expect at least 2 participants. Please select fields above before using AI configuration.
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
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
                                <>
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
                                  {field.description && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                      {field.description}
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          {selectedFieldIndex === idx && (
                            <Badge variant="default" className="ml-2">Editing</Badge>
                          )}
                        </div>

                        {/* Expanded Edit Form */}
                        {selectedFieldIndex === idx && (
                          <div className="mt-4 pt-4 border-t space-y-4" onClick={(e) => e.stopPropagation()}>
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

                            <div className="space-y-2">
                              <Label>Description (what this field represents)</Label>
                              <Textarea
                                value={field.description || ''}
                                onChange={(e) => updateField(idx, { description: e.target.value })}
                                placeholder="AI-generated description will appear here. You can edit it to provide context for later AI operations."
                                rows={2}
                                className="resize-none"
                              />
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

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
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
