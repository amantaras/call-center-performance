import { CallRecord, CallMetadata } from '@/types/call';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';

export interface CSVRow {
  TITLE?: string;
  BILLID?: string;
  ORDERID?: string;
  User_id?: string;
  File_tag?: string;
  'Agent name'?: string;
  Product?: string;
  'Customer type'?: string;
  'Borrower name'?: string;
  Nationality?: string;
  'Days past due'?: string;
  'Due amount'?: string;
  'Follow up status'?: string;
}

/**
 * Parse CSV text into array of objects
 */
export function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Parse a single CSV line, handling quoted values with commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i++; // Skip next quote
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Get value from row with flexible column name matching (case-insensitive)
 */
function getRowValue(row: any, ...possibleKeys: string[]): string {
  // First try exact match
  for (const key of possibleKeys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return String(row[key]);
    }
  }
  
  // Then try case-insensitive match
  const rowKeysLower = Object.keys(row).reduce((acc, k) => {
    acc[k.toLowerCase().trim()] = k;
    return acc;
  }, {} as Record<string, string>);
  
  for (const key of possibleKeys) {
    const normalizedKey = key.toLowerCase().trim();
    const actualKey = rowKeysLower[normalizedKey];
    if (actualKey && row[actualKey] !== undefined && row[actualKey] !== null && row[actualKey] !== '') {
      return String(row[actualKey]);
    }
  }
  
  return '';
}

/**
 * Convert CSV rows to CallRecords
 */
export function csvRowsToCallRecords(
  rows: CSVRow[],
  audioFolderPath: string,
): CallRecord[] {
  // Log the first row to help debug column names
  if (rows.length > 0) {
    console.log('=== CSV PARSER DEBUG ===');
    console.log('Total rows to convert:', rows.length);
    console.log('Excel column names found:', Object.keys(rows[0]));
    console.log('First row raw data:', rows[0]);
    
    // Test extraction with first row
    const firstRow = rows[0];
    const agentName = getRowValue(firstRow, 'Agent name', 'AgentName', 'agent_name', 'Agent');
    const borrowerName = getRowValue(firstRow, 'Borrower name', 'BorrowerName', 'borrower_name', 'Borrower');
    const product = getRowValue(firstRow, 'Product', 'product');
    const daysPastDue = getRowValue(firstRow, 'Days past due', 'DaysPastDue', 'days_past_due', 'Days Past Due');
    const dueAmount = getRowValue(firstRow, 'Due amount', 'DueAmount', 'due_amount', 'Due Amount');
    
    console.log('EXTRACTED VALUES:', { 
      agentName, 
      borrowerName, 
      product,
      daysPastDue,
      dueAmount
    });
  }

  return rows.map(row => {
    const fileTag = getRowValue(row, 'File_tag', 'File tag', 'file_tag', 'FileTag');
    const audioFileName = fileTag.split('/').pop() || fileTag;
    const audioUrl = audioFileName 
      ? `${audioFolderPath}/${audioFileName}`
      : undefined;

    const metadata: CallMetadata = {
      time: getRowValue(row, 'TITLE', 'Title', 'title'),
      billId: getRowValue(row, 'BILLID', 'BillId', 'Bill ID', 'bill_id'),
      orderId: getRowValue(row, 'ORDERID', 'OrderId', 'Order ID', 'order_id'),
      userId: getRowValue(row, 'User_id', 'UserId', 'User ID', 'user_id'),
      fileTag: fileTag,
      audioUrl: audioUrl,
      agentName: getRowValue(row, 'Agent name', 'AgentName', 'agent_name', 'Agent'),
      product: getRowValue(row, 'Product', 'product'),
      customerType: getRowValue(row, 'Customer type', 'CustomerType', 'customer_type'),
      borrowerName: getRowValue(row, 'Borrower name', 'BorrowerName', 'borrower_name', 'Borrower'),
      nationality: getRowValue(row, 'Nationality', 'nationality'),
      daysPastDue: parseInt(getRowValue(row, 'Days past due', 'DaysPastDue', 'days_past_due', 'Days Past Due') || '0', 10),
      dueAmount: parseFloat(getRowValue(row, 'Due amount', 'DueAmount', 'due_amount', 'Due Amount') || '0'),
      followUpStatus: getRowValue(row, 'Follow up status', 'FollowUpStatus', 'follow_up_status', 'Follow-up status'),
    };

    const createdAt = metadata.time || new Date().toISOString();

    return {
      id: uuidv4(),
      metadata,
      audioUrl, // Store URL for fetching later
      status: 'uploaded' as const,
      createdAt,
      updatedAt: createdAt,
    };
  });
}

