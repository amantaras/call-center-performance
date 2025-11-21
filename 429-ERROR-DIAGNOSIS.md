# 429 Error Diagnosis and Resolution

## Current Status
❌ **Getting 429 "Resource Exhausted" errors on ALL transcription attempts**
- API Version: 2025-10-15 (correct ✓)
- Languages: 5 languages (correct ✓)
- Rate limit: Retrying 3 times with exponential backoff (2s, 4s, 8s)

## Error Details
```
Fast transcription failed (429): {"code":"TooManyRequests","message":"Resource Exhausted"}
```

## Fast Transcription Limits (from Microsoft Docs)

| Limit Type | Value |
|-----------|-------|
| **Maximum requests per minute** | 600 |
| **Maximum audio file size** | < 300 MB |
| **Maximum audio length** | < 120 minutes per file |

## Possible Root Causes

### 1. **Pricing Tier Issue (MOST LIKELY)**
- **Free (F0) tier**: Has VERY strict limits and may not support Fast Transcription
- **Standard (S0) tier**: Full access to 600 requests/minute

**Action**: Check your Azure Speech resource pricing tier:
```
Azure Portal → Your Speech Resource → Settings → Pricing Tier
```

### 2. **Regional Capacity Issue**
- Some regions may have limited capacity for Fast Transcription
- Portal might use a different region or fallback mechanism

**Action**: Try a different region (e.g., `eastus`, `westus2`, `westeurope`)

### 3. **Subscription Key vs Endpoint Mismatch**
- Using wrong subscription key for the region
- Portal uses different credentials

**Action**: Verify in Azure Portal that:
- Region matches: `{your-region}.api.cognitive.microsoft.com`
- Subscription key is from the same resource
- Endpoint URL format: `https://{region}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version=2025-10-15`

### 4. **API Version Not Supported in Your Region**
- Some regions may not have 2025-10-15 deployed yet
- Portal might auto-fallback to older version

**Action**: Try API version `2024-11-15` as fallback

## Diagnostic Steps

### Step 1: Check Pricing Tier
```powershell
# Using Azure CLI
az cognitiveservices account show --name YOUR_SPEECH_RESOURCE_NAME --resource-group YOUR_RESOURCE_GROUP --query "sku.name"
```

Expected output:
- `F0` = Free tier (LIMITED - may not support Fast Transcription)
- `S0` = Standard tier (FULL ACCESS)

### Step 2: Verify Configuration in Portal
1. Go to Azure Portal → Your Speech Resource
2. Click "Keys and Endpoint"
3. Note down:
   - **Region**: e.g., `eastus`
   - **Key 1**: Your subscription key
   - **Endpoint**: e.g., `https://eastus.api.cognitive.microsoft.com/`
4. Compare with your application config

### Step 3: Test with Azure Portal Speech Studio
1. Go to https://speech.microsoft.com/portal
2. Navigate to "Speech to text" → "Fast transcription"
3. Try to transcribe the SAME audio file
4. If it works in Portal but not in app, there's a configuration mismatch

### Step 4: Check Regional Availability
Try changing region to one of these known working regions:
- `eastus`
- `westus2`
- `westeurope`
- `southeastasia`

### Step 5: Enable Detailed Error Logging
The application now logs:
- ✅ API Version used
- ✅ Region
- ✅ Full endpoint URL
- ✅ Masked subscription key (first 8 + last 4 chars)

Check console for: `🔧 === AZURE SPEECH API CONFIGURATION ===`

## Solutions by Root Cause

### If F0 (Free) Tier:
**Upgrade to S0 (Standard) tier**:
1. Azure Portal → Your Speech Resource
2. Settings → Pricing Tier
3. Select "Standard S0"
4. Save and wait 5-10 minutes for propagation

### If Wrong Region:
**Update configuration to match Portal**:
1. Open application Settings
2. Update Speech Service Region to match Portal
3. Update Subscription Key to match Portal
4. Save and retry

### If Regional Capacity Issue:
**Create new Speech resource in different region**:
1. Azure Portal → Create Resource → Speech
2. Select region: `eastus` or `westus2`
3. Choose Standard (S0) pricing tier
4. Get new subscription key and region
5. Update application configuration

### If API Version Issue:
**Try fallback version**:
1. Open Settings dialog
2. Change API Version from `2025-10-15` to `2024-11-15`
3. Save and retry

## Next Steps
1. ✅ Check console logs for configuration details
2. ✅ Verify pricing tier (F0 vs S0)
3. ✅ Compare app config with Portal "Keys and Endpoint"
4. ✅ Test in Portal Speech Studio with same audio
5. ✅ Try different region if needed
6. ✅ Upgrade to S0 tier if on F0

## Additional Resources
- [Azure Speech Quotas and Limits](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-services-quotas-and-limits)
- [Fast Transcription API](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/fast-transcription-create)
- [Pricing Calculator](https://azure.microsoft.com/pricing/details/cognitive-services/speech-services/)
