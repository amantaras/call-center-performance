targetScope = 'resourceGroup'

@description('Name of the Managed Identity')
param name string

@description('Location for the resource')
param location string = resourceGroup().location

@description('Tags for the resource')
param tags object = {}

resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: name
  location: location
  tags: tags
}

output id string = managedIdentity.id
output name string = managedIdentity.name
// Principal ID - used for role assignments
output principalId string = managedIdentity.properties.principalId
// Client ID - used for AZURE_CLIENT_ID env var for DefaultAzureCredential
output clientId string = managedIdentity.properties.clientId
