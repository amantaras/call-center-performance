import { STTCaller, STTCallOptions } from '../STTCaller';
import { CallRecord, AzureSpeechConfig, CallSentimentSegment } from '../types/call';
import { SchemaDefinition } from '../types/schema';
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
    schema: SchemaDefinition | null,
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
          const businessContext = schema?.businessContext || schema?.name || 'call center';
          const sentiment = await azureOpenAIService.analyzeSentimentTimeline(
            call.id,
            result.phrases,
            result.locale || 'en-US',
            ['positive', 'neutral', 'negative'],
            businessContext
          );
          sentimentSegments = sentiment.segments;
          sentimentSummary = sentiment.summary;

          // Second pass: Analyze overall sentiment for analytics
          if (result.transcript && result.transcript.trim().length > 0 && schema) {
            overallSentiment = await azureOpenAIService.analyzeOverallSentiment(
              call.id,
              result.transcript,
              call.metadata,
              schema
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
          
          if (!schema) {
            throw new Error('Schema is required for evaluation');
          }
          
          const evaluation = await azureOpenAIService.evaluateCall(
            result.transcript,
            call.metadata,
            schema,
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
   * Transcribe multiple calls in parallel with controlled concurrency
   * @param calls - Array of calls to transcribe
   * @param options - Speech-to-text options
   * @param onProgress - Progress callback (callId, status, completed, total, completedCall?)
   * @param concurrency - Maximum number of calls to process simultaneously (default: 5)
   */
  async transcribeCallsParallel(
    calls: CallRecord[],
    options: STTCallOptions = {},
    onProgress?: (callId: string, status: string, completed: number, total: number, completedCall?: CallRecord) => void,
    concurrency: number = 5,
    schema: SchemaDefinition | null = null
  ): Promise<CallRecord[]> {
    if (!this.sttCaller) {
      throw new Error('Transcription service not initialized. Please configure Azure Speech settings first.');
    }

    const total = calls.length;
    const results: CallRecord[] = new Array(total);
    
    // Track completion state for real-time progress updates
    const completionTracker = {
      completed: 0,
      increment() {
        this.completed++;
      },
      get count() {
        return this.completed;
      }
    };

    console.log(`🎤 Starting parallel batch transcription for ${total} calls with concurrency ${concurrency}...`);

    // Process calls in batches with controlled concurrency
    for (let i = 0; i < calls.length; i += concurrency) {
      const batch = calls.slice(i, i + concurrency);
      const batchNumber = Math.floor(i / concurrency) + 1;
      const totalBatches = Math.ceil(calls.length / concurrency);
      
      console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} calls)...`);

      // Process all calls in this batch in parallel
      const batchPromises = batch.map((call, batchIndex) => {
        const callIndex = i + batchIndex;
        console.log(`🚀 [PARALLEL] Starting transcription for call ${call.id} (${call.metadata.borrowerName}) at ${new Date().toISOString()}`);
        return this.transcribeCall(
          call,
          schema,
          options,
          (status) => {
            console.log(`📊 [PARALLEL] ${call.id}: ${status}`);
            // Pass current completion count for real-time updates
            onProgress?.(call.id, status, completionTracker.count, total);
          }
        ).then(
          (result) => {
            console.log(`✅ [PARALLEL] Completed transcription for call ${call.id} at ${new Date().toISOString()}`);
            // Increment completion count immediately when call finishes
            completionTracker.increment();
            // Pass the completed call data so UI can update immediately with full data
            onProgress?.(call.id, 'completed', completionTracker.count, total, result);
            return { index: callIndex, result, success: true };
          },
          (error) => {
            console.error(`❌ [PARALLEL] Failed to transcribe call ${call.id}:`, error);
            // Count failures as completed too (so progress bar doesn't get stuck)
            completionTracker.increment();
            const failedCall: CallRecord = {
              ...call,
              status: 'failed' as const,
              error: error instanceof Error ? error.message : 'Transcription failed',
              updatedAt: new Date().toISOString(),
            };
            // Pass the failed call data so UI can update immediately
            onProgress?.(call.id, 'failed', completionTracker.count, total, failedCall);
            return {
              index: callIndex,
              result: failedCall,
              success: false
            };
          }
        );
      });

      console.log(`⏳ [PARALLEL] Waiting for batch ${batchNumber} (${batchPromises.length} calls) to complete...`);
      // Wait for all calls in this batch to complete
      const batchResults = await Promise.allSettled(batchPromises);
      console.log(`✅ [PARALLEL] Batch ${batchNumber} finished!`);

      // Store results in their original positions
      batchResults.forEach((promiseResult) => {
        if (promiseResult.status === 'fulfilled') {
          const { index, result } = promiseResult.value;
          results[index] = result;
        }
      });

      console.log(`✅ Batch ${batchNumber}/${totalBatches} completed (${completionTracker.count}/${total} total)`);
    }

    const successful = results.filter(r => r.status === 'transcribed' || r.status === 'evaluated').length;
    console.log(`✅ Parallel batch transcription completed: ${successful}/${total} successful`);
    return results;
  }

  /**
   * Transcribe multiple calls in batch (sequential for backwards compatibility)
   * For parallel processing, use transcribeCallsParallel() instead
   */
  async transcribeCalls(
    calls: CallRecord[],
    options: STTCallOptions = {},
    onProgress?: (callId: string, status: string, index: number, total: number) => void,
    schema: SchemaDefinition | null = null
  ): Promise<CallRecord[]> {
    if (!this.sttCaller) {
      throw new Error('Transcription service not initialized. Please configure Azure Speech settings first.');
    }

    const results: CallRecord[] = [];
    const total = calls.length;

    console.log(`🎤 Starting sequential batch transcription for ${total} calls...`);

    for (let i = 0; i < calls.length; i++) {
      const call = calls[i];
      console.log(`🎤 Processing call ${i + 1}/${total}: ${call.id}`);
      
      try {
        const result = await this.transcribeCall(
          call,
          schema,
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
