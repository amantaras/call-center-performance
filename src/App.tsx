import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, ChartBar, Users, Upload } from '@phosphor-icons/react';
import { CallsView } from '@/components/views/CallsView';
import { AnalyticsView } from '@/components/views/AnalyticsView';
import { AgentsView } from '@/components/views/AgentsView';
import { ConfigDialog } from '@/components/ConfigDialog';
import { RulesEditorDialog } from '@/components/RulesEditorDialog';
import { SchemaSelector } from '@/components/SchemaSelector';
import { SchemaMigrationDialog } from '@/components/SchemaMigrationDialog';
import { EvaluationRulesWizard } from '@/components/EvaluationRulesWizard';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { setCustomEvaluationCriteria, azureOpenAIService } from '@/services/azure-openai';
import { EvaluationCriterion, CallRecord } from '@/types/call';
import { SchemaDefinition } from '@/types/schema';
import { transcriptionService } from '@/services/transcription';
import { loadAzureConfigFromCookie } from '@/lib/azure-config-storage';
import { AzureServicesConfig } from '@/types/config';
import { DEFAULT_CALL_CENTER_LANGUAGES, normalizeLocaleList } from '@/lib/speech-languages';
import { runMigration } from '@/services/schema-compatibility';
import { getActiveSchema, setActiveSchema as setActiveSchemaInStorage, getAllSchemas } from '@/services/schema-manager';
import { loadRulesForSchema } from '@/services/rules-generator';
import { toast } from 'sonner';

const arraysEqual = (a?: string[], b?: string[]) => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
};

