import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { defaultCalls } from '@/lib/default-calls';
import { CallRecord } from '@/types/call';
import { SchemaDefinition } from '@/types/schema';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, MagnifyingGlass, ArrowCounterClockwise, Microphone, FileCsv, Sparkle } from '@phosphor-icons/react';
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
  
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [importCSVOpen, setImportCSVOpen] = useState(false);
  const [syntheticWizardOpen, setSyntheticWizardOpen] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [transcribingIds, setTranscribingIds] = useState<Set<string>>(new Set());
  const [evaluatingIds, setEvaluatingIds] = useState<Set<string>>(new Set());
  const [selectedCallIds, setSelectedCallIds] = useState<Set<string>>(new Set());

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
    const transcribableCalls = (calls || []).filter(
      (call) => call.status === 'uploaded' && call.audioFile,
    );
    setSelectedCallIds(new Set(transcribableCalls.map((c) => c.id)));
  };

  const handleDeselectAll = () => {
    setSelectedCallIds(new Set());
  };

  const handleToggleSelect = (callId: string) => {
    setSelectedCallIds((prev) => {
      const next = new Set(prev);
      if (next.has(callId)) {
        next.delete(callId);
      } else {
        next.add(callId);
      }
      return next;
    });
  };

  const filteredCalls = (calls || []).filter((call) => {
    // Filter by active schema
    if (activeSchema && call.schemaId !== activeSchema.id) {
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
              <Button onClick={handleDeselectAll} variant="outline" size="sm">
                Deselect All
              </Button>
            </>
          )}
          {selectedCallIds.size === 0 && (calls || []).some(c => c.status === 'uploaded' && c.audioFile) && (
            <Button onClick={handleSelectAll} variant="outline">
              Select All
            </Button>
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
