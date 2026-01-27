targetScope = 'subscription'

@description('Name of the environment')
param environmentName string

@description('Primary location for all resources')
param location string

@description('Azure OpenAI model deployment name')
param openAiModelDeploymentName string = 'gpt-5-mini'

@description('Azure OpenAI model name')
param openAiModelName string = 'gpt-5-mini'

@description('Azure OpenAI model version - CRITICAL: Must match exact version available')
param openAiModelVersion string = '2025-08-07'

@description('Azure OpenAI model capacity (TPM in thousands)')
param openAiModelCapacity int = 1

@description('AI Foundry project name suffix')
param aiFoundryProjectName string = 'call-analytics'

@description('Deployment timestamp')
param deploymentDate string = utcNow('yyyy-MM-dd')

// Tags applied to all resources
var tags = {
  'azd-env-name': environmentName
  'deployment-date': deploymentDate
  project: 'your-project-name'
  'Security Control': 'Ignore'
}

// Generate unique suffix for resource names
var resourceSuffix = take(uniqueString(subscription().id, environmentName, location), 6)
var resourceGroupName = 'rg-${environmentName}'

// Abbreviations for resource naming
var abbrs = {
  containerAppsEnvironment: 'cae-'
  containerApps: 'ca-'
  containerRegistry: 'cr'
  aiFoundry: 'aif-'
  speech: 'speech-'
  logAnalytics: 'log-'
  appInsights: 'appi-'
  keyVault: 'kv-'
  managedIdentity: 'id-'
}

// Resource Group
resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

// Log Analytics Workspace
module logAnalytics 'modules/log-analytics.bicep' = {
  name: 'log-analytics'
  scope: rg
  params: {
    name: '${abbrs.logAnalytics}${environmentName}-${resourceSuffix}'
    location: location
    tags: tags
  }
}

// Application Insights
module appInsights 'modules/app-insights.bicep' = {
  name: 'app-insights'
  scope: rg
  params: {
    name: '${abbrs.appInsights}${environmentName}-${resourceSuffix}'
    location: location
    tags: tags
    logAnalyticsWorkspaceId: logAnalytics.outputs.id
  }
}

// User Assigned Managed Identity
module managedIdentity 'modules/managed-identity.bicep' = {
  name: 'managed-identity'
  scope: rg
  params: {
    name: '${abbrs.managedIdentity}${environmentName}-${resourceSuffix}'
    location: location
    tags: tags
  }
}

// Container Registry
module containerRegistry 'modules/container-registry.bicep' = {
  name: 'container-registry'
  scope: rg
  params: {
    name: '${abbrs.containerRegistry}${replace(environmentName, '-', '')}${resourceSuffix}'
    location: location
    tags: tags
    managedIdentityPrincipalId: managedIdentity.outputs.principalId
  }
}

// Container Apps Environment
module containerAppsEnvironment 'modules/container-apps-environment.bicep' = {
  name: 'container-apps-environment'
  scope: rg
  params: {
    name: '${abbrs.containerAppsEnvironment}${environmentName}-${resourceSuffix}'
    location: location
    tags: tags
    logAnalyticsWorkspaceCustomerId: logAnalytics.outputs.customerId
    logAnalyticsWorkspacePrimaryKey: logAnalytics.outputs.primarySharedKey
  }
}

// Azure AI Foundry (with project and model deployment)
module aiFoundry 'modules/ai-foundry.bicep' = {
  name: 'ai-foundry'
  scope: rg
  params: {
    name: '${abbrs.aiFoundry}${environmentName}-${resourceSuffix}'
    projectName: '${aiFoundryProjectName}-${resourceSuffix}'
    location: location
    tags: tags
    modelDeploymentName: openAiModelDeploymentName
    modelName: openAiModelName
    modelVersion: openAiModelVersion
    modelCapacity: openAiModelCapacity
    managedIdentityPrincipalId: managedIdentity.outputs.principalId
  }
}

// Azure Speech Service
module speech 'modules/speech.bicep' = {
  name: 'speech'
  scope: rg
  params: {
    name: '${abbrs.speech}${environmentName}-${resourceSuffix}'
    location: location
    tags: tags
    managedIdentityPrincipalId: managedIdentity.outputs.principalId
  }
}

// Container App
module containerApp 'modules/container-app.bicep' = {
  name: 'container-app'
  scope: rg
  params: {
    name: '${abbrs.containerApps}${environmentName}-${resourceSuffix}'
    location: location
    tags: union(tags, {
      'azd-service-name': 'web'
    })
    containerAppsEnvironmentId: containerAppsEnvironment.outputs.id
    containerRegistryLoginServer: containerRegistry.outputs.loginServer
    managedIdentityId: managedIdentity.outputs.id
    managedIdentityClientId: managedIdentity.outputs.clientId
    openAiEndpoint: aiFoundry.outputs.endpoint
    openAiDeployment: openAiModelDeploymentName
    speechRegion: location
    applicationInsightsConnectionString: appInsights.outputs.connectionString
  }
}

// Outputs for azd
output AZURE_LOCATION string = location
output AZURE_RESOURCE_GROUP string = rg.name
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = containerRegistry.outputs.loginServer
output AZURE_CONTAINER_REGISTRY_NAME string = containerRegistry.outputs.name
output AZURE_CONTAINER_ENVIRONMENT_NAME string = containerAppsEnvironment.outputs.name
output AZURE_CONTAINER_APP_NAME string = containerApp.outputs.name
output AZURE_CONTAINER_APP_FQDN string = containerApp.outputs.fqdn
output AZURE_AI_FOUNDRY_NAME string = aiFoundry.outputs.name
output AZURE_AI_FOUNDRY_PROJECT string = aiFoundry.outputs.projectName
output AZURE_OPENAI_ENDPOINT string = aiFoundry.outputs.endpoint
output AZURE_OPENAI_DEPLOYMENT_NAME string = openAiModelDeploymentName
output AZURE_SPEECH_REGION string = location
output SERVICE_WEB_NAME string = containerApp.outputs.name
output SERVICE_WEB_URI string = 'https://${containerApp.outputs.fqdn}'
