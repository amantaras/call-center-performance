---
name: azd-azure-container-apps
description: Deploy React/Node.js applications to Azure Container Apps using Azure Developer CLI (azd) with Azure AI Foundry (OpenAI), Speech Services, and Managed Identity authentication. Includes Bicep infrastructure templates, backend proxy for managed identity, and all configuration needed for zero-config deployments.
---

# Azure Container Apps Deployment with AI Foundry and Managed Identity

This skill helps you deploy web applications to Azure Container Apps with:
- Azure AI Foundry (OpenAI models like gpt-5-mini, gpt-4.1-mini)
- Azure Speech Services (STT/TTS)
- Managed Identity authentication (no API keys needed)
- Azure Developer CLI (azd) for deployment automation

## When to Use This Skill

Use this skill when you need to:
- Deploy a React/Vite/Node.js app to Azure Container Apps
- Use Azure OpenAI with managed identity (no API keys)
- Use Azure Speech Services with managed identity
- Set up azd infrastructure as code with Bicep
- Create a backend proxy for managed identity authentication

## Project Structure

Create the following structure for azd deployment:

```
your-project/
├── azure.yaml                    # azd project configuration
├── Dockerfile                    # Multi-stage build for React + Node.js backend
├── server/
│   ├── index.js                  # Backend proxy for managed identity
│   └── package.json              # Backend dependencies
├── infra/
│   ├── main.bicep                # Main infrastructure template
│   ├── main.parameters.json      # Parameter overrides
│   └── modules/
│       ├── ai-foundry.bicep      # AI Foundry with project and model deployment
│       ├── speech.bicep          # Azure Speech Services
│       ├── container-app.bicep   # Container App configuration
│       ├── container-apps-environment.bicep
│       ├── container-registry.bicep
│       ├── managed-identity.bicep
│       ├── log-analytics.bicep
│       └── app-insights.bicep
```

## Critical Configuration Files

### azure.yaml

```yaml
name: your-app-name
metadata:
  template: your-app-name@0.0.1
services:
  web:
    project: .
    language: js
    host: containerapp
```

### Dockerfile (CRITICAL - Multi-stage build)

```dockerfile
# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build the React app
RUN npm run build

# Stage 2: Production server
FROM node:20-alpine AS production

WORKDIR /app

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Copy server files
COPY server/package.json ./server/
COPY server/index.js ./server/

# Install server dependencies
WORKDIR /app/server
RUN npm install --omit=dev

# Set working directory back to app root
WORKDIR /app

# Expose port 80 (Azure Container Apps default)
EXPOSE 80

# Set environment variable for port
ENV PORT=80

# Start the Node.js server
CMD ["node", "server/index.js"]
```

**CRITICAL DOCKERFILE NOTES:**
1. Use `npm install` NOT `npm ci` - npm ci requires package-lock.json which may not exist
2. Use `npm install --omit=dev` for production dependencies only
3. Container Apps expects port 80 by default
4. The Node.js server serves both the static React build AND the API proxy

## Backend Proxy Server (server/index.js)

This is CRITICAL for managed identity authentication:

