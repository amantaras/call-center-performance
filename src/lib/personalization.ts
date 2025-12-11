/**
 * Personalization Settings
 * Manages theme, branding, and customization options
 */

export interface ColorPalette {
  id: string;
  name: string;
  description: string;
  accent: string;        // Primary accent color name (radix color)
  secondary: string;     // Secondary accent color name
  neutral: string;       // Neutral color name
  preview: {
    primary: string;     // Preview color hex
    secondary: string;   // Preview color hex
    background: string;  // Preview color hex
  };
}

export interface PersonalizationSettings {
  // Branding
  appTitle: string;
  appSubtitle: string;
  logoUrl: string | null;
  logoBase64: string | null;
  
  // Theme
  colorPaletteId: string;
  darkMode: boolean;
  
  // Layout
  compactMode: boolean;
}

// Available color palettes
export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    description: 'Professional blue tones',
    accent: 'blue',
    secondary: 'violet',
    neutral: 'slate',
    preview: { primary: '#3b82f6', secondary: '#8b5cf6', background: '#f8fafc' }
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    description: 'Natural and calming',
    accent: 'green',
    secondary: 'teal',
    neutral: 'sage',
    preview: { primary: '#22c55e', secondary: '#14b8a6', background: '#f8faf8' }
  },
  {
    id: 'royal-purple',
    name: 'Royal Purple',
    description: 'Elegant and premium',
    accent: 'violet',
    secondary: 'purple',
    neutral: 'mauve',
    preview: { primary: '#8b5cf6', secondary: '#a855f7', background: '#faf8fc' }
  },
  {
    id: 'sunset-orange',
    name: 'Sunset Orange',
    description: 'Warm and energetic',
    accent: 'orange',
    secondary: 'amber',
    neutral: 'sand',
    preview: { primary: '#f97316', secondary: '#f59e0b', background: '#faf9f7' }
  },
  {
    id: 'rose-pink',
    name: 'Rose Pink',
    description: 'Modern and friendly',
    accent: 'pink',
    secondary: 'crimson',
    neutral: 'mauve',
    preview: { primary: '#ec4899', secondary: '#e11d48', background: '#fcf8fa' }
  },
  {
    id: 'sky-cyan',
    name: 'Sky Cyan',
    description: 'Fresh and clean',
    accent: 'cyan',
    secondary: 'sky',
    neutral: 'slate',
    preview: { primary: '#06b6d4', secondary: '#0ea5e9', background: '#f7fafa' }
  },
  {
    id: 'earth-brown',
    name: 'Earth Brown',
    description: 'Warm and trustworthy',
    accent: 'bronze',
    secondary: 'gold',
    neutral: 'sand',
    preview: { primary: '#a16207', secondary: '#ca8a04', background: '#faf9f6' }
  },
  {
    id: 'midnight-indigo',
    name: 'Midnight Indigo',
    description: 'Deep and sophisticated',
    accent: 'indigo',
    secondary: 'iris',
    neutral: 'slate',
    preview: { primary: '#6366f1', secondary: '#5a67d8', background: '#f8f9fc' }
  },
  {
    id: 'mint-jade',
    name: 'Mint Jade',
    description: 'Refreshing and balanced',
    accent: 'jade',
    secondary: 'mint',
    neutral: 'olive',
    preview: { primary: '#00a86b', secondary: '#00d4aa', background: '#f6faf8' }
  },
  {
    id: 'crimson-ruby',
    name: 'Crimson Ruby',
    description: 'Bold and powerful',
    accent: 'ruby',
    secondary: 'crimson',
    neutral: 'mauve',
    preview: { primary: '#e11d48', secondary: '#dc2626', background: '#fdf2f4' }
  },
];

const STORAGE_KEY = 'app-personalization';
const SCHEMA_PERSONALIZATION_PREFIX = 'schema-personalization-';

const DEFAULT_SETTINGS: PersonalizationSettings = {
  appTitle: 'Call Center QA Platform',
  appSubtitle: 'AI-powered call quality evaluation and analytics',
  logoUrl: null,
  logoBase64: null,
  colorPaletteId: 'ocean-blue',
  darkMode: false,
  compactMode: false,
};

