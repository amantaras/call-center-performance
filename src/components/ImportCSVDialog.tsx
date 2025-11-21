import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileArrowUp, Warning } from '@phosphor-icons/react';
import { CallRecord } from '@/types/call';
import { parseCSV, csvRowsToCallRecords, readFileAsText, readExcelFile } from '@/lib/csv-parser';
import { toast } from 'sonner';

interface ImportCSVDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (calls: CallRecord[]) => void;
}

export function ImportCSVDialog({ open, onOpenChange, onImport }: ImportCSVDialogProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [audioFolderPath, setAudioFolderPath] = useState('/audio');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sheetName, setSheetName] = useState('audio related info');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      const isCsv = file.name.endsWith('.csv');
      
      if (!isExcel && !isCsv) {
        toast.error('Please select a CSV or Excel file');
        return;
      }
      setCsvFile(file);
    }
  };

  const handleImport = async () => {
    if (!csvFile) {
      toast.error('Please select a file');
      return;
    }

    if (!audioFolderPath.trim()) {
      toast.error('Please specify the audio folder path');
      return;
    }

    const isLocalFilePath = /^[a-zA-Z]:|^\\\\/.test(audioFolderPath.trim());
    if (isLocalFilePath) {
      toast.error('Please provide an HTTP-accessible path (e.g., /audio or http://localhost:8080) because browsers cannot load C:/ files directly.');
      return;
    }

    setIsProcessing(true);

    try {
      let rows: any[];
      
      const isExcel = csvFile.name.endsWith('.xlsx') || csvFile.name.endsWith('.xls');
      
      if (isExcel) {
        // Read Excel file
        rows = await readExcelFile(csvFile, sheetName);
        toast.info(`Reading from sheet: "${sheetName}"`);
      } else {
        // Read CSV file
        const csvText = await readFileAsText(csvFile);
        rows = parseCSV(csvText);
      }

      if (rows.length === 0) {
        toast.error('No data found in file');
        return;
      }

      console.log('=== IMPORT DEBUG ===');
      console.log('Total rows:', rows.length);
      console.log('First row columns:', Object.keys(rows[0]));
      console.log('First row data:', rows[0]);
      console.log('Second row data:', rows[1]);

      if (rows.length > 0) {
        const columnNames = Object.keys(rows[0]);
        toast.info(`Columns detected: ${columnNames.join(', ')}`);
        try {
          const samplePreview = JSON.stringify(rows[0]).slice(0, 180);
          toast.info(`Sample row: ${samplePreview}`);
        } catch (error) {
          console.warn('Failed to stringify sample row', error);
        }
      }

      const callRecords = csvRowsToCallRecords(rows, audioFolderPath);
      
      console.log('Converted call records:', callRecords.length);
      console.log('First call record:', callRecords[0]);
      
      if (callRecords.length > 0) {
        const firstRecord = callRecords[0];
        toast.info(`First record - Agent: "${firstRecord.metadata.agentName}" Borrower: "${firstRecord.metadata.borrowerName}"`);
      }

      // Fetch audio files from URLs
      toast.info('Fetching audio files...');
      const { fetchAudioFilesForCalls } = await import('@/lib/csv-parser');
      const callsWithAudio = await fetchAudioFilesForCalls(callRecords);
      const successCount = callsWithAudio.filter(c => c.audioFile).length;
      
      onImport(callsWithAudio);
      toast.success(`Successfully imported ${callRecords.length} call records! (${successCount} with audio files)`);
      onOpenChange(false);
      
      // Reset state
      setCsvFile(null);
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import file');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Calls from Excel/CSV</DialogTitle>
          <DialogDescription>
            Upload an Excel file (.xlsx) or CSV file with call metadata from the "audio related info" sheet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <Warning size={18} />
            <AlertDescription>
              Make sure your CSV file has the correct column headers: TITLE, BILLID, ORDERID, User_id, File_tag,
              Agent name, Product, Customer type, Borrower name, Nationality, Days past due, Due amount, Follow up status.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="csv-file">Excel or CSV File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="csv-file"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              {csvFile && (
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {csvFile.name}
                </span>
              )}
            </div>
          </div>

          {csvFile && (csvFile.name.endsWith('.xlsx') || csvFile.name.endsWith('.xls')) && (
            <div className="space-y-2">
              <Label htmlFor="sheet-name">Sheet Name</Label>
              <Input
                id="sheet-name"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                placeholder="audio related info"
              />
              <p className="text-xs text-muted-foreground">
                Name of the Excel sheet containing the call metadata (default: "audio related info")
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="audio-folder">Audio Folder Path</Label>
            <Input
              id="audio-folder"
              value={audioFolderPath}
              onChange={(e) => setAudioFolderPath(e.target.value)}
              placeholder="C:\path\to\audio\files"
            />
            <p className="text-xs text-muted-foreground">
              Provide an HTTP-accessible path (e.g., <code>/audio</code> or <code>http://localhost:8080</code>). Browsers{' '}
              cannot fetch <code>C:\\</code> file paths directly.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!csvFile || isProcessing}>
            <FileArrowUp className="mr-2" size={18} />
            {isProcessing ? 'Importing...' : 'Import Calls'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
