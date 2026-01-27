targetScope = 'resourceGroup'

@description('Name of the Azure Speech service')
param name string

@description('Location for the resource')
param location string = resourceGroup().location

@description('Tags for the resource')
param tags object = {}

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
    disableLocalAuth: false // Allow API key authentication
  }
}

output id string = speech.id
output name string = speech.name
output endpoint string = speech.properties.endpoint
output region string = location
