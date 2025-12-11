/**
 * TTSCaller - Text-to-Speech Service for Azure Speech Services
 * Generates synthetic audio from text using Azure Neural Voices
 */

export interface AzureTTSConfig {
  region: string;
  subscriptionKey: string;
  defaultMaleVoice1?: string;
  defaultMaleVoice2?: string;
  defaultFemaleVoice1?: string;
  defaultFemaleVoice2?: string;
  defaultNeutralVoice?: string;
  outputFormat?: TTSOutputFormat;
}

export type TTSOutputFormat = 
  | 'audio-16khz-128kbitrate-mono-mp3'
  | 'audio-24khz-160kbitrate-mono-mp3'
  | 'audio-48khz-192kbitrate-mono-mp3'
  | 'riff-16khz-16bit-mono-pcm'
  | 'riff-24khz-16bit-mono-pcm';

export interface VoiceInfo {
  name: string;
  displayName: string;
  localName: string;
  shortName: string;
  gender: 'Male' | 'Female';
  locale: string;
  localeName: string;
  voiceType: string;
  status: string;
  wordPerMinute?: string;
}

export interface SynthesisResult {
  audioBlob: Blob;
  durationMs: number;
}

// Default Azure Neural Voices (high quality English)
export const DEFAULT_VOICES = {
  male1: 'en-US-GuyNeural',
  male2: 'en-US-DavisNeural',
  female1: 'en-US-JennyNeural',
  female2: 'en-US-AriaNeural',
  neutral: 'en-US-SaraNeural',
};

// Popular voice options for configuration UI
export const VOICE_OPTIONS = {
  male: [
    { value: 'en-US-GuyNeural', label: 'Guy (US)' },
    { value: 'en-US-DavisNeural', label: 'Davis (US)' },
    { value: 'en-US-JasonNeural', label: 'Jason (US)' },
    { value: 'en-US-TonyNeural', label: 'Tony (US)' },
    { value: 'en-US-BrandonNeural', label: 'Brandon (US)' },
    { value: 'en-GB-RyanNeural', label: 'Ryan (UK)' },
    { value: 'en-AU-WilliamNeural', label: 'William (AU)' },
    { value: 'en-IN-PrabhatNeural', label: 'Prabhat (IN)' },
  ],
  female: [
    { value: 'en-US-JennyNeural', label: 'Jenny (US)' },
    { value: 'en-US-AriaNeural', label: 'Aria (US)' },
    { value: 'en-US-SaraNeural', label: 'Sara (US)' },
    { value: 'en-US-NancyNeural', label: 'Nancy (US)' },
    { value: 'en-US-MichelleNeural', label: 'Michelle (US)' },
    { value: 'en-GB-SoniaNeural', label: 'Sonia (UK)' },
    { value: 'en-AU-NatashaNeural', label: 'Natasha (AU)' },
    { value: 'en-IN-NeerjaNeural', label: 'Neerja (IN)' },
  ],
};

export class TTSCaller {
  private config: AzureTTSConfig;
  private voiceCache: VoiceInfo[] | null = null;

  constructor(config: AzureTTSConfig) {
    this.config = {
      ...config,
      defaultMaleVoice1: config.defaultMaleVoice1 || DEFAULT_VOICES.male1,
      defaultMaleVoice2: config.defaultMaleVoice2 || DEFAULT_VOICES.male2,
      defaultFemaleVoice1: config.defaultFemaleVoice1 || DEFAULT_VOICES.female1,
      defaultFemaleVoice2: config.defaultFemaleVoice2 || DEFAULT_VOICES.female2,
      defaultNeutralVoice: config.defaultNeutralVoice || DEFAULT_VOICES.neutral,
      outputFormat: config.outputFormat || 'audio-24khz-160kbitrate-mono-mp3',
    };
  }

