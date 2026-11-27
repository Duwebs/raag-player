import { Capacitor, registerPlugin, PluginListenerHandle } from '@capacitor/core';
import { Track } from '../types';

export interface MediaActionEvent {
  action: 'play' | 'pause' | 'next' | 'prev' | 'seek' | 'stop';
  position?: number;
}

export interface MediaControlsPluginInterface {
  updateMetadata(options: {
    title: string;
    artist: string;
    album: string;
    duration: number;
    artwork: string;
    filePath: string;
  }): Promise<void>;
  updatePlaybackState(options: {
    isPlaying: boolean;
    position: number;
    duration: number;
    playbackRate: number;
  }): Promise<void>;
  stopService(): Promise<void>;
  addListener(
    eventName: 'mediaAction',
    listenerFunc: (event: MediaActionEvent) => void
  ): Promise<PluginListenerHandle>;
}

const MediaControls = registerPlugin<MediaControlsPluginInterface>('MediaControls', {
  web: {
    updateMetadata: async () => {},
    updatePlaybackState: async () => {},
    stopService: async () => {},
    addListener: async () => ({ remove: async () => {} }),
  },
});

const isMediaPluginReady = (): boolean => {
  return (
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === 'android' &&
    Capacitor.isPluginAvailable('MediaControls')
  );
};

export async function updateNativeMediaMetadata(track: Track, resolvedDuration?: number): Promise<void> {
  if (!isMediaPluginReady()) return;

  try {
    const dur = resolvedDuration && isFinite(resolvedDuration) && resolvedDuration > 0
      ? resolvedDuration
      : track.duration || 0;

    // Prefer native content:// URI when available, fall back to coverArt data/file URI
    let artSource = track.rawAlbumArtUri || track.coverArt || '';
    if (artSource.startsWith('blob:')) {
      artSource = '';
    }

    await MediaControls.updateMetadata({
      title: track.title || 'Raag Player',
      artist: track.artist || 'Unknown Artist',
      album: 'Raag Player',
      duration: dur,
      artwork: artSource,
      filePath: track.filePath || '',
    });
  } catch (err) {
    console.warn('[MediaControls] updateMetadata error:', err);
  }
}

export async function updateNativePlaybackState(
  isPlaying: boolean,
  position: number,
  duration: number,
  playbackRate = 1
): Promise<void> {
  if (!isMediaPluginReady()) return;

  try {
    await MediaControls.updatePlaybackState({
      isPlaying,
      position: isFinite(position) && position >= 0 ? position : 0,
      duration: isFinite(duration) && duration >= 0 ? duration : 0,
      playbackRate: playbackRate > 0 ? playbackRate : 1,
    });
  } catch (err) {
    console.warn('[MediaControls] updatePlaybackState error:', err);
  }
}

export async function stopNativeMediaService(): Promise<void> {
  if (!isMediaPluginReady()) return;

  try {
    await MediaControls.stopService();
  } catch {
    // ignore
  }
}

export async function subscribeNativeMediaActions(
  onAction: (event: MediaActionEvent) => void
): Promise<() => void> {
  if (!isMediaPluginReady()) {
    return () => {};
  }

  try {
    const handle = await MediaControls.addListener('mediaAction', onAction);
    return () => {
      handle.remove().catch(() => {});
    };
  } catch {
    return () => {};
  }
}
