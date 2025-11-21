# Language Selector Feature Implementation

## Overview

This document describes the new **Language Selector** feature that allows users to dynamically select transcription languages for Azure Speech-to-Text in the Call Center Performance application.

## Implementation Date
November 2025

## Feature Summary

Users can now select from 150+ supported Azure Speech-to-Text languages via an intuitive UI in the Azure Services Configuration dialog. The selected languages are used for automatic language detection during transcription.

---

## Architecture

### Files Created

#### 1. `src/lib/speech-languages.ts`
**Purpose**: Central repository of all Azure Speech-to-Text supported languages

**Exports**:
- `SpeechLanguage` interface - Language definition with locale, name, and native name
- `SPEECH_TO_TEXT_LANGUAGES` - Complete list of 150+ supported languages
- `POPULAR_LANGUAGES` - Quick access to commonly used languages
- `DEFAULT_CALL_CENTER_LANGUAGES` - Default selection for call center use case

**Example**:
```typescript
export const DEFAULT_CALL_CENTER_LANGUAGES: string[] = [
  'en-US', // English (US)
  'ar-SA', // Arabic (Saudi)
  'hi-IN', // Hindi (India)
  'ur-PK', // Urdu (Pakistan)
  'tl-PH', // Tagalog (Philippines)
];
```

#### 2. `src/components/LanguageSelector.tsx`
**Purpose**: Reusable language selection component with search and multi-select

**Features**:
- **Multi-select dropdown** with checkmarks
- **Search functionality** - search by language name, locale code, or native name
- **Popular languages section** - quick access to frequently used languages
- **Selected language badges** - visual display with remove buttons
- **Preset buttons**:
  - "Use Defaults" - loads DEFAULT_CALL_CENTER_LANGUAGES
  - "Clear All" - removes all selections
- **Informative help text** about transcription impact

**Props**:
```typescript
interface LanguageSelectorProps {
  selectedLanguages: string[];      // Array of locale codes
  onLanguagesChange: (languages: string[]) => void;  // Callback for updates
}
```

### Files Modified

#### 1. `src/types/config.ts`
**Changes**: Added `selectedLanguages?: string[]` to speech configuration

```typescript
export interface AzureServicesConfig {
  openAI: { ... };
  speech: {
    region: string;
    subscriptionKey: string;
    apiVersion: string;
    selectedLanguages?: string[]; // NEW: Array of locale codes
  };
}
```

#### 2. `src/types/call.ts`
**Changes**: Added `selectedLanguages?: string[]` to AzureSpeechConfig

```typescript
export interface AzureSpeechConfig {
  region: string;
  subscriptionKey: string;
  apiVersion?: string;
  selectedLanguages?: string[]; // NEW: Array of locale codes
}
```

#### 3. `src/components/ConfigDialog.tsx`
**Changes**:
- Imported `LanguageSelector` component
- Added `selectedLanguages` to default config
- Integrated `<LanguageSelector>` in Speech Service section
- Languages are saved/loaded with other Azure Speech settings

**UI Location**: Azure Services → Speech Service section → after API Version field

#### 4. `src/services/transcription.ts`
**Changes**: Updated to use selected languages from configuration

**Logic**:
```typescript
const selectedLanguages = this.config?.selectedLanguages && this.config.selectedLanguages.length > 0
  ? this.config.selectedLanguages
  : DEFAULT_CALL_CENTER_LANGUAGES;

const speechOptions: STTCallOptions = {
  candidateLocales: options.candidateLocales || selectedLanguages,
  // ... other options
};
```

**Behavior**:
- If languages selected in config → use those
- If no languages selected → use DEFAULT_CALL_CENTER_LANGUAGES
- If options.candidateLocales provided → use those (override)

#### 5. `src/components/CallDetailDialog.tsx`
**Changes**: Updated individual call transcription to use config languages

**Logic**: Same as transcription.ts - uses selected languages from config or defaults

---

## User Workflow

### Configuring Languages

1. **Open Configuration**:
   - Click "Azure Services" button in top navigation
   - Scroll to "Azure Speech Service" section

