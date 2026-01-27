/**
 * Azure Token Service
 * 
 * Provides Entra ID (Azure AD) token acquisition for browser-based authentication.
 * Uses MSAL.js with popup flow for seamless token acquisition.
 * 
 * Scopes used:
 * - Azure Cognitive Services: https://cognitiveservices.azure.com/.default
 * - Azure OpenAI: https://cognitiveservices.azure.com/.default (same scope)
 */

import { PublicClientApplication, InteractionRequiredAuthError, AccountInfo, PopupRequest } from '@azure/msal-browser';

// Azure Cognitive Services scope (used for both Speech and OpenAI)
const COGNITIVE_SERVICES_SCOPE = 'https://cognitiveservices.azure.com/.default';

interface TokenCache {
  token: string;
  expiresAt: number;
  scope: string;
}

interface EntraIdConfiguration {
  clientId: string;
  tenantId?: string;
}

class AzureTokenService {
  private msalInstance: PublicClientApplication | null = null;
  private tokenCache: Map<string, TokenCache> = new Map();
  private initPromise: Promise<void> | null = null;
  private currentAccount: AccountInfo | null = null;
  private pendingLoginPromise: Promise<string> | null = null;
  private loginInProgress: boolean = false;
  private currentConfig: EntraIdConfiguration | null = null;

