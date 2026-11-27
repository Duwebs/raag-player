import { ListDensity, ThemeMode, UserSettings } from '../types';

export const DENSITY_STORAGE_KEY = 'raag_list_density';
export const WALLPAPER_STORAGE_KEY = 'raag_custom_wallpaper';

export interface AccentSwatch {
  id: string;
  name: string;
  hex: string;
}

export const ACCENT_SWATCHES: AccentSwatch[] = [
  { id: 'peacock-cyan', name: 'Peacock Cyan', hex: '#06B6D4' },
  { id: 'saffron-gold', name: 'Saffron Gold', hex: '#F59E0B' },
  { id: 'emerald-raag', name: 'Emerald Raag', hex: '#10B981' },
  { id: 'royal-indigo', name: 'Royal Indigo', hex: '#6366F1' },
  { id: 'crimson-rose', name: 'Crimson Rose', hex: '#F43F5E' },
];

export const DEFAULT_ACCENT_COLOR = '#06B6D4';

export function normalizeThemeMode(mode?: string): 'amoled' | 'light' | 'system' {
  if (mode === 'light') return 'light';
  if (mode === 'system') return 'system';
  return 'amoled';
}

export function resolveIsLightSurface(mode?: ThemeMode | string): boolean {
  const normalized = normalizeThemeMode(mode);
  if (normalized === 'light') return true;
  if (normalized === 'amoled') return false;
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: light)').matches;
  }
  return false;
}

function parseHexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = (hex || DEFAULT_ACCENT_COLOR).replace('#', '').trim();
  const full =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((c) => c + c)
          .join('')
      : cleaned;
  const num = parseInt(full, 16);
  if (Number.isNaN(num) || full.length !== 6) {
    return { r: 6, g: 182, b: 212 };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function getContrastTextColor(hex: string): '#FFFFFF' | '#09090B' {
  const { r, g, b } = parseHexToRgb(hex);
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const lum = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return lum > 0.40 ? '#09090B' : '#FFFFFF';
}

export interface SurfacePaletteTokens {
  isLight: boolean;
  bgSurface: string;
  cardSurface: string;
  cardElevated: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  headerGlass: string;
  miniplayerGlass: string;
  accentColor: string;
  accentSoft: string;
  accentBorder: string;
  accentGlow: string;
  accentContrast: '#FFFFFF' | '#09090B';
}

export function computeAppearanceTokens(
  themeMode?: ThemeMode | string,
  accentHex?: string
): SurfacePaletteTokens {
  const isLight = resolveIsLightSurface(themeMode);
  const accentColor = accentHex && /^#[0-9A-Fa-f]{6}$/.test(accentHex) ? accentHex : DEFAULT_ACCENT_COLOR;
  const { r, g, b } = parseHexToRgb(accentColor);

  return {
    isLight,
    bgSurface: isLight ? '#F8FAFC' : '#050505',
    cardSurface: isLight ? '#FFFFFF' : '#0F0F11',
    cardElevated: isLight ? '#F1F5F9' : '#17171C',
    borderSubtle: isLight ? '#E2E8F0' : '#1E1E24',
    textPrimary: isLight ? '#0F172A' : '#F8FAFC',
    textSecondary: isLight ? '#475569' : '#94A3B8',
    textMuted: isLight ? '#64748B' : '#71717A',
    headerGlass: isLight ? 'rgba(248, 250, 252, 0.88)' : 'rgba(5, 5, 5, 0.88)',
    miniplayerGlass: isLight ? 'rgba(255, 255, 255, 0.92)' : 'rgba(18, 18, 22, 0.92)',
    accentColor,
    accentSoft: `rgba(${r}, ${g}, ${b}, ${isLight ? 0.12 : 0.16})`,
    accentBorder: `rgba(${r}, ${g}, ${b}, ${isLight ? 0.36 : 0.34})`,
    accentGlow: `rgba(${r}, ${g}, ${b}, ${isLight ? 0.25 : 0.34})`,
    accentContrast: getContrastTextColor(accentColor),
  };
}

/**
 * Applies global CSS theme variables across the entire document without reload.
 */
export function applyAppearanceCssVariables(
  settings: Pick<UserSettings, 'theme' | 'accentColor'>
): SurfacePaletteTokens {
  const tokens = computeAppearanceTokens(settings.theme, settings.accentColor);
  if (typeof document === 'undefined') return tokens;

  const root = document.documentElement;
  root.style.colorScheme = tokens.isLight ? 'light' : 'dark';
  root.style.setProperty('--accent-color', tokens.accentColor);
  root.style.setProperty('--accent-soft', tokens.accentSoft);
  root.style.setProperty('--accent-border', tokens.accentBorder);
  root.style.setProperty('--accent-glow', tokens.accentGlow);
  root.style.setProperty('--accent-contrast', tokens.accentContrast);
  root.style.setProperty('--bg-surface', tokens.bgSurface);
  root.style.setProperty('--card-surface', tokens.cardSurface);
  root.style.setProperty('--card-elevated', tokens.cardElevated);
  root.style.setProperty('--border-subtle', tokens.borderSubtle);
  root.style.setProperty('--text-primary', tokens.textPrimary);
  root.style.setProperty('--text-secondary', tokens.textSecondary);
  root.style.setProperty('--text-muted', tokens.textMuted);
  root.style.setProperty('--header-glass', tokens.headerGlass);
  root.style.setProperty('--miniplayer-glass', tokens.miniplayerGlass);

  document.body.style.backgroundColor = tokens.bgSurface;
  document.body.style.color = tokens.textPrimary;

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute('content', tokens.bgSurface);
  }

  return tokens;
}

export function loadPersistedDensity(): ListDensity {
  try {
    const val = localStorage.getItem(DENSITY_STORAGE_KEY);
    if (val === 'compact' || val === 'cozy' || val === 'grid') {
      return val;
    }
  } catch {
    // ignore
  }
  return 'cozy';
}

export function savePersistedDensity(density: ListDensity): void {
  try {
    localStorage.setItem(DENSITY_STORAGE_KEY, density);
  } catch {
    // ignore
  }
}

export function loadPersistedWallpaper(): string | undefined {
  try {
    const val = localStorage.getItem(WALLPAPER_STORAGE_KEY);
    return val || undefined;
  } catch {
    return undefined;
  }
}

export function savePersistedWallpaper(dataUrl?: string): void {
  try {
    if (dataUrl) {
      localStorage.setItem(WALLPAPER_STORAGE_KEY, dataUrl);
    } else {
      localStorage.removeItem(WALLPAPER_STORAGE_KEY);
    }
  } catch {
    // ignore quota error silently; IDB also saves UserSettings copy
  }
}

/**
 * Compresses a selected gallery photo to max 1280px JPEG so it renders crisply without overflowing storage.
 */
export function compressWallpaperFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format'));
      img.onload = () => {
        const maxDim = 1280;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
