<div align="center">

# 📞 Call Center QA Platform

### AI-Powered Call Quality Evaluation & Analytics

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**A modern, full-featured platform for automating call center quality assurance using Azure AI services.**

[Features](#-key-features) • [Industry Templates](#-industry-templates) • [Quick Start](#-quick-start) • [Configuration](#%EF%B8%8F-configuration) • [Usage](#-usage-guide) • [Synthetic Data](#-synthetic-data-generation-guide) • [Architecture](#-project-architecture)

</div>

---

## 🎯 Overview

The Call Center QA Platform is a comprehensive React-based dashboard that streamlines the quality assurance process for call centers. It leverages **Azure Speech Services** for accurate transcription and **Azure OpenAI** for intelligent evaluation against customizable quality criteria.

### What It Does

- 📤 **Upload & Import**: Import call metadata from Excel/CSV with drag-and-drop audio file upload
- 🎤 **Transcription**: Convert audio recordings to text using Azure Speech-to-Text with 150+ language support
- 🤖 **AI Evaluation**: Automatically score calls against customizable quality criteria using Azure OpenAI
- 📊 **Analytics**: Visualize performance trends, agent comparisons, and criteria insights
- 🎨 **Personalization**: Customize branding, themes, and schemas per use case

---

## ✨ Key Features

### Core Functionality

| Feature | Description |
|---------|-------------|
| **Multi-Language Transcription** | Support for 150+ languages with automatic language detection |
| **Customizable Evaluation Rules** | Create and modify evaluation criteria with flexible scoring |
| **Dynamic Schema System** | Define custom data schemas for different call types |
| **Real-time Analytics** | Interactive charts and dashboards for performance insights |
| **Agent Performance Tracking** | Individual agent scorecards and trend analysis |
| **Batch Operations** | Process multiple calls simultaneously |

### Advanced Features

- **🔧 Schema Discovery Wizard**: AI-assisted schema creation from sample data
- **📋 Evaluation Rules Generator**: Automatically generate evaluation rules based on business context
- **🎯 Topic Taxonomy**: Hierarchical topic classification for calls
- **💡 Custom Insight Categories**: Define business-specific AI insights
- **🎨 White-Label Support**: Custom logos, titles, and color themes
- **🔄 Data Migration**: Automatic schema versioning and migration

### 🏭 Industry Templates

Pre-built schema templates for common call center industries, each including fields, evaluation rules, topic taxonomies, and insight categories:

| Template | Icon | Description |
|----------|------|-------------|
| **Debt Collection** | 💰 | Complete template for debt collection operations including borrower tracking, payment arrangements, compliance requirements, and risk assessment |
| **Customer Support** | 🎧 | Comprehensive template for customer support operations including ticket management, issue resolution tracking, satisfaction measurement, and service quality evaluation |
| **Sales** | 📈 | Complete template for sales operations including lead tracking, deal management, competitor analysis, and sales performance evaluation |
| **Healthcare** | 🏥 | HIPAA-compliant template for healthcare operations including patient scheduling, insurance verification, medical inquiries, and compliance-focused evaluation rules |
| **Airline Customer Service** | ✈️ | Complete template for airline customer service operations including flight disruptions, rebooking, luggage claims, refunds, upgrades, and special assistance |
| **Telecom Retention** | 📱 | Complete template for telecom retention operations including churn prevention, win-back campaigns, retention offers, competitive analysis, and customer loyalty management |

Templates are defined in [`src/lib/schema-templates.ts`](./src/lib/schema-templates.ts) and can be customized or extended to match your specific business needs.

### 🎲 Synthetic Data Generation

Generate complete synthetic call center datasets for testing, training, and demonstration purposes:

| Feature | Description |
|---------|-------------|
| **Synthetic Metadata Generation** | AI-powered generation of realistic call records based on your schema definition |
| **Synthetic Transcription Generation** | Create realistic call transcriptions with speaker diarization and sentiment |
| **Synthetic Audio Generation** | Convert transcripts to natural-sounding audio using Azure Text-to-Speech |
| **Intelligent Voice Assignment** | Automatic gender detection and voice selection for realistic conversations |
| **Batch Processing** | Generate multiple synthetic calls in parallel for rapid dataset creation |

---

## 🛠️ Technology Stack

| Category | Technologies |
|----------|--------------|
| **Frontend** | React 19, TypeScript 5.7, Vite 6.4 |
| **Styling** | Tailwind CSS 4.1, Radix UI Components |
| **State Management** | React Hooks, Local Storage |
| **Charts & Visualization** | Recharts, D3.js |
| **AI Services** | Azure Speech-to-Text, Azure Text-to-Speech, Azure OpenAI |
| **Data Handling** | xlsx, date-fns, Zod validation |
| **UI Components** | shadcn/ui, Lucide Icons, Phosphor Icons |

---

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **Azure Subscription** with the following services:
  - Azure Speech Services (for transcription)
  - Azure OpenAI Service (for evaluation)

---

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/amantaras/call-center-performance.git
cd call-center-performance

# Install dependencies
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

Visit the dev server URL printed in the terminal (typically `http://localhost:5173`).

### 3. Configure Azure Services

1. Click **"Azure Services"** button in the top-right corner
2. Enter your Azure Speech and OpenAI credentials (see [Configuration](#%EF%B8%8F-configuration) below)
3. Click **"Save Configuration"**

### 4. Import Your First Call

1. Click **"Import CSV"** to import call metadata
2. Upload or link audio files
3. Click **"Transcribe"** to generate transcripts
4. Click **"Evaluate"** to run AI quality assessment

---

## ⚙️ Configuration

### Azure Services Configuration

Access the configuration dialog by clicking **"Azure Services"** in the application header.

#### Azure Speech Service

| Setting | Description | Example |
|---------|-------------|---------|
| **Region** | Your Azure Speech resource region | `eastus`, `westus2`, `westeurope` |
| **Subscription Key** | Speech service subscription key | `abc123...` |
| **API Version** | Speech-to-Text API version | `2025-10-15` (recommended) |
| **Languages** | Languages for auto-detection | Select from 150+ options |
| **Diarization** | Enable speaker separation | Toggle on/off |
| **Min/Max Speakers** | Expected speaker count range | 1-10 |

#### Azure OpenAI Service

| Setting | Description | Example |
|---------|-------------|---------|
| **Endpoint URL** | Your Azure OpenAI endpoint | `https://your-resource.openai.azure.com/` |
| **API Key** | OpenAI service API key | `xyz789...` |
| **Deployment Name** | Your GPT model deployment | `gpt-4`, `gpt-4o` |
| **API Version** | Azure OpenAI API version | `2024-12-01-preview` |
| **Reasoning Effort** | Token budget for reasoning | `minimal`, `low`, `medium`, `high` |

#### Text-to-Speech (Optional)

| Setting | Description |
|---------|-------------|
| **Enabled** | Toggle TTS functionality |
| **Default Voices** | Configure male/female voice options |
| **Output Format** | Audio quality: 16kHz, 24kHz, or 48kHz MP3 |

### Configuration Persistence

Settings are stored in two locations for reliability:
- **localStorage**: Primary storage (`azure-services-config` key)
- **Cookie backup**: Base64-encoded backup (`ccp_azure_config`) for session recovery

---

## 📖 Usage Guide

### Step 1: Schema Setup

Before importing calls, select or create a schema that matches your data structure.

1. **Select Schema**: Use the schema dropdown in the header
2. **Create New Schema**: 
   - Click "Manage Schemas"
   - Use the Schema Discovery Wizard for AI-assisted creation
   - Or manually define fields

### Step 2: Import Call Data

#### From CSV/Excel

1. Click **"Import CSV"** button
2. Choose your file or paste data directly
3. Map columns to schema fields
4. Set the audio folder path:
   - `/audio` if files are in `public/audio`
   - `http://localhost:8080` for external server

#### Direct Upload

1. Click **"Upload Calls"**
2. Drag and drop audio files
3. Enter metadata manually or use auto-detection

> **Note**: Audio files must be served over HTTP. Browsers cannot fetch local `file://` URLs.

### Step 3: Transcription

1. Select calls with **"Uploaded"** status
2. Click **"Transcribe Selected"** or use the 🎤 icon
3. Wait for Azure Speech processing (30 seconds to 5 minutes per file)
4. Status changes to **"Transcribed"** when complete

### Step 4: Evaluation

1. Select calls with **"Transcribed"** status
2. Click **"Evaluate Selected"** or use the 🧪 icon
3. AI evaluates against your configured criteria
4. Review scores and detailed feedback

### Step 5: Analytics

Navigate to the **Analytics** tab to view:
- Overall performance trends
- Criteria pass rates
- Score distributions
- Topic analysis

Navigate to the **Agents** tab for:
- Individual agent performance
- Comparative analysis
- Strengths and improvement areas

---

## 🎲 Synthetic Data Generation Guide

The platform includes powerful AI-powered synthetic data generation capabilities for testing, training, and demonstration purposes. This feature allows you to create complete synthetic call center datasets without real recordings.

### Overview

The synthetic data generation workflow consists of three stages that can be used independently or together:

```
1. Metadata Generation → 2. Transcription Generation → 3. Audio Generation
   (Schema-based)         (AI Conversations)           (Text-to-Speech)
```

### Stage 1: Synthetic Metadata Generation

Generate realistic call metadata records using Azure OpenAI.

#### How to Use

1. Click **"Synthetic Data"** button in the Calls view
2. Configure generation parameters:
   - **Number of Records**: How many synthetic records to generate (1-50)
   - **Date Range**: Specify a date range for realistic timestamp distribution
   - **Participant Limits**: Control how many unique agent/customer names to use
3. Add optional custom instructions to guide the AI
4. Click **"Next"** to proceed to transcription options

#### What Gets Generated

- All schema-defined fields with appropriate data types
- Realistic values based on business context
- Select fields use only valid options from your schema
- Dates are distributed within your specified range
- Participant names are reused to simulate realistic scenarios

#### Example Custom Instructions

```
- Include a mix of high-risk and low-risk scenarios
- Focus on billing-related call types
- Generate more variety in the outcome field
- Include some edge cases with unusual durations
```

### Stage 2: Synthetic Transcription Generation

Generate realistic call transcriptions from the metadata using AI.

#### How to Use

1. In the Synthetic Data wizard, enable **"Generate Synthetic Transcriptions"**
2. Optionally provide transcription instructions:
   - Conversation tone and style
   - Specific topics to include
   - Difficulty scenarios
3. The AI generates structured conversations based on:
   - Call metadata (type, outcome, participants)
   - Schema business context
   - Your custom instructions

#### What Gets Generated

| Component | Description |
|-----------|-------------|
| **Full Transcript** | Complete conversation text with speaker labels |
| **Phrase Segments** | Individual dialogue turns with timing information |
| **Speaker Diarization** | Properly labeled speaker 1 (agent) and speaker 2 (customer) |
| **Timing Data** | Simulated timestamps for each phrase |
| **Sentiment Analysis** | Per-phrase sentiment labels (positive/negative/neutral) |
| **Overall Sentiment** | Aggregated call sentiment score |

#### Example Transcription Instructions

```
- Make conversations professional and formal
- Include some difficult customer scenarios
- Add natural speech patterns and acknowledgments
- Include specific product objections
- Vary conversation lengths between 2-8 minutes
```

### Stage 3: Synthetic Audio Generation (Text-to-Speech)

Convert transcriptions to natural-sounding audio using Azure Speech Services.

#### How to Use

##### Single Call
1. Open a call with a transcription (real or synthetic)
2. Click the **"Generate Audio"** button (speaker icon 🔊)
3. Wait for audio generation to complete

##### Batch Processing
1. Select multiple transcribed calls in the Calls view
2. Click **"Generate Audio"** in the batch actions toolbar
3. Monitor progress as audio is generated in parallel

#### How It Works

1. **Gender Detection**: The AI analyzes participant names to determine gender
2. **Voice Assignment**: Appropriate Azure Neural Voices are assigned:
   - Different voices for agent vs. customer
   - If same gender, uses primary/secondary voice variants for distinction
3. **Speech Synthesis**: Each transcript phrase is converted to audio
4. **Audio Assembly**: Phrases are combined with natural pauses between speakers

#### Voice Configuration

Configure default voices in **"Azure Services"** → **Text-to-Speech** tab:

| Setting | Description |
|---------|-------------|
| **Male Voice 1** | Primary voice for male speakers (e.g., en-US-GuyNeural) |
| **Male Voice 2** | Secondary voice when both speakers are male |
| **Female Voice 1** | Primary voice for female speakers (e.g., en-US-JennyNeural) |
| **Female Voice 2** | Secondary voice when both speakers are female |
| **Output Format** | Audio quality: 16kHz, 24kHz, or 48kHz MP3 |

#### Available Voice Options

The platform supports multiple Azure Neural Voice options:

**Male Voices**: Guy (US), Davis (US), Jason (US), Tony (US), Brandon (US), Ryan (UK), William (AU), Prabhat (IN)

**Female Voices**: Jenny (US), Aria (US), Sara (US), Nancy (US), Michelle (US), Sonia (UK), Natasha (AU), Neerja (IN)

### Complete Workflow Example

Create a full synthetic dataset with audio:

```
1. Select your schema in the header dropdown
2. Click "Synthetic Data" button
3. Configure: 10 records, last 30 days date range
4. Enable "Generate Synthetic Transcriptions"
5. Click "Generate" and wait for completion
6. Review and select records to add
7. Click "Add Records" to import them
8. Select the new records in the Calls view
9. Click "Generate Audio" to create audio files
10. Records are now ready for evaluation testing!
```

### Performance Tips

- **Parallel Batches**: Configure in Azure Services settings (default: 3 parallel batches)
- **Records Per Batch**: Configure batch size for metadata generation (default: 5)
- **Audio Generation**: Processes up to 5 calls in parallel to avoid rate limits
- **Large Datasets**: Generate in multiple smaller batches for reliability

---

## 📁 Project Architecture

```
call-center-performance/
├── public/
│   └── audio/              # HTTP-served audio files
├── src/
│   ├── components/         # React components
│   │   ├── ui/             # Reusable UI components (shadcn/ui)
│   │   ├── views/          # Main view components
│   │   ├── analytics/      # Analytics-specific components
│   │   └── call-player/    # Audio player components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions
│   │   ├── analytics.ts    # Analytics calculations
│   │   ├── csv-parser.ts   # Excel/CSV processing
│   │   ├── evaluation-criteria.ts  # Default evaluation rules
│   │   ├── personalization.ts      # Theme customization
│   │   └── speech-languages.ts     # Language definitions
│   ├── prompts/            # AI prompt templates
│   ├── services/           # Business logic services
│   │   ├── azure-openai.ts # OpenAI integration
│   │   ├── transcription.ts# Speech-to-Text integration
│   │   ├── synthetic-audio.ts # Text-to-Speech audio generation
│   │   ├── schema-manager.ts# Schema management
│   │   └── rules-generator.ts# Evaluation rules engine
│   ├── styles/             # CSS styles
│   └── types/              # TypeScript type definitions
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

### Key Components

| Component | Purpose |
|-----------|---------|
| `CallsView` | Main calls table with actions |
| `CallDetailDialog` | Individual call details and transcript |
| `ConfigDialog` | Azure services configuration |
| `RulesEditorDialog` | Evaluation rules management |
| `SchemaDiscoveryWizard` | AI-assisted schema creation |
| `SyntheticMetadataWizard` | Synthetic data generation wizard |
| `AnalyticsView` | Performance dashboards |
| `AgentsView` | Agent performance tracking |

---

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## 📊 Status Flow

Calls progress through the following statuses:

```
Real Calls:        Uploaded → Transcribing → Transcribed → Evaluated
                                                  ↓
                                           Failed (on error)

Synthetic Calls:   Synthetic Generation → Transcribed → Evaluated
                         ↓                     ↓
                   Pending Audio          Generate Audio
                         ↓                     ↓
                   (needs real audio)    Transcribed (with audio)
```

| Status | Badge Color | Description |
|--------|-------------|-------------|
| **Uploaded** | 🟦 Blue | Call data uploaded, ready for transcription |
| **Pending Audio** | 🟪 Purple | Metadata generated without transcription, awaiting audio upload or generation |
| **Transcribing** | 🟨 Yellow | Audio being processed by Azure Speech |
| **Transcribed** | 🟩 Green | Transcript ready for evaluation (can optionally generate synthetic audio) |
| **Evaluated** | 🟢 Dark Green | Complete with scores |
| **Failed** | 🔴 Red | Error occurred (check details) |

---

## 🔒 Security

- API credentials are stored in browser localStorage (never sent to external servers except Azure)
- Audio files are fetched directly from configured sources
- All processing happens client-side or via Azure services
- See [SECURITY.md](./SECURITY.md) for vulnerability reporting

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 📚 Additional Resources

- [Transcription Guide](./TRANSCRIPTION-GUIDE.md) - Detailed transcription workflow
- [Language Selector Feature](./LANGUAGE_SELECTOR_FEATURE.md) - Multi-language support documentation
- [Schema Audio Folders](./SCHEMA_AUDIO_FOLDERS.md) - Schema-specific audio organization
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md) - Dynamic evaluation rules

---

<div align="center">

**Built with ❤️ using React, TypeScript, and Azure AI**

</div>
