/**
 * Service for exporting call data with audio files and metadata to Excel
 */
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { CallRecord } from '@/types/call';
import { getAudioFile } from '@/lib/audio-storage';

export interface ExportProgress {
  current: number;
  total: number;
  status: string;
}

/**
 * Export calls with audio files to a ZIP containing:
 * - Audio files in an 'audio' folder
 * - Excel file with metadata and audio file references
 */
export async function exportCallsWithAudio(
  calls: CallRecord[],
  onProgress?: (progress: ExportProgress) => void
): Promise<Blob> {
  const zip = new JSZip();
  const audioFolder = zip.folder('audio');
  
  if (!audioFolder) {
    throw new Error('Failed to create audio folder in ZIP');
  }

  // Prepare Excel data
  const excelData: any[] = [];
  const callsWithAudio = calls.filter(c => c.audioFile || c.audioUrl);
  
  if (callsWithAudio.length === 0) {
    throw new Error('No calls with audio files found to export');
  }

  let processedCount = 0;
  const total = callsWithAudio.length;

  for (const call of callsWithAudio) {
    processedCount++;
    
    if (onProgress) {
      onProgress({
        current: processedCount,
        total,
        status: `Processing call ${processedCount}/${total}: ${call.metadata?.borrowerName || call.id}`
      });
    }

    // Get audio blob from storage
    let audioBlob: Blob | null = null;
    let audioFileName = '';

    if (call.audioFile instanceof Blob) {
      audioBlob = call.audioFile;
    } else {
      // Try to retrieve from IndexedDB
      audioBlob = await getAudioFile(call.id, call.schemaId);
    }

    if (audioBlob) {
      // Determine file extension from blob type (default to mp3 since Azure TTS generates audio/mpeg)
      const extension = audioBlob.type.includes('mpeg') || audioBlob.type.includes('mp3') ? 'mp3' : 
                        audioBlob.type.includes('wav') ? 'wav' : 
                        audioBlob.type.includes('ogg') ? 'ogg' : 
                        audioBlob.type.includes('webm') ? 'webm' : 'mp3'; // Default to mp3
      
      audioFileName = `${call.id}.${extension}`;
      
      // Add audio file to ZIP
      audioFolder.file(audioFileName, audioBlob);
    }

    // Prepare row data for Excel
    const row: any = {
      'Call ID': call.id,
      'Audio File': audioBlob ? `audio/${audioFileName}` : call.audioUrl || 'N/A',
      'Status': call.status,
      'Created At': call.createdAt,
      'Updated At': call.updatedAt,
      'Schema ID': call.schemaId,
      'Schema Version': call.schemaVersion,
    };

    // Add metadata fields
    if (call.metadata) {
      for (const [key, value] of Object.entries(call.metadata)) {
        // Convert complex objects to JSON strings
        row[`Metadata: ${key}`] = typeof value === 'object' ? JSON.stringify(value) : value;
      }
    }

    // Add transcript data
    if (call.transcript) {
      row['Transcript'] = call.transcript;
      row['Transcript Confidence'] = call.transcriptConfidence;
      row['Transcript Locale'] = call.transcriptLocale;
      row['Transcript Duration (ms)'] = call.transcriptDuration;
      row['Speaker Count'] = call.transcriptSpeakerCount;
    }

    // Add evaluation data
    if (call.evaluation) {
      row['Total Score'] = call.evaluation.totalScore;
      row['Max Score'] = call.evaluation.maxScore;
      row['Score Percentage'] = call.evaluation.percentage;
      row['Overall Feedback'] = call.evaluation.overallFeedback;
      
      // Add evaluation results summary
      if (call.evaluation.results && call.evaluation.results.length > 0) {
        const passed = call.evaluation.results.filter(r => r.passed).length;
        const failed = call.evaluation.results.filter(r => !r.passed).length;
        row['Criteria Passed'] = passed;
        row['Criteria Failed'] = failed;
      }
    }

    // Add sentiment data
    if (call.overallSentiment) {
      row['Overall Sentiment'] = call.overallSentiment;
    }
    
    if (call.sentimentSummary) {
      row['Sentiment Summary'] = call.sentimentSummary;
    }

    if (call.sentimentSegments && call.sentimentSegments.length > 0) {
      row['Sentiment Segments Count'] = call.sentimentSegments.length;
    }

    excelData.push(row);
  }

  // Create workbook
  const workbook = XLSX.utils.book_new();
  
  // Create main sheet with call data
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  
  // Auto-size columns
  const columnWidths = Object.keys(excelData[0] || {}).map(key => ({
    wch: Math.max(key.length, 15)
  }));
  worksheet['!cols'] = columnWidths;
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Calls');

  // Create evaluation details sheet if any calls have evaluations
  const callsWithEvaluation = callsWithAudio.filter(c => c.evaluation && c.evaluation.results);
  if (callsWithEvaluation.length > 0) {
    const evaluationData: any[] = [];
    
    for (const call of callsWithEvaluation) {
      if (call.evaluation && call.evaluation.results) {
        for (const result of call.evaluation.results) {
          evaluationData.push({
            'Call ID': call.id,
            'Borrower Name': call.metadata?.borrowerName || 'N/A',
            'Criterion ID': result.criterionId,
            'Score': result.score,
            'Passed': result.passed ? 'Yes' : 'No',
            'Evidence': result.evidence,
            'Reasoning': result.reasoning
          });
        }
      }
    }
    
    if (evaluationData.length > 0) {
      const evalWorksheet = XLSX.utils.json_to_sheet(evaluationData);
      evalWorksheet['!cols'] = [
        { wch: 25 }, // Call ID
        { wch: 20 }, // Borrower Name
        { wch: 15 }, // Criterion ID
        { wch: 10 }, // Score
        { wch: 10 }, // Passed
        { wch: 50 }, // Evidence
        { wch: 50 }  // Reasoning
      ];
      XLSX.utils.book_append_sheet(workbook, evalWorksheet, 'Evaluation Details');
    }
  }

  // Create sentiment timeline sheet if any calls have sentiment segments
  const callsWithSentiment = callsWithAudio.filter(c => c.sentimentSegments && c.sentimentSegments.length > 0);
  if (callsWithSentiment.length > 0) {
    const sentimentData: any[] = [];
    
    for (const call of callsWithSentiment) {
      if (call.sentimentSegments) {
        for (const segment of call.sentimentSegments) {
          sentimentData.push({
            'Call ID': call.id,
            'Borrower Name': call.metadata?.borrowerName || 'N/A',
            'Start Time (ms)': segment.startMilliseconds,
            'End Time (ms)': segment.endMilliseconds,
            'Duration (s)': ((segment.endMilliseconds - segment.startMilliseconds) / 1000).toFixed(2),
            'Speaker': segment.speaker !== undefined ? `Speaker ${segment.speaker}` : 'N/A',
            'Sentiment': segment.sentiment,
            'Intensity': segment.intensity !== undefined ? `${segment.intensity}/10` : 'N/A',
            'Confidence': segment.confidence !== undefined ? segment.confidence.toFixed(3) : 'N/A',
            'Summary': segment.summary || '',
            'Rationale': segment.rationale || '',
            'Emotional Triggers': segment.emotionalTriggers ? segment.emotionalTriggers.join(', ') : ''
          });
        }
      }
    }
    
    if (sentimentData.length > 0) {
      const sentimentWorksheet = XLSX.utils.json_to_sheet(sentimentData);
      sentimentWorksheet['!cols'] = [
        { wch: 25 }, // Call ID
        { wch: 20 }, // Borrower Name
        { wch: 15 }, // Start Time
        { wch: 15 }, // End Time
        { wch: 12 }, // Duration
        { wch: 12 }, // Speaker
        { wch: 12 }, // Sentiment
        { wch: 10 }, // Intensity
        { wch: 12 }, // Confidence
        { wch: 40 }, // Summary
        { wch: 50 }, // Rationale
        { wch: 50 }  // Emotional Triggers
      ];
      XLSX.utils.book_append_sheet(workbook, sentimentWorksheet, 'Sentiment Timeline');
    }
  }

  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const excelBlob = new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });

  // Add Excel to ZIP
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  zip.file(`call_center_export_${timestamp}.xlsx`, excelBlob);

  // Generate ZIP file
  if (onProgress) {
    onProgress({
      current: total,
      total,
      status: 'Generating ZIP file...'
    });
  }

  const zipBlob = await zip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  return zipBlob;
}

/**
 * Trigger download of the exported ZIP file
 */
export function downloadExportedZip(zipBlob: Blob, filename?: string): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const defaultFilename = `call_center_export_${timestamp}.zip`;
  
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export selected calls or all calls with audio
 */
export async function exportCalls(
  allCalls: CallRecord[],
  selectedCallIds?: Set<string>,
  onProgress?: (progress: ExportProgress) => void
): Promise<void> {
  // Filter calls to export
  const callsToExport = selectedCallIds && selectedCallIds.size > 0
    ? allCalls.filter(c => selectedCallIds.has(c.id))
    : allCalls;

  if (callsToExport.length === 0) {
    throw new Error('No calls selected for export');
  }

  // Export to ZIP
  const zipBlob = await exportCallsWithAudio(callsToExport, onProgress);
  
  // Download
  downloadExportedZip(zipBlob);
}
