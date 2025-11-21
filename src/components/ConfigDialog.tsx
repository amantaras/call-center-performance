import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
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
import { Switch } from '@/components/ui/switch';
import { GearSix } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { transcriptionService } from '@/services/transcription';
import { AzureServicesConfig } from '@/types/config';
import {
  loadAzureConfigFromCookie,
  saveAzureConfigCookie,
} from '@/lib/azure-config-storage';
import { LanguageSelector } from './LanguageSelector';
import { DEFAULT_CALL_CENTER_LANGUAGES, normalizeLocaleList } from '@/lib/speech-languages';

export function ConfigDialog() {
  const [config, setConfig] = useLocalStorage<AzureServicesConfig>('azure-services-config', {
    openAI: {
      endpoint: '',
      apiKey: '',
      deploymentName: '',
      apiVersion: '2024-12-01-preview',
      reasoningEffort: 'low',
    },
      speech: {
      region: '',
      subscriptionKey: '',
      apiVersion: '2025-10-15',
      selectedLanguages: [...DEFAULT_CALL_CENTER_LANGUAGES],
      diarizationEnabled: false,
      minSpeakers: 1,
      maxSpeakers: 2,
    },
  });

  const [open, setOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState<AzureServicesConfig>(
    config || {
      openAI: {
        endpoint: '',
        apiKey: '',
        deploymentName: '',
        apiVersion: '2024-12-01-preview',
        reasoningEffort: 'low',
      },
      speech: {
        region: '',
        subscriptionKey: '',
        apiVersion: '2025-10-15',
        selectedLanguages: [...DEFAULT_CALL_CENTER_LANGUAGES],
        diarizationEnabled: false,
        minSpeakers: 1,
        maxSpeakers: 2,
      },
    }
  );

  useEffect(() => {
    if (config) {
      const sanitizedLanguages =
        config.speech.selectedLanguages === undefined
          ? undefined
          : normalizeLocaleList(config.speech.selectedLanguages);

      // Auto-migrate old API version to latest
      const needsApiMigration = config.speech.apiVersion === '2024-11-15' || !config.speech.apiVersion;
      const latestApiVersion = '2025-10-15';

      if (
        (config.speech.selectedLanguages !== undefined &&
        JSON.stringify(config.speech.selectedLanguages) !== JSON.stringify(sanitizedLanguages)) ||
        needsApiMigration
      ) {
        const updatedConfig: AzureServicesConfig = {
          ...config,
          speech: {
            ...config.speech,
            selectedLanguages: sanitizedLanguages,
            apiVersion: needsApiMigration ? latestApiVersion : config.speech.apiVersion,
          },
        };
        
        if (needsApiMigration) {
          console.log(`🔄 Auto-migrated Speech API version from '${config.speech.apiVersion}' to '${latestApiVersion}'`);
          toast.info(`Speech API version updated to ${latestApiVersion} (latest)`);
        }
        
        setConfig(updatedConfig);
        setLocalConfig(updatedConfig);
      } else {
        setLocalConfig(config);
      }
    }
  }, [config, setConfig]);

  useEffect(() => {
    if (!config) {
      const cookieConfig = loadAzureConfigFromCookie();
      if (cookieConfig) {
        setConfig(cookieConfig);
        setLocalConfig(cookieConfig);
        console.log('☁️ Restored Azure config from cookie backup');
      }
    }
  }, [config, setConfig]);

  const handleSave = () => {
    const sanitizedLanguages = normalizeLocaleList(localConfig.speech.selectedLanguages ?? []);
    const configToPersist: AzureServicesConfig = {
      ...localConfig,
      speech: {
        ...localConfig.speech,
        selectedLanguages: sanitizedLanguages,
      },
    };

    setConfig(configToPersist);
    setLocalConfig(configToPersist);
    saveAzureConfigCookie(configToPersist);
    
    // Initialize transcription service with Azure Speech config
    if (configToPersist.speech.region && configToPersist.speech.subscriptionKey) {
      transcriptionService.initialize({
        region: configToPersist.speech.region,
        subscriptionKey: configToPersist.speech.subscriptionKey,
        apiVersion: configToPersist.speech.apiVersion,
        selectedLanguages: configToPersist.speech.selectedLanguages ?? DEFAULT_CALL_CENTER_LANGUAGES,
        diarizationEnabled: configToPersist.speech.diarizationEnabled ?? false,
        minSpeakers: configToPersist.speech.minSpeakers ?? 1,
        maxSpeakers: configToPersist.speech.maxSpeakers ?? 2,
      });
      console.log('🎤 Transcription service initialized with Azure Speech config', {
        diarizationEnabled: configToPersist.speech.diarizationEnabled,
        minSpeakers: configToPersist.speech.minSpeakers,
        maxSpeakers: configToPersist.speech.maxSpeakers
      });
    }
    
    toast.success('Azure services configuration saved successfully');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <GearSix className="mr-2" size={18} />
          Azure Services
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Azure Services Configuration</DialogTitle>
          <DialogDescription>
            Configure Azure OpenAI and Azure Speech services for call transcription and
            evaluation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Azure OpenAI Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Azure OpenAI</h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="openai-endpoint">Endpoint URL</Label>
                <Input
                  id="openai-endpoint"
                  placeholder="https://your-resource.openai.azure.com/"
                  value={localConfig.openAI.endpoint}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      openAI: { ...prev.openAI, endpoint: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="openai-apiKey">API Key</Label>
                <Input
                  id="openai-apiKey"
                  type="password"
                  placeholder="Your Azure OpenAI API key"
                  value={localConfig.openAI.apiKey}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      openAI: { ...prev.openAI, apiKey: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="openai-deployment">Deployment Name</Label>
                <Input
                  id="openai-deployment"
                  placeholder="gpt-4o"
                  value={localConfig.openAI.deploymentName}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      openAI: { ...prev.openAI, deploymentName: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="openai-version">API Version</Label>
                <Input
                  id="openai-version"
                  placeholder="2024-12-01-preview"
                  value={localConfig.openAI.apiVersion}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      openAI: { ...prev.openAI, apiVersion: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reasoning-effort">Reasoning Effort</Label>
                <select
                  id="reasoning-effort"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={localConfig.openAI.reasoningEffort || 'low'}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      openAI: { 
                        ...prev.openAI, 
                        reasoningEffort: e.target.value as 'minimal' | 'low' | 'medium' | 'high'
                      },
                    }))
                  }
                >
                  <option value="minimal">Minimal (fastest, GPT-5 only)</option>
                  <option value="low">Low (recommended)</option>
                  <option value="medium">Medium (balanced)</option>
                  <option value="high">High (most thorough)</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  For reasoning models (o1, o3, gpt-5). Higher effort = better quality but slower.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-border my-4" />

          {/* Azure Speech Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Azure Speech Service</h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="speech-region">Region</Label>
                <Input
                  id="speech-region"
                  placeholder="eastus"
                  value={localConfig.speech.region}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      speech: { ...prev.speech, region: e.target.value },
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Azure region (e.g., eastus, westus2, westeurope)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="speech-key">Subscription Key</Label>
                <Input
                  id="speech-key"
                  type="password"
                  placeholder="Your Azure Speech subscription key"
                  value={localConfig.speech.subscriptionKey}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      speech: { ...prev.speech, subscriptionKey: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="speech-version">API Version</Label>
                <Input
                  id="speech-version"
                  placeholder="2025-10-15"
                  value={localConfig.speech.apiVersion}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      speech: { ...prev.speech, apiVersion: e.target.value },
                    }))
                  }
                />
              </div>
              
              {/* Language Selector */}
              <div className="space-y-2 pt-2">
                <LanguageSelector
                  selectedLanguages={localConfig.speech.selectedLanguages || []}
                  onLanguagesChange={(languages) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      speech: { ...prev.speech, selectedLanguages: languages },
                    }))
                  }
                />
              </div>
              {/* Diarization Settings */}
              <div className="space-y-4 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="diarization-toggle">Speaker Diarization</Label>
                    <p className="text-xs text-muted-foreground">
                      Identify distinct speakers in the audio
                    </p>
                  </div>
                  <Switch
                    id="diarization-toggle"
                    checked={localConfig.speech.diarizationEnabled ?? false}
                    onCheckedChange={(checked) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        speech: { ...prev.speech, diarizationEnabled: checked },
                      }))
                    }
                  />
                </div>

                {localConfig.speech.diarizationEnabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="min-speakers">Min Speakers</Label>
                      <Input
                        id="min-speakers"
                        type="number"
                        min={1}
                        max={35}
                        value={localConfig.speech.minSpeakers ?? 1}
                        onChange={(e) =>
                          setLocalConfig((prev) => ({
                            ...prev,
                            speech: {
                              ...prev.speech,
                              minSpeakers: parseInt(e.target.value) || 1,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max-speakers">Max Speakers</Label>
                      <Input
                        id="max-speakers"
                        type="number"
                        min={1}
                        max={35}
                        value={localConfig.speech.maxSpeakers ?? 2}
                        onChange={(e) =>
                          setLocalConfig((prev) => ({
                            ...prev,
                            speech: {
                              ...prev.speech,
                              maxSpeakers: parseInt(e.target.value) || 2,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Configuration</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
