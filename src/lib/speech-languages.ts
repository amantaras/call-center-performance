/**
 * Azure Speech-to-Text Supported Languages
 * Source: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt
 * Last updated: November 2025
 */

export interface SpeechLanguage {
  locale: string;
  name: string;
  nativeName?: string;
}

export const SPEECH_TO_TEXT_LANGUAGES: SpeechLanguage[] = [
  { locale: 'af-ZA', name: 'Afrikaans (South Africa)', nativeName: 'Afrikaans' },
  { locale: 'am-ET', name: 'Amharic (Ethiopia)', nativeName: 'አማርኛ' },
  { locale: 'ar-AE', name: 'Arabic (United Arab Emirates)', nativeName: 'العربية' },
  { locale: 'ar-BH', name: 'Arabic (Bahrain)', nativeName: 'العربية' },
  { locale: 'ar-DZ', name: 'Arabic (Algeria)', nativeName: 'العربية' },
  { locale: 'ar-EG', name: 'Arabic (Egypt)', nativeName: 'العربية' },
  { locale: 'ar-IL', name: 'Arabic (Israel)', nativeName: 'العربية' },
  { locale: 'ar-IQ', name: 'Arabic (Iraq)', nativeName: 'العربية' },
  { locale: 'ar-JO', name: 'Arabic (Jordan)', nativeName: 'العربية' },
  { locale: 'ar-KW', name: 'Arabic (Kuwait)', nativeName: 'العربية' },
  { locale: 'ar-LB', name: 'Arabic (Lebanon)', nativeName: 'العربية' },
  { locale: 'ar-LY', name: 'Arabic (Libya)', nativeName: 'العربية' },
  { locale: 'ar-MA', name: 'Arabic (Morocco)', nativeName: 'العربية' },
  { locale: 'ar-OM', name: 'Arabic (Oman)', nativeName: 'العربية' },
  { locale: 'ar-PS', name: 'Arabic (Palestinian Authority)', nativeName: 'العربية' },
  { locale: 'ar-QA', name: 'Arabic (Qatar)', nativeName: 'العربية' },
  { locale: 'ar-SA', name: 'Arabic (Saudi Arabia)', nativeName: 'العربية' },
  { locale: 'ar-SY', name: 'Arabic (Syria)', nativeName: 'العربية' },
  { locale: 'ar-TN', name: 'Arabic (Tunisia)', nativeName: 'العربية' },
  { locale: 'ar-YE', name: 'Arabic (Yemen)', nativeName: 'العربية' },
  { locale: 'as-IN', name: 'Assamese (India)', nativeName: 'অসমীয়া' },
  { locale: 'az-AZ', name: 'Azerbaijani (Azerbaijan)', nativeName: 'Azərbaycan' },
  { locale: 'bg-BG', name: 'Bulgarian (Bulgaria)', nativeName: 'Български' },
  { locale: 'bn-IN', name: 'Bengali (India)', nativeName: 'বাংলা' },
  { locale: 'bs-BA', name: 'Bosnian (Bosnia and Herzegovina)', nativeName: 'Bosanski' },
  { locale: 'ca-ES', name: 'Catalan (Spain)', nativeName: 'Català' },
  { locale: 'cs-CZ', name: 'Czech (Czechia)', nativeName: 'Čeština' },
  { locale: 'cy-GB', name: 'Welsh (United Kingdom)', nativeName: 'Cymraeg' },
  { locale: 'da-DK', name: 'Danish (Denmark)', nativeName: 'Dansk' },
  { locale: 'de-AT', name: 'German (Austria)', nativeName: 'Deutsch' },
  { locale: 'de-CH', name: 'German (Switzerland)', nativeName: 'Deutsch' },
  { locale: 'de-DE', name: 'German (Germany)', nativeName: 'Deutsch' },
  { locale: 'el-GR', name: 'Greek (Greece)', nativeName: 'Ελληνικά' },
  { locale: 'en-AU', name: 'English (Australia)' },
  { locale: 'en-CA', name: 'English (Canada)' },
  { locale: 'en-GB', name: 'English (United Kingdom)' },
  { locale: 'en-GH', name: 'English (Ghana)' },
  { locale: 'en-HK', name: 'English (Hong Kong SAR)' },
  { locale: 'en-IE', name: 'English (Ireland)' },
  { locale: 'en-IN', name: 'English (India)' },
  { locale: 'en-KE', name: 'English (Kenya)' },
  { locale: 'en-NG', name: 'English (Nigeria)' },
  { locale: 'en-NZ', name: 'English (New Zealand)' },
  { locale: 'en-PH', name: 'English (Philippines)' },
  { locale: 'en-SG', name: 'English (Singapore)' },
  { locale: 'en-TZ', name: 'English (Tanzania)' },
  { locale: 'en-US', name: 'English (United States)' },
  { locale: 'en-ZA', name: 'English (South Africa)' },
  { locale: 'es-AR', name: 'Spanish (Argentina)', nativeName: 'Español' },
  { locale: 'es-BO', name: 'Spanish (Bolivia)', nativeName: 'Español' },
  { locale: 'es-CL', name: 'Spanish (Chile)', nativeName: 'Español' },
  { locale: 'es-CO', name: 'Spanish (Colombia)', nativeName: 'Español' },
  { locale: 'es-CR', name: 'Spanish (Costa Rica)', nativeName: 'Español' },
  { locale: 'es-CU', name: 'Spanish (Cuba)', nativeName: 'Español' },
  { locale: 'es-DO', name: 'Spanish (Dominican Republic)', nativeName: 'Español' },
  { locale: 'es-EC', name: 'Spanish (Ecuador)', nativeName: 'Español' },
  { locale: 'es-ES', name: 'Spanish (Spain)', nativeName: 'Español' },
  { locale: 'es-GQ', name: 'Spanish (Equatorial Guinea)', nativeName: 'Español' },
  { locale: 'es-GT', name: 'Spanish (Guatemala)', nativeName: 'Español' },
  { locale: 'es-HN', name: 'Spanish (Honduras)', nativeName: 'Español' },
  { locale: 'es-MX', name: 'Spanish (Mexico)', nativeName: 'Español' },
  { locale: 'es-NI', name: 'Spanish (Nicaragua)', nativeName: 'Español' },
  { locale: 'es-PA', name: 'Spanish (Panama)', nativeName: 'Español' },
  { locale: 'es-PE', name: 'Spanish (Peru)', nativeName: 'Español' },
  { locale: 'es-PR', name: 'Spanish (Puerto Rico)', nativeName: 'Español' },
  { locale: 'es-PY', name: 'Spanish (Paraguay)', nativeName: 'Español' },
  { locale: 'es-SV', name: 'Spanish (El Salvador)', nativeName: 'Español' },
  { locale: 'es-US', name: 'Spanish (United States)', nativeName: 'Español' },
  { locale: 'es-UY', name: 'Spanish (Uruguay)', nativeName: 'Español' },
  { locale: 'es-VE', name: 'Spanish (Venezuela)', nativeName: 'Español' },
  { locale: 'et-EE', name: 'Estonian (Estonia)', nativeName: 'Eesti' },
  { locale: 'eu-ES', name: 'Basque (Spain)', nativeName: 'Euskara' },
  { locale: 'fa-IR', name: 'Persian (Iran)', nativeName: 'فارسی' },
  { locale: 'fi-FI', name: 'Finnish (Finland)', nativeName: 'Suomi' },
  { locale: 'fil-PH', name: 'Filipino / Tagalog (Philippines)', nativeName: 'Filipino' },
  { locale: 'fr-BE', name: 'French (Belgium)', nativeName: 'Français' },
  { locale: 'fr-CA', name: 'French (Canada)', nativeName: 'Français' },
  { locale: 'fr-CH', name: 'French (Switzerland)', nativeName: 'Français' },
  { locale: 'fr-FR', name: 'French (France)', nativeName: 'Français' },
  { locale: 'ga-IE', name: 'Irish (Ireland)', nativeName: 'Gaeilge' },
  { locale: 'gl-ES', name: 'Galician (Spain)', nativeName: 'Galego' },
  { locale: 'gu-IN', name: 'Gujarati (India)', nativeName: 'ગુજરાતી' },
  { locale: 'he-IL', name: 'Hebrew (Israel)', nativeName: 'עברית' },
  { locale: 'hi-IN', name: 'Hindi (India)', nativeName: 'हिन्दी' },
  { locale: 'hr-HR', name: 'Croatian (Croatia)', nativeName: 'Hrvatski' },
  { locale: 'hu-HU', name: 'Hungarian (Hungary)', nativeName: 'Magyar' },
  { locale: 'hy-AM', name: 'Armenian (Armenia)', nativeName: 'Հայերեն' },
  { locale: 'id-ID', name: 'Indonesian (Indonesia)', nativeName: 'Bahasa Indonesia' },
  { locale: 'is-IS', name: 'Icelandic (Iceland)', nativeName: 'Íslenska' },
  { locale: 'it-CH', name: 'Italian (Switzerland)', nativeName: 'Italiano' },
  { locale: 'it-IT', name: 'Italian (Italy)', nativeName: 'Italiano' },
  { locale: 'ja-JP', name: 'Japanese (Japan)', nativeName: '日本語' },
  { locale: 'jv-ID', name: 'Javanese (Indonesia)', nativeName: 'Basa Jawa' },
  { locale: 'ka-GE', name: 'Georgian (Georgia)', nativeName: 'ქართული' },
  { locale: 'kk-KZ', name: 'Kazakh (Kazakhstan)', nativeName: 'Қазақ' },
  { locale: 'km-KH', name: 'Khmer (Cambodia)', nativeName: 'ខ្មែរ' },
  { locale: 'kn-IN', name: 'Kannada (India)', nativeName: 'ಕನ್ನಡ' },
  { locale: 'ko-KR', name: 'Korean (Korea)', nativeName: '한국어' },
  { locale: 'lo-LA', name: 'Lao (Laos)', nativeName: 'ລາວ' },
  { locale: 'lt-LT', name: 'Lithuanian (Lithuania)', nativeName: 'Lietuvių' },
  { locale: 'lv-LV', name: 'Latvian (Latvia)', nativeName: 'Latviešu' },
  { locale: 'mk-MK', name: 'Macedonian (North Macedonia)', nativeName: 'Македонски' },
  { locale: 'ml-IN', name: 'Malayalam (India)', nativeName: 'മലയാളം' },
  { locale: 'mn-MN', name: 'Mongolian (Mongolia)', nativeName: 'Монгол' },
  { locale: 'mr-IN', name: 'Marathi (India)', nativeName: 'मराठी' },
  { locale: 'ms-MY', name: 'Malay (Malaysia)', nativeName: 'Bahasa Melayu' },
  { locale: 'mt-MT', name: 'Maltese (Malta)', nativeName: 'Malti' },
  { locale: 'my-MM', name: 'Burmese (Myanmar)', nativeName: 'မြန်မာ' },
  { locale: 'nb-NO', name: 'Norwegian Bokmål (Norway)', nativeName: 'Norsk Bokmål' },
  { locale: 'ne-NP', name: 'Nepali (Nepal)', nativeName: 'नेपाली' },
  { locale: 'nl-BE', name: 'Dutch (Belgium)', nativeName: 'Nederlands' },
  { locale: 'nl-NL', name: 'Dutch (Netherlands)', nativeName: 'Nederlands' },
  { locale: 'or-IN', name: 'Odia (India)', nativeName: 'ଓଡ଼ିଆ' },
  { locale: 'pa-IN', name: 'Punjabi (India)', nativeName: 'ਪੰਜਾਬੀ' },
  { locale: 'pl-PL', name: 'Polish (Poland)', nativeName: 'Polski' },
  { locale: 'ps-AF', name: 'Pashto (Afghanistan)', nativeName: 'پښتو' },
  { locale: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português' },
  { locale: 'pt-PT', name: 'Portuguese (Portugal)', nativeName: 'Português' },
  { locale: 'ro-RO', name: 'Romanian (Romania)', nativeName: 'Română' },
  { locale: 'ru-RU', name: 'Russian (Russia)', nativeName: 'Русский' },
  { locale: 'si-LK', name: 'Sinhala (Sri Lanka)', nativeName: 'සිංහල' },
  { locale: 'sk-SK', name: 'Slovak (Slovakia)', nativeName: 'Slovenčina' },
  { locale: 'sl-SI', name: 'Slovenian (Slovenia)', nativeName: 'Slovenščina' },
  { locale: 'so-SO', name: 'Somali (Somalia)', nativeName: 'Soomaali' },
  { locale: 'sq-AL', name: 'Albanian (Albania)', nativeName: 'Shqip' },
  { locale: 'sr-RS', name: 'Serbian (Serbia)', nativeName: 'Српски' },
  { locale: 'sv-SE', name: 'Swedish (Sweden)', nativeName: 'Svenska' },
  { locale: 'sw-KE', name: 'Kiswahili (Kenya)', nativeName: 'Kiswahili' },
  { locale: 'sw-TZ', name: 'Kiswahili (Tanzania)', nativeName: 'Kiswahili' },
  { locale: 'ta-IN', name: 'Tamil (India)', nativeName: 'தமிழ்' },
  { locale: 'te-IN', name: 'Telugu (India)', nativeName: 'తెలుగు' },
  { locale: 'th-TH', name: 'Thai (Thailand)', nativeName: 'ไทย' },
  { locale: 'tr-TR', name: 'Turkish (Türkiye)', nativeName: 'Türkçe' },
  { locale: 'uk-UA', name: 'Ukrainian (Ukraine)', nativeName: 'Українська' },
  { locale: 'ur-IN', name: 'Urdu (India)', nativeName: 'اردو' },
  { locale: 'ur-PK', name: 'Urdu (Pakistan)', nativeName: 'اردو' },
  { locale: 'uz-UZ', name: 'Uzbek (Uzbekistan)', nativeName: 'Oʻzbek' },
  { locale: 'vi-VN', name: 'Vietnamese (Vietnam)', nativeName: 'Tiếng Việt' },
  { locale: 'wuu-CN', name: 'Chinese (Wu, Simplified)', nativeName: '吴语' },
  { locale: 'yue-CN', name: 'Chinese (Cantonese, Simplified)', nativeName: '粤语' },
  { locale: 'zh-CN', name: 'Chinese (Mandarin, Simplified)', nativeName: '中文' },
  { locale: 'zh-CN-shandong', name: 'Chinese (Jilu Mandarin, Simplified)', nativeName: '中文' },
  { locale: 'zh-CN-sichuan', name: 'Chinese (Southwestern Mandarin, Simplified)', nativeName: '中文' },
  { locale: 'zh-HK', name: 'Chinese (Cantonese, Traditional)', nativeName: '中文' },
  { locale: 'zh-TW', name: 'Chinese (Taiwanese Mandarin, Traditional)', nativeName: '中文' },
  { locale: 'zu-ZA', name: 'isiZulu (South Africa)', nativeName: 'isiZulu' },
];

// Popular languages for quick selection
export const POPULAR_LANGUAGES: string[] = [
  'en-US', // English (US)
  'ar-SA', // Arabic (Saudi)
  'hi-IN', // Hindi (India)
  'ur-PK', // Urdu (Pakistan)
  'fil-PH', // Filipino / Tagalog (Philippines)
  'es-ES', // Spanish
  'zh-CN', // Chinese (Mandarin)
  'fr-FR', // French
  'de-DE', // German
  'ja-JP', // Japanese
];

// Default languages for the call center use case
export const DEFAULT_CALL_CENTER_LANGUAGES: string[] = [
  'en-US', // English (US)
  'ar-SA', // Arabic (Saudi)
  'hi-IN', // Hindi (India)
  'ur-PK', // Urdu (Pakistan)
  'fil-PH', // Filipino / Tagalog (Philippines)
];

const SUPPORTED_LOCALE_SET = new Set(SPEECH_TO_TEXT_LANGUAGES.map((lang) => lang.locale));

const LEGACY_LOCALE_MAP: Record<string, string> = {
  'tl-PH': 'fil-PH',
};

export function normalizeLocale(locale: string): string | null {
  const mapped = LEGACY_LOCALE_MAP[locale] ?? locale;
  return SUPPORTED_LOCALE_SET.has(mapped) ? mapped : null;
}

export function normalizeLocaleList(locales?: string[]): string[] {
  if (!locales || locales.length === 0) {
    return [];
  }

  const normalized: string[] = [];
  for (const locale of locales) {
    const mapped = normalizeLocale(locale);
    if (mapped && !normalized.includes(mapped)) {
      normalized.push(mapped);
    }
  }
  return normalized;
}
