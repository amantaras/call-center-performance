import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileArrowUp, Warning, CheckCircle, Info } from '@phosphor-icons/react';
import { CallRecord } from '@/types/call';
import { SchemaDefinition } from '@/types/schema';
import { parseCSV, readFileAsText, readExcelFile } from '@/lib/csv-parser';
import { detectSchemaForRows } from '@/lib/csv-parser';
import { getAllSchemas } from '@/services/schema-manager';
import { mapRow } from '@/services/schema-mapper';
import { toast } from 'sonner';

interface ImportCSVDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (calls: CallRecord[]) => void;
  activeSchema: SchemaDefinition | null;
}

export function ImportCSVDialog({ open, onOpenChange, onImport, activeSchema }: ImportCSVDialogProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [audioFolderPath, setAudioFolderPath] = useState('/audio');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sheetName, setSheetName] = useState('audio related info');
  
  // Schema detection state
  const [availableSchemas, setAvailableSchemas] = useState<SchemaDefinition[]>([]);
  const [detectedSchema, setDetectedSchema] = useState<SchemaDefinition | null>(null);
  const [selectedSchema, setSelectedSchema] = useState<SchemaDefinition | null>(null);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [parsedRows, setParsedRows] = useState<any[] | null>(null);

  // Load available schemas on mount
  useEffect(() => {
    const schemas = getAllSchemas();
    setAvailableSchemas(schemas);
    setSelectedSchema(activeSchema);
  }, [activeSchema]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isCsv = file.name.endsWith('.csv');
    
    if (!isExcel && !isCsv) {
      toast.error('Please select a CSV or Excel file');
      return;
    }
    
    setCsvFile(file);
    
    // Auto-detect schema
    await detectSchema(file);
  };

  const detectSchema = async (file: File) => {
    setIsDetecting(true);
    try {
      let rows: any[];
      
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      
      if (isExcel) {
        rows = await readExcelFile(file, sheetName);
      } else {
        const csvText = await readFileAsText(file);
        rows = parseCSV(csvText);
      }

      if (rows.length === 0) {
        toast.error('No data found in file');
        return;
      }

      setParsedRows(rows);

      // Detect best matching schema
      const result = detectSchemaForRows(rows, availableSchemas);
      
      if (result.schema) {
        setDetectedSchema(result.schema);
        setSelectedSchema(result.schema);
        setMatchScore(result.matchScore);
        
        toast.success(
          `Schema detected: ${result.schema.name} (${Math.round(result.matchScore * 100)}% match)`,
          { duration: 4000 }
        );
      } else {
        toast.warning('No matching schema found. Please select manually.');
        setDetectedSchema(null);
        setMatchScore(null);
      }
    } catch (error) {
      console.error('Schema detection error:', error);
      toast.error('Failed to detect schema');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleImport = async () => {
    if (!csvFile) {
      toast.error('Please select a file');
      return;
    }

    if (!selectedSchema) {
      toast.error('Please select a schema');
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
      // Use parsed rows if available, otherwise re-parse
      let rows = parsedRows;
      if (!rows) {
        const isExcel = csvFile.name.endsWith('.xlsx') || csvFile.name.endsWith('.xls');
        
        if (isExcel) {
          rows = await readExcelFile(csvFile, sheetName);
        } else {
          const csvText = await readFileAsText(csvFile);
          rows = parseCSV(csvText);
        }
      }

      if (!rows || rows.length === 0) {
        toast.error('No data found in file');
        return;
      }

      console.log('=== IMPORT WITH SCHEMA ===');
      console.log('Selected schema:', selectedSchema.name);
      console.log('Total rows:', rows.length);

      // Convert rows to CallRecords using selected schema
      const callRecords: CallRecord[] = rows.map((row, index) => {
        const metadata = mapRow(row, selectedSchema);
        
        return {
          id: `import-${Date.now()}-${index}`,
          status: 'uploaded' as const,
          createdAt: new Date().toISOString(),
          schemaId: selectedSchema.id,
          schemaVersion: selectedSchema.version,
          metadata,
        };
      });

      console.log('Converted call records:', callRecords.length);
      console.log('First call record:', callRecords[0]);

      // Fetch audio files from URLs if audioUrl field exists in metadata
      const audioUrlField = selectedSchema.fields.find(f => 
        f.name.toLowerCase().includes('audiourl') || 
        f.name.toLowerCase().includes('audio_url') ||
        f.name.toLowerCase().includes('file')
      );

      if (audioUrlField) {
        toast.info('Fetching audio files...');
        const { fetchAudioFilesForCalls } = await import('@/lib/csv-parser');
        const callsWithAudio = await fetchAudioFilesForCalls(callRecords);
        const successCount = callsWithAudio.filter(c => c.audioFile).length;
        
        onImport(callsWithAudio);
        toast.success(`Successfully imported ${callRecords.length} call records! (${successCount} with audio files)`);
      } else {
        onImport(callRecords);
        toast.success(`Successfully imported ${callRecords.length} call records!`);
      }
      
      onOpenChange(false);
      
      // Reset state
      setCsvFile(null);
      setParsedRows(null);
      setDetectedSchema(null);
      setMatchScore(null);
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
