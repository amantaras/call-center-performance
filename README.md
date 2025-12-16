<div align="center">

# 📞 Call Center QA Platform

### AI-Powered Call Quality Evaluation & Analytics

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**A modern, full-featured platform for automating call center quality assurance using Azure AI services.**

[Features](#-key-features) • [Quick Start](#-quick-start) • [Configuration](#%EF%B8%8F-configuration) • [Usage](#-usage-guide) • [Architecture](#-project-architecture)

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

---

## 🛠️ Technology Stack

| Category | Technologies |
|----------|--------------|
| **Frontend** | React 19, TypeScript 5.7, Vite 6.4 |
| **Styling** | Tailwind CSS 4.1, Radix UI Components |
| **State Management** | React Hooks, Local Storage |
| **Charts & Visualization** | Recharts, D3.js |
| **AI Services** | Azure Speech-to-Text, Azure OpenAI |
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
Uploaded → Transcribing → Transcribed → Evaluated
                              ↓
                           Failed (on error)
```

| Status | Badge Color | Description |
|--------|-------------|-------------|
| **Uploaded** | 🟦 Blue | Call data uploaded, ready for transcription |
| **Transcribing** | 🟨 Yellow | Audio being processed by Azure Speech |
| **Transcribed** | 🟩 Green | Transcript ready for evaluation |
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
