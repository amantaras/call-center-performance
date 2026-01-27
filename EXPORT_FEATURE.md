# Call Export Feature

## Overview

The Call Export feature allows users to export call data along with audio files and comprehensive metadata to a downloadable ZIP archive. The exported package includes:

1. **Audio Files**: All audio recordings organized in an `audio/` folder
2. **Excel Workbook**: Multi-sheet Excel file with detailed call metadata, evaluation results, and sentiment analysis

## Features

### Export Options

- **Export Selected Calls**: Export only the calls you've selected in the UI
- **Export All Calls**: Export all calls with audio files

### Excel Workbook Structure

The generated Excel file contains multiple sheets with comprehensive data:

#### 1. Calls Sheet (Main Sheet)
Contains core call information:
- Call ID
- Audio File path (relative path in ZIP: `audio/filename.mp3`)
- Status
- Created/Updated timestamps
- Schema ID and Version
- All metadata fields (prefixed with "Metadata:")
- Transcript data (text, confidence, locale, duration, speaker count)
- Evaluation scores (total, max, percentage, feedback, criteria passed/failed)
- Overall sentiment and sentiment summary

#### 2. Evaluation Details Sheet
Detailed breakdown of evaluation criteria:
- Call ID
- Borrower Name
- Criterion ID
- Score
- Passed/Failed status
- Evidence
- Reasoning

#### 3. Sentiment Timeline Sheet
Sentiment analysis over time:
- Call ID
- Borrower Name
- Start/End timestamps
- Duration
- Speaker identification
- Sentiment label (positive/neutral/negative)
- Confidence score
- Summary and rationale

## Usage

### From the UI

1. **Navigate to Calls View**
2. **Select Calls** (Optional):
   - Click checkboxes to select specific calls
   - Use "Select All" to select all visible calls
   - Use Shift+Click for range selection
3. **Click Export Button**:
   - When calls are selected: "Export (N)" button appears
   - When no calls selected: "Export All" button available
4. **Monitor Progress**: Progress indicator shows export status
5. **Download**: ZIP file automatically downloads when complete

### Export Progress

The export process shows real-time progress:
- Current file being processed
- Number of calls processed
- Status messages (e.g., "Processing call 5/20: John Doe")

## Technical Implementation

### Files Created/Modified

1. **`src/services/call-export.ts`**: Core export service
   - `exportCallsWithAudio()`: Main export function
   - `exportCalls()`: Simplified export wrapper
   - `downloadExportedZip()`: Browser download trigger

2. **`src/components/views/CallsView.tsx`**: UI integration
   - Export button components
   - Progress tracking
   - State management

### Dependencies

- **xlsx**: Excel file generation
- **jszip**: ZIP archive creation

### Data Flow

```
User Clicks Export
    ↓
Filter calls (selected or all)
    ↓
Retrieve audio from IndexedDB
    ↓
Generate Excel sheets
    ↓
Create ZIP archive
    ↓
Trigger browser download
```

## File Naming Convention

### ZIP Archive
Format: `call_center_export_YYYY-MM-DD.zip`
- Example: `call_center_export_2025-12-11.zip`

### Audio Files
Format: `{callId}.{extension}`
- Example: `call-123456.mp3`
- Extensions: mp3, wav, ogg, webm (based on audio type)

### Excel File
Format: `call_center_export_YYYY-MM-DD.xlsx`
- Example: `call_center_export_2025-12-11.xlsx`

## ZIP Archive Structure

```
call_center_export_2025-12-11.zip
├── audio/
│   ├── call-001.mp3
│   ├── call-002.mp3
│   └── call-003.mp3
└── call_center_export_2025-12-11.xlsx
```

## Error Handling

### Common Errors

1. **No Audio Files Found**
   - Message: "No calls with audio files found to export"
   - Solution: Ensure calls have audio files uploaded or generated

2. **No Calls Selected**
   - Message: "No calls selected for export"
   - Solution: Select at least one call or use "Export All"

3. **Export Failed**
   - Message: Specific error message
   - Check browser console for details
   - Ensure sufficient storage space

## Performance Considerations

- **Large Exports**: Exports with many calls (100+) may take several seconds
- **Audio File Sizes**: Total ZIP size depends on audio quality and duration
- **Memory Usage**: Browser memory is used during ZIP generation
- **Progress Tracking**: Real-time updates keep user informed

## Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Edge, Safari (latest versions)
- **Requirements**: 
  - IndexedDB support (for audio retrieval)
  - Blob API support (for file generation)
  - Download attribute support (for file download)

## Future Enhancements

Potential improvements:
- [ ] Custom export filters (date range, evaluation score, sentiment)
- [ ] Export format options (CSV, JSON)
- [ ] Scheduled exports
- [ ] Export templates (customize included fields)
- [ ] Cloud storage integration (upload to Azure Blob, S3, etc.)
- [ ] Export history tracking
- [ ] Compressed audio options (reduce file sizes)

## API Reference

### `exportCalls()`

```typescript
async function exportCalls(
  allCalls: CallRecord[],
  selectedCallIds?: Set<string>,
  onProgress?: (progress: ExportProgress) => void
): Promise<void>
```

**Parameters:**
- `allCalls`: Array of all call records
- `selectedCallIds`: Optional set of call IDs to export (if undefined, exports all)
- `onProgress`: Optional callback for progress updates

**Progress Object:**
```typescript
interface ExportProgress {
  current: number;      // Current file number
  total: number;        // Total files to process
  status: string;       // Status message
}
```

### `exportCallsWithAudio()`

```typescript
async function exportCallsWithAudio(
  calls: CallRecord[],
  onProgress?: (progress: ExportProgress) => void
): Promise<Blob>
```

**Returns:** ZIP file as Blob

### `downloadExportedZip()`

```typescript
function downloadExportedZip(
  zipBlob: Blob,
  filename?: string
): void
```

Triggers browser download of the ZIP file.

## Example Usage

```typescript
import { exportCalls } from '@/services/call-export';

// Export selected calls
const selectedIds = new Set(['call-1', 'call-2']);
await exportCalls(
  allCalls,
  selectedIds,
  (progress) => {
    console.log(`${progress.current}/${progress.total}: ${progress.status}`);
  }
);

// Export all calls
await exportCalls(allCalls);
```

## Testing Checklist

- [ ] Export single call with audio
- [ ] Export multiple selected calls
- [ ] Export all calls
- [ ] Verify Excel structure and data accuracy
- [ ] Verify audio files in ZIP
- [ ] Test with different audio formats (mp3, wav, ogg)
- [ ] Test with calls that have evaluations
- [ ] Test with calls that have sentiment data
- [ ] Test with large datasets (100+ calls)
- [ ] Verify progress updates work correctly
- [ ] Test error handling (no audio files, no selection)

## Support

For issues or questions about the export feature:
1. Check browser console for error messages
2. Verify audio files are properly stored in IndexedDB
3. Ensure sufficient browser memory for large exports
4. Contact development team with error details and reproduction steps