// Default schema personalization templates
export const SCHEMA_PERSONALIZATION_DEFAULTS: Record<string, Partial<PersonalizationSettings>> = {
  // Match template IDs from schema-templates.ts
  'debt-collection': {
    appTitle: 'Debt Collection QA',
    appSubtitle: 'Collection call compliance and effectiveness',
    colorPaletteId: 'sunset-orange',
  },
  'customer-support': {
    appTitle: 'Customer Support Analytics',
    appSubtitle: 'Support call quality and satisfaction metrics',
    colorPaletteId: 'ocean-blue',
  },
  'sales': {
    appTitle: 'Sales Performance Analytics',
    appSubtitle: 'Sales call effectiveness and conversion tracking',
    colorPaletteId: 'forest-green',
  },
  'healthcare': {
    appTitle: 'Healthcare Call Center QA',
    appSubtitle: 'Patient care and medical support evaluation',
    colorPaletteId: 'mint-jade',
  },
  'airline': {
    appTitle: 'Airline Service Quality',
    appSubtitle: 'Flight and booking support call evaluation',
    colorPaletteId: 'sky-cyan',
  },
  'airline-customer-service': {
    appTitle: 'Airline Service Quality',
    appSubtitle: 'Flight and booking support call evaluation',
    colorPaletteId: 'sky-cyan',
  },
  'telecom': {
    appTitle: 'Telecom Service Analytics',
    appSubtitle: 'Telecom support and retention evaluation',
    colorPaletteId: 'royal-purple',
  },
  'telecom-retention': {
    appTitle: 'Telecom Retention Analytics',
    appSubtitle: 'Customer retention call performance',
    colorPaletteId: 'royal-purple',
  },
  'tech-support': {
    appTitle: 'Tech Support Analytics',
    appSubtitle: 'Technical support call quality evaluation',
    colorPaletteId: 'midnight-indigo',
  },
  'insurance': {
    appTitle: 'Insurance Call Center QA',
    appSubtitle: 'Claims and policy support evaluation',
    colorPaletteId: 'earth-brown',
  },
  'banking': {
    appTitle: 'Banking Service Analytics',
    appSubtitle: 'Financial services call quality metrics',
    colorPaletteId: 'forest-green',
  },
  'retail': {
    appTitle: 'Retail Customer Service',
    appSubtitle: 'Shopping and order support evaluation',
    colorPaletteId: 'rose-pink',
  },
};

/**
 * Load personalization settings from localStorage
 */
export function loadPersonalizationSettings(): PersonalizationSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error('Error loading personalization settings:', error);
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Save personalization settings to localStorage
 */
export function savePersonalizationSettings(settings: PersonalizationSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving personalization settings:', error);
  }
}

/**
 * Get color palette by ID
 */
export function getColorPalette(id: string): ColorPalette | undefined {
  return COLOR_PALETTES.find(p => p.id === id);
}

/**
 * Apply color palette to CSS variables
 */
export function applyColorPalette(palette: ColorPalette): void {
  const root = document.documentElement;
  const rootEl = document.getElementById('root');
  
  // Apply to both documentElement and #root for compatibility
  const targets = [root, rootEl].filter(Boolean) as HTMLElement[];
  
  targets.forEach(target => {
    // Update accent colors
    for (let i = 1; i <= 12; i++) {
      target.style.setProperty(`--color-accent-${i}`, `var(--${palette.accent}-${i})`);
    }
    target.style.setProperty('--color-accent-contrast', `var(--${palette.accent}-contrast)`);

    // Update secondary accent colors
    for (let i = 1; i <= 12; i++) {
      target.style.setProperty(`--color-accent-secondary-${i}`, `var(--${palette.secondary}-${i})`);
    }
    target.style.setProperty('--color-accent-secondary-contrast', `var(--${palette.secondary}-contrast)`);

    // Update neutral colors
    for (let i = 1; i <= 12; i++) {
      target.style.setProperty(`--color-neutral-${i}`, `var(--${palette.neutral}-${i})`);
    }
    target.style.setProperty('--color-neutral-contrast', `var(--${palette.neutral}-contrast)`);

    // Update alpha neutral colors
    for (let i = 1; i <= 12; i++) {
      target.style.setProperty(`--color-neutral-a${i}`, `var(--${palette.neutral}-a${i})`);
    }
  });

  console.log(`🎨 Applied color palette: ${palette.name}`);
}

/**
 * Apply dark mode
 */
