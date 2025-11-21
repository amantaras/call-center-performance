# Call Center Performance - Real Audio Transcription Guide

## 🎯 Overview

Your call center data is now integrated with **Azure Speech-to-Text** for real transcription! The system automatically detects blob URLs from your Excel data and enables transcription.

## 📊 Your Data Format

Your Excel spreadsheet has these columns:
```
TIME | BILLID | ORDERID | user_id | file tag | Agent name | Product | Customer type | Borrower name | Nationality | Days past due | Due amount | Follow up status
```

The `file tag` column contains Azure Blob Storage URLs like:
```
938ec846f424419ea18b29533567f40b.mp3
ea9b209f94b2f4b689c8de5e9f5f446b.mp3
```

## 🚀 Step-by-Step Workflow

### Step 1: Configure Azure Services

1. Click **"Azure Services"** button in the top-right
2. Enter your **Azure Speech** configuration:
   - **Region**: Your Azure region (e.g., `eastus`, `westus2`)
   - **Subscription Key**: Your Azure Speech service key
   - **API Version**: Auto-filled with `2024-11-15`
3. Enter your **Azure OpenAI** configuration:
   - **Endpoint URL**: Your Azure OpenAI endpoint
   - **API Key**: Your Azure OpenAI key
   - **Deployment Name**: Your GPT-4 deployment name
   - **API Version**: Auto-filled with `2024-12-01-preview`
4. Click **"Save"**

✅ The transcription service will be automatically initialized!

### Step 2: Upload Your Call Data

1. Click **"Upload Calls"** button
2. Open your Excel file and **copy all rows** (including header)
3. Paste into the **"Call Metadata"** textarea
4. Click **"Upload Calls"**

**What happens:**
- System parses your Excel data
- Detects `.mp3`, `.wav`, `.m4a`, `.flac`, `.ogg` files in the `file tag` column
- Stores these as `audioUrl` in the call metadata
- Sets status to **"uploaded"** for calls with audio URLs
- Displays all calls in the table

### Step 3: Transcribe Calls

For each call with status **"Uploaded"**:

1. Look for the **🎤 Microphone icon** in the Actions column
2. Click it to start transcription

**What happens:**
1. System fetches the audio file from Azure Blob Storage
2. Sends it to Azure Speech-to-Text API
3. Status changes to **"Transcribing..."**
4. Azure processes the audio (this can take 30 seconds to 5 minutes depending on file size)
5. Status changes to **"Transcribed"**
6. Transcript is saved to the call record

### Step 4: Evaluate Calls

For each call with status **"Transcribed"**:

1. Look for the **🧪 Flask icon** in the Actions column
2. Click it to start evaluation

**What happens:**
1. System sends transcript + metadata to Azure OpenAI
2. GPT-4 evaluates against your custom evaluation criteria
3. Status changes to **"Evaluated"**
4. Score appears in the Score column
5. Full evaluation details available by clicking the **▶ Play icon**

### Step 5: View Results

1. Click the **▶ Play icon** on any call to see:
   - Full transcript
   - Evaluation results
   - Scores for each criterion
   - Evidence and reasoning
   - Overall feedback

2. Switch to **"Analytics"** tab to see:
   - Performance trends over time
   - Criteria pass rates
   - Score distributions

3. Switch to **"Agents"** tab to see:
   - Individual agent performance
   - Top strengths and weaknesses
   - Average scores per agent

## 🔍 Status Flow

```
Uploaded → Transcribing → Transcribed → Evaluated
```

- **Uploaded**: Call data uploaded with audio URL, ready for transcription
- **Transcribing**: Audio being processed by Azure Speech
- **Transcribed**: Transcript ready, can now be evaluated
- **Evaluated**: GPT-4 evaluation complete with scores
- **Failed**: Error occurred (check error message)

## ⚡ Batch Operations

### Transcribe All Uploaded Calls

Currently, you need to click each microphone icon individually. Future enhancement: Add "Transcribe All" button to process multiple calls in batch.

### Evaluate All Transcribed Calls

