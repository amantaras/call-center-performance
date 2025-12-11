export interface AzureServicesConfig {
  openAI: {
    endpoint: string;
    apiKey: string;
    deploymentName: string;
    apiVersion: string;
    reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
  };
  speech: {
    region: string;
    subscriptionKey: string;
    apiVersion: string;
    selectedLanguages?: string[]; // Array of locale codes (e.g., ['en-US', 'ar-SA'])
    diarizationEnabled?: boolean;
    minSpeakers?: number;
    maxSpeakers?: number;
  };
  syntheticData?: {
    parallelBatches: number; // Number of parallel API calls (1-10)
    recordsPerBatch: number; // Records to generate per batch (1-10)
  };
  tts?: {
    enabled: boolean;
    defaultMaleVoice1: string;
    defaultMaleVoice2: string;
    defaultFemaleVoice1: string;
    defaultFemaleVoice2: string;
    outputFormat?: 'audio-16khz-128kbitrate-mono-mp3' | 'audio-24khz-160kbitrate-mono-mp3' | 'audio-48khz-192kbitrate-mono-mp3';
  };
}