  /**
   * Configure the token service with App Registration details
   * Must be called before using getAccessToken when auth type is entraId
   */
  configure(config: EntraIdConfiguration): void {
    // If config changed, reset MSAL instance
    if (this.currentConfig?.clientId !== config.clientId || 
        this.currentConfig?.tenantId !== config.tenantId) {
      console.log('🔐 Entra ID configuration changed, reinitializing...');
      this.msalInstance = null;
      this.initPromise = null;
      this.currentAccount = null;
      this.tokenCache.clear();
    }
    this.currentConfig = config;
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.currentConfig?.clientId);
  }

  /**
   * Get current configuration
   */
  getConfiguration(): EntraIdConfiguration | null {
    return this.currentConfig;
  }

  /**
   * Initialize MSAL for a specific tenant
   */
  private async initializeMSAL(tenantId?: string): Promise<void> {
    if (!this.currentConfig?.clientId) {
      throw new Error('Entra ID not configured. Please provide App Registration Client ID in Configuration.');
    }

    // Use common tenant if not specified (allows any Azure AD account)
    const effectiveTenantId = tenantId || this.currentConfig.tenantId;
    const authority = effectiveTenantId 
      ? `https://login.microsoftonline.com/${effectiveTenantId}`
      : 'https://login.microsoftonline.com/common';

    const msalConfig = {
      auth: {
        clientId: this.currentConfig.clientId,
        authority: authority,
        redirectUri: window.location.origin + window.location.pathname,
        navigateToLoginRequestUrl: true,
      },
      cache: {
        cacheLocation: 'localStorage' as const, // Use localStorage for persistence
        storeAuthStateInCookie: false,
      },
    };

    this.msalInstance = new PublicClientApplication(msalConfig);
    await this.msalInstance.initialize();
    
    // Check for existing accounts
    const accounts = this.msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      this.currentAccount = accounts[0];
      console.log('🔐 Found existing MSAL account:', this.currentAccount.username);
    }
  }

  /**
   * Ensure MSAL is initialized
   */
  private async ensureInitialized(tenantId?: string): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.initializeMSAL(tenantId);
    }
    await this.initPromise;
  }

  /**
   * Get an access token for Azure Cognitive Services (Speech/OpenAI)
   * Uses popup flow for interactive login (no page navigation)
   * 
   * @param tenantId - Optional Azure AD tenant ID
   * @param forceRefresh - Force a new token even if cached
   * @returns Access token string
   */
  async getAccessToken(tenantId?: string, forceRefresh: boolean = false): Promise<string> {
    const cacheKey = `cognitive_${tenantId || 'common'}`;
    
    // Check cache first
    if (!forceRefresh) {
      const cached = this.tokenCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now() + 60000) { // 1 min buffer
        console.log('🔐 Using cached token');
        return cached.token;
      }
    }

    await this.ensureInitialized(tenantId);

    if (!this.msalInstance) {
      throw new Error('MSAL not initialized');
    }

    // If login is already in progress, wait for it
    if (this.pendingLoginPromise) {
      console.log('🔐 Login already in progress, waiting...');
      return this.pendingLoginPromise;
    }

    const tokenRequest = {
      scopes: [COGNITIVE_SERVICES_SCOPE],
      account: this.currentAccount || undefined,
    };

    try {
      // Try silent token acquisition first
      let response;
      if (this.currentAccount) {
        try {
          response = await this.msalInstance.acquireTokenSilent(tokenRequest);
          console.log('🔐 Token acquired silently');
        } catch (silentError) {
          if (silentError instanceof InteractionRequiredAuthError) {
            // Silent acquisition failed, need popup interaction
            console.log('🔐 Silent auth failed, opening login popup...');
            response = await this.acquireTokenWithPopup();
          } else {
            throw silentError;
          }
        }
      } else {
        // No account, need to login first - use popup
        console.log('🔐 No account found, opening login popup...');
        response = await this.acquireTokenWithPopup();
      }

      // Update current account
      this.currentAccount = response.account;

      // Cache the token
      const expiresAt = response.expiresOn?.getTime() || (Date.now() + 3600000);
      this.tokenCache.set(cacheKey, {
        token: response.accessToken,
        expiresAt,
        scope: COGNITIVE_SERVICES_SCOPE,
      });

      return response.accessToken;
    } catch (error) {
      // Check for interaction_in_progress - this is NOT a retriable error
      if (error instanceof Error && error.message.includes('interaction_in_progress')) {
        console.error('🔐 Login interaction already in progress');
        throw new Error('Login is already in progress. Please complete the login popup and try again.');
      }
      console.error('🔐 Failed to acquire token:', error);
      throw new Error(`Failed to acquire Azure AD token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Acquire token using popup (deduped to prevent multiple popups)
   */
  private async acquireTokenWithPopup() {
    if (this.pendingLoginPromise) {
      return this.pendingLoginPromise as any;
    }

    this.loginInProgress = true;
    const popupRequest: PopupRequest = {
      scopes: [COGNITIVE_SERVICES_SCOPE],
    };

    this.pendingLoginPromise = (async () => {
      try {
        const response = await this.msalInstance!.acquireTokenPopup(popupRequest);
        console.log('🔐 Token acquired via popup');
        return response;
      } finally {
        this.pendingLoginPromise = null;
        this.loginInProgress = false;
      }
    })() as any;

    return this.pendingLoginPromise as any;
  }

  /**
   * Get token for Azure Speech Services specifically
   */
  async getSpeechToken(tenantId?: string): Promise<string> {
    return this.getAccessToken(tenantId);
  }

  /**
   * Get token for Azure OpenAI specifically
   */
  async getOpenAIToken(tenantId?: string): Promise<string> {
    return this.getAccessToken(tenantId);
  }

  /**
   * Check if user is currently logged in
   */
  isLoggedIn(): boolean {
    return this.currentAccount !== null;
  }

  /**
   * Get the current logged-in user's email/username
   */
  getCurrentUser(): string | null {
    return this.currentAccount?.username || null;
  }

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    if (this.msalInstance && this.currentAccount) {
      await this.msalInstance.logoutPopup({
        account: this.currentAccount,
      });
      this.currentAccount = null;
      this.tokenCache.clear();
      console.log('🔐 Logged out');
    }
  }

  /**
   * Clear token cache
   */
  clearCache(): void {
    this.tokenCache.clear();
  }
}

// Export singleton instance
export const azureTokenService = new AzureTokenService();
