targetScope = 'resourceGroup'

@description('Name of the Container Apps Environment')
param name string

@description('Location for the resource')
param location string = resourceGroup().location

@description('Tags for the resource')
param tags object = {}

@description('Log Analytics Workspace Customer ID')
param logAnalyticsWorkspaceCustomerId string

@description('Log Analytics Workspace Primary Shared Key')
@secure()
param logAnalyticsWorkspacePrimaryKey string

resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsWorkspaceCustomerId
        sharedKey: logAnalyticsWorkspacePrimaryKey
      }
    }
    workloadProfiles: [
      {
        name: 'Consumption'
        workloadProfileType: 'Consumption'
      }
    ]
    zoneRedundant: false
  }
}

output id string = containerAppsEnvironment.id
output name string = containerAppsEnvironment.name
output defaultDomain string = containerAppsEnvironment.properties.defaultDomain
