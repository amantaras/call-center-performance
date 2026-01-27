targetScope = 'resourceGroup'

@description('Name of the Azure Speech service')
param name string

@description('Location for the resource')
param location string = resourceGroup().location

@description('Tags for the resource')
param tags object = {}

@description('Principal ID of the managed identity to grant access')
param managedIdentityPrincipalId string

// Role definition IDs
var cognitiveServicesSpeechUserRole = 'f2dc8367-1007-4938-bd23-fe263f013447' // Cognitive Services Speech User
var cognitiveServicesUserRole = 'a97b65f3-24c7-4388-baec-2e87135dc908' // Cognitive Services User

resource speech 'Microsoft.CognitiveServices/accounts@2025-06-01' = {
  name: name
  location: location
  tags: tags
  kind: 'SpeechServices'
  sku: {
    name: 'S0'
  }
  properties: {
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
    }
    // CRITICAL: Disable API keys, require Entra ID authentication
    disableLocalAuth: true
  }
}

// Grant managed identity Speech User role
resource speechUserRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(speech.id, managedIdentityPrincipalId, cognitiveServicesSpeechUserRole)
  scope: speech
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cognitiveServicesSpeechUserRole)
    principalId: managedIdentityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// Grant managed identity Cognitive Services User role
resource cogServicesUserRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(speech.id, managedIdentityPrincipalId, cognitiveServicesUserRole)
  scope: speech
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cognitiveServicesUserRole)
    principalId: managedIdentityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

output id string = speech.id
output name string = speech.name
output endpoint string = speech.properties.endpoint
output region string = location