```javascript
const express = require('express');
const cors = require('cors');
const { DefaultAzureCredential } = require('@azure/identity');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 80;

// Azure configuration from environment variables (set by Bicep)
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5-mini';
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || 'swedencentral';

// Azure credential using managed identity
const credential = new DefaultAzureCredential();

// Token cache
let openAIToken = null;
let openAITokenExpiry = 0;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Config endpoint - returns Azure config to frontend
app.get('/api/config', (req, res) => {
  res.json({
    openAI: {
      endpoint: AZURE_OPENAI_ENDPOINT,
      deploymentName: AZURE_OPENAI_DEPLOYMENT,
      authType: 'managedIdentity',
    },
    speech: {
      region: AZURE_SPEECH_REGION,
      authType: 'managedIdentity',
    }
  });
});

// Get Azure OpenAI token
async function getOpenAIToken() {
  const now = Date.now();
  if (openAIToken && openAITokenExpiry > now + 60000) {
    return openAIToken;
  }
  const tokenResponse = await credential.getToken('https://cognitiveservices.azure.com/.default');
  openAIToken = tokenResponse.token;
  openAITokenExpiry = tokenResponse.expiresOnTimestamp;
  return openAIToken;
}

// CRITICAL: Proxy for Azure OpenAI Responses API
app.post('/api/openai/responses', async (req, res) => {
  try {
    if (!AZURE_OPENAI_ENDPOINT) {
      return res.status(500).json({ error: 'Azure OpenAI endpoint not configured' });
    }

    const token = await getOpenAIToken();
    const url = `${AZURE_OPENAI_ENDPOINT}/openai/v1/responses`;

    // CRITICAL: Override model with backend-configured deployment
    const requestBody = {
      ...req.body,
      model: AZURE_OPENAI_DEPLOYMENT,  // Always use server-side config
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Speech token endpoint for frontend SDK
app.get('/api/speech/token', async (req, res) => {
  try {
    const tokenResponse = await credential.getToken('https://cognitiveservices.azure.com/.default');
    res.json({
      token: tokenResponse.token,
      region: AZURE_SPEECH_REGION,
      expiresIn: 600,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../dist')));

// Handle React routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`OpenAI Endpoint: ${AZURE_OPENAI_ENDPOINT}`);
  console.log(`OpenAI Deployment: ${AZURE_OPENAI_DEPLOYMENT}`);
  console.log(`Speech Region: ${AZURE_SPEECH_REGION}`);
});
```

### server/package.json

```json
{
  "name": "backend-proxy",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "@azure/identity": "^4.6.0",
    "cors": "^2.8.5",
    "express": "^4.21.2"
  }
}
```

## Bicep Infrastructure

### AI Foundry Module (infra/modules/ai-foundry.bicep)

**CRITICAL:** This is for Azure AI Foundry with projects, NOT standalone Azure OpenAI.

```bicep
targetScope = 'resourceGroup'

param name string
param projectName string
param location string = resourceGroup().location
param tags object = {}
param modelDeploymentName string
param modelName string
param modelVersion string
param modelCapacity int
param managedIdentityPrincipalId string

// Role definition IDs
var cognitiveServicesOpenAIUserRole = '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd'
var cognitiveServicesUserRole = 'a97b65f3-24c7-4388-baec-2e87135dc908'

// AI Foundry resource (AIServices kind)
resource aiFoundry 'Microsoft.CognitiveServices/accounts@2025-06-01' = {
  name: name
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  sku: {
    name: 'S0'
  }
  kind: 'AIServices'  // CRITICAL: Must be AIServices for AI Foundry
  properties: {
    allowProjectManagement: true  // CRITICAL: Required for AI Foundry portal
    customSubDomainName: toLower(name)
    publicNetworkAccess: 'Enabled'
    disableLocalAuth: true  // Require Entra ID authentication
  }
}

// Role assignments for managed identity
resource openAIUserRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(aiFoundry.id, managedIdentityPrincipalId, cognitiveServicesOpenAIUserRole)
  scope: aiFoundry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cognitiveServicesOpenAIUserRole)
    principalId: managedIdentityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

resource cogServicesUserRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(aiFoundry.id, managedIdentityPrincipalId, cognitiveServicesUserRole)
  scope: aiFoundry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cognitiveServicesUserRole)
    principalId: managedIdentityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// AI Foundry Project
resource aiProject 'Microsoft.CognitiveServices/accounts/projects@2025-06-01' = {
  name: projectName
  parent: aiFoundry
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {}
}

// Model deployment - CRITICAL: Use correct model name and version
resource modelDeployment 'Microsoft.CognitiveServices/accounts/deployments@2025-06-01' = {
  parent: aiFoundry
  name: modelDeploymentName
  sku: {
    capacity: modelCapacity
    name: 'GlobalStandard'
  }
  properties: {
    model: {
      name: modelName
      format: 'OpenAI'
      version: modelVersion
    }
  }
}

output id string = aiFoundry.id
output name string = aiFoundry.name
output endpoint string = aiFoundry.properties.endpoint
output deploymentName string = modelDeployment.name
output projectId string = aiProject.id
output projectName string = aiProject.name
```

## Available Models and Versions (as of January 2026)

**CRITICAL: Model names and versions must be exact!**

