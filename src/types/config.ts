export interface AzureServicesConfig {
  openAI: {
    endpoint: string;
    apiKey: string;
    deploymentName: string;
    apiVersion: string;
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
