/**
 * App Registration Service
 * 
 * Creates Azure AD App Registrations.
 * Since browser-based creation requires an existing app (chicken-and-egg problem),
 * we provide helpers for CLI-based creation or Azure Portal links.
 */

interface CreateAppRegistrationOptions {
  displayName: string;
  redirectUri: string;
  tenantId?: string;
}

interface AppRegistrationResult {
  clientId: string;
  objectId?: string;
  tenantId?: string;
  displayName: string;
}

/**
 * Generate Azure CLI command to create an App Registration with Cognitive Services permission
 * The correct permission ID for Cognitive Services user_impersonation is: 5f1e8914-a52b-429f-9324-91b92b81adaf
 */
export function generateCliCommand(options: CreateAppRegistrationOptions): string {
  const { displayName, redirectUri } = options;
  
  // Cognitive Services API and user_impersonation scope (correct ID!)
  const cogServicesAppId = '7d312290-28c8-473c-a0ed-8e53749b6d6d';
  const userImpersonationScopeId = '5f1e8914-a52b-429f-9324-91b92b81adaf';
  
  // Complete command: create app, set SPA URI, add Cognitive Services permission, create service principal
  const permJson = `{\\"requiredResourceAccess\\":[{\\"resourceAppId\\":\\"${cogServicesAppId}\\",\\"resourceAccess\\":[{\\"id\\":\\"${userImpersonationScopeId}\\",\\"type\\":\\"Scope\\"}]}]}`;
  
  return `$appId = az ad app create --display-name "${displayName}" --sign-in-audience AzureADMyOrg --query appId -o tsv; ` +
    `az rest --method PATCH --uri "https://graph.microsoft.com/v1.0/applications(appId=''$appId'')" --body "{\\"spa\\":{\\"redirectUris\\":[\\"${redirectUri}\\"]}}"; ` +
    `az rest --method PATCH --uri "https://graph.microsoft.com/v1.0/applications(appId=''$appId'')" --body "${permJson}"; ` +
    `az ad sp create --id $appId; ` +
    `Write-Host "Client ID: $appId"`;
}

/**
 * Generate Azure Portal URL to create an App Registration with pre-filled values
 */
export function generatePortalUrl(options: CreateAppRegistrationOptions): string {
  // This opens the App Registration page - user needs to fill in details
  return 'https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/CreateApplicationBlade';
}

/**
 * Create App Registration via Azure CLI (must be run from terminal)
 * This is called from the ConfigDialog which will execute in terminal
 */
export async function createAppRegistration(
  options: CreateAppRegistrationOptions
): Promise<AppRegistrationResult> {
  // This function is a placeholder - actual creation happens via CLI
  // The UI will handle calling Azure CLI and parsing the result
  throw new Error(
    'App Registration creation requires Azure CLI. ' +
    'Please use the "Create via CLI" option or create manually in Azure Portal.'
  );
}

/**
 * Parse app ID from Azure CLI output
 */
export function parseAppIdFromCliOutput(output: string): string | null {
  // az ad app create with --query "appId" -o tsv returns just the GUID
  const trimmed = output.trim();
  const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (guidPattern.test(trimmed)) {
    return trimmed;
  }
  
  // Try to find a GUID in the output
  const match = output.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return match ? match[0] : null;
}

