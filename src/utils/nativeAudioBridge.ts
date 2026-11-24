import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { App } from '@capacitor/app';
import { Track } from '../types';

export const isNativeAndroid = (): boolean => {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
};

export interface PermissionResult {
  granted: boolean;
  deniedCount: number;
}

export async function requestAndroidAudioPermission(): Promise<boolean> {
  if (!isNativeAndroid()) {
    return true;
  }

  try {
    const status = await Filesystem.requestPermissions();
    if (status.publicStorage === 'granted') {
      return true;
    }
    return false;
  } catch (err) {
    console.warn("Native permission request exception:", err);
    return false;
  }
}

export async function checkAndroidAudioPermission(): Promise<boolean> {
  if (!isNativeAndroid()) {
    return true;
  }

  try {
    const status = await Filesystem.checkPermissions();
    return status.publicStorage === 'granted';
  } catch {
    return false;
  }
}

export async function openAppSettings(): Promise<void> {
  if (isNativeAndroid()) {
    try {
      // In Android, package URI can be opened or fallback to system intent
      window.open('package:com.duwebs.raagplayer', '_system');
    } catch (e) {
      console.warn("Could not open app settings:", e);
    }
  }
}

// Automatically scans native Android device audio folders (Music, Download)
export async function scanDeviceAudio(): Promise<Track[]> {
  if (!isNativeAndroid()) {
    return [];
  }

  const audioTracks: Track[] = [];
  const knownAudioExtensions = /\.(mp3|wav|flac|m4a|ogg|aac|opus)$/i;
  const targetDirectories = ['Music', 'Download', 'Audiobooks', 'Podcasts', ''];

  for (const dirName of targetDirectories) {
    try {
      const result = await Filesystem.readdir({
        directory: Directory.Documents,
        path: dirName,
      });

      for (const item of result.files) {
        if (item.type === 'file' && knownAudioExtensions.test(item.name)) {
          try {
            const uriResult = await Filesystem.getUri({
              directory: Directory.Documents,
              path: dirName ? `${dirName}/${item.name}` : item.name,
            });

            const webSrc = Capacitor.convertFileSrc(uriResult.uri);
            const cleanTitle = item.name.replace(/\.[^/.]+$/, '').replace(/[_]/g, ' ');

            audioTracks.push({
              id: `native-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
              title: cleanTitle,
              artist: dirName || 'Device Audio',
              album: dirName ? `${dirName} Folder` : 'Local Storage',
              duration: 180, // estimated until playback metadata resolves
              url: webSrc,
              folder: dirName || 'Internal Storage',
              format: item.name.split('.').pop()?.toLowerCase(),
              size: item.size || 0,
              dateAdded: Date.now(),
              isFavorite: false,
              playCount: 0,
            });
          } catch (fileErr) {
            console.warn("Error reading file URI:", fileErr);
          }
        }
      }
    } catch {
      // Directory may not exist or not accessible
    }
  }

  return audioTracks;
}
