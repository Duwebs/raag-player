import { ListeningStatsStore, SongListeningRecord, Track } from '../types';

const STORAGE_KEY = 'raag_listening_stats_v1';
const MAX_INLINE_ART_LENGTH = 16_000;

/**
 * Returns local calendar date key in YYYY-MM-DD format (avoids UTC midnight shift).
 */
export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats listening duration seconds cleanly (e.g. "0s", "42s", "14m 11s", "1h 24m").
 */
export function formatPlaytime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds || 0));
  if (!safe) return '0s';
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

/**
 * Formats a YYYY-MM-DD key into a friendly display label ("Today", "Yesterday", or "27 Nov 2026").
 */
export function formatDateLabel(dateKey: string, includeYear = true): string {
  const today = new Date();
  const todayKey = getLocalDateKey(today);
  if (dateKey === todayKey) return 'Today';

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateKey === getLocalDateKey(yesterday)) return 'Yesterday';

  const parts = dateKey.split('-').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(Number.isNaN)) return dateKey;

  const parsed = new Date(parts[0], parts[1] - 1, parts[2]);
  return parsed.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    ...(includeYear ? { year: 'numeric' } : {}),
  });
}

function createEmptyStore(): ListeningStatsStore {
  return {
    version: 1,
    migratedLegacySeconds: 0,
    totalSeconds: 0,
    songs: {},
    dailyTotals: {},
  };
}

function sanitizeCoverArtForStorage(coverArt?: string): string | undefined {
  if (!coverArt) return undefined;
  // Avoid overflowing WebView localStorage with large base64 images; live tracks array still supplies them.
  if (coverArt.startsWith('data:') && coverArt.length > MAX_INLINE_ART_LENGTH) {
    return undefined;
  }
  if (coverArt.startsWith('blob:')) {
    // Blob URLs are session-scoped and expire after restart
    return undefined;
  }
  return coverArt;
}

function saveStatsStore(store: ListeningStatsStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Retry after stripping cached coverArt thumbnails if localStorage quota is tight
    try {
      const strippedSongs: Record<string, SongListeningRecord> = {};
      for (const [id, song] of Object.entries(store.songs)) {
        strippedSongs[id] = { ...song, coverArt: undefined };
      }
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...store, songs: strippedSongs })
      );
    } catch {
      // Ignore unrecoverable storage failures silently
    }
  }
}

/**
 * Loads persisted listening stats store from localStorage safely.
 */
export function loadListeningStats(): ListeningStatsStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyStore();
    const parsed = JSON.parse(raw) as Partial<ListeningStatsStore>;
    return {
      version: 1,
      migratedLegacySeconds: Math.max(0, Math.floor(parsed.migratedLegacySeconds || 0)),
      totalSeconds: Math.max(0, Math.floor(parsed.totalSeconds || 0)),
      songs: parsed.songs && typeof parsed.songs === 'object' ? parsed.songs : {},
      dailyTotals: parsed.dailyTotals && typeof parsed.dailyTotals === 'object' ? parsed.dailyTotals : {},
    };
  } catch {
    return createEmptyStore();
  }
}

/**
 * Reconciles legacy IndexedDB playtimeSeconds into the stats store so existing lifetime totals are never lost.
 */
export function syncLegacyPlaytime(legacyPlaytimeSeconds: number): ListeningStatsStore {
  const store = loadListeningStats();
  const safeLegacy = Math.max(0, Math.floor(legacyPlaytimeSeconds || 0));

  if (safeLegacy > store.totalSeconds) {
    const delta = safeLegacy - store.totalSeconds;
    store.migratedLegacySeconds += delta;
    store.totalSeconds = safeLegacy;
    saveStatsStore(store);
  }

  return store;
}

function ensureSongRecord(store: ListeningStatsStore, track: Track): SongListeningRecord {
  const existing = store.songs[track.id];
  const compactArt = sanitizeCoverArtForStorage(track.coverArt);

  if (existing) {
    existing.title = track.title || existing.title;
    existing.artist = track.artist || existing.artist;
    if (compactArt) {
      existing.coverArt = compactArt;
    }
    if (!existing.daily) {
      existing.daily = {};
    }
    return existing;
  }

  const created: SongListeningRecord = {
    trackId: track.id,
    title: track.title || 'Unknown Title',
    artist: track.artist || 'Unknown Artist',
    coverArt: compactArt,
    durationSeconds: 0,
    playCount: 0,
    daily: {},
    lastPlayedAt: Date.now(),
  };
  store.songs[track.id] = created;
  return created;
}

/**
 * Records a track start/replay across total and today's daily breakdown.
 */
export function recordTrackPlayStart(track: Track): ListeningStatsStore {
  const store = loadListeningStats();
  const dateKey = getLocalDateKey();
  const song = ensureSongRecord(store, track);

  song.playCount += 1;
  song.lastPlayedAt = Date.now();

  if (!song.daily[dateKey]) {
    song.daily[dateKey] = { durationSeconds: 0, playCount: 0 };
  }
  song.daily[dateKey].playCount += 1;

  if (!store.dailyTotals[dateKey]) {
    store.dailyTotals[dateKey] = { durationSeconds: 0, playCount: 0 };
  }
  store.dailyTotals[dateKey].playCount += 1;

  saveStatsStore(store);
  return store;
}

/**
 * Records 1 second of active playback for the current track and date.
 */
