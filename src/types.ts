export type LanguageCode = 'en' | 'hi' | 'ta' | 'gu' | 'mr' | 'pa';

export type TabType = 'songs' | 'playlists' | 'folders' | 'artists' | 'albums' | 'favorites';

export type RepeatMode = 'off' | 'all' | 'one';

export type ThemeMode = 'amoled' | 'light' | 'system' | 'pure-black' | 'dark' | 'dynamic';

export type ListDensity = 'compact' | 'cozy' | 'grid';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  url?: string; // object URL or data URL
  filePath?: string; // native Android file path for fast MediaMetadataRetriever art
  coverArt?: string; // base64 or blob URL
  rawAlbumArtUri?: string; // native content:// albumart URI
  dominantColor?: string; // rgb(r, g, b)
  folder?: string;
  format?: string;
  size?: number;
  dateAdded: number;
  isFavorite: boolean;
  playCount: number;
  lyrics?: string; // plain or LRC
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
  color?: string;
}

export interface EqualizerPreset {
  name: string;
  gains: number[]; // 5 bands in dB: 60Hz, 230Hz, 910Hz, 3.6kHz, 14kHz
}

export interface UserSettings {
  language: LanguageCode;
  hasCompletedOnboarding: boolean;
  hasGrantedPermission: boolean;
  theme: ThemeMode;
  accentColor: string;
  listDensity: ListDensity;
  wallpaperImage?: string;
  wallpaperBlur: number; // 0 to 24 px
  wallpaperDim: number; // 30 to 85 %
  playtimeSeconds: number;
  sleepTimerMinutes: number | null;
  sleepTimerTarget: number | null;
  playbackSpeed: number;
  preservesPitch: boolean; // false for slowed+reverb aesthetic
  gapless: boolean;
  crossfade: number; // 0 to 5 seconds
  equalizerGains: number[];
  equalizerPreset: string;
  hiddenTrackIds: string[];
  recentlyDeleted: { track: Track; deletedAt: number }[];
}

export interface LyricLine {
  time: number; // seconds
  text: string;
}

export interface SongDailyStats {
  durationSeconds: number;
  playCount: number;
}

export interface SongListeningRecord {
  trackId: string;
  title: string;
  artist: string;
  coverArt?: string;
  durationSeconds: number;
  playCount: number;
  daily: Record<string, SongDailyStats>;
  lastPlayedAt?: number;
}

export interface ListeningStatsStore {
  version: 1;
  migratedLegacySeconds: number;
  totalSeconds: number;
  songs: Record<string, SongListeningRecord>;
  dailyTotals: Record<string, SongDailyStats>;
}
