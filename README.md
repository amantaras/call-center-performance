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

## License

MIT. See [LICENSE](LICENSE).
