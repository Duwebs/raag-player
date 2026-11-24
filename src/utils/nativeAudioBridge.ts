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
  getAllDeviceAudio(): Promise<{ tracks: NativeTrackRaw[] }>;
  openAppSettings(): Promise<void>;
}

export const AudioScanner = registerPlugin<AudioScannerPluginInterface>('AudioScanner', {
  web: {
    checkAudioPermission: async () => ({ granted: true, status: 'granted' }),
    requestAudioPermission: async () => ({ granted: true, status: 'granted' }),
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
    const rawList = response.tracks || [];

    return rawList.map((item) => {
      // Playable URL via Capacitor local server
      const playableUrl = item.filePath
        ? Capacitor.convertFileSrc(item.filePath)
        : item.contentUri
        ? Capacitor.convertFileSrc(item.contentUri)
        : '';

      const coverArtUrl = item.albumArtUri
        ? Capacitor.convertFileSrc(item.albumArtUri)
        : undefined;

      return {
        id: item.id,
        title: item.title,
        artist: item.artist,
        album: item.album,
        duration: item.duration || 0,
        url: playableUrl,
        coverArt: coverArtUrl,
        folder: item.folder || 'Internal Storage',
        format: item.format || 'mp3',
        size: item.size || 0,
        dateAdded: item.dateAdded || Date.now(),
        isFavorite: false,
        playCount: 0,
      };
    });
  } catch (err) {
    console.error("Error retrieving device audio from MediaStore:", err);
    return [];
  }
}
