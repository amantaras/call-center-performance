import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { defaultCalls } from '@/lib/default-calls';
import { CallRecord } from '@/types/call';
import { SchemaDefinition } from '@/types/schema';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, MagnifyingGlass, ArrowCounterClockwise, Microphone, FileCsv, Sparkle, ChartBar, SpeakerHigh, FileArchive } from '@phosphor-icons/react';
import { loadAzureConfigFromCookie } from '@/lib/azure-config-storage';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { CallsTable } from '@/components/CallsTable';
import { UploadDialog } from '@/components/UploadDialog';
import { CallDetailDialog } from '@/components/CallDetailDialog';
import { ImportCSVDialog } from '@/components/ImportCSVDialog';
import { SyntheticMetadataWizard } from '@/components/SyntheticMetadataWizard';
import { transcriptionService } from '@/services/transcription';
import { azureOpenAIService } from '@/services/azure-openai';
import { restoreAudioFilesFromStorage } from '@/lib/csv-parser';
import { toast } from 'sonner';
import { generateSyntheticAudioBatch } from '@/services/synthetic-audio';
import { LLMCaller } from '@/llmCaller';
import { BrowserConfigManager } from '@/services/browser-config-manager';
import { storeAudioFile } from '@/lib/audio-storage';
import { exportCalls, ExportProgress } from '@/services/call-export';

interface CallsViewProps {
  batchProgress: { completed: number; total: number } | null;
  setBatchProgress: (progress: { completed: number; total: number } | null) => void;
  activeSchema: SchemaDefinition | null;
  schemaLoading: boolean;
}

