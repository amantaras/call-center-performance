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

const DEFAULT_SETTINGS: PersonalizationSettings = {
  appTitle: 'Call Center QA Platform',
  appSubtitle: 'AI-powered call quality evaluation and analytics',
  logoUrl: null,
  logoBase64: null,
  colorPaletteId: 'ocean-blue',
  darkMode: false,
  compactMode: false,
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