function App() {
  const [activeTab, setActiveTab] = useState('calls');
  const [customRules] = useLocalStorage<EvaluationCriterion[]>('evaluation-criteria-custom', []);
  const [azureConfig, setAzureConfig] = useLocalStorage<AzureServicesConfig | null>('azure-services-config', null);
  const [calls, setCalls] = useLocalStorage<CallRecord[]>('calls', []);
  // Schema state
  const [activeSchema, setActiveSchema] = useState<SchemaDefinition | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(true);
  // Migration dialog state
  const [migrationDialogOpen, setMigrationDialogOpen] = useState(false);
  const [pendingSchema, setPendingSchema] = useState<SchemaDefinition | null>(null);
  // Batch progress state (persists across tab changes)
  const [batchProgress, setBatchProgress] = useState<{ completed: number; total: number } | null>(null);

  // Initialize schema system on mount
  useEffect(() => {
    const initializeSchemas = async () => {
      try {
        console.log('🔧 Initializing schema system...');
        
        // Run auto-migration for existing calls
        const migrationResult = await runMigration();
        
        if (migrationResult.migrated > 0) {
          console.log(`✅ Auto-migration complete: ${migrationResult.migrated} calls migrated`);
          toast.success(`Schema Migration Complete: Successfully migrated ${migrationResult.migrated} existing call(s) to new schema system.`);
        }
        
        // Load active schema
        const schema = getActiveSchema();
        if (schema) {
          console.log(`📋 Loaded active schema: ${schema.name} v${schema.version}`);
          setActiveSchema(schema);
          
          // Load schema-specific evaluation rules
          const schemaRules = loadRulesForSchema(schema.id);
          if (schemaRules && schemaRules.length > 0) {
            console.log(`📋 Loaded ${schemaRules.length} schema-specific rules for ${schema.name}`);
            // Convert to EvaluationCriterion format and set
            const criteriaRules: EvaluationCriterion[] = schemaRules.map(rule => ({
              id: rule.id,
              type: rule.type,
              name: rule.name,
              definition: rule.definition,
              evaluationCriteria: rule.evaluationCriteria,
              scoringStandard: rule.scoringStandard,
              examples: rule.examples
            }));
            setCustomEvaluationCriteria(criteriaRules);
          }
        } else {
          console.log('⚠️ No active schema found');
          // Check if any schemas exist
          const allSchemas = getAllSchemas();
          if (allSchemas.length > 0) {
            // Set first schema as active
            setActiveSchemaInStorage(allSchemas[0].id);
            setActiveSchema(allSchemas[0]);
            console.log(`📋 Set ${allSchemas[0].name} as active schema`);
          }
        }
      } catch (error) {
        console.error('❌ Schema initialization error:', error);
        toast.error('Schema Initialization Error: Failed to initialize schema system. Some features may not work correctly.');
      } finally {
        setSchemaLoading(false);
      }
    };
    
    initializeSchemas();
  }, []); // Run once on mount

  useEffect(() => {
    if (!azureConfig) {
      const cookieConfig = loadAzureConfigFromCookie();
      if (cookieConfig) {
        setAzureConfig(cookieConfig);
        console.log('☁️ Synced Azure config from cookie into localStorage');
      }
    }
  }, [azureConfig, setAzureConfig]);

  // Load custom rules on mount
  useEffect(() => {
    if (customRules && customRules.length > 0) {
      console.log('📋 Loading custom evaluation criteria:', customRules.length, 'rules');
      setCustomEvaluationCriteria(customRules);
    } else {
      console.log('📋 Using default evaluation criteria');
      setCustomEvaluationCriteria(null);
    }
  }, [customRules]);

  // Initialize Azure services on mount if config exists
  useEffect(() => {
    if (azureConfig?.speech?.region && azureConfig?.speech?.subscriptionKey) {
      const sanitizedLanguages =
        azureConfig.speech.selectedLanguages === undefined
          ? undefined
          : normalizeLocaleList(azureConfig.speech.selectedLanguages);

      if (
        azureConfig.speech.selectedLanguages !== undefined &&
        !arraysEqual(azureConfig.speech.selectedLanguages, sanitizedLanguages)
      ) {
        setAzureConfig({
          ...azureConfig,
          speech: {
            ...azureConfig.speech,
            selectedLanguages: sanitizedLanguages,
          },
        });
      }

      transcriptionService.initialize({
        region: azureConfig.speech.region,
        subscriptionKey: azureConfig.speech.subscriptionKey,
        apiVersion: azureConfig.speech.apiVersion || '2025-10-15',
        selectedLanguages: sanitizedLanguages ?? azureConfig.speech.selectedLanguages ?? DEFAULT_CALL_CENTER_LANGUAGES,
        diarizationEnabled: azureConfig.speech.diarizationEnabled ?? false,
        minSpeakers: azureConfig.speech.minSpeakers ?? 1,
        maxSpeakers: azureConfig.speech.maxSpeakers ?? 2,
      });
      console.log('🎤 Transcription service initialized from stored config', {
        diarizationEnabled: azureConfig.speech.diarizationEnabled,
        minSpeakers: azureConfig.speech.minSpeakers,
        maxSpeakers: azureConfig.speech.maxSpeakers
      });
    }
    
    if (azureConfig?.openAI?.endpoint && azureConfig?.openAI?.apiKey && azureConfig?.openAI?.deploymentName) {
      console.log('🔍 App.tsx: azureConfig.openAI.reasoningEffort from localStorage:', azureConfig.openAI.reasoningEffort);
      console.log('🔍 App.tsx: Full openAI config from localStorage:', azureConfig.openAI);
      
      const configToApply = {
        endpoint: azureConfig.openAI.endpoint,
        apiKey: azureConfig.openAI.apiKey,
        deploymentName: azureConfig.openAI.deploymentName,
        apiVersion: azureConfig.openAI.apiVersion || '2024-12-01-preview',
        reasoningEffort: azureConfig.openAI.reasoningEffort || 'low',
      };
      
      console.log('📤 App.tsx: Calling azureOpenAIService.updateConfig with:', configToApply);
      azureOpenAIService.updateConfig(configToApply);
      console.log('🤖 Azure OpenAI service initialized from stored config');
    }
  }, [azureConfig]);

  // Callback when rules are updated from RulesEditorDialog
  const handleRulesUpdate = (updatedRules: EvaluationCriterion[]) => {
    console.log('📋 Rules updated via editor:', updatedRules.length, 'rules');
    setCustomEvaluationCriteria(updatedRules);
  };

  // Callback when schema is changed via SchemaSelector
  const handleSchemaChange = (schema: SchemaDefinition) => {
    // If changing from one schema to another and calls exist, show migration dialog
    if (activeSchema && activeSchema.id !== schema.id && calls && calls.length > 0) {
      setPendingSchema(schema);
      setMigrationDialogOpen(true);
      return;
    }

    // Otherwise, apply schema change directly
    applySchemaChange(schema);
  };

  const applySchemaChange = (schema: SchemaDefinition) => {
    setActiveSchema(schema);
    setActiveSchemaInStorage(schema.id);
    console.log(`📋 Schema switched to: ${schema.name} v${schema.version}`);
    
    // Load schema-specific rules
    const schemaRules = loadRulesForSchema(schema.id);
    if (schemaRules && schemaRules.length > 0) {
      const criteriaRules: EvaluationCriterion[] = schemaRules.map(rule => ({
        id: rule.id,
        type: rule.type,
        name: rule.name,
        definition: rule.definition,
        evaluationCriteria: rule.evaluationCriteria,
        scoringStandard: rule.scoringStandard,
        examples: rule.examples
      }));
      setCustomEvaluationCriteria(criteriaRules);
      console.log(`📋 Loaded ${schemaRules.length} rules for ${schema.name}`);
    }
    
    toast.success(`Schema Changed: Now using ${schema.name} v${schema.version}`);
  };

  const handleMigration = (keepCalls: boolean) => {
    if (!pendingSchema) return;

    if (keepCalls) {
      // Update existing calls to new schema
      const updatedCalls = calls.map(call => ({
        ...call,
        schemaId: pendingSchema.id,
        schemaVersion: pendingSchema.version,
        updatedAt: new Date().toISOString(),
      }));
      setCalls(updatedCalls);
      toast.success(`Migration Complete: ${updatedCalls.length} call(s) migrated to ${pendingSchema.name}`);
    } else {
      // Clear calls and start fresh
      setCalls([]);
      toast.success(`Starting Fresh: All calls cleared. Now using ${pendingSchema.name}`);
    }

    applySchemaChange(pendingSchema);
    setMigrationDialogOpen(false);
    setPendingSchema(null);
  };

  const handleMigrationCancel = () => {
    setPendingSchema(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Call Center QA Platform
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                AI-powered call quality evaluation and analytics
              </p>
            </div>
            <div className="flex items-center gap-3">
              <SchemaSelector
                activeSchema={activeSchema}
                onSchemaChange={handleSchemaChange}
              />
              <div className="h-6 w-px bg-border" />
              <EvaluationRulesWizard
                activeSchema={activeSchema}
                onRulesGenerated={handleRulesUpdate}
              />
              <RulesEditorDialog onRulesUpdate={handleRulesUpdate} />
              <ConfigDialog />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="calls" className="flex items-center gap-2">
              <Phone size={18} />
              <span>Calls</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <ChartBar size={18} />
              <span>Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="agents" className="flex items-center gap-2">
              <Users size={18} />
              <span>Agents</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="calls">
              <CallsView 
                batchProgress={batchProgress}
                setBatchProgress={setBatchProgress}
                activeSchema={activeSchema}
                schemaLoading={schemaLoading}
              />
            </TabsContent>

            <TabsContent value="analytics">
              <AnalyticsView 
                activeSchema={activeSchema}
                schemaLoading={schemaLoading}
              />
            </TabsContent>

            <TabsContent value="agents">
              <AgentsView 
                activeSchema={activeSchema}
                schemaLoading={schemaLoading}
              />
            </TabsContent>
          </div>
        </Tabs>
      </main>

      {/* Schema Migration Dialog */}
      {pendingSchema && (
        <SchemaMigrationDialog
          open={migrationDialogOpen}
          onOpenChange={setMigrationDialogOpen}
          currentSchema={activeSchema}
          targetSchema={pendingSchema}
          calls={calls}
          onMigrate={handleMigration}
          onCancel={handleMigrationCancel}
        />
      )}
    </div>
  );
}

export default App;