export function CallsView({ batchProgress, setBatchProgress, activeSchema, schemaLoading }: CallsViewProps) {
  const [calls, setCalls] = useLocalStorage<CallRecord[]>('calls', defaultCalls);
  
  // Restore audio files from IndexedDB on mount
  useEffect(() => {
    if (calls && calls.length > 0) {
      restoreAudioFilesFromStorage(calls).then((restoredCalls) => {
        const audioCount = restoredCalls.filter(c => c.audioFile).length;
        if (audioCount > 0) {
          console.log(`✅ Restored ${audioCount} audio files from IndexedDB`);
          setCalls(restoredCalls);
        }
      }).catch((error) => {
        console.error('Failed to restore audio files:', error);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  console.log('=== CALLSVIEW RENDER ===');
  console.log('Calls loaded:', calls?.length || 0);
  console.log('First call:', calls?.[0]);
  console.log('Active schema ID:', activeSchema?.id);
  console.log('First call schemaId:', calls?.[0]?.schemaId);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [importCSVOpen, setImportCSVOpen] = useState(false);
  const [syntheticWizardOpen, setSyntheticWizardOpen] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [transcribingIds, setTranscribingIds] = useState<Set<string>>(new Set());
  const [evaluatingIds, setEvaluatingIds] = useState<Set<string>>(new Set());
  const [generatingAudioIds, setGeneratingAudioIds] = useState<Set<string>>(new Set());
  const [selectedCallIds, setSelectedCallIds] = useState<Set<string>>(new Set());
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const onUpdateCalls = (updater: (prev: CallRecord[] | undefined) => CallRecord[]) => {
    setCalls(updater);
  };

  const handleTranscribe = async (call: CallRecord) => {
    if (!transcriptionService.isConfigured()) {
      toast.error('Please configure Azure Speech services first');
      return;
    }

    if (!call.audioFile) {
      toast.error('No audio file attached. Please upload a call with an audio file.');
      return;
    }

    setTranscribingIds((prev) => new Set(prev).add(call.id));
    
    // Immediately update status to processing
    onUpdateCalls((prev) => 
      (prev || []).map((c) => 
        c.id === call.id 
          ? { ...c, status: 'processing' as const, updatedAt: new Date().toISOString() }
          : c
      )
    );
    
    toast.info(`Starting transcription for ${call.metadata.borrowerName}...`);

    try {
      const updatedCall = await transcriptionService.transcribeCall(
        call,
        activeSchema,
        {}, // Default STT options
        (status) => {
          console.log(`Transcription progress: ${status}`);
        },
      );

      onUpdateCalls((prev) => (prev || []).map((c) => (c.id === call.id ? updatedCall : c)));

      toast.success(`Transcription completed for ${call.metadata.borrowerName}!`);
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error(error instanceof Error ? error.message : 'Transcription failed');
      
      // Reset status on error
      onUpdateCalls((prev) => 
        (prev || []).map((c) => 
          c.id === call.id 
            ? { ...c, status: 'uploaded' as const, updatedAt: new Date().toISOString() }
            : c
        )
      );
    } finally {
      setTranscribingIds((prev) => {
        const next = new Set(prev);
        next.delete(call.id);
        return next;
      });
    }
  };

  const handleEvaluate = async (call: CallRecord) => {
    if (!call.transcript) {
      toast.error('Please transcribe this call first');
      return;
    }

    setEvaluatingIds((prev) => new Set(prev).add(call.id));
    toast.info(`Starting evaluation for ${call.metadata.borrowerName}...`);

    try {
      console.log(`🔄 Re-evaluating call ${call.id} with schema: ${activeSchema?.id || 'NO SCHEMA'}`);
      const evaluation = await azureOpenAIService.evaluateCall(
        call.transcript,
        call.metadata,
        activeSchema || {} as SchemaDefinition,
        call.id,
      );

      const updatedCall: CallRecord = {
        ...call,
        evaluation,
        status: 'evaluated',
        updatedAt: new Date().toISOString(),
      };

      onUpdateCalls((prev) => (prev || []).map((c) => (c.id === call.id ? updatedCall : c)));

      toast.success(`Evaluation completed! Score: ${evaluation.percentage}%`);
    } catch (error) {
      console.error('Evaluation error:', error);
      toast.error(error instanceof Error ? error.message : 'Evaluation failed');
    } finally {
      setEvaluatingIds((prev) => {
        const next = new Set(prev);
        next.delete(call.id);
        return next;
      });
    }
  };

  const handleEvaluateSelected = async () => {
    try {
      // Filter for selected calls that have transcripts (allow re-evaluation of already evaluated calls)
      const callsToEvaluate = (calls || []).filter(
        (call) => selectedCallIds.has(call.id) && call.transcript
      );

      if (callsToEvaluate.length === 0) {
        toast.error('No transcribed calls selected for evaluation. Please select calls that have been transcribed.');
        return;
      }

      if (!activeSchema) {
        toast.error('Please select a schema first');
        return;
      }

      // Get batch settings from config
      const azureConfig = loadAzureConfigFromCookie();
      const parallelBatches = azureConfig?.syntheticData?.parallelBatches ?? 3;
      const totalBatchGroups = Math.ceil(callsToEvaluate.length / parallelBatches);

      console.log(`📊 Evaluation batch settings: ${parallelBatches} parallel, ${callsToEvaluate.length} calls, ${totalBatchGroups} batch groups`);

      // Mark all calls as evaluating
      const callIdsToEvaluate = new Set(callsToEvaluate.map(c => c.id));
      setEvaluatingIds(callIdsToEvaluate);

      const startTime = Date.now();
      toast.info(`🚀 Starting evaluation: ${callsToEvaluate.length} calls in ${totalBatchGroups} batch group(s) (${parallelBatches} parallel)`);

      // Set up progress tracking
      setBatchProgress({ completed: 0, total: callsToEvaluate.length });

    let completedCount = 0;
    let successCount = 0;
    let failCount = 0;

    // Collect all updates to apply in a single batch (avoid race conditions)
    const updatesToApply: CallRecord[] = [];

    // Process in parallel batches - NO STATE UPDATES during loop
    for (let i = 0; i < callsToEvaluate.length; i += parallelBatches) {
      const batch = callsToEvaluate.slice(i, i + parallelBatches);
      const batchGroupNum = Math.floor(i / parallelBatches) + 1;
      
      console.log(`🔄 Starting batch group ${batchGroupNum}/${totalBatchGroups} with ${batch.length} parallel calls`);
      toast.info(`Processing batch ${batchGroupNum}/${totalBatchGroups} (${batch.length} parallel calls)...`);
      
      // Process batch in parallel - all calls in this batch start simultaneously
      const batchPromises = batch.map(async (call) => {
        console.log(`  ▶️ Starting evaluation for call ${call.id}`);
        try {
          const evaluation = await azureOpenAIService.evaluateCall(
            call.transcript!,
            call.metadata,
            activeSchema,
            call.id,
          );

          let sentimentSegments = call.sentimentSegments;
          let sentimentSummary = call.sentimentSummary;
          let overallSentiment = call.overallSentiment;

          // Always run sentiment analysis if we have transcript phrases
          if (call.transcriptPhrases && call.transcriptPhrases.length > 0) {
            try {
              const businessContext = activeSchema.businessContext || activeSchema.name || 'call center';
              const sentiment = await azureOpenAIService.analyzeSentimentTimeline(
                call.id,
                call.transcriptPhrases,
                call.transcriptLocale || 'en-US',
                ['positive', 'neutral', 'negative'],
                businessContext
              );
              sentimentSegments = sentiment.segments;
              sentimentSummary = sentiment.summary;

              // Also analyze overall sentiment for analytics
              overallSentiment = await azureOpenAIService.analyzeOverallSentiment(
                call.id,
                call.transcript!,
                call.metadata,
                activeSchema
              );
              
              console.log(`  ✓ Sentiment analysis completed for call ${call.id}`);
            } catch (error) {
              console.warn(`  ⚠️ Sentiment analysis failed for ${call.id}:`, error);
              // Don't fail the whole evaluation if sentiment fails
            }
          }

          const updatedCall: CallRecord = {
            ...call,
            evaluation,
            sentimentSegments,
            sentimentSummary,
            overallSentiment,
            status: 'evaluated',
            updatedAt: new Date().toISOString(),
          };
          
          console.log(`  ✅ Completed evaluation for call ${call.id}: ${evaluation.percentage}%`);
          successCount++;
          return { success: true, call: updatedCall };
        } catch (error) {
          console.error(`  ❌ Evaluation error for ${call.id}:`, error);
          failCount++;
          return { success: false, callId: call.id, error };
        }
      });

      // Wait for this batch to complete before starting the next
      console.log(`⏳ Waiting for batch group ${batchGroupNum} to complete...`);
      const results = await Promise.all(batchPromises);
      console.log(`✅ Batch group ${batchGroupNum} completed - ${results.length} results received`);
      
      // Collect successful updates
      let batchSuccessCount = 0;
      for (const result of results) {
        if (result.success && result.call) {
          updatesToApply.push(result.call);
          batchSuccessCount++;
        }
      }
      console.log(`📦 Collected ${batchSuccessCount} successful updates from batch ${batchGroupNum}`);
      
      // Update completed count for progress
      completedCount += batch.length;
      console.log(`📊 Progress: ${completedCount}/${callsToEvaluate.length} calls processed (${updatesToApply.length} total successful so far)`);
    }

    console.log(`🎯 Batch loop completed! Total successful evaluations to apply: ${updatesToApply.length}`);

    // Apply all updates in a single batch to avoid race conditions
    console.log(`📊 Applying ${updatesToApply.length} call updates in single batch`);
    console.log('📊 Updates to apply:', updatesToApply.map(u => ({ id: u.id, status: u.status, score: u.evaluation?.percentage })));
    
    if (updatesToApply.length > 0) {
      onUpdateCalls((prev) => {
        console.log('📊 onUpdateCalls callback - prev length:', prev?.length || 0);
        const updated = (prev || []).map((c) => {
          const update = updatesToApply.find(u => u.id === c.id);
          if (update) {
            console.log(`  📝 Updating call ${c.id} from status "${c.status}" to "${update.status}"`);
          }
          return update || c;
        });
        console.log('📊 onUpdateCalls callback - returning updated array, length:', updated.length);
        console.log('📊 Updated statuses:', updated.map(c => ({ id: c.id, status: c.status, score: c.evaluation?.percentage })));
        return updated;
      });
    }
    
      console.log('✅ State update completed, clearing progress indicators');
      
      // Clear evaluating state and progress
      setEvaluatingIds(new Set());
      setBatchProgress(null);
      setSelectedCallIds(new Set());

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      if (failCount === 0) {
        toast.success(`✅ Evaluated ${successCount} calls in ${duration}s`);
      } else {
        toast.warning(`Completed: ${successCount} succeeded, ${failCount} failed in ${duration}s`);
      }
    } catch (error) {
      console.error('❌ FATAL ERROR in handleEvaluateSelected:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      toast.error(`Evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Clean up state on error
      setEvaluatingIds(new Set());
      setBatchProgress(null);
    }
  };

  const handleGenerateAudioSelected = async () => {
    // Filter for selected calls that have transcripts
    const callsToGenerate = (calls || []).filter(
      (call) => selectedCallIds.has(call.id) && call.transcriptPhrases && call.transcriptPhrases.length > 0
    );

    if (callsToGenerate.length === 0) {
      toast.error('No transcribed calls selected. Please select calls that have been transcribed.');
      return;
    }

    if (!activeSchema) {
      toast.error('Please select a schema first');
      return;
    }

    // Get config
    const azureConfig = loadAzureConfigFromCookie();
    if (!azureConfig?.speech?.region || !azureConfig?.speech?.subscriptionKey) {
      toast.error('Azure Speech credentials not configured. Please configure in Settings.');
      return;
    }

    if (!azureConfig?.openAI?.endpoint || !azureConfig?.openAI?.apiKey) {
      toast.error('Azure OpenAI not configured. Needed for gender detection from names.');
      return;
    }

    if (azureConfig.tts?.enabled === false) {
      toast.error('Synthetic audio generation is disabled. Enable it in Configuration.');
      return;
    }

    // Mark all calls as generating
    const callIdsToGenerate = new Set(callsToGenerate.map(c => c.id));
    setGeneratingAudioIds(callIdsToGenerate);

    const startTime = Date.now();
    toast.info(`🔊 Generating synthetic audio for ${callsToGenerate.length} call(s)...`);

    // Set up progress tracking
    setBatchProgress({ completed: 0, total: callsToGenerate.length });

    try {
      // Create LLM caller for gender detection using shared BrowserConfigManager
      const llmCaller = new LLMCaller(new BrowserConfigManager({
        endpoint: azureConfig.openAI.endpoint,
        apiKey: azureConfig.openAI.apiKey,
        deploymentName: azureConfig.openAI.deploymentName,
        apiVersion: azureConfig.openAI.apiVersion,
        reasoningEffort: azureConfig.openAI.reasoningEffort,
        authType: azureConfig.openAI.authType || 'apiKey',
        tenantId: azureConfig.openAI.tenantId,
      }));

      let successCount = 0;
      let failCount = 0;
      let skippedCount = 0;

      const results = await generateSyntheticAudioBatch(
        callsToGenerate,
        activeSchema,
        llmCaller,
        azureConfig,
        async (callIndex, totalCalls, callId, status) => {
          setBatchProgress({ completed: callIndex, total: totalCalls });
          
          if (status === 'completed') {
            successCount++;
          } else if (status === 'failed') {
            failCount++;
          } else if (status === 'skipped') {
            skippedCount++;
          }

          // Remove from generating set when done
          if (status === 'completed' || status === 'failed' || status === 'skipped') {
            setGeneratingAudioIds((prev) => {
              const next = new Set(prev);
              next.delete(callId);
              return next;
            });
          }
        }
      );

      console.log(`🔊 Batch generation complete. Results:`, Array.from(results.entries()).map(([id, r]) => ({ id, hasResult: !!r })));

      // Collect all updates to apply in a single batch
      const updatesToApply: Array<{ callId: string; audioBlob: Blob; voiceAssignments: string }> = [];
      
      for (const [callId, result] of results) {
        if (result) {
          console.log(`🔊 Storing audio for call ${callId}, blob size: ${result.audioBlob.size}`);
          // Store audio in IndexedDB
          await storeAudioFile(callId, result.audioBlob);
          
          updatesToApply.push({
            callId,
            audioBlob: result.audioBlob,
            voiceAssignments: result.voiceAssignments
              .map(v => `${v.speakerLabel}: ${v.voiceName}`)
              .join(', '),
          });
        }
      }

      console.log(`🔊 Applying ${updatesToApply.length} call updates in single batch`);

      // Apply all updates in a single state update to avoid race conditions
      if (updatesToApply.length > 0) {
        onUpdateCalls((prev) => {
          const updated = (prev || []).map((c) => {
            const update = updatesToApply.find(u => u.callId === c.id);
            if (update) {
              console.log(`🔊 Updating call ${c.id} with synthetic audio`);
              return {
                ...c,
                audioFile: update.audioBlob,
                metadata: {
                  ...c.metadata,
                  syntheticAudioGenerated: true,
                  syntheticAudioVoices: update.voiceAssignments,
                },
                updatedAt: new Date().toISOString(),
              };
            }
            return c;
          });
          return updated;
        });
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      if (failCount === 0 && skippedCount === 0) {
        toast.success(`✅ Generated synthetic audio for ${successCount} calls in ${duration}s`);
      } else if (skippedCount > 0) {
        toast.warning(`Generated ${successCount} audio files, ${skippedCount} skipped (no transcript), ${failCount} failed in ${duration}s`);
      } else {
        toast.warning(`Generated ${successCount} audio files, ${failCount} failed in ${duration}s`);
      }
    } catch (error) {
      console.error('Batch audio generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Batch audio generation failed');
    } finally {
      setGeneratingAudioIds(new Set());
      setSelectedCallIds(new Set());
      setBatchProgress(null);
    }
  };

  const handleTranscribeSelected = async () => {
    console.log('🔍 Selected call IDs:', Array.from(selectedCallIds));
    console.log('🔍 All calls:', (calls || []).map(c => ({ 
      id: c.id, 
      borrower: c.metadata.borrowerName, 
      hasAudio: !!c.audioFile,
      audioType: c.audioFile instanceof Blob ? 'Blob' : typeof c.audioFile
    })));
    
    const callsToTranscribe = (calls || []).filter(
      (call) => selectedCallIds.has(call.id) && call.audioFile,
    );

    console.log('🔍 Calls to transcribe:', callsToTranscribe.map(c => c.metadata.borrowerName));

    if (callsToTranscribe.length === 0) {
      toast.error('Selected calls have no audio files attached. Please check that audio files were properly loaded.');
      return;
    }

    // Mark all calls as processing
    const callIdsToTranscribe = new Set(callsToTranscribe.map(c => c.id));
    setTranscribingIds(callIdsToTranscribe);
    onUpdateCalls((prev) => 
      (prev || []).map((c) => 
        callIdsToTranscribe.has(c.id)
          ? { ...c, status: 'processing' as const, updatedAt: new Date().toISOString() }
          : c
      )
    );

    const startTime = Date.now();
    toast.info(`🚀 Starting parallel transcription for ${callsToTranscribe.length} call(s)...`);

    try {
      // Use parallel transcription with concurrency limit of 5
      const results = await transcriptionService.transcribeCallsParallel(
        callsToTranscribe,
        {},
        (callId, status, completed, total, completedCall) => {
          console.log(`Progress: ${callId} - ${status} (${completed}/${total})`);
          
          // Update progress bar
          setBatchProgress({ completed, total });
          
          // Update the individual call with real-time data
          onUpdateCalls((prev) => 
            (prev || []).map((c) => {
              if (c.id !== callId) return c;
              
              // If we have the completed call data, use it immediately
              if (completedCall && (status === 'completed' || status === 'failed')) {
                return completedCall;
              }
              
              // Otherwise, just update status based on progress messages
              if (status === 'Evaluation complete!') {
                return { ...c, status: 'evaluated' as const, updatedAt: new Date().toISOString() };
              } else if (status === 'Transcription complete!') {
                return { ...c, status: 'transcribed' as const, updatedAt: new Date().toISOString() };
              } else {
                // Keep as processing but update timestamp to show activity
                return { ...c, status: 'processing' as const, updatedAt: new Date().toISOString() };
              }
            })
          );
          
          // Remove from transcribing set when completed
          if (status === 'completed' || status === 'failed') {
            setTranscribingIds((prev) => {
              const next = new Set(prev);
              next.delete(callId);
              return next;
            });
          }
        },
        5, // Process 5 calls at a time
        activeSchema // Pass schema for sentiment analysis and evaluation
      );

      // Update all calls with their results
      onUpdateCalls((prev) => {
        const updated = prev || [];
        return updated.map((c) => {
          const result = results.find(r => r.id === c.id);
          return result || c;
        });
      });

      const successful = results.filter(r => r.status === 'transcribed' || r.status === 'evaluated').length;
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      toast.success(`✅ Finished: ${successful}/${callsToTranscribe.length} successful in ${duration}s`);
    } catch (error) {
      console.error('Batch transcription error:', error);
      toast.error(error instanceof Error ? error.message : 'Batch transcription failed');
      
      // Reset all processing calls on error
      onUpdateCalls((prev) => 
        (prev || []).map((c) => 
          callIdsToTranscribe.has(c.id)
            ? { ...c, status: 'uploaded' as const, updatedAt: new Date().toISOString() }
            : c
        )
      );
    } finally {
      setTranscribingIds(new Set());
      setSelectedCallIds(new Set());
      setBatchProgress(null);
    }
  };

  const handleSelectAll = () => {
    // Select all calls in the current filtered view
    const allCallIds = (filteredCalls || []).map((c) => c.id);
    setSelectedCallIds(new Set(allCallIds));
  };

  const handleDeselectAll = () => {
    setSelectedCallIds(new Set());
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportProgress({ current: 0, total: 0, status: 'Preparing export...' });

      // Determine which calls to export
      const callsToExport = selectedCallIds.size > 0
        ? (calls || []).filter(c => selectedCallIds.has(c.id))
        : (calls || []);

      const callsWithAudio = callsToExport.filter(c => c.audioFile || c.audioUrl);
      
      if (callsWithAudio.length === 0) {
        toast.error('No calls with audio files found to export');
        return;
      }

      toast.info(`Starting export of ${callsWithAudio.length} call(s) with audio...`);

      await exportCalls(
        calls || [],
        selectedCallIds.size > 0 ? selectedCallIds : undefined,
        (progress) => {
          setExportProgress(progress);
        }
      );

      toast.success(`Successfully exported ${callsWithAudio.length} call(s) with audio and metadata!`);
      setSelectedCallIds(new Set()); // Clear selection after export
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  // Define filteredCalls BEFORE handleToggleSelect so it's available for shift-click
  const filteredCalls = (calls || []).filter((call) => {
    // Filter by active schema
    if (activeSchema && call.schemaId !== activeSchema.id) {
      console.log(`❌ Call ${call.id} filtered out: schemaId mismatch (call: ${call.schemaId}, active: ${activeSchema.id})`);
      return false;
    }
    
    // If no search query, include all calls for this schema
    if (!searchQuery.trim()) {
      return true;
    }
    
    const query = searchQuery.toLowerCase();
    
    // Search across all metadata fields that are strings
    return Object.values(call.metadata || {}).some(value => {
      if (typeof value === 'string') {
        return value.toLowerCase().includes(query);
      }
      if (typeof value === 'number') {
        return value.toString().includes(query);
      }
      return false;
    });
  });

  console.log('Filtered calls:', filteredCalls.length, 'of', calls?.length || 0);

  // Find orphaned calls (calls with different schemaId than active schema)
  const orphanedCalls = activeSchema 
    ? (calls || []).filter(call => call.schemaId && call.schemaId !== activeSchema.id)
    : [];

  const handleMigrateOrphanedCalls = () => {
    if (!activeSchema) {
      toast.error('No active schema selected');
      return;
    }
    
    if (orphanedCalls.length === 0) {
      toast.info('No orphaned calls to migrate');
      return;
    }

    if (window.confirm(`Migrate ${orphanedCalls.length} call(s) to "${activeSchema.name}"? This will update their schema association.`)) {
      setCalls((prev) => 
        (prev || []).map((call) => {
          if (call.schemaId !== activeSchema.id) {
            return { ...call, schemaId: activeSchema.id, updatedAt: new Date().toISOString() };
          }
          return call;
        })
      );
      toast.success(`Migrated ${orphanedCalls.length} call(s) to ${activeSchema.name}`);
    }
  };

  // Track last selected index for shift-click range selection
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const handleToggleSelect = (callId: string, index: number, shiftKey: boolean) => {
    // Shift-click: select range from last selected to current
    if (shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const callsInRange = filteredCalls.slice(start, end + 1);
      
      console.log(`Shift-click: selecting rows ${start} to ${end} (${callsInRange.length} calls)`);
      
      setSelectedCallIds((prev) => {
        const next = new Set(prev);
        // Add all calls in range that can be processed
        callsInRange.forEach(call => {
          const canProcess = call.status !== 'pending audio' && call.status !== 'processing' && call.status !== 'failed';
          if (canProcess) {
            next.add(call.id);
          }
        });
        return next;
      });
    } else {
      // Normal click: toggle single selection
      setSelectedCallIds((prev) => {
        const next = new Set(prev);
        if (next.has(callId)) {
          next.delete(callId);
        } else {
          next.add(callId);
        }
        return next;
      });
      setLastSelectedIndex(index);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to delete all call records? This action cannot be undone.')) {
      setCalls([]);
      toast.success('All call records deleted');
    }
  };

  return (
    <div className="space-y-6">
      {batchProgress && (
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Processing calls...</span>
              <span className="text-muted-foreground">
                {batchProgress.completed} / {batchProgress.total} completed
              </span>
            </div>
            <Progress 
              value={(batchProgress.completed / batchProgress.total) * 100} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground">
              {Math.round((batchProgress.completed / batchProgress.total) * 100)}% complete
            </p>
          </div>
        </Card>
      )}
      {exportProgress && (
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Exporting calls...</span>
              {exportProgress.total > 0 && (
                <span className="text-muted-foreground">
                  {exportProgress.current} / {exportProgress.total} completed
                </span>
              )}
            </div>
            {exportProgress.total > 0 && (
              <Progress 
                value={(exportProgress.current / exportProgress.total) * 100} 
                className="h-2"
              />
            )}
            <p className="text-xs text-muted-foreground">
              {exportProgress.status}
            </p>
          </div>
        </Card>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlass
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={18}
            />
            <Input
              placeholder="Search calls by agent, borrower, product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedCallIds.size > 0 && (
            <>
              <Button onClick={handleTranscribeSelected} variant="default">
                <Microphone className="mr-2" size={18} />
                Transcribe Selected ({selectedCallIds.size})
              </Button>
              <Button onClick={handleEvaluateSelected} variant="default">
                <ChartBar className="mr-2" size={18} />
                Evaluate Selected ({selectedCallIds.size})
              </Button>
              <Button onClick={handleGenerateAudioSelected} variant="outline">
                <SpeakerHigh className="mr-2" size={18} />
                Generate Audio ({selectedCallIds.size})
              </Button>
              <Button onClick={handleExport} variant="outline" disabled={isExporting}>
                <FileArchive className="mr-2" size={18} />
                Export ({selectedCallIds.size})
              </Button>
              <Button onClick={handleDeselectAll} variant="outline" size="sm">
                Deselect All
              </Button>
            </>
          )}
          {selectedCallIds.size === 0 && (calls || []).length > 0 && (
            <>
              <Button onClick={handleSelectAll} variant="outline">
                Select All
              </Button>
              <Button onClick={handleExport} variant="outline" disabled={isExporting}>
                <FileArchive className="mr-2" size={18} />
                Export All
              </Button>
            </>
          )}
          <Button onClick={handleReset} variant="outline">
            <ArrowCounterClockwise className="mr-2" size={18} />
            Reset Data
          </Button>
          <Button onClick={() => setImportCSVOpen(true)} variant="outline">
            <FileCsv className="mr-2" size={18} />
            Import Metadata
          </Button>
          <Button 
            onClick={() => setSyntheticWizardOpen(true)} 
            variant="outline"
            disabled={!activeSchema}
            title={!activeSchema ? "Please select a schema first" : "Generate synthetic metadata records using AI"}
          >
            <Sparkle className="mr-2" size={18} />
            Synthetic Data
          </Button>
          <Button 
            onClick={() => setUploadOpen(true)}
            disabled={!activeSchema}
            title={!activeSchema ? "Please select a schema first" : "Upload audio files to attach to existing records"}
          >
            <Upload className="mr-2" size={18} />
            Upload Audio Files
          </Button>
        </div>
      </div>

      {/* Show orphaned calls warning */}
      {activeSchema && orphanedCalls.length > 0 && (
        <Card className="p-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <span className="text-amber-600 text-lg">⚠️</span>
              </div>
              <div>
                <h4 className="font-medium text-amber-800 dark:text-amber-200">
                  {orphanedCalls.length} call(s) from a different schema
                </h4>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  These calls were imported with a different schema and are hidden. Migrate them to view and process them.
                </p>
              </div>
            </div>
            <Button onClick={handleMigrateOrphanedCalls} variant="outline" className="border-amber-500 text-amber-700 hover:bg-amber-100">
              Migrate to {activeSchema.name}
            </Button>
          </div>
        </Card>
      )}

      {(!calls || calls.length === 0) && !activeSchema && (
        <Card className="p-12 text-center">
          <div className="mx-auto max-w-md space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Upload size={32} className="text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No calls yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Upload your first batch of call recordings with metadata to get started
              </p>
            </div>
            <Button onClick={() => setImportCSVOpen(true)}>
              <FileCsv className="mr-2" size={18} />
              Import Metadata
            </Button>
          </div>
        </Card>
      )}

      {activeSchema && (
        <CallsTable
          calls={filteredCalls}
          schema={activeSchema}
          onSelectCall={setSelectedCall}
          onUpdateCalls={onUpdateCalls}
          transcribingIds={transcribingIds}
          evaluatingIds={evaluatingIds}
          selectedCallIds={selectedCallIds}
          onToggleSelect={handleToggleSelect}
          onTranscribe={(call, e) => {
            e.stopPropagation();
            handleTranscribe(call);
          }}
          onEvaluate={(call, e) => {
            e.stopPropagation();
            handleEvaluate(call);
          }}
        />
      )}

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        activeSchema={activeSchema}
        existingCalls={calls || []}
        onUpload={(updatedCalls) => {
          // Update existing calls with audio files
          setCalls((prevCalls) => {
            const callMap = new Map((prevCalls || []).map(c => [c.id, c]));
            updatedCalls.forEach(updated => callMap.set(updated.id, updated));
            return Array.from(callMap.values());
          });
          setUploadOpen(false);
        }}
      />

      <ImportCSVDialog
        open={importCSVOpen}
        onOpenChange={setImportCSVOpen}
        onImport={(importedCalls) => {
          console.log('=== IMPORT CALLBACK ===');
          console.log('Received imported calls:', importedCalls.length);
          console.log('First imported call:', importedCalls[0]);
          setCalls(importedCalls);
          setImportCSVOpen(false);
        }}
        activeSchema={activeSchema}
      />

      {selectedCall && activeSchema && (
        <CallDetailDialog
          call={selectedCall}
          schema={activeSchema}
          open={!!selectedCall}
          onOpenChange={(open) => !open && setSelectedCall(null)}
          onUpdate={(updatedCall) => {
            setCalls((prevCalls) =>
              (prevCalls || []).map((c) => (c.id === updatedCall.id ? updatedCall : c))
            );
            setSelectedCall(updatedCall);
          }}
        />
      )}

      {activeSchema && (
        <SyntheticMetadataWizard
          open={syntheticWizardOpen}
          onOpenChange={setSyntheticWizardOpen}
          schema={activeSchema}
          existingCalls={calls || []}
          onRecordsGenerated={(newRecords) => {
            setCalls((prev) => [...(prev || []), ...newRecords]);
          }}
        />
      )}
    </div>
  );
}