  /**
   * Update TTS configuration
   */
  updateConfig(config: Partial<AzureTTSConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AzureTTSConfig {
    return { ...this.config };
  }

  /**
   * Get the TTS endpoint URL
   */
  private getTTSEndpoint(): string {
    return `https://${this.config.region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  }

  /**
   * Get the voices list endpoint URL
   */
  private getVoicesEndpoint(): string {
    return `https://${this.config.region}.tts.speech.microsoft.com/cognitiveservices/voices/list`;
  }

  /**
   * Build SSML (Speech Synthesis Markup Language) for text
   */
  private buildSSML(text: string, voiceName: string, rate: string = 'medium', pitch: string = 'medium'): string {
    // Escape XML special characters
    const escapedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>
      <voice name='${voiceName}'>
        <prosody rate='${rate}' pitch='${pitch}'>
          ${escapedText}
        </prosody>
      </voice>
    </speak>`;
  }

  /**
   * Build SSML for a break/silence
   */
  private buildSilenceSSML(durationMs: number, voiceName: string): string {
    return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>
      <voice name='${voiceName}'>
        <break time='${durationMs}ms'/>
      </voice>
    </speak>`;
  }

  /**
   * Synthesize text to speech
   */
  async synthesize(text: string, voiceName?: string): Promise<SynthesisResult> {
    const voice = voiceName || this.config.defaultNeutralVoice || DEFAULT_VOICES.neutral;
    const ssml = this.buildSSML(text, voice);

    const response = await fetch(this.getTTSEndpoint(), {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': this.config.outputFormat || 'audio-24khz-160kbitrate-mono-mp3',
        'User-Agent': 'CallCenterPerformance-TTS/1.0',
      },
      body: ssml,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TTS synthesis failed: ${response.status} - ${errorText}`);
    }

    const audioBlob = await response.blob();
    
    // Estimate duration based on text length (rough approximation: 150 words per minute)
    const wordCount = text.split(/\s+/).length;
    const estimatedDurationMs = (wordCount / 150) * 60 * 1000;

    return {
      audioBlob,
      durationMs: estimatedDurationMs,
    };
  }

  /**
   * Generate silence audio
   */
  async generateSilence(durationMs: number): Promise<Blob> {
    const voice = this.config.defaultNeutralVoice || DEFAULT_VOICES.neutral;
    const ssml = this.buildSilenceSSML(durationMs, voice);

    try {
      const response = await fetch(this.getTTSEndpoint(), {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': this.config.outputFormat || 'audio-24khz-160kbitrate-mono-mp3',
          'User-Agent': 'CallCenterPerformance-TTS/1.0',
        },
        body: ssml,
      });

      if (!response.ok) {
        // Return empty blob if silence generation fails
        return new Blob([], { type: 'audio/mpeg' });
      }

      return await response.blob();
    } catch {
      return new Blob([], { type: 'audio/mpeg' });
    }
  }

  /**
   * Get voice for a specific gender
   * @param gender - 'male' | 'female' | 'neutral'
   * @param isPrimary - true for first speaker, false for second speaker (uses alternate voice)
   */
  getVoiceForGender(gender: 'male' | 'female' | 'neutral', isPrimary: boolean = true): string {
    switch (gender) {
      case 'male':
        return isPrimary 
          ? (this.config.defaultMaleVoice1 || DEFAULT_VOICES.male1)
          : (this.config.defaultMaleVoice2 || DEFAULT_VOICES.male2);
      case 'female':
        return isPrimary 
          ? (this.config.defaultFemaleVoice1 || DEFAULT_VOICES.female1)
          : (this.config.defaultFemaleVoice2 || DEFAULT_VOICES.female2);
      default:
        return this.config.defaultNeutralVoice || DEFAULT_VOICES.neutral;
    }
  }

  /**
   * Get list of available voices from Azure
   */
  async getAvailableVoices(): Promise<VoiceInfo[]> {
    if (this.voiceCache) {
      return this.voiceCache;
    }

    const response = await fetch(this.getVoicesEndpoint(), {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.status}`);
    }

    const voices: VoiceInfo[] = await response.json();
    
    // Filter to Neural voices only and cache
    this.voiceCache = voices.filter(v => v.voiceType === 'Neural');
    return this.voiceCache;
  }

  /**
   * Generate a conversation audio from multiple phrases
   * Each phrase is synthesized with the appropriate voice and combined
   */
  async synthesizeConversation(
    phrases: Array<{ text: string; voice: string; pauseAfterMs?: number }>,
    onProgress?: (current: number, total: number) => void
  ): Promise<Blob> {
    const audioChunks: Blob[] = [];

    for (let i = 0; i < phrases.length; i++) {
      const phrase = phrases[i];
      
      if (onProgress) {
        onProgress(i + 1, phrases.length);
      }

      // Skip empty text
      if (!phrase.text || phrase.text.trim().length === 0) {
        continue;
      }

      try {
        const result = await this.synthesize(phrase.text, phrase.voice);
        audioChunks.push(result.audioBlob);

        // Add pause between phrases
        if (i < phrases.length - 1) {
          const pauseMs = phrase.pauseAfterMs ?? 400;
          if (pauseMs > 0) {
            const pause = await this.generateSilence(pauseMs);
            if (pause.size > 0) {
              audioChunks.push(pause);
            }
          }
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to synthesize phrase ${i + 1}:`, error);
        // Continue with remaining phrases
      }
    }

    // Combine all audio chunks
    return new Blob(audioChunks, { type: 'audio/mpeg' });
  }

  /**
   * Test the TTS connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.synthesize('Test connection successful.', this.config.defaultNeutralVoice);
      if (result.audioBlob.size > 0) {
        return { success: true, message: 'TTS connection successful' };
      }
      return { success: false, message: 'TTS returned empty audio' };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// Singleton instance management
let ttsCallerInstance: TTSCaller | null = null;

export function getTTSCaller(): TTSCaller | null {
  return ttsCallerInstance;
}

export function initializeTTSCaller(config: AzureTTSConfig): TTSCaller {
  ttsCallerInstance = new TTSCaller(config);
  return ttsCallerInstance;
}

export function updateTTSCaller(config: Partial<AzureTTSConfig>): void {
  if (ttsCallerInstance) {
    ttsCallerInstance.updateConfig(config);
  }
}
