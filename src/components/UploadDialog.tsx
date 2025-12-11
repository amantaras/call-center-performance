import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CallRecord } from '@/types/call';
import { SchemaDefinition, getSchemaAudioPath } from '@/types/schema';
import { toast } from 'sonner';
import { Upload, Info, Warning } from '@phosphor-icons/react';

type MatchingStrategy = 'filename' | 'order' | 'auto';

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (updatedCalls: CallRecord[]) => void;
  activeSchema?: SchemaDefinition | null;
  existingCalls: CallRecord[];
}

export function UploadDialog({ open, onOpenChange, onUpload, activeSchema, existingCalls }: UploadDialogProps) {
  const [audioFiles, setAudioFiles] = useState<FileList | null>(null);
  const [matchingStrategy, setMatchingStrategy] = useState<MatchingStrategy>('auto');

  // Check if existing calls have an audio filename field
  const hasAudioFileNameField = useMemo(() => {
    if (!existingCalls || existingCalls.length === 0) return false;
    
    const firstCall = existingCalls[0];
    if (!firstCall.metadata) return false;
    
    // Look for any field that looks like an audio filename field
    // Check for standard field names first (from templates), then fuzzy match
    return Object.entries(firstCall.metadata).some(([key, value]) => {
      const keyLower = key.toLowerCase();
      // Standard field from templates
      if (keyLower === 'audio_file_name' || keyLower === 'audiofilename') {
        return true; // Field exists, even if empty (we can populate it)
      }
      // Fuzzy match for other audio-related fields with values
      return (
        keyLower.includes('audio') || 
        keyLower.includes('file') ||
        keyLower.includes('filetag') ||
        keyLower.includes('recording')
      ) && typeof value === 'string' && value.length > 0;
    });
  }, [existingCalls]);

  // Determine effective matching strategy
  const effectiveStrategy = useMemo(() => {
    if (matchingStrategy === 'auto') {
      return hasAudioFileNameField ? 'filename' : 'order';
    }
    return matchingStrategy;
  }, [matchingStrategy, hasAudioFileNameField]);

  const handleUpload = async () => {
    if (!audioFiles || audioFiles.length === 0) {
      toast.error('Please select at least one audio file');
      return;
    }

    if (!activeSchema) {
      toast.error('No active schema selected. Please select a schema first.');
      return;
    }

    if (!existingCalls || existingCalls.length === 0) {
      toast.error('No existing records found. Please import metadata first.');
      return;
    }

    try {
      const schemaAudioPath = getSchemaAudioPath(activeSchema);
      const updatedCalls: CallRecord[] = [];
      let matchedCount = 0;
      let unmatchedFiles: string[] = [];

      // Convert FileList to array for easier manipulation
      const filesArray = Array.from(audioFiles);

      if (effectiveStrategy === 'filename') {
        // Strategy 1: Match by filename in metadata
        for (const file of filesArray) {
          const fileName = file.name;
          
          // Find matching call record by checking metadata for audio filename
          const matchingCall = existingCalls.find(call => {
            const audioField = Object.entries(call.metadata || {}).find(([key, value]) => 
              typeof value === 'string' && 
              (value === fileName || value.endsWith(`/${fileName}`) || value.includes(fileName))
            );
            return !!audioField;
          });

          if (matchingCall) {
            const audioBlob = new Blob([file], { type: file.type });
            const audioUrl = URL.createObjectURL(audioBlob);
            
            const updatedCall: CallRecord = {
              ...matchingCall,
              audioFile: file,
              audioUrl: audioUrl,
              status: 'uploaded',
              updatedAt: new Date().toISOString(),
            };
            
            updatedCalls.push(updatedCall);
            matchedCount++;
          } else {
            unmatchedFiles.push(fileName);
          }
        }
      } else {
        // Strategy 2: Match by order (index-based)
        // Sort files alphabetically for consistent ordering
        const sortedFiles = [...filesArray].sort((a, b) => a.name.localeCompare(b.name));
        
        // Match files to calls by index
        const maxMatches = Math.min(sortedFiles.length, existingCalls.length);
        
        for (let i = 0; i < maxMatches; i++) {
          const file = sortedFiles[i];
          const call = existingCalls[i];
          
          const audioBlob = new Blob([file], { type: file.type });
          const audioUrl = URL.createObjectURL(audioBlob);
          
          // Create/update the audio_file_name field in metadata (standard field from templates)
          const updatedMetadata = {
            ...call.metadata,
            audio_file_name: file.name, // Use standard field name from templates
          };
          
          const updatedCall: CallRecord = {
            ...call,
            audioFile: file,
            audioUrl: audioUrl,
            status: 'uploaded',
            updatedAt: new Date().toISOString(),
            metadata: updatedMetadata,
          };
          
          updatedCalls.push(updatedCall);
          matchedCount++;
        }
        
        // Track files that couldn't be matched (more files than records)
        if (sortedFiles.length > existingCalls.length) {
          unmatchedFiles = sortedFiles.slice(existingCalls.length).map(f => f.name);
        }
      }

      if (updatedCalls.length === 0) {
        toast.error('No audio files could be matched to existing records.');
        return;
      }

      // Store audio files in IndexedDB with schema organization
      const { storeAudioFiles } = await import('@/lib/audio-storage');
      await storeAudioFiles(updatedCalls.map(call => ({
        id: call.id,
        audioFile: call.audioFile!,
        schemaId: activeSchema.id
      })));

      onUpload(updatedCalls);
      
      const strategyMsg = effectiveStrategy === 'order' 
        ? ' (matched by row order - audio_file_name field created)'
        : ' (matched by filename)';
      
      if (unmatchedFiles.length > 0) {
        toast.warning(`Matched ${matchedCount} file(s)${strategyMsg}. ${unmatchedFiles.length} unmatched: ${unmatchedFiles.slice(0, 3).join(', ')}${unmatchedFiles.length > 3 ? '...' : ''}`);
      } else {
        toast.success(`Successfully attached ${matchedCount} audio file(s) to existing records${strategyMsg}`);
      }
      
      setAudioFiles(null);
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to upload audio files');
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Audio Files</DialogTitle>
          <DialogDescription>
            {activeSchema ? (
              <>
                Select audio files to attach to existing records in <strong>{activeSchema.name}</strong>.
                <br />
                <span className="text-xs text-muted-foreground">
                  Files will be matched to metadata records. {existingCalls?.length || 0} record(s) available.
                </span>
              </>
            ) : (
              'Please select a schema before uploading audio files.'
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Info/Warning about audio filename field */}
          {existingCalls && existingCalls.length > 0 && (
            <Alert className={hasAudioFileNameField ? 'border-blue-200 bg-blue-50 dark:bg-blue-950' : 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950'}>
              {hasAudioFileNameField ? (
                <Info size={18} className="text-blue-600" />
              ) : (
                <Warning size={18} className="text-yellow-600" />
              )}
              <AlertDescription>
                {hasAudioFileNameField ? (
                  <span className="text-sm">
                    Audio filename field detected in metadata. Files will be matched by filename.
                  </span>
                ) : (
                  <span className="text-sm">
                    <strong>No audio filename field found</strong> in metadata. Files will be matched by row order and an <code className="bg-muted px-1 rounded">audio_file_name</code> field will be created automatically.
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Matching Strategy Selector */}
          <div className="space-y-2">
            <Label>Matching Strategy</Label>
            <Select
              value={matchingStrategy}
              onValueChange={(value: MatchingStrategy) => setMatchingStrategy(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  Auto ({hasAudioFileNameField ? 'will use filename' : 'will use order'})
                </SelectItem>
                <SelectItem value="filename">
                  Match by Filename (requires audio field in metadata)
                </SelectItem>
                <SelectItem value="order">
                  Match by Order (assigns files to rows sequentially)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {effectiveStrategy === 'filename' 
                ? 'Files will be matched to records where metadata contains the filename.'
                : 'Files will be sorted alphabetically and assigned to records by row order. An audio_file_name field will be added to metadata.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="audio-files">Audio Files</Label>
            <Input
              id="audio-files"
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg"
              multiple
              onChange={(e) => setAudioFiles(e.target.files)}
              className="cursor-pointer"
            />
            {audioFiles && audioFiles.length > 0 && (
              <div className="mt-2 p-3 bg-muted rounded-md">
                <p className="text-sm font-medium mb-2">Selected files ({audioFiles.length}):</p>
                <ul className="text-xs space-y-1 max-h-[150px] overflow-y-auto">
                  {Array.from(audioFiles).map((file, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Upload size={14} className="text-muted-foreground" />
                      <span className="truncate">{file.name}</span>
                      <span className="text-muted-foreground">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </li>
                  ))}
                </ul>
                {effectiveStrategy === 'order' && existingCalls && audioFiles.length !== existingCalls.length && (
                  <p className="text-xs text-yellow-600 mt-2">
                    ⚠️ {audioFiles.length} files selected but {existingCalls.length} records available. 
                    {audioFiles.length > existingCalls.length 
                      ? ` ${audioFiles.length - existingCalls.length} file(s) will not be matched.`
                      : ` ${existingCalls.length - audioFiles.length} record(s) will not have audio.`}
                  </p>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Supported formats: MP3, WAV, M4A, FLAC, OGG
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!audioFiles || audioFiles.length === 0 || !activeSchema}>
              <Upload className="mr-2" size={18} />
              Upload {audioFiles && audioFiles.length > 0 ? `${audioFiles.length} File(s)` : 'Files'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