export function recordListeningSecond(track: Track | null): ListeningStatsStore {
  const store = loadListeningStats();
  const dateKey = getLocalDateKey();

  store.totalSeconds += 1;
  if (!store.dailyTotals[dateKey]) {
    store.dailyTotals[dateKey] = { durationSeconds: 0, playCount: 0 };
  }
  store.dailyTotals[dateKey].durationSeconds += 1;

  if (track) {
    const song = ensureSongRecord(store, track);
    song.durationSeconds += 1;
    song.lastPlayedAt = Date.now();
    if (!song.daily[dateKey]) {
      song.daily[dateKey] = { durationSeconds: 0, playCount: 0 };
    }
    song.daily[dateKey].durationSeconds += 1;
  }

  saveStatsStore(store);
  return store;
}

/**
 * Returns sorted descending list of YYYY-MM-DD dates with recorded activity (always including today if present or empty).
 */
export function getActiveDates(store: ListeningStatsStore): string[] {
  const dateSet = new Set<string>();
  const todayKey = getLocalDateKey();
  dateSet.add(todayKey);

  for (const [dateKey, stats] of Object.entries(store.dailyTotals)) {
    if ((stats.durationSeconds || 0) > 0 || (stats.playCount || 0) > 0) {
      dateSet.add(dateKey);
    }
  }

  for (const song of Object.values(store.songs)) {
    for (const [dateKey, stats] of Object.entries(song.daily || {})) {
      if ((stats.durationSeconds || 0) > 0 || (stats.playCount || 0) > 0) {
        dateSet.add(dateKey);
      }
    }
  }

  return Array.from(dateSet).sort((a, b) => b.localeCompare(a));
}

export type PlaytimeFilterTab = 'today' | 'all-time' | 'by-date';
export type PlaytimeSortMode = 'time' | 'plays';

export interface RankedPlaytimeSong {
  rank: number;
  trackId: string;
  title: string;
  artist: string;
  coverArt?: string;
  durationSeconds: number;
  playCount: number;
  progressPercent: number;
}

export interface PlaytimeViewSummary {
  totalSeconds: number;
  totalPlays: number;
  songCount: number;
  migratedLegacySeconds: number;
  topSong: RankedPlaytimeSong | null;
  items: RankedPlaytimeSong[];
}

/**
 * Aggregates and ranks listening stats for the selected filter tab, calendar date, and sort order.
 */
export function buildPlaytimeViewData({
  store,
  filter,
  selectedDate,
  sortBy,
  tracks,
}: {
  store: ListeningStatsStore;
  filter: PlaytimeFilterTab;
  selectedDate: string;
  sortBy: PlaytimeSortMode;
  tracks: Track[];
}): PlaytimeViewSummary {
  const trackMap = new Map<string, Track>();
  for (const t of tracks) {
    trackMap.set(t.id, t);
  }

  const targetDateKey = filter === 'today' ? getLocalDateKey() : selectedDate;
  const rawItems: Omit<RankedPlaytimeSong, 'rank' | 'progressPercent'>[] = [];
  let sumSongSeconds = 0;
  let sumSongPlays = 0;

  for (const song of Object.values(store.songs)) {
    let durationSeconds = 0;
    let playCount = 0;

    if (filter === 'all-time') {
      durationSeconds = song.durationSeconds || 0;
      playCount = song.playCount || 0;
    } else {
      const dayStats = song.daily?.[targetDateKey];
      if (!dayStats) continue;
      durationSeconds = dayStats.durationSeconds || 0;
      playCount = dayStats.playCount || 0;
    }

    if (durationSeconds <= 0 && playCount <= 0) continue;

    sumSongSeconds += durationSeconds;
    sumSongPlays += playCount;

    const liveTrack = trackMap.get(song.trackId);
    rawItems.push({
      trackId: song.trackId,
      title: liveTrack?.title || song.title || 'Unknown Title',
      artist: liveTrack?.artist || song.artist || 'Unknown Artist',
      coverArt: liveTrack?.coverArt || song.coverArt,
      durationSeconds,
      playCount,
    });
  }

  rawItems.sort((a, b) => {
    if (sortBy === 'plays') {
      if (b.playCount !== a.playCount) return b.playCount - a.playCount;
      return b.durationSeconds - a.durationSeconds;
    }
    if (b.durationSeconds !== a.durationSeconds) return b.durationSeconds - a.durationSeconds;
    return b.playCount - a.playCount;
  });

  const topMetric =
    rawItems.length > 0
      ? sortBy === 'plays'
        ? rawItems[0].playCount
        : rawItems[0].durationSeconds
      : 0;

  const items: RankedPlaytimeSong[] = rawItems.map((item, idx) => {
    const val = sortBy === 'plays' ? item.playCount : item.durationSeconds;
    const ratio = topMetric > 0 ? (val / topMetric) * 100 : 0;
    return {
      ...item,
      rank: idx + 1,
      progressPercent: val > 0 ? Math.max(4, Math.min(100, ratio)) : 0,
    };
  });

  const dailySummary = store.dailyTotals[targetDateKey];
  const totalSeconds =
    filter === 'all-time'
      ? Math.max(store.totalSeconds, sumSongSeconds)
      : Math.max(dailySummary?.durationSeconds || 0, sumSongSeconds);

  const totalPlays =
    filter === 'all-time'
      ? sumSongPlays
      : Math.max(dailySummary?.playCount || 0, sumSongPlays);

  return {
    totalSeconds,
    totalPlays,
    songCount: items.length,
    migratedLegacySeconds: filter === 'all-time' ? store.migratedLegacySeconds : 0,
    topSong: items[0] || null,
    items,
  };
}
