import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CallRecord, CallMetadata } from '@/types/call';
import { toast } from 'sonner';

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (calls: CallRecord[]) => void;
}

export function UploadDialog({ open, onOpenChange, onUpload }: UploadDialogProps) {
  const [metadataText, setMetadataText] = useState('');
  const [transcriptText, setTranscriptText] = useState('');

  const parseMetadata = (text: string): CallMetadata[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const metadata: CallMetadata[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split('\t');
      if (parts.length >= 12) {
        const fileTag = parts[4];
        // Check if fileTag looks like a blob URL (contains .mp3, .wav, etc.)
        const audioUrl = fileTag.match(/\.(mp3|wav|m4a|flac|ogg)$/i) ? fileTag : undefined;
        
        metadata.push({
          time: parts[0],
          billId: parts[1],
          orderId: parts[2],
          userId: parts[3],
          fileTag: parts[4],
          audioUrl: audioUrl, // Store the blob URL if it's an audio file
          agentName: parts[5],
          product: parts[6],
          customerType: parts[7],
          borrowerName: parts[8],
          nationality: parts[9],
          daysPastDue: parseInt(parts[10]) || 0,
          dueAmount: parseFloat(parts[11]) || 0,
          followUpStatus: parts[12] || '',
        });
      }
    }

    return metadata;
  };

  const handleUpload = () => {
    try {
      const metadataList = parseMetadata(metadataText);
      
      if (metadataList.length === 0) {
        toast.error('No valid metadata found. Please check your input format.');
        return;
      }

      const calls: CallRecord[] = metadataList.map((metadata) => {
        const parsedCreatedAt = metadata.time ? new Date(metadata.time) : new Date();
        const createdAtDate = Number.isNaN(parsedCreatedAt.getTime()) ? new Date() : parsedCreatedAt;

        return {
        id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        metadata,
        // Only add transcript if manually provided OR if no audioUrl (for testing)
        transcript: transcriptText || (!metadata.audioUrl ? `Sample transcript for call with ${metadata.borrowerName}. This is a placeholder transcript that would normally come from audio transcription. The agent ${metadata.agentName} spoke with the customer about ${metadata.product} with ${metadata.daysPastDue} days past due and amount ${metadata.dueAmount}.` : undefined),
        // Set status based on whether we have audio URL or manual transcript
        status: metadata.audioUrl ? 'uploaded' : (transcriptText ? 'transcribed' : 'transcribed'),
          createdAt: createdAtDate.toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

      onUpload(calls);
      toast.success(`Successfully uploaded ${calls.length} call(s)`);
      setMetadataText('');
      setTranscriptText('');
    } catch (error) {
      toast.error('Failed to parse metadata. Please check your format.');
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Calls</DialogTitle>
          <DialogDescription>
            Paste your call metadata (tab-separated format from Excel) below.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="metadata">Call Metadata (Tab-separated)</Label>
            <Textarea
              id="metadata"
              placeholder="TIME	BILLID	ORDERID	user_id	file tag	Agent name	Product	Customer type	Borrower name	Nationality	Days past due	Due amount	Follow up status
2025/9/3 17:52:08	20250429100109304		100016218425	938ec846f424419ea18b29533567f40b.mp3	Raj	SNPL	Borrower	MUHAMMAD ABU BAKAR	Pakistan	95	1348.34	HE WILL PAY..."
              value={metadataText}
              onChange={(e) => setMetadataText(e.target.value)}
              className="font-mono text-xs min-h-[200px]"
            />
            <p className="text-xs text-muted-foreground">
              Copy and paste directly from Excel with headers included
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transcript">
              Sample Transcript (Optional - for testing)
            </Label>
            <Textarea
              id="transcript"
              placeholder="Enter a sample transcript or leave empty to generate placeholder text..."
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              className="min-h-[150px]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload}>Upload Calls</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
