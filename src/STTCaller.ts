import { AzureSpeechConfig, TranscriptPhrase, TranscriptionResult, WordTiming } from './types/call';
import { azureTokenService } from './services/azure-token';

export interface STTCallOptions {
  /** Locale for speech recognition (e.g., 'en-US', 'ar-SA', etc.). Use 'auto' for automatic language detection. */
  locale?: string;
  /** Candidate languages for automatic detection (used when locale is 'auto'). Up to 10 languages. */
  candidateLocales?: string[];
  /** Optional publicly reachable URL for the audio. Required for batch REST jobs. */
  contentUrl?: string;
  /** Enable word-level timestamps */
  wordLevelTimestampsEnabled?: boolean;
  /** Enable speaker diarization (who spoke when) */
  diarizationEnabled?: boolean;
  /** Minimum number of speakers for diarization */
  minSpeakers?: number;
  /** Maximum number of speakers for diarization */
  maxSpeakers?: number;
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Delay between retries in milliseconds (default: 1000) */
  retryDelay?: number;
  /** Polling interval for checking transcription status in milliseconds (default: 2000) */
  pollingInterval?: number;
  /** Maximum time to wait for transcription completion in milliseconds (default: 300000 = 5 minutes) */
  maxWaitTime?: number;
  /** Time to keep the transcription before automatic deletion (hours, default 48) */
  timeToLiveHours?: number;
}

interface TranscriptionJob {
  self: string;
  displayName: string;
  locale: string;
  createdDateTime: string;
  lastActionDateTime: string;
  status: 'NotStarted' | 'Running' | 'Succeeded' | 'Failed';
  links: {
    files: string;
  };
  properties?: {
    durationMilliseconds?: number;
    error?: {
      code: string;
      message: string;
    };
  };
}

interface TranscriptionFile {
  name: string;
  kind: 'Transcription' | 'TranscriptionReport';
  links: {
    contentUrl: string;
  };
}

interface TranscriptionContent {
  source: string;
  timestamp: string;
  durationInTicks: number;
  duration: string;
  combinedRecognizedPhrases: Array<{
    channel: number;
    lexical: string;
    itn: string;
    maskedITN: string;
    display: string;
  }>;
  recognizedPhrases: Array<{
    recognitionStatus: string;
    channel: number;
    speaker?: number;
    offset: string;
    duration: string;
    offsetInTicks: number;
    durationInTicks: number;
    nBest: Array<{
      confidence: number;
      lexical: string;
      itn: string;
      maskedITN: string;
      display: string;
      words?: Array<{
        word: string;
        offset: number;
        duration: number;
        confidence?: number;
      }>;
    }>;
  }>;
}

/**
 * Azure Speech-to-Text caller with retry logic and batch transcription support.
 * 
 * This class provides a reliable interface for calling Azure Speech-to-Text REST API v3.2
 * with automatic retries, job polling, and detailed transcription results.
 * 
 * API Documentation: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-speech-to-text
 * Latest API Version: 2025-10-15 (latest GA)
 */
export class STTCaller {
  private readonly DEFAULT_MAX_RETRIES = 3;
  private readonly DEFAULT_RETRY_DELAY = 2000; // Start with 2s for exponential backoff (2s, 4s, 8s)
  private readonly DEFAULT_POLLING_INTERVAL = 2000;
  private readonly DEFAULT_MAX_WAIT_TIME = 300000; // 5 minutes
  private readonly DEFAULT_LOCALE = 'en-US';
  private cachedAccessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(private config: AzureSpeechConfig) {
    if (!this.config.apiVersion) {
      this.config.apiVersion = '2025-10-15'; // Latest GA version (October 2025)
    }
  }

  /**
   * Update the Azure Speech configuration
   */
  updateConfig(config: Partial<AzureSpeechConfig>): void {
    this.config = { ...this.config, ...config };
    if (!this.config.apiVersion) {
      this.config.apiVersion = '2025-10-15';
    }
    // Clear cached token when config changes
    if (config.authType !== undefined || config.tenantId !== undefined || config.accessToken !== undefined) {
      this.cachedAccessToken = null;
      this.tokenExpiresAt = 0;
    }
  }

