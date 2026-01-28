/**
 * Backend API Server for Azure Service Proxy
 * 
 * Uses Azure Managed Identity to authenticate with Azure OpenAI and Speech services.
 * Proxies requests from the frontend to Azure services securely.
 */

const express = require('express');
const cors = require('cors');
const { DefaultAzureCredential } = require('@azure/identity');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Azure configuration from environment variables
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5-mini';
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || 'swedencentral';
const AZURE_SPEECH_RESOURCE_ID = process.env.AZURE_SPEECH_RESOURCE_ID;
const AZURE_SPEECH_ENDPOINT = process.env.AZURE_SPEECH_ENDPOINT;

// Azure credential using managed identity
const credential = new DefaultAzureCredential();

// Token cache
let openAIToken = null;
let openAITokenExpiry = 0;
let speechToken = null;
let speechTokenExpiry = 0;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    config: {
      openAiEndpoint: AZURE_OPENAI_ENDPOINT ? 'configured' : 'missing',
      speechRegion: AZURE_SPEECH_REGION,
    }
  });
});

// Get configuration endpoint - returns Azure endpoints for the frontend
app.get('/api/config', (req, res) => {
  res.json({
    openAI: {
      endpoint: AZURE_OPENAI_ENDPOINT,
      deploymentName: AZURE_OPENAI_DEPLOYMENT,
      authType: 'managedIdentity',
    },
    speech: {
      region: AZURE_SPEECH_REGION,
      endpoint: AZURE_SPEECH_ENDPOINT,
      authType: 'managedIdentity',
    }
  });
});

/**
 * Get Azure OpenAI access token using managed identity
 */
async function getOpenAIToken() {
  const now = Date.now();
  if (openAIToken && openAITokenExpiry > now + 60000) {
    return openAIToken;
  }

  console.log('🔐 Acquiring Azure OpenAI token via managed identity...');
  const tokenResponse = await credential.getToken('https://cognitiveservices.azure.com/.default');
  openAIToken = tokenResponse.token;
  openAITokenExpiry = tokenResponse.expiresOnTimestamp;
  console.log('🔐 Azure OpenAI token acquired');
  return openAIToken;
}

/**
 * Get Azure Speech access token using managed identity
 */
async function getSpeechToken() {
  const now = Date.now();
  if (speechToken && speechTokenExpiry > now + 60000) {
    return speechToken;
  }

  console.log('🔐 Acquiring Azure Speech token via managed identity...');
  const tokenResponse = await credential.getToken('https://cognitiveservices.azure.com/.default');
  const rawToken = tokenResponse.token;
  if (!AZURE_SPEECH_RESOURCE_ID) {
    console.warn('⚠️ AZURE_SPEECH_RESOURCE_ID not set; using raw Speech token');
  }
  // For Speech REST APIs, use the raw AAD token in the Authorization header
  speechToken = rawToken;
  speechTokenExpiry = tokenResponse.expiresOnTimestamp;
  console.log('🔐 Azure Speech token acquired');
  return speechToken;
}

/**
 * Proxy endpoint for Azure OpenAI Responses API
 */
app.post('/api/openai/responses', async (req, res) => {
  try {
    if (!AZURE_OPENAI_ENDPOINT) {
      return res.status(500).json({ error: 'Azure OpenAI endpoint not configured' });
    }

    const token = await getOpenAIToken();
    const url = `${AZURE_OPENAI_ENDPOINT}/openai/v1/responses`;

    console.log(`📤 Proxying OpenAI request to: ${url}`);
    console.log(`📤 Using deployment: ${AZURE_OPENAI_DEPLOYMENT}`);

    // Override the model field with the backend-configured deployment
    const requestBody = {
      ...req.body,
      model: AZURE_OPENAI_DEPLOYMENT,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ OpenAI API error:', data);
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('❌ OpenAI proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Proxy endpoint for Azure OpenAI Chat Completions API (legacy)
 */
app.post('/api/openai/chat/completions', async (req, res) => {
  try {
    if (!AZURE_OPENAI_ENDPOINT) {
      return res.status(500).json({ error: 'Azure OpenAI endpoint not configured' });
    }

    const token = await getOpenAIToken();
    const deployment = req.body.model || AZURE_OPENAI_DEPLOYMENT;
    const apiVersion = '2024-12-01-preview';
    const url = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

    console.log(`📤 Proxying Chat Completions request to: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Chat Completions API error:', data);
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('❌ Chat Completions proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get Speech token for frontend SDK
 * Returns a token that the frontend can use with the Speech SDK
 */
app.get('/api/speech/token', async (req, res) => {
  try {
    const token = await getSpeechToken();
    res.json({
      token: token,
      region: AZURE_SPEECH_REGION,
      endpoint: AZURE_SPEECH_ENDPOINT,
      expiresIn: 600, // 10 minutes
    });
  } catch (error) {
    console.error('❌ Speech token error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Proxy endpoint for Speech-to-Text (STT)
 * Accepts audio and returns transcription
 */
app.post('/api/speech/stt', async (req, res) => {
  try {
    const token = await getSpeechToken();
    const language = req.query.language || 'en-US';
    const url = `https://${AZURE_SPEECH_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${language}`;

    console.log(`📤 Proxying STT request to: ${url}`);

    // Forward the audio data
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': req.headers['content-type'] || 'audio/wav',
        'Accept': 'application/json',
      },
      body: req.body,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ STT API error:', data);
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('❌ STT proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Proxy endpoint for Text-to-Speech (TTS)
 * Accepts text and returns audio
 */
app.post('/api/speech/tts', async (req, res) => {
  try {
    const token = await getSpeechToken();
    
    // TTS with managed identity ALWAYS uses regional endpoint (not custom subdomain)
    const url = `https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

    console.log(`📤 Proxying TTS request to: ${url}`);

    const { text, voice, outputFormat } = req.body;
    
    // Build SSML
    const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>
      <voice name='${voice || 'en-US-JennyNeural'}'>${text}</voice>
    </speak>`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': outputFormat || 'audio-16khz-128kbitrate-mono-mp3',
      },
      body: ssml,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ TTS API error:', errorText);
      return res.status(response.status).json({ error: errorText });
    }

    // Return audio as binary
    const audioBuffer = await response.arrayBuffer();
    res.set('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error('❌ TTS proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve static files from the React app build
app.use(express.static(path.join(__dirname, '../dist')));

// Handle React routing - serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend API server running on port ${PORT}`);
  console.log(`📋 Configuration:`);
  console.log(`   - OpenAI Endpoint: ${AZURE_OPENAI_ENDPOINT || 'NOT SET'}`);
  console.log(`   - OpenAI Deployment: ${AZURE_OPENAI_DEPLOYMENT}`);
  console.log(`   - Speech Region: ${AZURE_SPEECH_REGION}`);
  console.log(`   - Auth: Managed Identity`);
});
