/**
 * Browser Config Manager
 * 
 * Shared ConfigManager implementation for browser environment.
 * Bridges AzureOpenAIConfig with ConfigManager interface expected by LLMCaller.
 * Supports both API Key and Entra ID authentication.
 */

import type { AzureOpenAIConfig, ConfigManager } from '@/configManager';
import { azureTokenService } from './azure-token';

/**
 * ConfigManager implementation for browser that supports Entra ID auth
 */
export class BrowserConfigManager implements ConfigManager {
  constructor(private config: AzureOpenAIConfig) {
    console.log('📦 BrowserConfigManager created with:', {
      authType: config.authType || 'apiKey',
      reasoningEffort: config.reasoningEffort,
      hasApiKey: !!config.apiKey,
      tenantId: config.tenantId || '(default)',
    });
  }

  async getConfig(): Promise<AzureOpenAIConfig | null> {
    console.log('📖 BrowserConfigManager.getConfig() returning reasoningEffort:', this.config.reasoningEffort);
    return this.config;
  }

  async getEntraIdToken(tenantId?: string): Promise<string | null> {
    // Use the shared Azure Token Service for Entra ID auth
    try {
      const effectiveTenantId = tenantId || this.config.tenantId;
      console.log('🔐 BrowserConfigManager requesting Entra ID token for OpenAI...');
      const token = await azureTokenService.getOpenAIToken(effectiveTenantId);
      console.log('🔐 Entra ID token acquired successfully');
      return token;
    } catch (error) {
      console.error('🔐 Failed to get Entra ID token:', error);
      throw error; // Let the caller handle the redirect flow
    }
  }

  getMaxRetries(): number {
    return 3; // Default retry count
  }
}

/**
 * Create a BrowserConfigManager from stored Azure config
 */
export function createBrowserConfigManager(config: AzureOpenAIConfig): ConfigManager {
  return new BrowserConfigManager(config);
}
