import { STTCaller, STTCallOptions } from '../STTCaller';
import { CallRecord, AzureSpeechConfig, CallSentimentSegment } from '../types/call';
import { azureOpenAIService } from './azure-openai';
import { DEFAULT_CALL_CENTER_LANGUAGES } from '@/lib/speech-languages';

/**
 * Service for managing call transcription using Azure Speech-to-Text
 */
class TranscriptionService {
  private sttCaller: STTCaller | null = null;
  private config: AzureSpeechConfig | null = null;

  /**
   * Initialize the transcription service with Azure Speech configuration
   */
  initialize(config: AzureSpeechConfig): void {
    this.config = config;
    this.sttCaller = new STTCaller(config);
    console.log('🎤 Transcription service initialized');
  }

  /**
   * Update the Azure Speech configuration
   */
  updateConfig(config: AzureSpeechConfig): void {
    this.config = config;
    if (this.sttCaller) {
      this.sttCaller.updateConfig(config);
      console.log('🎤 Transcription service config updated');
    }
  }

  /**
   * Check if the service is configured
   */
  isConfigured(): boolean {
    return this.sttCaller !== null && this.config !== null;
  }

  /**
   * Transcribe a single call from its audio URL
   */
  async transcribeCall(
    call: CallRecord,
    options: STTCallOptions = {},
    onProgress?: (status: string) => void
  ): Promise<CallRecord> {
    if (!this.sttCaller) {
      throw new Error('Transcription service not initialized. Please configure Azure Speech settings first.');
    }

    console.log(`🎤 Starting transcription for call ${call.id}...`);
    onProgress?.('Starting transcription...');

    try {
      // Update call status to transcribing
      const updatedCall: CallRecord = {
        ...call,
        status: 'processing',
        updatedAt: new Date().toISOString(),
      };

      // Only transcribe if we have an actual audio file
      if (!call.audioFile || !(call.audioFile instanceof File || call.audioFile instanceof Blob)) {
        throw new Error('No audio file attached to this call. Please upload an audio file to transcribe.');
      }

      const audioSource = call.audioFile;
      const size = audioSource.size ?? 0;
      console.log(`📥 Using audio file: ${size} bytes`);

      // Get selected languages from config
      // IMPORTANT: Only fall back to defaults if selectedLanguages is undefined/null, NOT if it's an empty array
      const selectedLanguages = this.config?.selectedLanguages !== undefined
        ? this.config.selectedLanguages
        : DEFAULT_CALL_CENTER_LANGUAGES;

      console.log(`🌍 Config languages:`, this.config?.selectedLanguages);
      console.log(`🌍 Using languages:`, selectedLanguages);
      console.log(`🎙️ Diarization config:`, {
        enabled: this.config?.diarizationEnabled,
        minSpeakers: this.config?.minSpeakers,
        maxSpeakers: this.config?.maxSpeakers
      });

      const speechOptions: STTCallOptions = {
        ...options,
        // Use selected languages from configuration (options can override)
        candidateLocales: options.candidateLocales || selectedLanguages,
        wordLevelTimestampsEnabled: true,
        diarizationEnabled: this.config?.diarizationEnabled ?? false,
        minSpeakers: options.minSpeakers ?? this.config?.minSpeakers ?? 1,
        maxSpeakers: options.maxSpeakers ?? this.config?.maxSpeakers ?? 2,
      };
      
      console.log(`📋 Final speech options:`, {
        diarizationEnabled: speechOptions.diarizationEnabled,
        minSpeakers: speechOptions.minSpeakers,
        maxSpeakers: speechOptions.maxSpeakers
      });

      onProgress?.('Sending audio to Azure Speech API...');
      const result = await this.sttCaller.transcribeAudioFile(audioSource, speechOptions);

      let sentimentSegments: CallSentimentSegment[] | undefined;
      let sentimentSummary: string | undefined;

      let overallSentiment: 'positive' | 'neutral' | 'negative' | undefined;

      const sentimentConfig = azureOpenAIService.validateConfig();
      if (sentimentConfig.valid && result.phrases && result.phrases.length > 0) {
        try {
          const sentiment = await azureOpenAIService.analyzeSentimentTimeline(
            call.id,
            result.phrases,
            result.locale || 'en-US'
          );
          sentimentSegments = sentiment.segments;
          sentimentSummary = sentiment.summary;

          // Second pass: Analyze overall sentiment for analytics
          if (result.transcript && result.transcript.trim().length > 0) {
            overallSentiment = await azureOpenAIService.analyzeOverallSentiment(
              call.id,
              result.transcript,
              call.metadata
            );
            console.log(`✓ Overall sentiment: ${overallSentiment}`);
          }
        } catch (sentimentError) {
          console.warn('Sentiment analysis skipped:', sentimentError);
        }
      }

      onProgress?.('Transcription complete!');
      console.log(`✅ Transcription completed for call ${call.id}`);

      // Create transcribed call record
      const transcribedCall: CallRecord = {
        ...updatedCall,
        transcript: result.transcript,
        transcriptConfidence: result.confidence,
        transcriptWords: result.words,
        transcriptLocale: result.locale,
        transcriptDuration: result.durationMilliseconds,
        transcriptPhrases: result.phrases,
        transcriptSpeakerCount: result.speakerCount,
        sentimentSegments,
        sentimentSummary,
        overallSentiment,
        status: 'transcribed',
        updatedAt: new Date().toISOString(),
      };

      // Automatically evaluate the call after transcription
      if (azureOpenAIService.validateConfig().valid && result.transcript && result.transcript.trim().length > 0) {
        try {
          onProgress?.('Starting automatic evaluation...');
          console.log(`🤖 Auto-evaluating call ${call.id}...`);
          
          const evaluation = await azureOpenAIService.evaluateCall(
            result.transcript,
            call.metadata,
            call.id
          );

          onProgress?.('Evaluation complete!');
          console.log(`✅ Auto-evaluation completed for call ${call.id}: ${evaluation.percentage}%`);

          return {
            ...transcribedCall,
            evaluation,
            status: 'evaluated',
            updatedAt: new Date().toISOString(),
          };
        } catch (evalError) {
          console.warn(`⚠️ Auto-evaluation failed for call ${call.id}:`, evalError);
          // Return transcribed call even if evaluation fails
          return transcribedCall;
        }
      }

      return transcribedCall;
    } catch (error) {
      console.error(`❌ Transcription failed for call ${call.id}:`, error);
      onProgress?.('Transcription failed');
      
      return {
        ...call,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Transcription failed',
        updatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Transcribe multiple calls in batch
   */
  async transcribeCalls(
    calls: CallRecord[],
    options: STTCallOptions = {},
    onProgress?: (callId: string, status: string, index: number, total: number) => void
  ): Promise<CallRecord[]> {
    if (!this.sttCaller) {
      throw new Error('Transcription service not initialized. Please configure Azure Speech settings first.');
    }

    const results: CallRecord[] = [];
    const total = calls.length;

    console.log(`🎤 Starting batch transcription for ${total} calls...`);

    for (let i = 0; i < calls.length; i++) {
      const call = calls[i];
      console.log(`🎤 Processing call ${i + 1}/${total}: ${call.id}`);
      
      try {
        const result = await this.transcribeCall(
          call,
          options,
          (status) => onProgress?.(call.id, status, i + 1, total)
        );
        results.push(result);
      } catch (error) {
        console.error(`❌ Failed to transcribe call ${call.id}:`, error);
        results.push({
          ...call,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Transcription failed',
          updatedAt: new Date().toISOString(),
        });
      }
    }

    console.log(`✅ Batch transcription completed: ${results.filter(r => r.status === 'transcribed').length}/${total} successful`);
    return results;
  }

  /**
   * Validate Azure Speech configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    if (!this.sttCaller) {
      return {
        valid: false,
        errors: ['Transcription service not initialized'],
      };
    }

    return this.sttCaller!.validateConfig();
  }
}

// Export singleton instance
export const transcriptionService = new TranscriptionService();
