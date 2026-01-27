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
import { GearSix, Copy, CheckCircle, Terminal, ArrowSquareOut } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { transcriptionService } from '@/services/transcription';
import { AzureServicesConfig } from '@/types/config';
import {
  loadAzureConfigFromCookie,
  saveAzureConfigCookie,
} from '@/lib/azure-config-storage';
import { LanguageSelector } from './LanguageSelector';
import { DEFAULT_CALL_CENTER_LANGUAGES, normalizeLocaleList } from '@/lib/speech-languages';
import { VOICE_OPTIONS, DEFAULT_VOICES } from '@/TTSCaller';
import { azureTokenService } from '@/services/azure-token';
import { generateCliCommand, generatePortalUrl } from '@/services/app-registration';

export function ConfigDialog() {
  const [config, setConfig] = useLocalStorage<AzureServicesConfig>('azure-services-config', {
    entraId: {
      clientId: '',
      tenantId: '',
    },
    openAI: {
      endpoint: '',
      apiKey: '',
      deploymentName: '',
      apiVersion: '2024-12-01-preview',
      reasoningEffort: 'low',
      authType: 'apiKey',
      tenantId: '',
    },
      speech: {
      region: '',
      subscriptionKey: '',
      apiVersion: '2025-10-15',
      selectedLanguages: [...DEFAULT_CALL_CENTER_LANGUAGES],
      diarizationEnabled: false,
      minSpeakers: 1,
      maxSpeakers: 2,
      authType: 'apiKey',
      tenantId: '',
    },
    tts: {
      enabled: true,
      defaultMaleVoice1: DEFAULT_VOICES.male1,
      defaultMaleVoice2: DEFAULT_VOICES.male2,
      defaultFemaleVoice1: DEFAULT_VOICES.female1,
      defaultFemaleVoice2: DEFAULT_VOICES.female2,
    },
    syntheticData: {
      parallelBatches: 3,
      recordsPerBatch: 5,
    },
  });

  const [open, setOpen] = useState(false);
  const [copiedRedirectUri, setCopiedRedirectUri] = useState(false);
  const [localConfig, setLocalConfig] = useState<AzureServicesConfig>(
    config || {
      entraId: {
        clientId: '',
        tenantId: '',
      },
      openAI: {
        endpoint: '',
        apiKey: '',
        deploymentName: '',
        apiVersion: '2024-12-01-preview',
        reasoningEffort: 'low',
        authType: 'apiKey',
        tenantId: '',
      },
      speech: {
        region: '',
        subscriptionKey: '',
        apiVersion: '2025-10-15',
        selectedLanguages: [...DEFAULT_CALL_CENTER_LANGUAGES],
        diarizationEnabled: false,
        minSpeakers: 1,
        maxSpeakers: 2,
        authType: 'apiKey',
        tenantId: '',
      },
      tts: {
        enabled: true,
        defaultMaleVoice1: DEFAULT_VOICES.male1,
        defaultMaleVoice2: DEFAULT_VOICES.male2,
        defaultFemaleVoice1: DEFAULT_VOICES.female1,
        defaultFemaleVoice2: DEFAULT_VOICES.female2,
      },
      syntheticData: {
        parallelBatches: 3,
        recordsPerBatch: 5,
      },
    }
  );
  
  // Computed: is Entra ID enabled for any service?
  const isEntraIdEnabled = localConfig.openAI.authType === 'entraId' || localConfig.speech.authType === 'entraId';
  
  // Current redirect URI for App Registration
  const currentRedirectUri = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  
  // State for CLI command display
  const [showCliCommand, setShowCliCommand] = useState(false);
  const [copiedCliCommand, setCopiedCliCommand] = useState(false);
  
  // Generate CLI command for creating App Registration
  const cliCommand = generateCliCommand({
    displayName: 'Call Center QA',
    redirectUri: currentRedirectUri,
  });
  
  const handleCopyRedirectUri = () => {
    navigator.clipboard.writeText(currentRedirectUri);
    setCopiedRedirectUri(true);
    setTimeout(() => setCopiedRedirectUri(false), 2000);
    toast.success('Redirect URI copied to clipboard');
  };
  
  const handleCopyCliCommand = () => {
    navigator.clipboard.writeText(cliCommand);
    setCopiedCliCommand(true);
    setTimeout(() => setCopiedCliCommand(false), 2000);
    toast.success('CLI command copied! Paste in terminal and run.');
  };
  
  const handleOpenPortal = () => {
    window.open(generatePortalUrl({ displayName: 'Call Center QA', redirectUri: currentRedirectUri }), '_blank');
  };

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
    
    // Validate Entra ID config if enabled
    const needsEntraId = localConfig.openAI.authType === 'entraId' || localConfig.speech.authType === 'entraId';
    if (needsEntraId && !localConfig.entraId?.clientId) {
      toast.error('App Registration Client ID is required when using Entra ID authentication');
      return;
    }
    
    const configToPersist: AzureServicesConfig = {
      entraId: {
        clientId: localConfig.entraId?.clientId || '',
        tenantId: localConfig.entraId?.tenantId || '',
      },
      openAI: {
        ...localConfig.openAI,
        // Ensure reasoningEffort is explicitly included, defaulting to 'low' if not set
        reasoningEffort: localConfig.openAI.reasoningEffort || 'low',
      },
      speech: {
        ...localConfig.speech,
        selectedLanguages: sanitizedLanguages,
      },
      tts: {
        enabled: localConfig.tts?.enabled ?? true,
        defaultMaleVoice1: localConfig.tts?.defaultMaleVoice1 || DEFAULT_VOICES.male1,
        defaultMaleVoice2: localConfig.tts?.defaultMaleVoice2 || DEFAULT_VOICES.male2,
        defaultFemaleVoice1: localConfig.tts?.defaultFemaleVoice1 || DEFAULT_VOICES.female1,
        defaultFemaleVoice2: localConfig.tts?.defaultFemaleVoice2 || DEFAULT_VOICES.female2,
      },
      syntheticData: {
        parallelBatches: localConfig.syntheticData?.parallelBatches ?? 3,
        recordsPerBatch: localConfig.syntheticData?.recordsPerBatch ?? 5,
      },
    };

    console.log('💾 ConfigDialog saving config with reasoningEffort:', configToPersist.openAI.reasoningEffort);
    console.log('💾 Full OpenAI config being saved:', configToPersist.openAI);
    console.log('💾 ConfigToPersist stringified:', JSON.stringify(configToPersist, null, 2));

    // Configure Azure Token Service if Entra ID is enabled
    if (needsEntraId && configToPersist.entraId?.clientId) {
      azureTokenService.configure({
        clientId: configToPersist.entraId.clientId,
        tenantId: configToPersist.entraId.tenantId,
      });
      console.log('🔐 Azure Token Service configured with App Registration:', configToPersist.entraId.clientId);
    }

    setConfig(configToPersist);
    setLocalConfig(configToPersist);
    saveAzureConfigCookie(configToPersist);
    
    // Initialize transcription service with Azure Speech config
    // For Entra ID auth, we don't require a subscription key (will get token instead)
    const hasValidAuth = configToPersist.speech.authType === 'entraId' 
      ? configToPersist.speech.region 
      : (configToPersist.speech.region && configToPersist.speech.subscriptionKey);
      
    if (hasValidAuth) {
      transcriptionService.initialize({
        region: configToPersist.speech.region,
        subscriptionKey: configToPersist.speech.subscriptionKey,
        apiVersion: configToPersist.speech.apiVersion,
        selectedLanguages: configToPersist.speech.selectedLanguages ?? DEFAULT_CALL_CENTER_LANGUAGES,
        diarizationEnabled: configToPersist.speech.diarizationEnabled ?? false,
        minSpeakers: configToPersist.speech.minSpeakers ?? 1,
        maxSpeakers: configToPersist.speech.maxSpeakers ?? 2,
        authType: configToPersist.speech.authType ?? 'apiKey',
        tenantId: configToPersist.speech.tenantId,
      });
      console.log('🎤 Transcription service initialized with Azure Speech config', {
        authType: configToPersist.speech.authType ?? 'apiKey',
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
          Configuration
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuration</DialogTitle>
          <DialogDescription>
            Configure Azure OpenAI and Azure Speech services for call transcription and
            evaluation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Entra ID App Registration Section - shown when any service uses Entra ID */}
          {isEntraIdEnabled && (
            <>
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2 text-amber-900 dark:text-amber-100">
                  🔐 Entra ID App Registration
                </h3>
                <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
                  To use Entra ID authentication, you need an App Registration in your Azure AD tenant.
                </p>
                
                <div className="space-y-4">
                  {/* Create App Registration options - shown when no client ID */}
                  {!localConfig.entraId?.clientId && (
                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3 space-y-3">
                      <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                        ✨ Create App Registration:
                      </p>
                      
                      {/* Option 1: CLI Command */}
                      <div className="space-y-2">
                        <Button
                          onClick={() => setShowCliCommand(!showCliCommand)}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                        >
                          <Terminal className="mr-2 h-4 w-4" />
                          {showCliCommand ? 'Hide' : 'Show'} Azure CLI Command (Recommended)
                        </Button>
                        
                        {showCliCommand && (
                          <div className="space-y-2 p-3 bg-gray-900 rounded-lg border border-gray-700">
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-gray-300">
                                Run this command in your terminal (requires <code className="text-amber-400">az login</code> first):
                              </p>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleCopyCliCommand}
                                className="shrink-0 bg-green-600 hover:bg-green-700 text-white"
                              >
                                {copiedCliCommand ? (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-4 w-4 mr-1" />
                                    Copy Command
                                  </>
                                )}
                              </Button>
                            </div>
                            <pre className="text-xs bg-black text-green-400 p-3 rounded overflow-x-auto whitespace-pre-wrap break-all font-mono max-h-32 overflow-y-auto">
                              {cliCommand}
                            </pre>
                            <p className="text-xs text-amber-400">
                              ↑ The command outputs the Client ID - paste it below.
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Option 2: Azure Portal */}
                      <Button
                        onClick={handleOpenPortal}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                      >
                        <ArrowSquareOut className="mr-2 h-4 w-4" />
                        Create in Azure Portal
                      </Button>
                      <p className="text-xs text-green-700 dark:text-green-300">
                        In the portal: Name it "Call Center QA", select "SPA" as platform, add redirect URI: <code className="bg-green-100 dark:bg-green-900 px-1 rounded">{currentRedirectUri}</code>
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="entra-client-id" className="text-amber-900 dark:text-amber-100">
                      App Registration Client ID {!localConfig.entraId?.clientId && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      id="entra-client-id"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      value={localConfig.entraId?.clientId || ''}
                      onChange={(e) =>
                        setLocalConfig((prev) => ({
                          ...prev,
                          entraId: { 
                            ...prev.entraId, 
                            clientId: e.target.value,
                            tenantId: prev.entraId?.tenantId || '',
                          },
                        }))
                      }
                      className="font-mono"
                    />
                    {localConfig.entraId?.clientId && (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        ✓ App Registration configured
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="entra-tenant-id" className="text-amber-900 dark:text-amber-100">
                      Tenant ID (optional)
                    </Label>
                    <Input
                      id="entra-tenant-id"
                      placeholder="your-tenant-id or leave empty for multi-tenant"
                      value={localConfig.entraId?.tenantId || ''}
                      onChange={(e) =>
                        setLocalConfig((prev) => ({
                          ...prev,
                          entraId: { 
                            ...prev.entraId, 
                            clientId: prev.entraId?.clientId || '',
                            tenantId: e.target.value,
                          },
                        }))
                      }
                      className="font-mono"
                    />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Leave empty to allow any Azure AD account (multi-tenant).
                    </p>
                  </div>
                  
                  {/* Redirect URI info - only show if they have a client ID (for troubleshooting) */}
                  {localConfig.entraId?.clientId && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-amber-800 dark:text-amber-200 font-medium hover:underline">
                        🔧 Troubleshooting: Redirect URI
                      </summary>
                      <div className="mt-2 space-y-2">
                        <p className="text-amber-700 dark:text-amber-300">
                          If you're having login issues, ensure this URI is added to your App Registration as a <strong>SPA</strong> redirect:
                        </p>
                        <div className="flex gap-2">
                          <Input
                            readOnly
                            value={currentRedirectUri}
                            className="font-mono text-xs bg-white dark:bg-gray-900"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyRedirectUri}
                            className="shrink-0"
                          >
                            {copiedRedirectUri ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </details>
                  )}
                </div>
              </div>
              
              <div className="border-t border-border my-4" />
            </>
          )}
          
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
                  disabled={localConfig.openAI.authType === 'entraId'}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      openAI: { ...prev.openAI, apiKey: e.target.value },
                    }))
                  }
                />
              </div>
              
              {/* Entra ID Authentication Toggle */}
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="openai-entra-toggle">Use Entra ID (Azure AD)</Label>
                    <p className="text-xs text-muted-foreground">
                      Authenticate with Azure AD instead of API key
                    </p>
                  </div>
                  <Switch
                    id="openai-entra-toggle"
                    checked={localConfig.openAI.authType === 'entraId'}
                    onCheckedChange={(checked) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        openAI: { ...prev.openAI, authType: checked ? 'entraId' : 'apiKey' },
                      }))
                    }
                  />
                </div>
                
                {localConfig.openAI.authType === 'entraId' && (
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      <strong>🔐 Browser Authentication:</strong> A login popup will appear when you first use the service. 
                      Requires <strong>Cognitive Services User</strong> role on the Azure OpenAI resource.
                    </p>
                  </div>
                )}
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
                  disabled={localConfig.speech.authType === 'entraId'}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      speech: { ...prev.speech, subscriptionKey: e.target.value },
                    }))
                  }
                />
              </div>
              
              {/* Entra ID Authentication Toggle for Speech */}
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="speech-entra-toggle">Use Entra ID (Azure AD)</Label>
                    <p className="text-xs text-muted-foreground">
                      Authenticate with Azure AD instead of subscription key
                    </p>
                  </div>
                  <Switch
                    id="speech-entra-toggle"
                    checked={localConfig.speech.authType === 'entraId'}
                    onCheckedChange={(checked) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        speech: { ...prev.speech, authType: checked ? 'entraId' : 'apiKey' },
                      }))
                    }
                  />
                </div>
                
                {localConfig.speech.authType === 'entraId' && (
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      <strong>🔐 Browser Authentication:</strong> A login popup will appear when you first transcribe audio. 
                      Requires <strong>Cognitive Services User</strong> role on the Azure Speech resource.
                    </p>
                  </div>
                )}
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

          <div className="border-t border-border my-4" />

          {/* Synthetic Audio Generation (TTS) Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Synthetic Audio Generation</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Configure text-to-speech voices for generating synthetic call audio from transcripts.
              Uses Azure Speech Services (same credentials as Speech Service above).
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="tts-enabled">Enable TTS Generation</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow generating synthetic audio from call transcripts
                  </p>
                </div>
                <Switch
                  id="tts-enabled"
                  checked={localConfig.tts?.enabled ?? true}
                  onCheckedChange={(checked) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      tts: { 
                        ...prev.tts,
                        enabled: checked,
                        defaultMaleVoice1: prev.tts?.defaultMaleVoice1 || DEFAULT_VOICES.male1,
                        defaultMaleVoice2: prev.tts?.defaultMaleVoice2 || DEFAULT_VOICES.male2,
                        defaultFemaleVoice1: prev.tts?.defaultFemaleVoice1 || DEFAULT_VOICES.female1,
                        defaultFemaleVoice2: prev.tts?.defaultFemaleVoice2 || DEFAULT_VOICES.female2,
                      },
                    }))
                  }
                />
              </div>

              {(localConfig.tts?.enabled ?? true) && (
                <div className="space-y-4">
                  {/* Male Voices */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Male Voices</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="tts-male-voice-1" className="text-xs">Primary Voice</Label>
                        <select
                          id="tts-male-voice-1"
                          className="w-full h-9 px-2 text-sm rounded-md border border-input bg-background"
                          value={localConfig.tts?.defaultMaleVoice1 || DEFAULT_VOICES.male1}
                          onChange={(e) =>
                            setLocalConfig((prev) => ({
                              ...prev,
                              tts: {
                                ...prev.tts,
                                enabled: prev.tts?.enabled ?? true,
                                defaultMaleVoice1: e.target.value,
                                defaultMaleVoice2: prev.tts?.defaultMaleVoice2 || DEFAULT_VOICES.male2,
                                defaultFemaleVoice1: prev.tts?.defaultFemaleVoice1 || DEFAULT_VOICES.female1,
                                defaultFemaleVoice2: prev.tts?.defaultFemaleVoice2 || DEFAULT_VOICES.female2,
                              },
                            }))
                          }
                        >
                          {VOICE_OPTIONS.male.map((voice) => (
                            <option key={voice.value} value={voice.value}>
                              {voice.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="tts-male-voice-2" className="text-xs">Secondary Voice</Label>
                        <select
                          id="tts-male-voice-2"
                          className="w-full h-9 px-2 text-sm rounded-md border border-input bg-background"
                          value={localConfig.tts?.defaultMaleVoice2 || DEFAULT_VOICES.male2}
                          onChange={(e) =>
                            setLocalConfig((prev) => ({
                              ...prev,
                              tts: {
                                ...prev.tts,
                                enabled: prev.tts?.enabled ?? true,
                                defaultMaleVoice1: prev.tts?.defaultMaleVoice1 || DEFAULT_VOICES.male1,
                                defaultMaleVoice2: e.target.value,
                                defaultFemaleVoice1: prev.tts?.defaultFemaleVoice1 || DEFAULT_VOICES.female1,
                                defaultFemaleVoice2: prev.tts?.defaultFemaleVoice2 || DEFAULT_VOICES.female2,
                              },
                            }))
                          }
                        >
                          {VOICE_OPTIONS.male.map((voice) => (
                            <option key={voice.value} value={voice.value}>
                              {voice.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Female Voices */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Female Voices</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="tts-female-voice-1" className="text-xs">Primary Voice</Label>
                        <select
                          id="tts-female-voice-1"
                          className="w-full h-9 px-2 text-sm rounded-md border border-input bg-background"
                          value={localConfig.tts?.defaultFemaleVoice1 || DEFAULT_VOICES.female1}
                          onChange={(e) =>
                            setLocalConfig((prev) => ({
                              ...prev,
                              tts: {
                                ...prev.tts,
                                enabled: prev.tts?.enabled ?? true,
                                defaultMaleVoice1: prev.tts?.defaultMaleVoice1 || DEFAULT_VOICES.male1,
                                defaultMaleVoice2: prev.tts?.defaultMaleVoice2 || DEFAULT_VOICES.male2,
                                defaultFemaleVoice1: e.target.value,
                                defaultFemaleVoice2: prev.tts?.defaultFemaleVoice2 || DEFAULT_VOICES.female2,
                              },
                            }))
                          }
                        >
                          {VOICE_OPTIONS.female.map((voice) => (
                            <option key={voice.value} value={voice.value}>
                              {voice.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="tts-female-voice-2" className="text-xs">Secondary Voice</Label>
                        <select
                          id="tts-female-voice-2"
                          className="w-full h-9 px-2 text-sm rounded-md border border-input bg-background"
                          value={localConfig.tts?.defaultFemaleVoice2 || DEFAULT_VOICES.female2}
                          onChange={(e) =>
                            setLocalConfig((prev) => ({
                              ...prev,
                              tts: {
                                ...prev.tts,
                                enabled: prev.tts?.enabled ?? true,
                                defaultMaleVoice1: prev.tts?.defaultMaleVoice1 || DEFAULT_VOICES.male1,
                                defaultMaleVoice2: prev.tts?.defaultMaleVoice2 || DEFAULT_VOICES.male2,
                                defaultFemaleVoice1: prev.tts?.defaultFemaleVoice1 || DEFAULT_VOICES.female1,
                                defaultFemaleVoice2: e.target.value,
                              },
                            }))
                          }
                        >
                          {VOICE_OPTIONS.female.map((voice) => (
                            <option key={voice.value} value={voice.value}>
                              {voice.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      <strong>How it works:</strong> The system uses the LLM to detect speaker gender from names
                      in the transcript metadata. When both speakers are the same gender (e.g., two women or two men),
                      the primary voice is used for the first speaker and the secondary voice for the second speaker.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border my-4" />

          {/* Batches Configuration Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Batches Configuration</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Configure parallel processing for faster synthetic data generation and AI Evaluations.
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="parallel-batches">Parallel Batches</Label>
                  <Input
                    id="parallel-batches"
                    type="number"
                    min={1}
                    max={10}
                    value={localConfig.syntheticData?.parallelBatches ?? 3}
                    onChange={(e) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        syntheticData: {
                          ...prev.syntheticData,
                          parallelBatches: Math.max(1, Math.min(10, parseInt(e.target.value) || 3)),
                          recordsPerBatch: prev.syntheticData?.recordsPerBatch ?? 5,
                        },
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Concurrent API calls (1-10)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="records-per-batch">Records per Batch</Label>
                  <Input
                    id="records-per-batch"
                    type="number"
                    min={1}
                    max={10}
                    value={localConfig.syntheticData?.recordsPerBatch ?? 5}
                    onChange={(e) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        syntheticData: {
                          ...prev.syntheticData,
                          parallelBatches: prev.syntheticData?.parallelBatches ?? 3,
                          recordsPerBatch: Math.max(1, Math.min(10, parseInt(e.target.value) || 5)),
                        },
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Records per API call (1-10)
                  </p>
                </div>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>Example:</strong> With {localConfig.syntheticData?.parallelBatches ?? 3} parallel batches × {localConfig.syntheticData?.recordsPerBatch ?? 5} records each = {(localConfig.syntheticData?.parallelBatches ?? 3) * (localConfig.syntheticData?.recordsPerBatch ?? 5)} records generated simultaneously.
                  Higher values speed up generation but may increase API rate limiting.
                </p>
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
