export type AzureAuthType = 'apiKey' | 'entraId';

export interface AzureOpenAIConfig {
  endpoint: string;
  apiKey?: string;
  deploymentName: string;
  apiVersion?: string;
  authType?: AzureAuthType;
  tenantId?: string;
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
  embeddingModelName?: string;
}

export interface ConfigManager {
  getConfig(): Promise<AzureOpenAIConfig | null>;
  getEntraIdToken(tenantId?: string): Promise<string | null>;
  getMaxRetries(): number;
}