2. **Select Languages**:
   - Click the "Select languages..." dropdown
   - See "Popular Languages" at top (optional quick select)
   - Browse "All Languages" section
   - Use search box to filter by name, locale, or native script
   - Click languages to toggle selection (checkmark appears)
   - Selected languages appear as badges above dropdown

3. **Manage Selection**:
   - Click **X** on badge to remove a language
   - Click "Use Defaults" to load recommended 5 languages
   - Click "Clear All" to start fresh

4. **Save**:
   - Click "Save Configuration" button
   - Languages are saved to localStorage and cookie backup

### Using Selected Languages

1. **Automatic Application**:
   - All new transcriptions use selected languages
   - Works for:
     - Bulk transcription from Calls View
     - Individual call transcription from Call Detail Dialog
     - CSV import transcription

2. **Language Detection**:
   - Azure automatically detects which language was spoken
   - More languages = longer processing time
   - Recommended: Select only languages your callers actually use

---

## Technical Details

### Storage

**Primary**: localStorage key `azure-services-config`
**Backup**: Cookie (via `saveAzureConfigCookie`)

**Structure**:
```json
{
  "openAI": { ... },
  "speech": {
    "region": "eastus2",
    "subscriptionKey": "...",
    "apiVersion": "2025-10-15",
    "selectedLanguages": ["en-US", "ar-SA", "hi-IN", "ur-PK", "tl-PH"]
  }
}
```

### Defaults

If no languages configured, system uses:
```typescript
DEFAULT_CALL_CENTER_LANGUAGES = [
  'en-US', // English (US)
  'ar-SA', // Arabic (Saudi)
  'hi-IN', // Hindi (India)
  'ur-PK', // Urdu (Pakistan)
  'tl-PH', // Tagalog (Philippines)
];
```

### Popular Languages Preset

Quick access to 10 commonly used languages:
```typescript
POPULAR_LANGUAGES = [
  'en-US', 'ar-SA', 'hi-IN', 'ur-PK', 'tl-PH',
  'es-ES', 'zh-CN', 'fr-FR', 'de-DE', 'ja-JP'
];
```

### Component Dependencies

**LanguageSelector.tsx uses**:
- `@/components/ui/button` - Buttons for actions
- `@/components/ui/badge` - Selected language badges
- `@/components/ui/input` - Not directly, but via Command
- `@/components/ui/command` - Search and selection dropdown
- `@/components/ui/popover` - Dropdown container
- `@/lib/utils` - `cn()` for conditional classes
- `lucide-react` - Icons (Check, ChevronsUpDown, X)

---

## Benefits

### For Users
✅ **Flexibility** - Select only languages they need
✅ **Performance** - Fewer languages = faster transcription
✅ **Accuracy** - Better results when language pool is limited
✅ **Global Support** - 150+ languages available
✅ **Easy Management** - Visual UI with search and presets

### For Developers
✅ **Type Safety** - Full TypeScript support
✅ **Reusable Component** - LanguageSelector can be used elsewhere
✅ **Centralized Data** - Single source of truth (speech-languages.ts)
✅ **Backward Compatible** - Defaults to recommended languages if not configured
✅ **Testable** - Pure functions and props-based component

---

## Future Enhancements

### Potential Improvements
1. **Language Ordering** - Allow drag-and-drop to prioritize languages
2. **Usage Analytics** - Show which languages are detected most often
3. **Auto-suggest** - Recommend languages based on past transcriptions
4. **Grouping** - Group by region (Middle East, Asia, Europe, etc.)
5. **Custom Labels** - Allow users to rename/tag language sets
6. **Saved Presets** - Multiple named presets ("Customer Support", "Sales", etc.)
7. **Real-time Validation** - Check if selected languages work with current Azure region
8. **API Sync** - Automatically fetch latest supported languages from Azure

### Known Limitations
- Maximum recommended: 10 languages per transcription (performance)
- No visual indication of region-specific availability
- Search only works with display names (not BCP-47 codes)

---

## Troubleshooting

