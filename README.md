# Call Center QA Platform

React + Vite dashboard for uploading call recordings, running Azure Speech transcription, and evaluating calls with Azure OpenAI.

## Getting Started

```pwsh
# install dependencies
npm install

# start dev server
npm run dev

# build for production
npm run build
```

Visit the dev server URL printed in the terminal (typically http://localhost:5173 or :5174).

## Importing metadata

Use **Calls → Import CSV** and select `qa.xlsx` (sheet `audio related info`). The importer automatically normalizes the header row that is stored in the first line of the sheet.

### Audio files must be served over HTTP

Browsers cannot fetch `C:\...` or `file://` URLs. Place the MP3s under `public/audio` (already created) or run a static file server in the folder containing the audio files:

```pwsh
cd "C:\Users\amantara\OneDrive - Microsoft\Documents\projects\astratech\Audio and rules\Audio and rules"
npx serve -p 8080
```

Then set the **Audio Folder Path** in the import dialog to either `/audio` (if you copied the files into `public/audio`) or `http://localhost:8080` (if you started the local server). Imports that reference drive letters are rejected, preventing the transcription step from failing later.

## Azure configuration persistence

The Azure Services dialog stores settings in `localStorage` and also mirrors them to a Base64-encoded cookie (`ccp_azure_config`) so that a fresh browser profile can restore the saved values automatically.

## Transcription & evaluation

1. Configure Azure Speech + Azure OpenAI in **Azure Services**.
2. Import your calls (metadata + audio URL).
3. Select one or more calls and choose **Transcribe Selected**.
4. After transcription succeeds, open a call and run **Evaluate Call** to score it with Azure OpenAI.

## Project structure

- `src/components/` – dialogs, tables, charts, and views
- `src/lib/csv-parser.ts` – Excel normalization + record conversion
- `public/audio` – HTTP-served audio files

---

## 🚀 Azure Deployment

Deploy the application to Azure Container Apps with Azure OpenAI and Speech Services using Azure Developer CLI (azd).

### Prerequisites

1. **Azure Developer CLI (azd)**
   ```powershell
   winget install microsoft.azd
   ```

2. **Azure CLI**
   ```powershell
   winget install -e --id Microsoft.AzureCLI
   ```

3. **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop/)

4. **Azure Subscription** with permissions to create resources

### Quick Deploy (One Command)

```powershell
cd call-center-performance

# Initialize and deploy everything
azd up
```

This will prompt you for:
- **Environment name**: A unique name for your deployment (e.g., `callcenter-prod`)
- **Azure location**: Choose a region with Azure OpenAI support (`eastus2`, `westus`, `swedencentral`, `westeurope`)

### Step-by-Step Deployment

```powershell
# 1. Initialize azd environment
azd init

# 2. Set your preferred Azure region
azd env set AZURE_LOCATION "eastus2"

# 3. Preview what will be deployed
azd provision --preview

# 4. Deploy infrastructure and application
azd up
```

### What Gets Deployed

| Resource | Description |
|----------|-------------|
| **Container App** | Hosts the React frontend (serverless, scales 0-3) |
| **Container Registry** | Stores your container images |
| **Azure AI Foundry** | GPT-5-mini model deployment (with project) |
| **Speech Services** | STT/TTS capabilities |
| **Log Analytics** | Centralized logging |
| **Application Insights** | Performance monitoring |

### Post-Deployment Setup

After deployment, get your service keys and configure them in the app:

```powershell
# View deployed resources and URLs
azd show

# Get OpenAI API key
az cognitiveservices account keys list --name <openai-name> --resource-group <rg-name>

# Get Speech key
az cognitiveservices account keys list --name <speech-name> --resource-group <rg-name>
```

Then open your app URL and configure:
1. **Settings** → **Azure Services**
2. Enter the OpenAI endpoint, API key, and deployment name (`gpt-5-mini`)
3. Enter the Speech region and subscription key

### Useful Commands

```powershell
# Show environment info and URLs
azd show

# Redeploy after code changes
azd deploy

# View live logs
azd monitor --logs

# Tear down all resources
azd down --force --purge
```

### Troubleshooting

- **"Model not available"**: Try a different region (`swedencentral` has good availability)
- **Build fails**: Ensure Docker Desktop is running (`docker info`)
- **Container unhealthy**: Check logs with `az containerapp logs show --name <app> --resource-group <rg>`

For detailed deployment documentation, see [DEPLOYMENT.md](DEPLOYMENT.md).

---

## License

MIT. See [LICENSE](LICENSE).