| Model | Version | Notes |
|-------|---------|-------|
| gpt-5-mini | 2025-08-07 | No registration required |
| gpt-5-nano | 2025-08-07 | No registration required |
| gpt-5 | 2025-08-07 | Registration required |
| gpt-4.1-mini | 2025-04-14 | Widely available |
| gpt-4.1 | 2025-04-14 | Widely available |
| gpt-4o-mini | 2024-07-18 | Legacy |
| gpt-4o | 2024-11-20 | Legacy |

**Common version errors:**
- `2025-01-01` - DOES NOT EXIST, will fail
- Model names are case-sensitive
- Format is always `OpenAI`

## Common Issues and Solutions

### 1. "DeploymentModelNotSupported" Error

**Problem:** Model name or version is incorrect.

**Solution:** Use exact model name and version from the table above. The version must match exactly.

### 2. "Unable to get resource information" (500 Error)

**Problem:** Backend sends empty `model` field to Azure.

**Solution:** Backend MUST inject the deployment name:
```javascript
const requestBody = {
  ...req.body,
  model: AZURE_OPENAI_DEPLOYMENT,  // Override with server config
};
```

### 3. "Azure OpenAI is not configured" on Frontend

**Problem:** Frontend validation doesn't handle `managedIdentity` auth type.

**Solution:** Add `managedIdentity` to validation checks:
```typescript
// In isConfigValid() or similar
if (config.authType === 'managedIdentity') {
  return true;  // Backend handles everything
}
```

### 4. npm ci fails during Docker build

**Problem:** `npm ci` requires package-lock.json.

**Solution:** Use `npm install` instead of `npm ci`, and `npm install --omit=dev` for production.

### 5. Container App getting 502 errors

**Problem:** App expecting wrong port or server not starting.

**Solution:** 
- Set `ENV PORT=80` in Dockerfile
- Ensure Container App ingress targets port 80
- Check logs with: `az containerapp logs show --name <app> --resource-group <rg>`

### 6. Managed Identity not working

**Problem:** Role assignments missing or incorrect.

**Solution:** Ensure these role assignments are created:
- `Cognitive Services OpenAI User` (5e0bd9bd-7b93-4f28-af87-19fc36ad61bd)
- `Cognitive Services User` (a97b65f3-24c7-4388-baec-2e87135dc908)

## Frontend Auth Type Support

When supporting managed identity in the frontend, handle three auth types:

```typescript
type AzureAuthType = 'apiKey' | 'entraId' | 'managedIdentity';

// Validation
function isConfigValid(config): boolean {
  if (config.authType === 'managedIdentity') {
    return true; // Backend handles everything
  }
  if (config.authType === 'entraId') {
    return !!(config.endpoint && config.deploymentName);
  }
  // API key auth
  return !!(config.endpoint && config.apiKey && config.deploymentName);
}

// API calls
if (config.authType === 'managedIdentity') {
  url = '/api/openai/responses';  // Use backend proxy
} else {
  url = `${config.endpoint}/openai/v1/responses`;  // Direct call
}
```

## Deployment Commands

```bash
# Initialize azd (first time only)
azd init

# Deploy everything (infrastructure + app)
azd up

# Deploy only infrastructure changes
azd provision

# Deploy only application changes
azd deploy

# View logs
az containerapp logs show --name <app-name> --resource-group <rg-name>

# Clean up resources
azd down --force --purge
```

## Environment Variables Set by Bicep

The Container App receives these environment variables automatically:

| Variable | Source | Description |
|----------|--------|-------------|
| AZURE_OPENAI_ENDPOINT | AI Foundry output | e.g., https://xxx.cognitiveservices.azure.com/ |
| AZURE_OPENAI_DEPLOYMENT | Bicep parameter | e.g., gpt-5-mini |
| AZURE_SPEECH_REGION | Location parameter | e.g., swedencentral |
| AZURE_CLIENT_ID | Managed Identity | For DefaultAzureCredential |

## Additional Common Issues (Lessons Learned)

### 7. Stale Model Version in Azure State

**Problem:** Azure caches deployment state. After changing model versions in Bicep, the old version persists.

**Solution:** Run `azd down --force --purge` then `azd up` to fully clean and redeploy.

### 8. Azure AI Foundry vs Standalone OpenAI

**CRITICAL:** These are DIFFERENT resources with different Bicep configurations:

| Feature | Azure AI Foundry | Standalone OpenAI |
|---------|-----------------|-------------------|
| Kind | `AIServices` | `OpenAI` |
| Project Management | `allowProjectManagement: true` | Not applicable |
| Portal | AI Foundry Portal | Azure OpenAI Studio |
| API Version | `2025-06-01` | `2024-10-01` |

### 9. Role Assignment Timing

**Problem:** Container App tries to pull image before ACR role assignment is ready.

**Solution:** The Container Registry module MUST create AcrPull role assignment. Bicep handles dependencies automatically when outputs are used.

### 10. DefaultAzureCredential Not Finding Identity

**Problem:** `DefaultAzureCredential` can't authenticate.

**Solution:** Set `AZURE_CLIENT_ID` environment variable to the managed identity's client ID (not principal ID).

### 11. Frontend Shows "Configure Azure OpenAI" Despite Backend Config

**Problem:** Frontend validation logic doesn't handle `managedIdentity` auth type.

**Solution (TypeScript):**
```typescript
// In App.tsx or config validation
if (azureConfig?.openAI?.authType === 'managedIdentity') {
  hasOpenAIConfig = true; // Backend handles everything
}
```

### 12. 429 Rate Limit Errors from Azure OpenAI

**Problem:** Exceeding TPM (tokens per minute) quota.

**Solution:** 
- Increase `modelCapacity` parameter in Bicep (default is 1 = 1000 TPM)
- Implement retry with exponential backoff
- Use GlobalStandard SKU for higher limits

### 13. Speech SDK Can't Use Managed Identity Directly in Browser

**Problem:** Browser Speech SDK cannot use managed identity tokens directly.

**Solution:** Backend provides `/api/speech/token` endpoint that frontend uses:
```typescript
// Frontend fetches token from backend
const response = await fetch('/api/speech/token');
const { token, region } = await response.json();
const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(token, region);
```

## Debugging Tips

### View Container App Logs
```bash
az containerapp logs show --name <app-name> --resource-group <rg-name> --follow
```

### Check Managed Identity Token Acquisition
```bash
# Inside container or via Azure CLI
curl -H "Metadata: true" "http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://cognitiveservices.azure.com/"
```

### Verify Role Assignments
```bash
az role assignment list --assignee <managed-identity-principal-id> --all
```

### Check Model Availability in Region
```bash
az cognitiveservices model list --resource-group <rg> --name <ai-foundry-name> --query "[].{name:model.name,version:model.version}" -o table
```

## Complete Template Files

This skill includes production-ready templates:

### Infrastructure (Bicep)
- [main.bicep](./templates/infra/main.bicep) - Main orchestration template
- [main.parameters.json](./templates/infra/main.parameters.json) - Parameters file
- [ai-foundry.bicep](./templates/infra/modules/ai-foundry.bicep) - AI Foundry with projects & roles
- [speech.bicep](./templates/infra/modules/speech.bicep) - Speech Services with managed identity
- [container-app.bicep](./templates/infra/modules/container-app.bicep) - Container App configuration
- [container-apps-environment.bicep](./templates/infra/modules/container-apps-environment.bicep)
- [container-registry.bicep](./templates/infra/modules/container-registry.bicep) - ACR with AcrPull role
- [managed-identity.bicep](./templates/infra/modules/managed-identity.bicep)
- [log-analytics.bicep](./templates/infra/modules/log-analytics.bicep)
- [app-insights.bicep](./templates/infra/modules/app-insights.bicep)

### Application
- [azure.yaml](./templates/azure.yaml) - azd project configuration
- [Dockerfile](./templates/Dockerfile) - Multi-stage build
- [server/index.js](./templates/server/index.js) - Backend proxy with managed identity
- [server/package.json](./templates/server/package.json) - Backend dependencies

## Quick Start Checklist

1. [ ] Copy `azure.yaml` to project root
2. [ ] Create `server/` directory with `index.js` and `package.json`
3. [ ] Create/update `Dockerfile` for multi-stage build
4. [ ] Create `infra/` directory with all Bicep modules
5. [ ] Update `main.parameters.json` with desired model name/version
6. [ ] Run `azd init` (select existing project)
7. [ ] Run `azd up`
8. [ ] Verify app at output URL
9. [ ] Check `/api/health` endpoint returns healthy
10. [ ] Test AI features work through `/api/openai/responses`