### Languages Not Applying
**Issue**: Selected languages don't seem to be used
**Solution**: 
1. Check localStorage: `azure-services-config` → `speech.selectedLanguages`
2. Verify "Save Configuration" was clicked
3. Check browser console for config initialization logs
4. Try "Use Defaults" button then save

### Transcription Still Fails
**Issue**: 429 errors or transcription failures after selecting languages
**Solution**:
1. Reduce number of languages (try 2-3 first)
2. Verify all selected locale codes are valid
3. Check Azure Speech resource pricing tier (S0 recommended)
4. Review console logs for specific error details

### Dropdown Not Opening
**Issue**: Click on "Select languages..." does nothing
**Solution**:
1. Check browser console for JavaScript errors
2. Verify all UI component dependencies are installed
3. Try refreshing the page
4. Check if Popover component is working elsewhere

### Search Not Working
**Issue**: Typing in search doesn't filter languages
**Solution**:
1. Click inside the search input first
2. Check if Command component is properly imported
3. Try typing full language name (e.g., "Spanish" not "Spa")
4. Clear search and try again

---

## Code Examples

### Using LanguageSelector Standalone
```tsx
import { LanguageSelector } from '@/components/LanguageSelector';

function MyComponent() {
  const [languages, setLanguages] = useState(['en-US', 'es-ES']);
  
  return (
    <LanguageSelector
      selectedLanguages={languages}
      onLanguagesChange={setLanguages}
    />
  );
}
```

### Programmatically Get Language Name
```typescript
import { SPEECH_TO_TEXT_LANGUAGES } from '@/lib/speech-languages';

function getLanguageName(locale: string): string {
  const lang = SPEECH_TO_TEXT_LANGUAGES.find(l => l.locale === locale);
  return lang ? lang.name : locale;
}

console.log(getLanguageName('ar-SA')); // "Arabic (Saudi Arabia)"
```

### Add Custom Default Languages
```typescript
// In src/lib/speech-languages.ts
export const MY_CUSTOM_DEFAULTS: string[] = [
  'en-GB', // English (UK)
  'fr-FR', // French
  'de-DE', // German
];

// In component
import { MY_CUSTOM_DEFAULTS } from '@/lib/speech-languages';
const [languages, setLanguages] = useState(MY_CUSTOM_DEFAULTS);
```

---

## Testing Checklist

### Manual Testing
- [ ] Open ConfigDialog and see Language Selector
- [ ] Click dropdown and see Popular Languages section
- [ ] Search for "Spanish" and verify results
- [ ] Select 3-4 languages and see badges appear
- [ ] Remove a language via X button
- [ ] Click "Use Defaults" and verify 5 default languages load
- [ ] Click "Clear All" and verify all languages removed
- [ ] Save configuration and refresh page
- [ ] Verify selected languages persist after refresh
- [ ] Transcribe a call and check console logs for locale array
- [ ] Verify transcription uses selected languages (check Azure logs)

### Edge Cases
- [ ] Save with 0 languages selected (should use defaults)
- [ ] Save with 20+ languages (should work but warn about performance)
- [ ] Select language, remove it, save (should not appear in config)
- [ ] Search with non-English characters (e.g., "日本語")
- [ ] Select all 150+ languages (performance test)

---

## References

### Azure Documentation
- [Language Support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt)
- [Fast Transcription API](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/fast-transcription-create)
- [REST API Reference](https://learn.microsoft.com/en-us/rest/api/speechtotext/transcriptions/transcribe)

### Internal Documentation
- See `TRANSCRIPTION-GUIDE.md` for transcription workflow
- See `IMPLEMENTATION_SUMMARY.md` for feature history
- See `PRD.md` for original requirements

---

## Changelog

### v1.0.0 - November 2025
- ✅ Initial implementation of Language Selector component
- ✅ Added 150+ supported languages to speech-languages.ts
- ✅ Integrated into ConfigDialog
- ✅ Updated transcription.ts to use selected languages
- ✅ Updated CallDetailDialog.tsx to use selected languages
- ✅ Added popular languages preset
- ✅ Added default call center languages
- ✅ Full TypeScript support
- ✅ localStorage and cookie persistence