Currently, you need to click each flask icon individually. Future enhancement: Add "Evaluate All" button to process multiple calls in batch.

## 📝 Data Storage

All data is stored locally in your browser using GitHub Spark's storage:
- **Key**: `calls`
- **Storage**: IndexedDB (local, persistent)
- **Includes**: Metadata, audioUrl, transcript, evaluation results

## 🔧 Technical Details

### Audio File Support

Supported formats:
- `.mp3` (most common)
- `.wav`
- `.m4a`
- `.flac`
- `.ogg`

### Transcription Options

Default settings:
- **Locale**: `en-US` (English)
- **Word-level timestamps**: Enabled
- **Diarization**: Disabled (can be enabled if you need speaker separation)

### Error Handling

If transcription fails:
- Status changes to **"Failed"**
- Error message is stored in call record
- You can view error by clicking the call
- Common issues:
  - Invalid audio URL (blob not accessible)
  - Azure Speech service not configured
  - Audio file format not supported
  - Network timeout

## 💡 Tips & Best Practices

1. **Configure Azure services first** before uploading calls
2. **Test with 1-2 calls** before batch processing
3. **Check console logs** (F12 → Console) for detailed progress
4. **Wait for transcription** to complete before evaluating
5. **Monitor Azure costs** - each transcription call costs money!

## 🎨 UI Indicators

| Icon | Meaning |
|------|---------|
| 🎤 | Transcribe this call |
| 🧪 | Evaluate this call |
| ▶ | View call details |

| Badge | Status |
|-------|--------|
| 🟦 **Uploaded** | Ready for transcription |
| 🟨 **Transcribing...** | Processing audio |
| 🟩 **Transcribed** | Ready for evaluation |
| 🟢 **Evaluated** | Complete with scores |
| 🔴 **Failed** | Error occurred |

## 📊 Example Data Row

From your Excel:
```
2025/9/3 17:52:08 | 20250429100109304 | | 100016218425 | 938ec846f424419ea18b29533567f40b.mp3 | Raj | SNPL | Borrower | MUHAMMAD ABU BAKAR | Pakistan | 95 | 1348.34 | HE WILL PAY...
```

After upload:
- **Audio URL**: `938ec846f424419ea18b29533567f40b.mp3`
- **Status**: Uploaded
- **Agent**: Raj
- **Borrower**: MUHAMMAD ABU BAKAR
- **Product**: SNPL
- **Days Past Due**: 95
- **Due Amount**: 1348.34

After transcription:
- **Status**: Transcribed
- **Transcript**: Full text of the conversation
- **Confidence**: 0.85-0.95 (typical range)
- **Duration**: Audio length in milliseconds

After evaluation:
- **Status**: Evaluated
- **Score**: e.g., 85/100 (85%)
- **Results**: Scores for each evaluation criterion
- **Feedback**: GPT-4's overall assessment

## 🔐 Security Notes

- Azure credentials stored in **browser localStorage** (never sent to servers except Azure)
- Audio files fetched **directly from blob storage** (CORS must be enabled on your blob container)
- Transcripts stored **locally in browser** (no cloud backup unless you configure it)

## 🚨 Troubleshooting

### "Please configure Azure Speech services first"
→ Go to Azure Services dialog and enter your Speech service credentials

### "Failed to fetch audio file: 403 Forbidden"
→ Your blob storage container needs to allow CORS requests from your domain
→ Enable public read access or add proper CORS rules

### "Transcription failed after 3 attempts"
→ Check your Azure Speech subscription has quota remaining
→ Verify the audio file is accessible
→ Check console for detailed error message

### "Evaluation failed"
→ Ensure Azure OpenAI is configured correctly
→ Check deployment name matches your actual deployment
→ Verify your deployment has GPT-4 or compatible model

## 📚 Next Steps

1. **Customize Evaluation Criteria**: Click "Edit Evaluation Rules" to modify scoring
2. **View Analytics**: Switch to Analytics tab for insights
3. **Export Results**: Future enhancement - export evaluations to CSV/Excel

---

**Need Help?** Check browser console (F12) for detailed logs with 🎤 emoji indicators!