  /**
   * Get the base URL for Azure Speech API
   */
  private getBaseUrl(): string {
    return `https://${this.config.region}.api.cognitive.microsoft.com/speechtotext`;
  }

  /**
   * Get access token for Entra ID or Managed Identity authentication
   */
  private async getAccessToken(): Promise<string> {
    // If a pre-fetched token is provided in config, use it
    if (this.config.accessToken) {
      return this.config.accessToken;
    }

    // Check if cached token is still valid (with 1 min buffer)
    if (this.cachedAccessToken && this.tokenExpiresAt > Date.now() + 60000) {
      return this.cachedAccessToken;
    }

    // For managed identity, fetch token from backend proxy
    if (this.config.authType === 'managedIdentity') {
      console.log('🔐 Acquiring Speech token via managed identity backend...');
      const response = await fetch('/api/speech/token');
      if (!response.ok) {
        throw new Error(`Failed to get speech token from backend: ${response.statusText}`);
      }
      const data = await response.json();
      this.cachedAccessToken = data.token;
      this.tokenExpiresAt = Date.now() + (data.expiresIn * 1000);
      return data.token;
    }

    // Fetch new token using Azure Token Service (user Entra ID login)
    console.log('🔐 Acquiring Entra ID token for Speech service...');
    const token = await azureTokenService.getSpeechToken(this.config.tenantId);
    
    // Cache the token (assume 1 hour validity, actual expiry is handled by token service)
    this.cachedAccessToken = token;
    this.tokenExpiresAt = Date.now() + 3600000; // 1 hour
    
    return token;
  }

