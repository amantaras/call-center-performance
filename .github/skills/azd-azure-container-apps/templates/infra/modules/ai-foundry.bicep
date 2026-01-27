targetScope = 'resourceGroup'

@description('Name of the Azure AI Foundry resource')
param name string

@description('Name of the AI Foundry project')
param projectName string

@description('Location for the resource')
param location string = resourceGroup().location

@description('Tags for the resource')
param tags object = {}

@description('Name of the model deployment')
param modelDeploymentName string

@description('Name of the model to deploy')
param modelName string

@description('Version of the model to deploy - CRITICAL: Must be exact version')
param modelVersion string

@description('Model capacity in TPM (thousands)')
param modelCapacity int

@description('Principal ID of the managed identity to grant access')
param managedIdentityPrincipalId string

// Role definition IDs
var cognitiveServicesOpenAIUserRole = '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd' // Cognitive Services OpenAI User
var cognitiveServicesUserRole = 'a97b65f3-24c7-4388-baec-2e87135dc908' // Cognitive Services User

// Azure AI Foundry resource (AIServices kind with project management enabled)
// CRITICAL: Use kind: 'AIServices' NOT 'OpenAI' for AI Foundry
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
    // CRITICAL: Required for AI Foundry portal access
    allowProjectManagement: true
    // Defines developer API endpoint subdomain
    customSubDomainName: toLower(name)
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
    }
    // CRITICAL: Disable API keys, require Entra ID authentication
    disableLocalAuth: true
  }
}

// Grant managed identity OpenAI User role
resource openAIUserRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(aiFoundry.id, managedIdentityPrincipalId, cognitiveServicesOpenAIUserRole)
  scope: aiFoundry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cognitiveServicesOpenAIUserRole)
    principalId: managedIdentityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// Grant managed identity Cognitive Services User role (for broader access)
resource cogServicesUserRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(aiFoundry.id, managedIdentityPrincipalId, cognitiveServicesUserRole)
  scope: aiFoundry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cognitiveServicesUserRole)
    principalId: managedIdentityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// AI Foundry Project - groups resources for development teams
resource aiProject 'Microsoft.CognitiveServices/accounts/projects@2025-06-01' = {
  name: projectName
  parent: aiFoundry
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {}
}

// Deploy the model
// CRITICAL: Model name and version must be exact - check available models in your region
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