/**
 * Fetch audio files from URLs and attach them to call records
 * Audio files are stored in IndexedDB to avoid localStorage quota issues
 */
export async function fetchAudioFilesForCalls(calls: CallRecord[]): Promise<CallRecord[]> {
  const { storeAudioFile } = await import('@/lib/audio-storage');
  
  const results = await Promise.allSettled(
    calls.map(async (call) => {
      if (!call.audioUrl) {
        return call;
      }

      try {
        console.log(`📥 Fetching audio: ${call.audioUrl}`);
        const response = await fetch(call.audioUrl);
        if (!response.ok) {
          console.warn(`Failed to fetch ${call.audioUrl}: ${response.status}`);
          return call;
        }
        const blob = await response.blob();
        const fileName = call.audioUrl.split('/').pop() || 'audio.mp3';
        const file = new File([blob], fileName, { type: blob.type || 'audio/mpeg' });
        
        // Store in IndexedDB for persistence
        await storeAudioFile(call.id, file);
        
        return {
          ...call,
          audioFile: file,
        };
      } catch (error) {
        console.warn(`Error fetching audio for ${call.id}:`, error);
        return call;
      }
    })
  );

  return results.map((result, index) => 
    result.status === 'fulfilled' ? result.value : calls[index]
  );
}

/**
 * Restore audio files from IndexedDB (called when loading from localStorage)
 */
export async function restoreAudioFilesFromStorage(calls: CallRecord[]): Promise<CallRecord[]> {
  const { getAudioFile } = await import('@/lib/audio-storage');
  
  const results = await Promise.allSettled(
    calls.map(async (call) => {
      if (call.audioFile) {
        return call; // Already has audio file
      }

      try {
        const blob = await getAudioFile(call.id);
        if (blob) {
          const fileName = call.audioUrl?.split('/').pop() || 'audio.mp3';
          const file = new File([blob], fileName, { type: blob.type });
          return {
            ...call,
            audioFile: file,
          };
        }
      } catch (error) {
        console.warn(`Failed to restore audio for ${call.id}:`, error);
      }

      return call;
    })
  );

  return results.map((result, index) => 
    result.status === 'fulfilled' ? result.value : calls[index]
  );
}

/**
 * Read file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

/**
 * Read Excel file and extract data from specific sheet
 */
export function readExcelFile(file: File, sheetName: string = 'audio related info'): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Check if the specified sheet exists
        if (!workbook.SheetNames.includes(sheetName)) {
          // Try to use the first sheet if specified sheet doesn't exist
          const firstSheet = workbook.SheetNames[0];
          console.warn(`Sheet "${sheetName}" not found, using "${firstSheet}" instead`);
          const worksheet = workbook.Sheets[firstSheet];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          resolve(normalizeExcelRows(jsonData));
        } else {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          resolve(normalizeExcelRows(jsonData));
        }
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
}

function normalizeExcelRows(rows: any[]): CSVRow[] {
  if (!rows || rows.length === 0) {
    return [];
  }

  const firstRow = rows[0];
  const keys = Object.keys(firstRow);
  const hasGenericKeys = keys.length > 0 && keys.every((key) => key.startsWith('__EMPTY'));

  if (!hasGenericKeys) {
    return rows as CSVRow[];
  }

  const headerNames = keys.map((key) => String(firstRow[key] || '').trim());
  const dataRows = rows.slice(1);

  return dataRows.map((row) => {
    const normalizedRow: Record<string, any> = {};
    keys.forEach((key, index) => {
      const header = headerNames[index];
      if (header) {
        normalizedRow[header] = row[key];
      }
    });
    return normalizedRow as CSVRow;
  });
}