export function applyDarkMode(enabled: boolean): void {
  const root = document.documentElement;
  const rootEl = document.getElementById('root');
  
  // Apply to both documentElement and #root for compatibility
  const targets = [root, rootEl].filter(Boolean) as HTMLElement[];
  
  targets.forEach(target => {
    if (enabled) {
      target.classList.add('dark-theme');
      target.classList.add('dark');
    } else {
      target.classList.remove('dark-theme');
      target.classList.remove('dark');
    }
  });
  
  // Also set color-scheme for proper system integration
  document.documentElement.style.colorScheme = enabled ? 'dark' : 'light';
  
  console.log(`🌓 Dark mode: ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Initialize personalization on app load
 */
export function initializePersonalization(): PersonalizationSettings {
  const settings = loadPersonalizationSettings();
  
  // Apply color palette
  const palette = getColorPalette(settings.colorPaletteId);
  if (palette) {
    applyColorPalette(palette);
  }
  
  // Apply dark mode
  applyDarkMode(settings.darkMode);
  
  return settings;
}

/**
 * Convert file to base64 for storage
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

/**
 * Get default personalization for a schema based on its ID or name
 */
export function getSchemaPersonalizationDefaults(schemaId: string, schemaName?: string): Partial<PersonalizationSettings> {
  // Check for exact match first
  const idLower = schemaId.toLowerCase();
  if (SCHEMA_PERSONALIZATION_DEFAULTS[idLower]) {
    return SCHEMA_PERSONALIZATION_DEFAULTS[idLower];
  }
  
  // Check for partial matches in schema ID or name
  const searchTerm = (schemaId + ' ' + (schemaName || '')).toLowerCase();
  
  // Airline/Aviation
  if (searchTerm.includes('airline') || searchTerm.includes('flight') || searchTerm.includes('aviation') || searchTerm.includes('airport')) {
    return SCHEMA_PERSONALIZATION_DEFAULTS['airline'];
  }
  // Healthcare/Medical
  if (searchTerm.includes('health') || searchTerm.includes('medical') || searchTerm.includes('patient') || searchTerm.includes('hospital') || searchTerm.includes('clinic')) {
    return SCHEMA_PERSONALIZATION_DEFAULTS['healthcare'];
  }
  // Telecom
  if (searchTerm.includes('telecom') || searchTerm.includes('retention') || searchTerm.includes('mobile') || searchTerm.includes('wireless') || searchTerm.includes('carrier')) {
    return SCHEMA_PERSONALIZATION_DEFAULTS['telecom'];
  }
  // Debt/Collection
  if (searchTerm.includes('debt') || searchTerm.includes('collection') || searchTerm.includes('payment') || searchTerm.includes('recovery') || searchTerm.includes('billing')) {
    return SCHEMA_PERSONALIZATION_DEFAULTS['debt-collection'];
  }
  // Tech Support
  if (searchTerm.includes('tech') || searchTerm.includes('it support') || searchTerm.includes('technical') || searchTerm.includes('helpdesk')) {
    return SCHEMA_PERSONALIZATION_DEFAULTS['tech-support'];
  }
  // Sales
  if (searchTerm.includes('sales') || searchTerm.includes('conversion') || searchTerm.includes('lead') || searchTerm.includes('prospect')) {
    return SCHEMA_PERSONALIZATION_DEFAULTS['sales'];
  }
  // Insurance
  if (searchTerm.includes('insurance') || searchTerm.includes('claim') || searchTerm.includes('policy') || searchTerm.includes('coverage')) {
    return SCHEMA_PERSONALIZATION_DEFAULTS['insurance'];
  }
  // Banking/Finance
  if (searchTerm.includes('bank') || searchTerm.includes('finance') || searchTerm.includes('loan') || searchTerm.includes('mortgage') || searchTerm.includes('account')) {
    return SCHEMA_PERSONALIZATION_DEFAULTS['banking'];
  }
  // Retail/Shopping
  if (searchTerm.includes('retail') || searchTerm.includes('shopping') || searchTerm.includes('order') || searchTerm.includes('ecommerce') || searchTerm.includes('store')) {
    return SCHEMA_PERSONALIZATION_DEFAULTS['retail'];
  }
  // Customer Support (general fallback)
  if (searchTerm.includes('support') || searchTerm.includes('service') || searchTerm.includes('customer')) {
    return SCHEMA_PERSONALIZATION_DEFAULTS['customer-support'];
  }
  
  return {};
}

/**
 * Load personalization settings for a specific schema
 */
export function loadSchemaPersonalization(schemaId: string, schemaName?: string): PersonalizationSettings {
  try {
    // First try to load schema-specific settings
    const stored = localStorage.getItem(SCHEMA_PERSONALIZATION_PREFIX + schemaId);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
    
    // No stored settings - use defaults based on schema type
    const schemaDefaults = getSchemaPersonalizationDefaults(schemaId, schemaName);
    return { ...DEFAULT_SETTINGS, ...schemaDefaults };
  } catch (error) {
    console.error('Error loading schema personalization:', error);
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Save personalization settings for a specific schema
 */
export function saveSchemaPersonalization(schemaId: string, settings: PersonalizationSettings): void {
  try {
    localStorage.setItem(SCHEMA_PERSONALIZATION_PREFIX + schemaId, JSON.stringify(settings));
    console.log(`💾 Saved personalization for schema: ${schemaId}`);
  } catch (error) {
    console.error('Error saving schema personalization:', error);
  }
}

/**
 * Delete personalization settings for a specific schema
 */
export function deleteSchemaPersonalization(schemaId: string): void {
  try {
    localStorage.removeItem(SCHEMA_PERSONALIZATION_PREFIX + schemaId);
    console.log(`🗑️ Deleted personalization for schema: ${schemaId}`);
  } catch (error) {
    console.error('Error deleting schema personalization:', error);
  }
}

/**
 * Initialize personalization for a specific schema
 * Applies the settings and returns them
 */
export function initializeSchemaPersonalization(schemaId: string, schemaName?: string): PersonalizationSettings {
  const settings = loadSchemaPersonalization(schemaId, schemaName);
  
  // Apply color palette
  const palette = getColorPalette(settings.colorPaletteId);
  if (palette) {
    applyColorPalette(palette);
  }
  
  // Apply dark mode
  applyDarkMode(settings.darkMode);
  
  console.log(`🎨 Initialized personalization for schema: ${schemaId}`);
  return settings;
}
