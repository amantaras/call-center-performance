import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Sparkle,
  ArrowRight,
  ArrowLeft,
  Check,
  Warning,
  Database,
  ListBullets,
  Lightbulb,
  ChatText,
  Spinner,
  Calendar,
} from '@phosphor-icons/react';
import { SchemaDefinition, FieldDefinition } from '@/types/schema';
import { CallRecord, TranscriptPhrase, CallSentimentSegment, SentimentLabel } from '@/types/call';
import { AzureServicesConfig } from '@/types/config';
import { azureOpenAIService } from '@/services/azure-openai';
import { loadAzureConfigFromCookie } from '@/lib/azure-config-storage';
import { toast } from 'sonner';

interface SyntheticMetadataWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schema: SchemaDefinition;
  existingCalls: CallRecord[];
  onRecordsGenerated: (records: CallRecord[]) => void;
}

type WizardStep = 'intro' | 'configure' | 'transcription-config' | 'generate' | 'review';

interface GeneratedRecord {
  id: string;
  metadata: Record<string, any>;
  // Structured transcription data for UI display
  transcript?: string;
  transcriptPhrases?: TranscriptPhrase[];
  transcriptDuration?: number;
  transcriptSpeakerCount?: number;
  transcriptLocale?: string;
  // Sentiment data for synthetic calls
  sentimentSegments?: CallSentimentSegment[];
  overallSentiment?: SentimentLabel;
  selected: boolean;
}

/**
 * SyntheticMetadataWizard Component
 * 
 * A wizard that helps users generate synthetic metadata records
 * using AI based on the current schema definition.
 */
