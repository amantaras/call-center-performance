# Call Center Performance - Azure Deployment Guide

This guide explains how to deploy the Call Center Performance application to Azure using Azure Developer CLI (azd).

## 📋 Prerequisites

Before deploying, ensure you have:

1. **Azure Developer CLI (azd)** - [Install instructions](https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd)
   ```powershell
   winget install microsoft.azd
   ```

2. **Azure CLI** - [Install instructions](https://docs.microsoft.com/cli/azure/install-azure-cli)
   ```powershell
   winget install -e --id Microsoft.AzureCLI
   ```

3. **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop/)

4. **Azure Subscription** with access to create resources

## 🚀 Quick Deployment

### One-Command Deployment
The simplest way to deploy is using `azd up`, which handles everything:

```powershell
cd call-center-performance
azd up
```

This will:
1. Prompt for environment name and Azure location
2. Create all Azure resources (Container Apps, OpenAI, Speech)
3. Build and deploy your containerized application

### What Gets Deployed

| Resource | Description | SKU |
|----------|-------------|-----|
| Container App | Hosts the React frontend | Consumption (serverless) |
| Container Registry | Stores container images | Basic |
| Azure AI Foundry | GPT-5-mini model (with project) | S0 |
| Speech Services | STT/TTS capabilities | S0 |
| Log Analytics | Centralized logging | Per GB |
| Application Insights | Application monitoring | Per GB |
| Managed Identity | secure service auth | - |

## 📝 Step-by-Step Deployment

### 1. Initialize Environment

```powershell
# Create a new azd environment
azd init

# Or use an existing environment
azd env new myenv
```

### 2. Configure Location

Choose a region that supports all services (Azure OpenAI requires specific regions):

```powershell
# Recommended regions for Azure OpenAI + Speech
azd env set AZURE_LOCATION "eastus2"
# Other options: westus, westeurope, swedencentral
```

### 3. Preview Infrastructure Changes

```powershell
# See what will be created without deploying
azd provision --preview
```

### 4. Deploy Everything

```powershell
# Provision infrastructure and deploy application
azd up
```

### 5. View Deployment Outputs

```powershell
# Show all deployment outputs
azd show

# The output includes:
# - SERVICE_WEB_URI: Your application URL
# - AZURE_OPENAI_ENDPOINT: OpenAI endpoint for configuration
# - AZURE_SPEECH_REGION: Speech service region
```

## ⚙️ Post-Deployment Configuration

After deployment, you need to configure the Azure services in the application:

### 1. Get Service Keys

```powershell
# Get Azure OpenAI API Key
az cognitiveservices account keys list \
  --name <openai-resource-name> \
  --resource-group <resource-group-name>

# Get Speech Service Key
az cognitiveservices account keys list \
  --name <speech-resource-name> \
  --resource-group <resource-group-name>
```

### 2. Configure in the Application

1. Open the deployed application URL
2. Go to Settings (gear icon)
3. Configure Azure OpenAI:
   - **Endpoint**: Use the `AZURE_OPENAI_ENDPOINT` output
   - **API Key**: Use the key from step 1
   - **Deployment Name**: `gpt-5-mini`
4. Configure Speech Service:
   - **Region**: Use the `AZURE_SPEECH_REGION` output
   - **Subscription Key**: Use the key from step 1

## 🔄 Common Operations

### Update the Application

```powershell
# After making code changes, redeploy
azd deploy
```

### View Application Logs

```powershell
# Stream logs from the container app
az containerapp logs show \
  --name <container-app-name> \
  --resource-group <resource-group-name> \
  --follow
```

### Scale the Application

```powershell
# Update scaling rules (0-10 replicas based on HTTP traffic)
az containerapp update \
  --name <container-app-name> \
  --resource-group <resource-group-name> \
  --min-replicas 1 \
  --max-replicas 10
```

### Tear Down Everything

```powershell
# Delete all deployed resources
azd down --force --purge
```

## 💡 Smart azd Commands

### Information & Status

```powershell
# Show environment information
azd show

# List all environments
azd env list

# Show current environment variables
azd env get-values
```

### CI/CD Pipeline Setup

```powershell
# Set up GitHub Actions pipeline
azd pipeline config
```

### Monitor & Debug

```powershell
# Open Azure Portal for the resource group
azd monitor --overview

# View live logs
azd monitor --logs
```

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Azure Resource Group                         │
│                                                                  │
│  ┌──────────────────┐    ┌───────────────────────────────────┐  │
│  │ Container Registry│───▶│   Container Apps Environment     │  │
│  │    (Basic)        │    │                                   │  │
│  └──────────────────┘    │  ┌─────────────────────────────┐  │  │
│                          │  │      Container App (web)     │  │  │
│  ┌──────────────────┐    │  │  ┌────────────────────────┐ │  │  │
│  │ Managed Identity │◀───│  │  │   React/Vite App       │ │  │  │
│  └──────────────────┘    │  │  │   (nginx + static)     │ │  │  │
│                          │  │  └────────────────────────┘ │  │  │
│                          │  └─────────────────────────────┘  │  │
│                          └───────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │  Azure OpenAI    │    │  Speech Service  │                   │
│  │  AI Foundry    │    │   (STT/TTS)      │                   │
│  └──────────────────┘    └──────────────────┘                   │
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │ Log Analytics    │◀───│  App Insights    │                   │
│  │   Workspace      │    │                  │                   │
│  └──────────────────┘    └──────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

## 🔐 Security Notes

- **Settings Persistence**: The application stores settings in browser localStorage (per-user, per-browser). This is secure for personal use but doesn't sync across devices.
- **API Keys**: Keep your Azure service keys secure. Never commit them to source control.
- **Managed Identity**: The container app uses a managed identity for accessing the container registry securely.

## ⚠️ Troubleshooting

### Deployment Fails with "Model not available"

Azure OpenAI models have regional availability. Try:
```powershell
azd env set AZURE_LOCATION "swedencentral"
azd up
```

### Container App Shows "No healthy replicas"

Check the container logs:
```powershell
az containerapp logs show --name <app-name> --resource-group <rg-name>
```

### Build Fails

Ensure Docker Desktop is running:
```powershell
docker info
```

## 📚 Additional Resources

- [Azure Developer CLI Documentation](https://learn.microsoft.com/azure/developer/azure-developer-cli/)
- [Azure Container Apps Documentation](https://learn.microsoft.com/azure/container-apps/)
- [Azure OpenAI Service Documentation](https://learn.microsoft.com/azure/ai-services/openai/)
- [Azure Speech Service Documentation](https://learn.microsoft.com/azure/ai-services/speech-service/)
