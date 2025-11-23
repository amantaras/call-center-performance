import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, ChartBar, Users, Upload } from '@phosphor-icons/react';
import { CallsView } from '@/components/views/CallsView';
import { AnalyticsView } from '@/components/views/AnalyticsView';
import { AgentsView } from '@/components/views/AgentsView';
import { ConfigDialog } from '@/components/ConfigDialog';
import { RulesEditorDialog } from '@/components/RulesEditorDialog';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { setCustomEvaluationCriteria, azureOpenAIService } from '@/services/azure-openai';
import { EvaluationCriterion } from '@/types/call';
import { transcriptionService } from '@/services/transcription';
import { loadAzureConfigFromCookie } from '@/lib/azure-config-storage';
import { AzureServicesConfig } from '@/types/config';
import { DEFAULT_CALL_CENTER_LANGUAGES, normalizeLocaleList } from '@/lib/speech-languages';

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
  // Batch progress state (persists across tab changes)
  const [batchProgress, setBatchProgress] = useState<{ completed: number; total: number } | null>(null);

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Call Center QA Platform
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                AI-powered call quality evaluation and analytics
              </p>
            </div>
            <div className="flex items-center gap-2">
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
              />
            </TabsContent>

            <TabsContent value="analytics">
              <AnalyticsView />
            </TabsContent>

            <TabsContent value="agents">
              <AgentsView />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}

export default App;