export function SyntheticMetadataWizard({
  open,
  onOpenChange,
  schema,
  existingCalls,
  onRecordsGenerated,
}: SyntheticMetadataWizardProps) {
  const [step, setStep] = useState<WizardStep>('intro');
  const [customPrompt, setCustomPrompt] = useState('');
  const [recordCount, setRecordCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const [generatedRecords, setGeneratedRecords] = useState<GeneratedRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Transcription generation options
  const [generateTranscriptions, setGenerateTranscriptions] = useState(false);
  const [transcriptionPrompt, setTranscriptionPrompt] = useState('');
  
  // Date range for synthetic records
  const [dateRangeEnabled, setDateRangeEnabled] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    // Default: 30 days ago
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    // Default: today
    return new Date().toISOString().split('T')[0];
  });
  
  // Participant occurrence limits
  const [maxParticipant1Occurrences, setMaxParticipant1Occurrences] = useState(5);
  // Participant 2: random names by default, or limit to existing names
  const [useRandomParticipant2Names, setUseRandomParticipant2Names] = useState(true);
  const [maxParticipant2Occurrences, setMaxParticipant2Occurrences] = useState(5);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep('intro');
      setCustomPrompt('');
      setRecordCount(5);
      setIsGenerating(false);
      setGenerationProgress(0);
      setGenerationStatus('');
      setGeneratedRecords([]);
      setError(null);
      setGenerateTranscriptions(false);
      setTranscriptionPrompt('');
      // Reset date range to last 30 days
      setDateRangeEnabled(true);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      setDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);
      setDateTo(new Date().toISOString().split('T')[0]);
      // Default participant limits: min of recordCount and 10
      setMaxParticipant1Occurrences(Math.min(5, 10));
      // Participant 2: random names by default
      setUseRandomParticipant2Names(true);
      setMaxParticipant2Occurrences(5);
    }
  }, [open]);
  
  // Update participant limits when record count changes
  useEffect(() => {
    setMaxParticipant1Occurrences(prev => Math.min(prev, Math.min(recordCount, 10)));
    // Only adjust participant 2 limit if not using random names
    if (!useRandomParticipant2Names) {
      setMaxParticipant2Occurrences(prev => Math.min(prev, recordCount));
    }
  }, [recordCount, useRandomParticipant2Names]);

  // Get editable fields from schema (exclude system/identifier fields)
  const editableFields = schema.fields.filter(f => 
    f.semanticRole !== 'identifier' && 
    !['id', 'schemaId', 'schemaVersion', 'createdAt', 'updatedAt', 'status'].includes(f.id)
  );

  // Get participant fields for transcription context
  const participant1Field = schema.fields.find(f => f.semanticRole === 'participant_1');
  const participant2Field = schema.fields.find(f => f.semanticRole === 'participant_2');
  
  // Extract unique existing participants from existing calls
  const existingParticipant1Names = participant1Field 
    ? [...new Set(existingCalls.map(c => c.metadata[participant1Field.id] || c.metadata[participant1Field.name]).filter(Boolean))]
    : [];
  const existingParticipant2Names = participant2Field
    ? [...new Set(existingCalls.map(c => c.metadata[participant2Field.id] || c.metadata[participant2Field.name]).filter(Boolean))]
    : [];

  // Build the generation prompt for a specific batch
  const buildBatchGenerationPrompt = (batchRecordCount: number, batchIndex: number, totalBatches: number): string => {
    const fieldDescriptions = editableFields.map(field => {
      let desc = `- ${field.id} (${field.type}): ${field.displayName}`;
      if (field.semanticRole) desc += ` [Role: ${field.semanticRole}]`;
      if (field.type === 'select' && field.selectOptions) {
        desc += ` [Options: ${field.selectOptions.join(', ')}]`;
      }
      if (field.required) desc += ' (required)';
      return desc;
    }).join('\n');

    const existingDataSample = existingCalls.slice(0, 3).map(call => {
      const relevantData: Record<string, any> = {};
      editableFields.forEach(f => {
        if (call.metadata[f.id] !== undefined) {
          relevantData[f.id] = call.metadata[f.id];
        }
      });
      return relevantData;
    });
    
    // Build participant constraints section
    let participantConstraints = '';
    if (participant1Field || participant2Field) {
      participantConstraints = '\nPARTICIPANT CONSTRAINTS:\n';
      
      if (participant1Field) {
        const p1Label = participant1Field.participantLabel || participant1Field.displayName || 'Participant 1';
        participantConstraints += `- For "${participant1Field.id}" (${p1Label}): Use at most ${maxParticipant1Occurrences} unique names across all records.\n`;
        if (existingParticipant1Names.length > 0) {
          participantConstraints += `  Existing names you can reuse: ${existingParticipant1Names.slice(0, 10).join(', ')}\n`;
        }
      }
      
      if (participant2Field) {
        const p2Label = participant2Field.participantLabel || participant2Field.displayName || 'Participant 2';
        if (useRandomParticipant2Names) {
          participantConstraints += `- For "${participant2Field.id}" (${p2Label}): Generate unique random names for each record (each ${p2Label} should be different).\n`;
        } else {
          participantConstraints += `- For "${participant2Field.id}" (${p2Label}): Use at most ${maxParticipant2Occurrences} unique names across all records.\n`;
          if (existingParticipant2Names.length > 0) {
            participantConstraints += `  Existing names you MUST reuse: ${existingParticipant2Names.slice(0, maxParticipant2Occurrences).join(', ')}\n`;
          }
        }
      }
      
      participantConstraints += `  This means some records should share the same participant names (realistic scenario where agents/customers have multiple interactions).\n`;
    }

    // Add batch context for diversity
    const batchContext = totalBatches > 1 
      ? `\nBATCH CONTEXT: This is batch ${batchIndex + 1} of ${totalBatches}. Ensure variety - generate different scenarios from other batches.\n`
      : '';

    // Build date range constraint for the LLM
    const dateRangeConstraint = dateRangeEnabled
      ? `\nDATE RANGE CONSTRAINT:
For ALL date/timestamp fields in the records, generate random dates between ${dateFrom} and ${dateTo}.
Distribute dates evenly across this range - each record should have a different date.
Use ISO format: YYYY-MM-DD for date fields, or full ISO timestamp YYYY-MM-DDTHH:MM:SS for datetime fields.
`
      : '';

    return `You are a data generation assistant for Contoso Corporation, a fictional company used for demonstration purposes. Generate ${batchRecordCount} realistic and diverse synthetic metadata records for a ${schema.name} schema.

IMPORTANT: All generated data should reference "Contoso" as the company/organization name where applicable. Use Contoso branding for any company references, email domains (@contoso.com), or corporate mentions.

SCHEMA NAME: ${schema.name}
${batchContext}
BUSINESS CONTEXT:
${schema.businessContext || 'General business data (Contoso Corporation)'}

FIELDS TO GENERATE:
${fieldDescriptions}
${participantConstraints}${dateRangeConstraint}
${existingDataSample.length > 0 ? `
EXISTING DATA SAMPLE (for reference style and patterns):
${JSON.stringify(existingDataSample, null, 2)}
` : ''}${customPrompt.trim() ? `
ADDITIONAL USER INSTRUCTIONS:
${customPrompt}` : ''}

GENERATION REQUIREMENTS:
1. Generate exactly ${batchRecordCount} unique records
2. Each record must include ALL fields listed above
3. Follow the data types strictly (string, number, date, boolean, select options)
4. For select fields, only use the provided options
5. Make the data realistic and varied based on the business context
6. If additional user instructions are provided, follow them precisely
7. Ensure diversity across records (different values, scenarios)
8. For date fields: ${dateRangeEnabled ? `MUST use dates between ${dateFrom} and ${dateTo} - distribute randomly across this range` : 'use ISO format (YYYY-MM-DD)'}
9. For number fields, provide numeric values (not strings)
10. For boolean fields, use true/false
${participant1Field || participant2Field ? `11. IMPORTANT: Respect participant limits - reuse names to stay within the max unique count specified` : ''}

OUTPUT FORMAT:
Return a JSON object with a "records" array containing exactly ${batchRecordCount} objects.
Each object should have all the field IDs as keys with appropriate values.

Example structure:
{
  "records": [
    { "field1": "value1", "field2": 123, ... },
    { "field1": "value2", "field2": 456, ... }
  ]
}`;
  };

  // Generate synthetic records using LLM with parallel batch processing
  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setGenerationProgress(5);
    setGenerationStatus('Preparing generation...');

    try {
      // Load config for parallel batch settings
      const azureConfig = loadAzureConfigFromCookie();
      const parallelBatches = azureConfig?.syntheticData?.parallelBatches ?? 3;
      const recordsPerBatch = azureConfig?.syntheticData?.recordsPerBatch ?? 5;
      
      // Calculate batches needed
      const totalBatches = Math.ceil(recordCount / recordsPerBatch);
      const batches: { batchIndex: number; recordsInBatch: number }[] = [];
      let remainingRecords = recordCount;
      
      for (let i = 0; i < totalBatches; i++) {
        const recordsInBatch = Math.min(recordsPerBatch, remainingRecords);
        batches.push({ batchIndex: i, recordsInBatch });
        remainingRecords -= recordsInBatch;
      }

      console.log(`🚀 Generating ${recordCount} records in ${totalBatches} batches (${parallelBatches} parallel, ${recordsPerBatch} per batch)`);
      setGenerationStatus(`Generating ${recordCount} records in ${totalBatches} batches...`);
      setGenerationProgress(10);

      // Process batches in parallel groups
      let allRecords: GeneratedRecord[] = [];
      let completedBatches = 0;
      
      for (let i = 0; i < batches.length; i += parallelBatches) {
        const batchGroup = batches.slice(i, i + parallelBatches);
        const groupStartTime = Date.now();
        
        setGenerationStatus(`Processing batch group ${Math.floor(i / parallelBatches) + 1}/${Math.ceil(batches.length / parallelBatches)} (${batchGroup.length} parallel calls)...`);
        
        // Execute parallel batches
        const batchPromises = batchGroup.map(async ({ batchIndex, recordsInBatch }) => {
          const prompt = buildBatchGenerationPrompt(recordsInBatch, batchIndex, totalBatches);
          try {
            const response = await azureOpenAIService.generateSyntheticData(prompt, recordsInBatch);
            return response?.records || [];
          } catch (err) {
            console.error(`Batch ${batchIndex + 1} failed:`, err);
            return []; // Return empty on failure, continue with other batches
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        
        // Flatten results and create GeneratedRecord objects
        const groupRecords = batchResults.flat().map((metadata: Record<string, any>, index: number) => ({
          id: `synthetic_${Date.now()}_${allRecords.length + index}`,
          metadata,
          selected: true,
        }));
        
        allRecords = [...allRecords, ...groupRecords];
        completedBatches += batchGroup.length;
        
        const metadataProgress = 10 + Math.round((completedBatches / totalBatches) * 30);
        setGenerationProgress(metadataProgress);
        
        console.log(`✓ Batch group completed in ${Date.now() - groupStartTime}ms, total records: ${allRecords.length}`);
      }

      if (allRecords.length === 0) {
        throw new Error('No records were generated. Please check your Azure OpenAI configuration.');
      }

      setGenerationProgress(40);
      setGenerationStatus(`Generated ${allRecords.length} metadata records`);

      // Step 2: Generate transcriptions if enabled (also in parallel)
      if (generateTranscriptions) {
        setGenerationStatus('Generating synthetic transcriptions...');
        const transcriptionParallel = Math.min(parallelBatches, 5); // Limit transcription parallelism
        
        for (let i = 0; i < allRecords.length; i += transcriptionParallel) {
          const recordGroup = allRecords.slice(i, i + transcriptionParallel);
          
          setGenerationStatus(`Generating transcriptions ${i + 1}-${Math.min(i + transcriptionParallel, allRecords.length)} of ${allRecords.length}...`);
          
          const transcriptionPromises = recordGroup.map(async (record, groupIndex) => {
            const recordIndex = i + groupIndex;
            try {
              const transcriptionResult = await azureOpenAIService.generateSyntheticTranscription(
                record.metadata,
                schema,
                transcriptionPrompt || undefined
              );
              
              if (transcriptionResult) {
                allRecords[recordIndex].transcript = transcriptionResult.transcript;
                allRecords[recordIndex].transcriptPhrases = transcriptionResult.phrases;
                allRecords[recordIndex].transcriptDuration = transcriptionResult.durationMilliseconds;
                allRecords[recordIndex].transcriptSpeakerCount = transcriptionResult.speakerCount;
                allRecords[recordIndex].transcriptLocale = transcriptionResult.locale;
                allRecords[recordIndex].sentimentSegments = transcriptionResult.sentimentSegments;
                allRecords[recordIndex].overallSentiment = transcriptionResult.overallSentiment;
              }
            } catch (err) {
              console.error(`Failed to generate transcription for record ${recordIndex + 1}:`, err);
            }
          });
          
          await Promise.all(transcriptionPromises);
          
          const transcriptionProgress = 40 + Math.round(((i + recordGroup.length) / allRecords.length) * 55);
          setGenerationProgress(transcriptionProgress);
        }
      }

      setGenerationProgress(95);
      setGenerationStatus('Finalizing...');

      setGeneratedRecords(allRecords);
      setGenerationProgress(100);
      setStep('review');
      
      const transcriptCount = allRecords.filter(r => r.transcript).length;
      if (generateTranscriptions && transcriptCount > 0) {
        toast.success(`Generated ${allRecords.length} records with ${transcriptCount} transcriptions`);
      } else {
        toast.success(`Generated ${allRecords.length} synthetic records`);
      }
    } catch (err: any) {
      console.error('Synthetic data generation error:', err);
      setError(err.message || 'Failed to generate synthetic data');
      toast.error('Generation failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsGenerating(false);
      setGenerationStatus('');
    }
  };

  // Toggle record selection
  const toggleRecordSelection = (id: string) => {
    setGeneratedRecords(prev =>
      prev.map(r => r.id === id ? { ...r, selected: !r.selected } : r)
    );
  };

  // Select/deselect all records
  const toggleSelectAll = () => {
    const allSelected = generatedRecords.every(r => r.selected);
    setGeneratedRecords(prev =>
      prev.map(r => ({ ...r, selected: !allSelected }))
    );
  };

  // Create CallRecords from selected generated records
  const handleAddRecords = () => {
    const selectedRecords = generatedRecords.filter(r => r.selected);
    
    if (selectedRecords.length === 0) {
      toast.error('Please select at least one record to add');
      return;
    }

    // Helper function to generate random date within range
    const generateRandomDate = (): string => {
      if (!dateRangeEnabled) {
        return new Date().toISOString();
      }
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      // Set time to random hour of the day for more realism
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      
      const fromTime = from.getTime();
      const toTime = to.getTime();
      const randomTime = fromTime + Math.random() * (toTime - fromTime);
      
      return new Date(randomTime).toISOString();
    };

    const newCallRecords: CallRecord[] = selectedRecords.map(r => {
      // Determine status based on whether transcription was generated
      const hasTranscript = r.transcript && r.transcript.trim().length > 0;
      const hasPhrases = r.transcriptPhrases && r.transcriptPhrases.length > 0;
      const status = hasTranscript ? 'transcribed' : 'pending audio';
      
      // Generate random date for this record
      const recordDate = generateRandomDate();
      
      return {
        id: r.id,
        schemaId: schema.id,
        schemaVersion: schema.version,
        metadata: r.metadata,
        // Full transcription data for UI display with diarization
        transcript: r.transcript,
        transcriptConfidence: hasTranscript ? 0.98 : undefined, // Synthetic = high confidence
        transcriptPhrases: r.transcriptPhrases, // Structured phrases for conversation UI
        transcriptDuration: r.transcriptDuration, // Duration in milliseconds
        transcriptSpeakerCount: r.transcriptSpeakerCount || (hasPhrases ? 2 : undefined),
        transcriptLocale: r.transcriptLocale || 'en-US',
        // Sentiment data for synthetic calls
        sentimentSegments: r.sentimentSegments,
        overallSentiment: r.overallSentiment,
        status: status as CallRecord['status'],
        createdAt: recordDate,
        updatedAt: recordDate,
      };
    });

    onRecordsGenerated(newCallRecords);
    
    const withTranscripts = newCallRecords.filter(r => r.transcript).length;
    if (withTranscripts > 0) {
      toast.success(`Added ${newCallRecords.length} records (${withTranscripts} with transcriptions)`);
    } else {
      toast.success(`Added ${newCallRecords.length} new records to the database`);
    }
    onOpenChange(false);
  };

  // Handle dialog close - prevent during generation
  const handleOpenChange = (newOpen: boolean) => {
    if (isGenerating) {
      // Prevent closing during generation
      return;
    }
    onOpenChange(newOpen);
  };

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 'intro':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-lg">
              <div className="p-3 bg-primary/10 rounded-full">
                <Sparkle className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">AI-Powered Synthetic Data Generation</h3>
                <p className="text-muted-foreground text-sm">
                  Generate realistic metadata records based on your schema definition
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted rounded-full">
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium">Current Schema: {schema.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {editableFields.length} fields available for data generation
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted rounded-full">
                  <ListBullets className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium">Existing Records: {existingCalls.filter(c => c.schemaId === schema.id).length}</h4>
                  <p className="text-sm text-muted-foreground">
                    New synthetic records will be added to your existing data
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted rounded-full">
                  <Lightbulb className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium">How it works</h4>
                  <p className="text-sm text-muted-foreground">
                    You'll provide instructions to guide the AI in generating meaningful,
                    contextual data that fits your schema and business requirements.
                  </p>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Schema Fields</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto">
                  {editableFields.map(field => (
                    <Badge key={field.id} variant="secondary" className="text-xs whitespace-nowrap">
                      {field.displayName}
                      <span className="ml-1 text-muted-foreground">({field.type})</span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'configure':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recordCount" className="text-base font-medium">
                  Number of Records
                </Label>
                <p className="text-sm text-muted-foreground">
                  How many synthetic records do you want to generate?
                </p>
                <Input
                  id="recordCount"
                  type="number"
                  min={1}
                  max={50}
                  value={recordCount}
                  onChange={(e) => setRecordCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum: 50 records per generation
                </p>
              </div>

              {/* Date Range Selection */}
              <Separator />
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Label className="text-base font-medium flex items-center gap-2">
                      <Calendar size={18} />
                      Date Range for Records
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Generate records with random dates within a specified range
                    </p>
                  </div>
                  <Switch
                    checked={dateRangeEnabled}
                    onCheckedChange={setDateRangeEnabled}
                  />
                </div>
                
                {dateRangeEnabled && (
                  <div className="grid grid-cols-2 gap-4 pl-1">
                    <div className="space-y-2">
                      <Label htmlFor="dateFrom" className="text-sm">From Date</Label>
                      <Input
                        id="dateFrom"
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        max={dateTo}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateTo" className="text-sm">To Date</Label>
                      <Input
                        id="dateTo"
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        min={dateFrom}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full"
                      />
                    </div>
                    <p className="col-span-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      💡 Records will be assigned random dates and times within this range for realistic distribution.
                    </p>
                  </div>
                )}
                
                {!dateRangeEnabled && (
                  <p className="text-xs text-muted-foreground">
                    All records will use the current date/time when disabled.
                  </p>
                )}
              </div>

              {/* Participant Occurrence Limits */}
              {(participant1Field || participant2Field) && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-medium">Participant Limits</Label>
                      <p className="text-sm text-muted-foreground">
                        Limit the number of unique participant names to create realistic scenarios 
                        where the same agents/customers appear in multiple records.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {participant1Field && (
                        <div className="space-y-2">
                          <Label htmlFor="maxParticipant1" className="text-sm">
                            Max {participant1Field.participantLabel || participant1Field.displayName || 'Participant 1'} names
                          </Label>
                          <Input
                            id="maxParticipant1"
                            type="number"
                            min={1}
                            max={Math.min(recordCount, 10)}
                            value={maxParticipant1Occurrences}
                            onChange={(e) => setMaxParticipant1Occurrences(
                              Math.max(1, Math.min(Math.min(recordCount, 10), parseInt(e.target.value) || 1))
                            )}
                            className="w-24"
                          />
                          {existingParticipant1Names.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {existingParticipant1Names.length} existing: {existingParticipant1Names.slice(0, 3).join(', ')}
                              {existingParticipant1Names.length > 3 && '...'}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {participant2Field && (
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">
                            {participant2Field.participantLabel || participant2Field.displayName || 'Participant 2'} Names
                          </Label>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="randomParticipant2"
                              checked={useRandomParticipant2Names}
                              onCheckedChange={(checked) => {
                                setUseRandomParticipant2Names(checked);
                                // When switching to limited mode, set default to recordCount
                                if (!checked) {
                                  setMaxParticipant2Occurrences(recordCount);
                                }
                              }}
                            />
                            <Label htmlFor="randomParticipant2" className="text-sm cursor-pointer">
                              Generate random names
                            </Label>
                          </div>
                          {!useRandomParticipant2Names && (
                            <div className="space-y-2 pl-6 border-l-2 border-muted">
                              <Label htmlFor="maxParticipant2" className="text-sm">
                                Max unique {participant2Field.participantLabel || participant2Field.displayName || 'Participant 2'} names
                              </Label>
                              <Input
                                id="maxParticipant2"
                                type="number"
                                min={1}
                                max={recordCount}
                                value={maxParticipant2Occurrences}
                                onChange={(e) => setMaxParticipant2Occurrences(
                                  Math.max(1, Math.min(recordCount, parseInt(e.target.value) || 1))
                                )}
                                className="w-24"
                              />
                              {existingParticipant2Names.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  {existingParticipant2Names.length} existing: {existingParticipant2Names.slice(0, 3).join(', ')}
                                  {existingParticipant2Names.length > 3 && '...'}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                Each name will appear ~{Math.ceil(recordCount / maxParticipant2Occurrences)} time(s)
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {participant1Field && (
                      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        💡 With {recordCount} records and max {maxParticipant1Occurrences} {participant1Field?.participantLabel || 'Participant 1'} names, 
                        each {participant1Field?.participantLabel || 'name'} will appear ~{Math.ceil(recordCount / maxParticipant1Occurrences)} time(s) on average.
                      </p>
                    )}
                  </div>
                </>
              )}

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="customPrompt" className="text-base font-medium flex items-center gap-2">
                  Additional Instructions
                  <Badge variant="secondary" className="text-xs">Optional</Badge>
                </Label>
                <p className="text-sm text-muted-foreground">
                  The AI will automatically use your schema's fields, business context, and existing data patterns.
                  Add extra instructions here for anything not covered in the schema.
                </p>
                <Textarea
                  id="customPrompt"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder={`Optional examples:
- Include a mix of high-risk and low-risk scenarios
- Vary numeric values within specific ranges
- Focus on certain geographic regions
- Ensure some records have edge cases or unusual patterns
- Generate more variety in a specific field`}
                  className="min-h-[140px]"
                />
              </div>
            </div>

            <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Database className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800 dark:text-blue-200">What's automatically included:</p>
                    <ul className="mt-1 text-blue-700 dark:text-blue-300 space-y-1">
                      <li>• Schema fields with types and options</li>
                      <li>• Business context from schema definition</li>
                      <li>• Patterns from existing records (if any)</li>
                      <li>• Field semantic roles and relationships</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'transcription-config':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              {/* Enable transcription generation */}
              <Card className={generateTranscriptions ? 'ring-2 ring-primary' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-full mt-0.5">
                        <ChatText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <Label className="text-base font-medium">Generate Synthetic Transcriptions</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Also generate realistic conversation transcripts for each record.
                          Records will be marked as "transcribed" and ready for evaluation.
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={generateTranscriptions}
                      onCheckedChange={setGenerateTranscriptions}
                    />
                  </div>
                </CardContent>
              </Card>

              {generateTranscriptions && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="transcriptionPrompt" className="text-base font-medium flex items-center gap-2">
                      Transcription Instructions
                      <Badge variant="secondary" className="text-xs">Optional</Badge>
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Guide how the AI generates conversations. The metadata context is automatically used.
                    </p>
                    <Textarea
                      id="transcriptionPrompt"
                      value={transcriptionPrompt}
                      onChange={(e) => setTranscriptionPrompt(e.target.value)}
                      placeholder={`Optional examples:
- Make conversations professional and formal
- Include some difficult customer scenarios
- Add natural speech patterns and pauses
- Include specific topics or objections
- Vary conversation lengths`}
                      className="min-h-[120px]"
                    />
                  </div>

                  <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-amber-800 dark:text-amber-200">
                            Note: Generating transcriptions takes longer
                          </p>
                          <p className="mt-1 text-amber-700 dark:text-amber-300">
                            Each record will have a unique conversation generated based on its metadata.
                            This may take 30-60 seconds per record.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {!generateTranscriptions && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium">Records without transcriptions</p>
                        <p className="mt-1">
                          Records will be created with status "pending audio". You can upload real audio
                          files or generate transcriptions later.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        );

      case 'generate':
        return (
          <div className="space-y-6 py-8">
            <div className="flex flex-col items-center justify-center gap-4 w-full px-4">
              <div className="p-4 bg-primary/10 rounded-full animate-pulse">
                <Sparkle className="h-12 w-12 text-primary" />
              </div>
              <div className="text-center w-full max-w-md">
                <h3 className="font-semibold text-lg">Generating Synthetic Data</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {generationStatus || `AI is creating ${recordCount} records...`}
                </p>
              </div>
              <Progress value={generationProgress} className="w-full max-w-md" />
              <p className="text-sm text-muted-foreground">{generationProgress}%</p>
              
              {isGenerating && (
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Spinner className="h-3 w-3 animate-spin" />
                  Please wait, do not close this window
                </p>
              )}
            </div>

            {error && (
              <Card className="border-destructive bg-destructive/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-destructive">
                    <Warning className="h-5 w-5" />
                    <span>{error}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setError(null);
                      setStep('configure');
                    }}
                  >
                    Go Back and Try Again
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'review':
        const selectedCount = generatedRecords.filter(r => r.selected).length;
        const withTranscripts = generatedRecords.filter(r => r.transcript).length;
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Review Generated Records</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedCount} of {generatedRecords.length} records selected
                  {withTranscripts > 0 && ` • ${withTranscripts} with transcriptions`}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                {generatedRecords.every(r => r.selected) ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-3">
                {generatedRecords.map((record, index) => (
                  <Card
                    key={record.id}
                    className={`cursor-pointer transition-all ${
                      record.selected ? 'ring-2 ring-primary' : 'opacity-60'
                    }`}
                    onClick={() => toggleRecordSelection(record.id)}
                  >
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm">Record #{index + 1}</CardTitle>
                          {record.transcript && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <ChatText className="h-3 w-3" />
                              Transcript
                            </Badge>
                          )}
                        </div>
                        {record.selected && (
                          <Badge variant="default" className="gap-1">
                            <Check className="h-3 w-3" />
                            Selected
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(record.metadata).slice(0, 6).map(([key, value]) => {
                          const field = editableFields.find(f => f.id === key);
                          return (
                            <div key={key} className="flex justify-between gap-2">
                              <span className="text-muted-foreground truncate">
                                {field?.displayName || key}:
                              </span>
                              <span className="font-medium truncate max-w-[150px]">
                                {String(value)}
                              </span>
                            </div>
                          );
                        })}
                        {Object.keys(record.metadata).length > 6 && (
                          <div className="col-span-2 text-xs text-muted-foreground">
                            +{Object.keys(record.metadata).length - 6} more fields
                          </div>
                        )}
                      </div>
                      {record.transcript && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-muted-foreground mb-1">Transcript preview:</p>
                          <p className="text-xs line-clamp-2 italic">
                            {record.transcript.substring(0, 150)}...
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        );
    }
  };

  // Get step index for progress display
  const getStepIndex = (s: WizardStep): number => {
    const steps: WizardStep[] = ['intro', 'configure', 'transcription-config', 'generate', 'review'];
    return steps.indexOf(s);
  };

  // Navigation handlers
  const canProceed = () => {
    switch (step) {
      case 'intro':
        return true;
      case 'configure':
        return recordCount > 0;
      case 'transcription-config':
        return true;
      case 'generate':
        return !isGenerating && !error;
      case 'review':
        return generatedRecords.some(r => r.selected);
      default:
        return false;
    }
  };

  const handleNext = () => {
    switch (step) {
      case 'intro':
        setStep('configure');
        break;
      case 'configure':
        setStep('transcription-config');
        break;
      case 'transcription-config':
        setStep('generate');
        handleGenerate();
        break;
      case 'review':
        handleAddRecords();
        break;
    }
  };

  const handleBack = () => {
    switch (step) {
      case 'configure':
        setStep('intro');
        break;
      case 'transcription-config':
        setStep('configure');
        break;
      case 'generate':
        if (!isGenerating) setStep('transcription-config');
        break;
      case 'review':
        setStep('transcription-config');
        break;
    }
  };

  const allSteps: WizardStep[] = ['intro', 'configure', 'transcription-config', 'generate', 'review'];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="max-w-3xl w-[90vw] max-h-[90vh] overflow-hidden flex flex-col"
        onPointerDownOutside={(e) => {
          if (isGenerating) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isGenerating) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkle className="h-5 w-5" />
            Synthetic Metadata Generator
          </DialogTitle>
          <DialogDescription>
            {step === 'intro' && 'Generate AI-powered synthetic data for your schema'}
            {step === 'configure' && 'Configure generation parameters'}
            {step === 'transcription-config' && 'Configure optional transcription generation'}
            {step === 'generate' && 'Generating synthetic records...'}
            {step === 'review' && 'Review and select records to add'}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 py-2">
          {allSteps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step === s
                    ? 'bg-primary text-primary-foreground'
                    : getStepIndex(step) > i
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i + 1}
              </div>
              {i < allSteps.length - 1 && (
                <div className={`w-6 h-0.5 ${
                  getStepIndex(step) > i
                    ? 'bg-primary'
                    : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        <Separator />

        {/* Step content */}
        <div className="flex-1 overflow-y-auto py-4 min-h-0">
          {renderStepContent()}
        </div>

        <Separator />

        {/* Navigation */}
        <div className="flex justify-between pt-2">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 'intro' || isGenerating}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            {step !== 'generate' && (
              <Button onClick={handleNext} disabled={!canProceed()}>
                {step === 'review' ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Add {generatedRecords.filter(r => r.selected).length} Records
                  </>
                ) : (
                  <>
                    {step === 'transcription-config' ? 'Generate' : 'Next'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
