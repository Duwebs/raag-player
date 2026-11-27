import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Track } from '../types';

export interface NativeTrackRaw {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  filePath: string;
  contentUri: string;
  albumArtUri: string;
  folder: string;
  format: string;
  size: number;
  dateAdded: number;
  isFavorite: boolean;
  playCount: number;
}

export interface PermissionStatusResult {
  granted: boolean;
  status: 'granted' | 'denied' | 'never_ask_again';
}

export interface AudioScannerPluginInterface {
  checkAudioPermission(): Promise<PermissionStatusResult>;
  requestAudioPermission(): Promise<PermissionStatusResult>;
  requestNotificationPermission(): Promise<{ granted: boolean }>;
  getAllDeviceAudio(): Promise<{ tracks: NativeTrackRaw[] }>;
  openAppSettings(): Promise<void>;
}

export const AudioScanner = registerPlugin<AudioScannerPluginInterface>('AudioScanner', {
  web: {
    checkAudioPermission: async () => ({ granted: true, status: 'granted' }),
    requestAudioPermission: async () => ({ granted: true, status: 'granted' }),
    requestNotificationPermission: async () => ({ granted: true }),
    getAllDeviceAudio: async () => ({ tracks: [] }),
    openAppSettings: async () => {},
  },
});

export const isNativeAndroid = (): boolean => {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
};

/**
 * Checks current audio permission status without prompting
 */
export async function checkAndroidAudioPermission(): Promise<PermissionStatusResult> {
  if (!isNativeAndroid()) {
    return { granted: true, status: 'granted' };
  }

  try {
    return await AudioScanner.checkAudioPermission();
  } catch (err) {
    console.warn("Native checkAudioPermission exception:", err);
    return { granted: false, status: 'denied' };
  }
}

/**
 * Calls Android's native runtime permission request for READ_MEDIA_AUDIO or READ_EXTERNAL_STORAGE
 */
export async function requestAndroidAudioPermission(): Promise<PermissionStatusResult> {
  if (!isNativeAndroid()) {
    return { granted: true, status: 'granted' };
  }

  try {
    return await AudioScanner.requestAudioPermission();
  } catch (err) {
    console.warn("Native requestAudioPermission exception:", err);
    return { granted: false, status: 'denied' };
  }
}

/**
 * Triggers Android 13+ POST_NOTIFICATIONS runtime dialog
 */
export async function requestAndroidNotificationPermission(): Promise<boolean> {
  if (!isNativeAndroid()) {
    return true;
  }

  try {
    const res = await AudioScanner.requestNotificationPermission();
    return res.granted;
  } catch (err) {
    console.warn("Notification permission exception:", err);
    return false;
  }
}

/**
 * Opens Android Application Details Settings screen
 */
export async function openAppSettings(): Promise<void> {
  if (isNativeAndroid()) {
    try {
      await AudioScanner.openAppSettings();
    } catch (err) {
      console.warn("Could not open native settings:", err);
    }
  }
}

/**
 * Queries native Android MediaStore.Audio.Media to fetch all music tracks across the device
 */
export async function getAllDeviceAudio(): Promise<Track[]> {
  if (!isNativeAndroid()) {
    return [];
  }

  try {
    const response = await AudioScanner.getAllDeviceAudio();
    const rawList = response?.tracks || [];

    return rawList.map((item) => {
      // Playable URL via Capacitor local server
      let playableUrl = '';
      try {
        if (item.filePath && item.filePath.trim().length > 0) {
          playableUrl = Capacitor.convertFileSrc(item.filePath);
        } else if (item.contentUri && item.contentUri.trim().length > 0) {
          playableUrl = Capacitor.convertFileSrc(item.contentUri);
        }
      } catch (e) {
        console.warn('convertFileSrc error:', e);
      }

      let coverArtUrl: string | undefined = undefined;
      try {
        if (item.albumArtUri && item.albumArtUri.trim().length > 0) {
          coverArtUrl = Capacitor.convertFileSrc(item.albumArtUri);
        }
      } catch {
        coverArtUrl = undefined;
      }

      return {
        id: item.id || `media-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: item.title || 'Unknown Title',
        artist: item.artist || 'Unknown Artist',
        album: item.album || 'Unknown Album',
        duration: typeof item.duration === 'number' && !isNaN(item.duration) ? item.duration : 0,
        url: playableUrl,
        filePath: item.filePath || undefined,
        coverArt: coverArtUrl,
        rawAlbumArtUri: item.albumArtUri || undefined,
        folder: item.folder || 'Internal Storage',
        format: item.format || 'mp3',
        size: typeof item.size === 'number' ? item.size : 0,
        dateAdded: item.dateAdded || Date.now(),
        isFavorite: false,
        playCount: 0,
      };
    });
  } catch (err) {
    console.error('Error retrieving device audio from MediaStore:', err);
    return [];
  }
}