  /**
   * Get common headers for API requests (supports API Key, Entra ID, and Managed Identity auth)
   */
  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.authType === 'entraId' || this.config.authType === 'managedIdentity') {
      const token = await this.getAccessToken();
      headers['Authorization'] = `Bearer ${token}`;
      console.log(`🔐 Using ${this.config.authType} authentication for Speech API`);
    } else {
      // Default to API Key authentication
      headers['Ocp-Apim-Subscription-Key'] = this.config.subscriptionKey;
    }

    return headers;
  }

  /**
   * Get headers for inline transcription (FormData requests)
   */
  private async getInlineHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};

    if (this.config.authType === 'entraId' || this.config.authType === 'managedIdentity') {
      const token = await this.getAccessToken();
      headers['Authorization'] = `Bearer ${token}`;
      console.log(`🔐 Using ${this.config.authType} authentication for Speech API`);
    } else {
      headers['Ocp-Apim-Subscription-Key'] = this.config.subscriptionKey;
    }

    return headers;
  }

  /**
   * Transcribe an audio source using Azure Speech-to-Text batch transcription
   * 
   * @param audioSource - The audio source (File, Blob, or HTTPS URL) to transcribe
   * @param options - Transcription options
   * @returns Transcription result with text, confidence, and word timings
   */
  async transcribeAudioFile(
    audioSource: File | Blob | string,
    options: STTCallOptions = {}
  ): Promise<TranscriptionResult> {
    const normalizedOptions: STTCallOptions = {
      ...options,
      diarizationEnabled: options.diarizationEnabled ?? false, // DEFAULT: false (testing 429 fix)
      wordLevelTimestampsEnabled: options.wordLevelTimestampsEnabled ?? true,
    };

    const maxRetries = normalizedOptions.maxRetries ?? this.DEFAULT_MAX_RETRIES;
    const baseRetryDelay = normalizedOptions.retryDelay ?? this.DEFAULT_RETRY_DELAY;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🎤 STT transcription attempt ${attempt}/${maxRetries}...`);
        // Always use inline (fast) API for File/Blob objects
        const result = await this.executeInlineTranscription(audioSource as File | Blob, normalizedOptions);
        
        if (attempt > 1) {
          console.log(`✓ Transcription succeeded on attempt ${attempt}`);
        }
        
        return result;
      } catch (error: any) {
        lastError = new Error(error?.message || String(error));
        console.warn(`⚠ Transcription attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);
        
        // Don't retry auth errors - they won't succeed without user action
        const isAuthError = lastError.message.includes('interaction_in_progress') ||
                           lastError.message.includes('Login is already in progress') ||
                           lastError.message.includes('Failed to acquire Azure AD token');
        
        if (isAuthError) {
          console.error('❌ Authentication error - not retrying (requires user action)');
          throw lastError;
        }
        
        if (attempt < maxRetries) {
          // Exponential backoff: 2s, 4s, 8s, 16s... (recommended by Azure for 429 errors)
          const retryDelay = baseRetryDelay * Math.pow(2, attempt - 1);
          console.log(`↻ Retrying in ${retryDelay}ms... (exponential backoff for rate limit throttling)`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    throw new Error(`Transcription failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Execute a single transcription (internal method)
   */
  private async executeBatchTranscription(
    audioSource: File | Blob | string,
    options: STTCallOptions
  ): Promise<TranscriptionResult> {
    console.log(`🎤 Starting Azure Speech-to-Text transcription...`);
    console.log(`   Region: ${this.config.region}`);
    console.log(`   API Version: ${this.config.apiVersion}`);
    console.log(`   Locale: ${options.locale || this.DEFAULT_LOCALE}`);

    const transcriptionJob = await this.createTranscriptionJob(audioSource, options);
    console.log(`✓ Transcription job created: ${transcriptionJob.self}`);

    // Step 3: Poll for completion
    const completedJob = await this.pollTranscriptionStatus(transcriptionJob.self, options);
    console.log(`✓ Transcription completed with status: ${completedJob.status}`);

    if (completedJob.status === 'Failed') {
      const errorMsg = completedJob.properties?.error?.message || 'Unknown error';
      throw new Error(`Transcription failed: ${errorMsg}`);
    }

    // Step 4: Get transcription files
    const files = await this.getTranscriptionFiles(completedJob.links.files);
    console.log(`✓ Found ${files.length} transcription files`);

    // Step 5: Download and parse transcription content
    const transcriptionFile = files.find(f => f.kind === 'Transcription');
    if (!transcriptionFile) {
      throw new Error('No transcription file found in results');
    }

    const content = await this.downloadTranscriptionContent(transcriptionFile.links.contentUrl);
    console.log(`✓ Downloaded transcription content`);

    // Step 6: Parse and return result
    const result = this.parseTranscriptionContent(content, completedJob);
    
    // Step 7: Cleanup - delete transcription job
    await this.deleteTranscriptionJob(transcriptionJob.self);
    console.log(`✓ Cleaned up transcription job`);

    return result;
  }

  private async executeInlineTranscription(
    audioSource: File | Blob,
    options: STTCallOptions
  ): Promise<TranscriptionResult> {
    // Use configured API version (should be 2025-10-15 for latest features)
    const apiVersion = this.config.apiVersion || '2025-10-15';
    const transcribeUrl = `${this.getBaseUrl()}/transcriptions:transcribe?api-version=${apiVersion}`;
    
    console.log('� === AZURE SPEECH API CONFIGURATION ===');
    console.log(`📡 API Version: ${apiVersion}`);
    console.log(`🌍 Region: ${this.config.region}`);
    console.log(`🔗 Full URL: ${transcribeUrl}`);
    console.log(`� Auth Type: ${this.config.authType || 'apiKey'}`);
    if (this.config.authType !== 'entraId' && this.config.subscriptionKey) {
      console.log(`🔑 Subscription Key: ${this.config.subscriptionKey.substring(0, 8)}...${this.config.subscriptionKey.substring(this.config.subscriptionKey.length - 4)}`);
    }
    console.log('========================================');

    const file = audioSource instanceof File
      ? audioSource
      : new File([audioSource], 'audio.wav', { type: (audioSource as Blob).type || 'audio/wav' });

    const definition: any = {
      profanityFilterMode: 'Masked',
      punctuationMode: 'DictatedAndAutomatic',
    };

    // Handle language detection
    // When multiple locales are provided, Azure will detect which one is spoken
    // When a single locale is provided, Azure will use that specific language model
    if (!options.locale || (Array.isArray(options.candidateLocales) && options.candidateLocales.length > 1)) {
      // Multi-language detection: provide candidate locales
      // IMPORTANT: candidateLocales MUST be provided by the caller (from config)
      // If not provided, this is an error - we should not have hardcoded defaults here
      if (!options.candidateLocales || options.candidateLocales.length === 0) {
        throw new Error('candidateLocales must be provided for language detection. Configure languages in Azure Services settings.');
      }
      
      const candidateLocales = options.candidateLocales;
      definition.locales = candidateLocales.slice(0, 10); // Azure supports max 10 languages
      
      console.log(`🌍 Using language detection with ${definition.locales.length} candidate languages:`, definition.locales);
    } else {
      // Single specific locale
      definition.locales = [options.locale];
      console.log(`🌍 Using specific locale: ${options.locale}`);
    }

    const diarizationEnabled = options.diarizationEnabled ?? false;
    
    console.log(`🎙️ Diarization options received:`, {
      diarizationEnabled: options.diarizationEnabled,
      minSpeakers: options.minSpeakers,
      maxSpeakers: options.maxSpeakers,
      computed: diarizationEnabled
    });

    if (options.wordLevelTimestampsEnabled ?? true) {
      definition.wordLevelTimestampsEnabled = true;
    }

    if (diarizationEnabled) {
      const minSpeakers = Math.max(options.minSpeakers ?? 1, 1);
      const maxSpeakers = Math.min(Math.max(options.maxSpeakers ?? 2, 2), 35);
      definition.diarization = {
        enabled: true,
        minSpeakers,
        maxSpeakers,
      };
      console.log(`✅ Diarization enabled in definition:`, definition.diarization);
    } else {
      console.log(`❌ Diarization DISABLED (diarizationEnabled=${diarizationEnabled})`);
    }

    console.log('📤 Submitting fast transcription request...');
    console.log('📋 Definition:', JSON.stringify(definition, null, 2));
    
    const formData = new FormData();
    formData.append('audio', file, file.name || 'audio.wav');
    formData.append('definition', JSON.stringify(definition));

    // Get headers based on auth type (API Key or Entra ID)
    const headers = await this.getInlineHeaders();

    const response = await fetch(transcribeUrl, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Enhanced 429 error diagnostics
      if (response.status === 429) {
        console.error('❌ === 429 ERROR DIAGNOSTICS ===');
        console.error('📋 This error usually means:');
        console.error('   1. You are using FREE (F0) tier which may not support Fast Transcription');
        console.error('   2. You exceeded 600 requests/minute limit');
        console.error('   3. Regional capacity issues');
        console.error('');
        console.error('🔧 IMMEDIATE ACTIONS:');
        console.error('   1. Check your Azure Portal → Speech Resource → Pricing Tier');
        console.error('   2. If it says "F0 (Free)", upgrade to "Standard S0"');
        console.error('   3. Verify region matches between app config and Azure Portal');
        console.error('   4. See 429-ERROR-DIAGNOSIS.md for detailed steps');
        console.error('================================');
      }
      
      throw new Error(`Fast transcription failed (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    console.log('✓ Fast transcription complete');
    console.log('🔍 API Response sample:', {
      phraseCount: result.phrases?.length,
      firstPhrase: result.phrases?.[0],
      hasLocale: !!result.phrases?.[0]?.locale
    });

    const transcript = (result.combinedPhrases || [])
      .map((phrase: any) => phrase.text)
      .filter(Boolean)
      .join(' ')
      .trim();

    const phrases: TranscriptPhrase[] = [];
    const aggregatedWords: WordTiming[] = [];
    const speakers = new Set<number>();
    let confidenceTotal = 0;
    let confidenceCount = 0;

    for (const phrase of result.phrases || []) {
      if (typeof phrase.confidence === 'number') {
        confidenceTotal += phrase.confidence;
        confidenceCount += 1;
      }

      const phraseWords: WordTiming[] = [];
      for (const word of phrase.words || []) {
        const wordTiming: WordTiming = {
          word: word.text,
          offsetMilliseconds: word.offsetMilliseconds ?? 0,
          durationMilliseconds: word.durationMilliseconds ?? 0,
          confidence: word.confidence,
        };
        phraseWords.push(wordTiming);
        aggregatedWords.push(wordTiming);
      }

      const speaker = typeof phrase.speaker === 'number' ? phrase.speaker : undefined;
      if (speaker !== undefined) {
        speakers.add(speaker);
        console.log(`🎙️ Speaker ${speaker} detected for phrase`);
      } else {
        console.log(`⚠️ No speaker info in phrase (diarization may be disabled or failed)`);
      }

      const capturedLocale = phrase.locale;
      if (capturedLocale) {
        console.log(`🌍 Detected language: ${capturedLocale} for text: "${phrase.text?.substring(0, 30)}..."`);
      }

      phrases.push({
        text: phrase.text ?? phrase.lexical ?? '',
        lexical: phrase.lexical,
        speaker,
        channel: phrase.channel,
        offsetMilliseconds: phrase.offsetMilliseconds ?? 0,
        durationMilliseconds: phrase.durationMilliseconds ?? 0,
        confidence: phrase.confidence,
        words: phraseWords.length ? phraseWords : undefined,
        locale: capturedLocale,
      });
    }

    const averageConfidence = confidenceCount > 0 ? confidenceTotal / confidenceCount : 0;
    const speakerCount = speakers.size > 0 ? speakers.size : undefined;

    return {
      transcript,
      confidence: Math.round(averageConfidence * 100) / 100,
      words: aggregatedWords.length > 0 ? aggregatedWords : undefined,
      phrases: phrases.length > 0 ? phrases : undefined,
      locale: (result.phrases && result.phrases[0]?.locale) || options.locale || this.DEFAULT_LOCALE,
      durationMilliseconds: result.durationMilliseconds,
      speakerCount,
    };
  }

  /**
   * Create a transcription job
   */
  private async createTranscriptionJob(
    audioSource: File | Blob | string,
    options: STTCallOptions
  ): Promise<TranscriptionJob> {
    const apiVersion = this.config.apiVersion ?? '2025-10-15';
    const submitUrl = `${this.getBaseUrl()}/transcriptions:submit?api-version=${apiVersion}`;

    const contentUrl = typeof audioSource === 'string' ? audioSource : options.contentUrl;
    if (!contentUrl) {
      throw new Error(
        'Azure Speech batch transcription requires a publicly accessible audio URL. Provide options.contentUrl or pass a URL string when calling transcribeAudioFile.'
      );
    }

    const ttl = Math.min(Math.max(options.timeToLiveHours ?? 48, 6), 744); // 6 hours – 31 days
    const payload: any = {
      displayName: `Call Transcription ${new Date().toISOString()}`,
      locale: options.locale || this.DEFAULT_LOCALE,
      contentUrls: [contentUrl],
      properties: {
        wordLevelTimestampsEnabled: options.wordLevelTimestampsEnabled ?? true,
        punctuationMode: 'DictatedAndAutomatic',
        profanityFilterMode: 'Masked',
        timeToLiveHours: ttl,
      },
    };

    if (options.diarizationEnabled) {
      const maxSpeakers = Math.min(Math.max(options.maxSpeakers ?? 2, 2), 35);
      payload.properties.diarization = {
        enabled: true,
        maxSpeakers,
      };
    }

    console.log(`📤 Creating transcription job...`);

    const headers = await this.getHeaders();
    const response = await fetch(submitUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create transcription job (${response.status}): ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Poll transcription status until completion
   */
  private async pollTranscriptionStatus(
    transcriptionUrl: string,
    options: STTCallOptions
  ): Promise<TranscriptionJob> {
    const pollingInterval = options.pollingInterval ?? this.DEFAULT_POLLING_INTERVAL;
    const maxWaitTime = options.maxWaitTime ?? this.DEFAULT_MAX_WAIT_TIME;
    const startTime = Date.now();

    console.log(`⏳ Polling transcription status (max wait: ${maxWaitTime}ms)...`);

    while (true) {
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error(`Transcription timed out after ${maxWaitTime}ms`);
      }

      const headers = await this.getHeaders();
      const response = await fetch(transcriptionUrl, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get transcription status (${response.status}): ${errorText}`);
      }

      const job: TranscriptionJob = await response.json();
      console.log(`   Status: ${job.status}`);

      if (job.status === 'Succeeded' || job.status === 'Failed') {
        return job;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollingInterval));
    }
  }

  /**
   * Get transcription files
   */
  private async getTranscriptionFiles(filesUrl: string): Promise<TranscriptionFile[]> {
    const headers = await this.getHeaders();
    const response = await fetch(filesUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get transcription files (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.values || [];
  }

  /**
   * Download transcription content
   */
  private async downloadTranscriptionContent(contentUrl: string): Promise<TranscriptionContent> {
    // Content URL is a SAS URL, no need for subscription key header
    const response = await fetch(contentUrl, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to download transcription content (${response.status}): ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Delete transcription job (cleanup)
   */
  private async deleteTranscriptionJob(transcriptionUrl: string): Promise<void> {
    try {
      const headers = await this.getHeaders();
      await fetch(transcriptionUrl, {
        method: 'DELETE',
        headers,
      });
    } catch (error) {
      // Ignore deletion errors - not critical
      console.warn('Failed to delete transcription job:', error);
    }
  }

  /**
   * Parse transcription content into result
   */
  private parseTranscriptionContent(
    content: TranscriptionContent,
    job: TranscriptionJob
  ): TranscriptionResult {
    // Get the best transcription from combined phrases (all channels merged)
    const combinedPhrase = content.combinedRecognizedPhrases?.[0];
    if (!combinedPhrase) {
      throw new Error('No recognized phrases in transcription');
    }

    const transcript = combinedPhrase.display || combinedPhrase.lexical;
    
    // Calculate average confidence from recognized phrases
    let totalConfidence = 0;
    let phraseCount = 0;
    const allWords: WordTiming[] = [];
    const transcriptPhrases: TranscriptPhrase[] = [];
    const speakers = new Set<number>();

    for (const phrase of content.recognizedPhrases || []) {
      if (phrase.nBest && phrase.nBest.length > 0) {
        const best = phrase.nBest[0];
        totalConfidence += best.confidence;
        phraseCount++;

        const phraseWords: WordTiming[] = [];

        // Collect word timings
        if (best.words) {
          for (const word of best.words) {
            const timing: WordTiming = {
              word: word.word,
              offsetMilliseconds: Math.round(word.offset / 10000),
              durationMilliseconds: Math.round(word.duration / 10000),
              confidence: word.confidence,
            };
            phraseWords.push(timing);
            allWords.push(timing);
          }
        }

        const offsetMilliseconds = Math.round((phrase.offsetInTicks ?? 0) / 10000);
        const durationMilliseconds = Math.round((phrase.durationInTicks ?? 0) / 10000);
        const speaker = typeof phrase.speaker === 'number' ? phrase.speaker : undefined;
        if (speaker !== undefined) {
          speakers.add(speaker);
        }

        transcriptPhrases.push({
          text: best.display || best.lexical,
          lexical: best.lexical,
          speaker,
          channel: phrase.channel,
          offsetMilliseconds,
          durationMilliseconds,
          confidence: best.confidence,
          words: phraseWords.length ? phraseWords : undefined,
        });
      }
    }

    const averageConfidence = phraseCount > 0 ? totalConfidence / phraseCount : 0;
    const speakerCount = speakers.size > 0 ? speakers.size : undefined;

    return {
      transcript,
      confidence: Math.round(averageConfidence * 100) / 100,
      words: allWords.length > 0 ? allWords : undefined,
      phrases: transcriptPhrases.length > 0 ? transcriptPhrases : undefined,
      locale: job.locale || this.DEFAULT_LOCALE,
      durationMilliseconds: job.properties?.durationMilliseconds,
      speakerCount,
    };
  }

  /**
   * Validate configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.region) {
      errors.push('Azure Speech region is required');
    }

    // For Entra ID auth, subscription key is not required
    if (this.config.authType !== 'entraId' && !this.config.subscriptionKey) {
      errors.push('Azure Speech subscription key is required (or use Entra ID authentication)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
