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
}
