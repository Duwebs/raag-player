import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Track,
  Playlist,
  UserSettings,
  TabType,
  RepeatMode,
  ListeningStatsStore,
  VisualizerStyle,
} from './types';
import {
  loadListeningStats,
  syncLegacyPlaytime,
  recordTrackPlayStart,
  recordListeningSecond,
} from './utils/playtimeStats';
import {
  DEFAULT_ACCENT_COLOR,
  applyAppearanceCssVariables,
  computeAppearanceTokens,
  loadPersistedDensity,
  loadPersistedWallpaper,
  normalizeThemeMode,
  savePersistedDensity,
  savePersistedWallpaper,
} from './utils/appearanceTheme';
import {
  subscribeNativeMediaActions,
  updateNativeMediaMetadata,
  updateNativePlaybackState,
} from './utils/nativeMediaControls';
import { TRANSLATIONS } from './utils/translations';
import {
  dbGetAllTracks,
  dbSaveMultipleTracks,
  dbSaveTrack,
  dbGetAudioBlob,
  dbToggleFavorite,
  dbGetSettings,
  dbSaveSettings,
  dbGetPlaylists,
  dbSavePlaylists,
  dbClearStorage,
  dbDeleteTrack,
} from './utils/db';
import { parseAudioFile } from './utils/id3Parser';
import { extractDominantColor } from './utils/colorExtractor';
import { audioEngine, EQUALIZER_PRESETS, normalizeEqGains } from './utils/audioEngine';
import { getDemoTracks } from './data/demoTracks';
import { isNativeAndroid, getAllDeviceAudio, requestAndroidNotificationPermission } from './utils/nativeAudioBridge';

import { OnboardingScreen } from './components/OnboardingScreen';
import { AccessFlowScreen } from './components/AccessFlowScreen';
import { TopAppBar } from './components/TopAppBar';
import { FilterPills } from './components/FilterPills';
import { TrackItem } from './components/TrackItem';
import { MiniPlayer } from './components/MiniPlayer';
import { NowPlayingSheet } from './components/NowPlayingSheet';
import { SettingsScreen } from './components/SettingsScreen';
import { GroupedListView } from './components/GroupedListView';
import { TrackInfoModal } from './components/TrackInfoModal';
import { UpdateModal } from './components/UpdateModal';
import { SplashScreen } from './components/SplashScreen';
import {
  notifyAppReady,
  getActiveBundleVersion,
  checkRemoteUpdate,
  getMockUpdate,
  UpdateCheckResult,
  OTA_BUNDLE_URL,
} from './utils/otaUpdater';
import { ArrowLeft, Plus, Music } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DEFAULT_SETTINGS: UserSettings = {
  language: 'en',
  hasCompletedOnboarding: false,
  hasGrantedPermission: false,
  theme: 'amoled',
  accentColor: DEFAULT_ACCENT_COLOR,
  listDensity: loadPersistedDensity(),
  wallpaperImage: loadPersistedWallpaper(),
  wallpaperBlur: 8,
  wallpaperDim: 60,
  playtimeSeconds: 0,
  sleepTimerMinutes: null,
  sleepTimerTarget: null,
  playbackSpeed: 1.0,
  preservesPitch: true,
  gapless: true,
  crossfade: 0,
  equalizerEnabled: false,
  equalizerGains: [...EQUALIZER_PRESETS.normal.gains],
  equalizerPreset: 'normal',
  visualizerEnabled: false,
  visualizerStyle: 'bars',
  hiddenTrackIds: [],
  recentlyDeleted: [],
};

export const App: React.FC = () => {
  // App Settings
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isOnboardingStep2, setIsOnboardingStep2] = useState(false);
  const [denialCount, setDenialCount] = useState(0);

  // PWA Install Prompt
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // Library State
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('songs');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<'title' | 'artist' | 'duration' | 'date'>('date');

  // Playback State
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const currentTrackRef = useRef<Track | null>(null);
  const [listeningStats, setListeningStats] = useState<ListeningStatsStore>(() => loadListeningStats());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');
  const [isShuffle, setIsShuffle] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [dynamicGradient, setDynamicGradient] = useState<string>('');

  // UI Navigation
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<{ name: string; tracks: Track[] } | null>(null);
  const [infoModalTrack, setInfoModalTrack] = useState<Track | null>(null);
  const isCrossfadingRef = useRef(false);

  // OTA Live Updates State
  const [activeVersion, setActiveVersion] = useState<string>('1.0.0');
  const [availableUpdate, setAvailableUpdate] = useState<UpdateCheckResult | null>(null);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [updateToast, setUpdateToast] = useState<string | null>(null);
  const [updateStatusType, setUpdateStatusType] = useState<'info' | 'success' | 'error'>('info');

  // Notify Capacitor that app is healthy and check for OTA updates
  useEffect(() => {
    notifyAppReady();

    getActiveBundleVersion().then((ver) => {
      setActiveVersion(ver);
      const justUpdated = localStorage.getItem('raag_just_updated_version');
      if (justUpdated) {
        setUpdateToast(`Updated to v${justUpdated}!`);
        setUpdateStatusType('success');
        localStorage.removeItem('raag_just_updated_version');
        setTimeout(() => setUpdateToast(null), 4000);
      }
    });

    const checkTimer = setTimeout(() => {
      checkRemoteUpdate()
        .then((res) => {
          if (res.updateAvailable && res.remoteVersion) {
            setAvailableUpdate(res);
          }
        })
        .catch((e) => console.warn('[OTA] Initial check error:', e));
    }, 2500);

    return () => clearTimeout(checkTimer);
  }, []);

  const handleManualCheckUpdates = async () => {
    setIsCheckingUpdates(true);
    setUpdateToast('Checking server...');
    setUpdateStatusType('info');
    try {
      const res = await checkRemoteUpdate(true);
      setIsCheckingUpdates(false);
      if (res.updateAvailable && res.remoteVersion) {
        setUpdateToast(`Update Available (v${res.remoteVersion})`);
        setUpdateStatusType('success');
        setAvailableUpdate(res);
      } else {
        const msg = 'OTA Connected • Up to date';
        setUpdateToast(msg);
        setUpdateStatusType('success');
        setTimeout(() => setUpdateToast(null), 5000);
      }
    } catch (err: unknown) {
      setIsCheckingUpdates(false);
      const msg = (err as Error)?.message || 'Failed to connect to update server';
      setUpdateToast(`OTA Error: ${msg}`);
      setUpdateStatusType('error');
      setTimeout(() => setUpdateToast(null), 7000);
    }
  };

  const handleSimulateUpdate = () => {
    const mock = getMockUpdate();
    setAvailableUpdate(mock);
  };

  // Hidden file inputs for adding files later
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // 1. Capture PWA beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    if (deferredInstallPrompt) {
      await deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredInstallPrompt(null);
      }
    } else {
      alert("To install Raag Player:\nTap your browser's menu (⋮) and choose 'Install app' or 'Add to Home screen'.");
    }
  };

  // 2. Load initial settings and stored tracks from IndexedDB
  useEffect(() => {
    async function initApp() {
      try {
        const savedSettings = await dbGetSettings();
        const syncedStats = syncLegacyPlaytime(savedSettings?.playtimeSeconds ?? 0);
        setListeningStats(syncedStats);
        if (savedSettings) {
          const density = savedSettings.listDensity || loadPersistedDensity();
          savePersistedDensity(density);
          const wallpaper =
            'wallpaperImage' in savedSettings
              ? savedSettings.wallpaperImage
              : loadPersistedWallpaper();
          if (wallpaper) {
            savePersistedWallpaper(wallpaper);
          }

          const normalizedEqGains = normalizeEqGains(savedSettings.equalizerGains);
          const migratedPreset =
            savedSettings.equalizerPreset === 'flat'
              ? 'normal'
              : savedSettings.equalizerPreset || 'normal';
          const migratedEqEnabled =
            typeof savedSettings.equalizerEnabled === 'boolean'
              ? savedSettings.equalizerEnabled
              : normalizedEqGains.some((g) => Math.abs(g) > 0.01);
          const savedVisEnabled = savedSettings.visualizerEnabled ?? false;

          setSettings((prev) => ({
            ...prev,
            ...savedSettings,
            theme: normalizeThemeMode(savedSettings.theme),
            accentColor: savedSettings.accentColor || DEFAULT_ACCENT_COLOR,
            listDensity: density,
            wallpaperImage: wallpaper,
            wallpaperBlur: savedSettings.wallpaperBlur ?? 8,
            wallpaperDim: savedSettings.wallpaperDim ?? 60,
            equalizerEnabled: migratedEqEnabled,
            equalizerGains: normalizedEqGains,
            equalizerPreset: migratedPreset,
            visualizerEnabled: savedVisEnabled,
            visualizerStyle: savedSettings.visualizerStyle || 'bars',
            playtimeSeconds: Math.max(savedSettings.playtimeSeconds ?? 0, syncedStats.totalSeconds),
          }));

          audioEngine.setEqualizerGains(normalizedEqGains, migratedEqEnabled);
          audioEngine.setVisualizerEnabled(savedVisEnabled);
        } else if (syncedStats.totalSeconds > 0) {
          setSettings((prev) => ({ ...prev, playtimeSeconds: syncedStats.totalSeconds }));
        }

        const savedTracks = await dbGetAllTracks();
        if (savedTracks && savedTracks.length > 0) {
          setTracks(savedTracks);
        }

        const savedPlaylists = await dbGetPlaylists();
        if (savedPlaylists) {
          setPlaylists(savedPlaylists);
        }
      } catch (err) {
        console.warn("DB init error:", err);
      } finally {
        setIsLoaded(true);
      }
    }
    initApp();
  }, []);

  // 3. Setup Audio Engine Event Listeners
  useEffect(() => {
    const audio = audioEngine.getAudioElement();

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      audioEngine.updateMediaSessionPositionState();

      // Crossfade handling: smoothly ramp down current track and start next track
      if (
        settings.crossfade > 0 &&
        audio.duration > settings.crossfade + 2 &&
        audio.duration - audio.currentTime <= settings.crossfade &&
        !isCrossfadingRef.current
      ) {
        isCrossfadingRef.current = true;
        const fadeTime = Math.max(0.5, audio.duration - audio.currentTime);
        audioEngine.fadeOut(fadeTime);

        setTimeout(() => {
          handleNextTrack(true);
          isCrossfadingRef.current = false;
        }, Math.max(100, (fadeTime - 0.1) * 1000));
      }
    };

    const onDurationChange = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
        updateNativePlaybackState(
          !audio.paused,
          audio.currentTime || 0,
          audio.duration,
          audio.playbackRate || 1
        );
      }
    };

    const onPlay = () => {
      setIsPlaying(true);
      audioEngine.updateMediaSessionPlaybackState(true);
      audioEngine.updateMediaSessionPositionState();
      updateNativePlaybackState(
        true,
        audio.currentTime || 0,
        isFinite(audio.duration) ? audio.duration : 0,
        audio.playbackRate || 1
      );
    };
    const onPause = () => {
      setIsPlaying(false);
      audioEngine.updateMediaSessionPlaybackState(false);
      audioEngine.updateMediaSessionPositionState();
      updateNativePlaybackState(
        false,
        audio.currentTime || 0,
        isFinite(audio.duration) ? audio.duration : 0,
        audio.playbackRate || 1
      );
    };

    const onEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio
          .play()
          .then(() => {
            if (currentTrack) {
              currentTrack.playCount += 1;
              dbSaveTrack(currentTrack);
              setListeningStats(recordTrackPlayStart(currentTrack));
            }
          })
          .catch(console.warn);
        return;
      }
      if (!isCrossfadingRef.current) {
        handleNextTrack(false);
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, [currentTrack, queue, tracks, repeatMode, isShuffle]);

  // Keep currentTrackRef synchronized for accurate per-second listening telemetry
  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  // 4. Track listening duration & keep lockscreen/notification position synced every second
  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(() => {
        const audio = audioEngine.getAudioElement();
        audioEngine.updateMediaSessionPositionState();
        updateNativePlaybackState(
          true,
          audio.currentTime || 0,
          isFinite(audio.duration) && audio.duration > 0
            ? audio.duration
            : currentTrackRef.current?.duration || 0,
          audio.playbackRate || 1
        );

        const nextStats = recordListeningSecond(currentTrackRef.current);
        setListeningStats(nextStats);
        setSettings((prev) => {
          const newPlaytime = Math.max(prev.playtimeSeconds + 1, nextStats.totalSeconds);
          dbSaveSettings({ playtimeSeconds: newPlaytime });
          return { ...prev, playtimeSeconds: newPlaytime };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // 4B. Apply live CSS variables across the entire app without reload
  useEffect(() => {
    applyAppearanceCssVariables(settings);
    if (normalizeThemeMode(settings.theme) === 'system' && typeof window.matchMedia === 'function') {
      const mq = window.matchMedia('(prefers-color-scheme: light)');
      const onSchemeChange = () => applyAppearanceCssVariables(settings);
      mq.addEventListener('change', onSchemeChange);
      return () => mq.removeEventListener('change', onSchemeChange);
    }
  }, [settings.theme, settings.accentColor]);

  // 5. Update dynamic background color when currentTrack changes
  useEffect(() => {
    if (currentTrack?.coverArt) {
      extractDominantColor(currentTrack.coverArt).then((palette) => {
        setDynamicGradient(palette.gradientBackground);
      });
    } else {
      setDynamicGradient('linear-gradient(180deg, #1e293b 0%, #0f172a 45%, #050505 100%)');
    }
  }, [currentTrack]);

  // Ref storing latest playback action handlers (avoids stale closures on lockscreen actions)
  const mediaHandlersRef = useRef({
    onPlay: () => {
      audioEngine.resumeContext();
      audioEngine.getAudioElement().play().catch(console.warn);
    },
    onPause: () => {
      audioEngine.getAudioElement().pause();
    },
    onNext: () => {},
    onPrev: () => {},
    onSeek: (_time: number) => {},
    onStop: () => {
      audioEngine.getAudioElement().pause();
      setIsPlaying(false);
    },
  });

  // 6. Update MediaSession API & Native Android Lockscreen Foreground Service
  useEffect(() => {
    if (currentTrack) {
      audioEngine.updateMediaSession(currentTrack, {
        onPlay: () => mediaHandlersRef.current.onPlay(),
        onPause: () => mediaHandlersRef.current.onPause(),
        onNext: () => mediaHandlersRef.current.onNext(),
        onPrev: () => mediaHandlersRef.current.onPrev(),
        onSeek: (time) => mediaHandlersRef.current.onSeek(time),
      });
      const audio = audioEngine.getAudioElement();
      const dur = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : currentTrack.duration;
      updateNativeMediaMetadata(currentTrack, dur);
    }
  }, [currentTrack]);

  // 6B. Subscribe to native Android MediaPlaybackService notification/lockscreen events
  useEffect(() => {
    let cleanup: (() => void) | null = null;
    subscribeNativeMediaActions((evt) => {
      if (evt.action === 'play') mediaHandlersRef.current.onPlay();
      else if (evt.action === 'pause') mediaHandlersRef.current.onPause();
      else if (evt.action === 'next') mediaHandlersRef.current.onNext();
      else if (evt.action === 'prev') mediaHandlersRef.current.onPrev();
      else if (evt.action === 'seek' && typeof evt.position === 'number') {
        mediaHandlersRef.current.onSeek(evt.position);
      } else if (evt.action === 'stop') {
        mediaHandlersRef.current.onStop();
      }
    }).then((unsub) => {
      cleanup = unsub;
    });
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // 7. Capacitor Android Hardware Back Button Cascade (always declared unconditionally above early returns)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listenerPromise = CapApp.addListener('backButton', () => {
      const ev = new CustomEvent('raag:hardware-back', { cancelable: true });
      const notCancelled = window.dispatchEvent(ev);
      if (!notCancelled) return;

      if (infoModalTrack) {
        setInfoModalTrack(null);
      } else if (availableUpdate) {
        setAvailableUpdate(null);
      } else if (isNowPlayingOpen) {
        setIsNowPlayingOpen(false);
      } else if (isSettingsOpen) {
        setIsSettingsOpen(false);
      } else if (selectedGroup) {
        setSelectedGroup(null);
      } else if (isOnboardingStep2) {
        setIsOnboardingStep2(false);
      } else {
        CapApp.minimizeApp();
      }
    });
    return () => {
      listenerPromise.then((h) => h.remove()).catch(() => {});
    };
  }, [infoModalTrack, availableUpdate, isNowPlayingOpen, isSettingsOpen, selectedGroup, isOnboardingStep2]);

  // Track ended handler
  const handleTrackEnded = () => {
    if (repeatMode === 'one') {
      const audio = audioEngine.getAudioElement();
      audio.currentTime = 0;
      audio.play();
      return;
    }

    handleNextTrack();
  };

  // Play a specific track
  const playTrack = async (track: Track, isCrossfade = false) => {
    const audio = audioEngine.getAudioElement();

    let srcUrl = track.url;
    if (!srcUrl) {
      const blob = await dbGetAudioBlob(track.id);
      if (blob) {
        srcUrl = URL.createObjectURL(blob);
      }
    }

    if (!srcUrl) {
      console.warn("No audio source available for track:", track);
      return;
    }

    audio.src = srcUrl;
    audioEngine.setPlaybackRate(settings.playbackSpeed, settings.preservesPitch);
    audioEngine.setReverbEnabled(!settings.preservesPitch);
    audioEngine.setEqualizerGains(settings.equalizerGains, settings.equalizerEnabled);
    audioEngine.setVisualizerEnabled(settings.visualizerEnabled);

    if (isCrossfade && settings.crossfade > 0) {
      audioEngine.fadeIn(settings.crossfade);
    } else {
      audioEngine.resetMasterGain();
    }

    try {
      await audio.play();
      currentTrackRef.current = track;
      setCurrentTrack(track);
      setIsPlaying(true);
      setDuration(track.duration || audio.duration || 0);

      track.playCount += 1;
      dbSaveTrack(track);
      setListeningStats(recordTrackPlayStart(track));

      // Preload next track if gapless playback is enabled
      if (settings.gapless) {
        const list = queue.length > 0 ? queue : visibleTracks;
        const curIdx = list.findIndex((t) => t.id === track.id);
        if (curIdx !== -1 && list.length > 1) {
          const nextTrk = list[(curIdx + 1) % list.length];
          if (nextTrk && nextTrk.url) {
            audioEngine.preloadTrack(nextTrk.url);
          }
        }
      }

      // Prompt Android 13+ notification permission for lock screen & media notification controls
      requestAndroidNotificationPermission();
    } catch (err) {
      console.warn("Audio play prevented:", err);
    }
  };

  const handlePlayPause = () => {
    audioEngine.resumeContext();
    const audio = audioEngine.getAudioElement();

    if (!currentTrack && visibleTracks.length > 0) {
      playTrack(visibleTracks[0]);
      return;
    }

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.warn);
    }
  };

  const handleSeek = (time: number) => {
    const audio = audioEngine.getAudioElement();
    const clamped = Math.max(0, Math.min(audio.duration || duration || time, time));
    audio.currentTime = clamped;
    setCurrentTime(clamped);
    audioEngine.updateMediaSessionPositionState();
    updateNativePlaybackState(
      !audio.paused,
      clamped,
      isFinite(audio.duration) ? audio.duration : duration,
      audio.playbackRate || 1
    );
  };

  const handleNextTrack = (isCrossfade = false) => {
    const list = queue.length > 0 ? queue : visibleTracks;
    if (list.length === 0) return;

    if (!currentTrack) {
      playTrack(list[0], isCrossfade);
      return;
    }

    const currentIndex = list.findIndex((t) => t.id === currentTrack.id);
    let nextIndex = 0;

    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * list.length);
    } else {
      nextIndex = (currentIndex + 1) % list.length;
    }

    playTrack(list[nextIndex], isCrossfade);
  };

  const handlePrevTrack = () => {
    const audio = audioEngine.getAudioElement();
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      audioEngine.updateMediaSessionPositionState();
      updateNativePlaybackState(
        !audio.paused,
        0,
        isFinite(audio.duration) ? audio.duration : duration,
        audio.playbackRate || 1
      );
      return;
    }

    const list = queue.length > 0 ? queue : visibleTracks;
    if (list.length === 0) return;

    const currentIndex = list.findIndex((t) => t.id === currentTrack?.id);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : list.length - 1;
    playTrack(list[prevIndex]);
  };

  // Keep lockscreen & notification action callbacks always pointing at latest state
  mediaHandlersRef.current = {
    onPlay: () => {
      audioEngine.resumeContext();
      if (!currentTrack && visibleTracks.length > 0) {
        playTrack(visibleTracks[0]);
      } else {
        audioEngine.getAudioElement().play().catch(console.warn);
      }
    },
    onPause: () => {
      audioEngine.getAudioElement().pause();
    },
    onNext: () => handleNextTrack(false),
    onPrev: () => handlePrevTrack(),
    onSeek: (time: number) => handleSeek(time),
    onStop: () => {
      audioEngine.getAudioElement().pause();
      setIsPlaying(false);
    },
  };

  const handleToggleRepeat = () => {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const next = modes[(modes.indexOf(repeatMode) + 1) % modes.length];
    setRepeatMode(next);
  };

  const handleToggleShuffle = () => {
    setIsShuffle(!isShuffle);
  };

  const handleToggleFavorite = async (trackId: string) => {
    const newStatus = await dbToggleFavorite(trackId);
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, isFavorite: newStatus } : t))
    );
    if (currentTrack?.id === trackId) {
      setCurrentTrack((prev) => (prev ? { ...prev, isFavorite: newStatus } : null));
    }
  };

  const handleAddToQueueNext = (track: Track) => {
    setQueue((prev) => [track, ...prev.filter((t) => t.id !== track.id)]);
  };

  const handleHideTrack = (trackId: string) => {
    const updatedHidden = [...settings.hiddenTrackIds, trackId];
    updateSettings({ hiddenTrackIds: updatedHidden });
  };

  const handleUnhideTrack = (trackId: string) => {
    const updatedHidden = settings.hiddenTrackIds.filter((id) => id !== trackId);
    updateSettings({ hiddenTrackIds: updatedHidden });
  };

  const handleDeleteTrack = async (track: Track) => {
    await dbDeleteTrack(track.id);
    const updatedDeleted = [
      ...settings.recentlyDeleted,
      { track, deletedAt: Date.now() },
    ];
    updateSettings({ recentlyDeleted: updatedDeleted });
    setTracks((prev) => prev.filter((t) => t.id !== track.id));
    setQueue((prev) => prev.filter((t) => t.id !== track.id));
    if (currentTrack?.id === track.id) {
      audioEngine.getAudioElement().pause();
      setCurrentTrack(null);
      setIsPlaying(false);
    }
  };

  const handleRestoreDeletedTrack = async (trackId: string) => {
    const item = settings.recentlyDeleted.find((d) => d.track.id === trackId);
    if (item) {
      await dbSaveTrack(item.track);
      setTracks((prev) => [item.track, ...prev]);
      const updated = settings.recentlyDeleted.filter((d) => d.track.id !== trackId);
      updateSettings({ recentlyDeleted: updated });
    }
  };

  const handlePermanentDelete = (trackId: string) => {
    const updated = settings.recentlyDeleted.filter((d) => d.track.id !== trackId);
    updateSettings({ recentlyDeleted: updated });
  };

  const showAppToast = (
    message: string,
    type: 'info' | 'success' | 'error' = 'success',
    durationMs = 2800
  ) => {
    setUpdateStatusType(type);
    setUpdateToast(message);
    window.setTimeout(() => setUpdateToast((prev) => (prev === message ? null : prev)), durationMs);
  };

  const handleUpdateTrackMetadata = (trackId: string, title: string, artist: string) => {
    setTracks((prev) =>
      prev.map((trk) => {
        if (trk.id !== trackId) return trk;
        const updated = { ...trk, title, artist };
        dbSaveTrack(updated).catch(() => {});
        return updated;
      })
    );
    setQueue((prev) =>
      prev.map((trk) => (trk.id === trackId ? { ...trk, title, artist } : trk))
    );
    setCurrentTrack((prev) =>
      prev && prev.id === trackId ? { ...prev, title, artist } : prev
    );
    showAppToast('Track details updated');
  };

  const handleUpdateTrackLyrics = (trackId: string, lyrics: string) => {
    setTracks((prev) =>
      prev.map((trk) => {
        if (trk.id !== trackId) return trk;
        const updated = { ...trk, lyrics };
        dbSaveTrack(updated).catch(() => {});
        return updated;
      })
    );
    setQueue((prev) =>
      prev.map((trk) => (trk.id === trackId ? { ...trk, lyrics } : trk))
    );
    setCurrentTrack((prev) =>
      prev && prev.id === trackId ? { ...prev, lyrics } : prev
    );
    showAppToast(lyrics.trim() ? 'Lyrics saved to track' : 'Lyrics cleared');
  };

  const handleAddTrackToPlaylist = (playlistId: string, trackId: string) => {
    let addedName = '';
    setPlaylists((prev) => {
      const updated = prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        addedName = pl.name;
        if (pl.trackIds.includes(trackId)) return pl;
        return { ...pl, trackIds: [...pl.trackIds, trackId] };
      });
      dbSavePlaylists(updated);
      return updated;
    });
    if (addedName) showAppToast(`Added to ${addedName}`);
  };

  const handleCreatePlaylistWithTrack = (name: string, trackId: string) => {
    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      name: name.trim(),
      trackIds: [trackId],
      createdAt: Date.now(),
    };
    setPlaylists((prev) => {
      const updated = [...prev, newPl];
      dbSavePlaylists(updated);
      return updated;
    });
    showAppToast(`Created playlist "${newPl.name}"`);
  };

  const handleShareTrack = async (track: Track) => {
    const shareText = `${track.title} — ${track.artist} (Listening on Raag Player)`;
    try {
      if (navigator.share) {
        await navigator.share({ title: track.title, text: shareText });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        showAppToast('Track info copied to clipboard');
        return;
      }
    } catch {
      // User dismissed native share sheet
      return;
    }
    showAppToast('Sharing unavailable on this browser', 'info');
  };

  const handleMakeRingtone = (track: Track) => {
    showAppToast(
      `Open Android Sound Settings to assign "${track.title}" as ringtone`,
      'info',
      3800
    );
  };

  const updateSettings = (newPartial: Partial<UserSettings>) => {
    if (newPartial.listDensity) {
      savePersistedDensity(newPartial.listDensity);
    }
    if ('wallpaperImage' in newPartial) {
      savePersistedWallpaper(newPartial.wallpaperImage);
    }

    setSettings((prev) => {
      const updated = { ...prev, ...newPartial };
      dbSaveSettings(updated);

      if (newPartial.playbackSpeed !== undefined || newPartial.preservesPitch !== undefined) {
        audioEngine.setPlaybackRate(updated.playbackSpeed, updated.preservesPitch);
        audioEngine.setReverbEnabled(!updated.preservesPitch);
      }

      if (newPartial.equalizerEnabled !== undefined && newPartial.equalizerGains === undefined) {
        audioEngine.setEqualizerEnabled(updated.equalizerEnabled);
      }

      if (newPartial.visualizerEnabled !== undefined) {
        audioEngine.setVisualizerEnabled(updated.visualizerEnabled);
      }

      return updated;
    });
  };

  // Process imported local audio files
  const processAudioFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files).filter((f) =>
      /\.(mp3|wav|flac|m4a|ogg|aac|opus)$/i.test(f.name)
    );

    if (fileList.length === 0) {
      setDenialCount((prev) => prev + 1);
      return;
    }

    const newTracks: Track[] = [];
    const blobsMap = new Map<string, Blob>();

    for (const file of fileList) {
      const meta = await parseAudioFile(file);
      const trackId = `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const relativePath = (file as unknown as { webkitRelativePath?: string }).webkitRelativePath || '';
      const folderName = relativePath.includes('/')
        ? relativePath.split('/')[0]
        : 'Local Music';

      const track: Track = {
        id: trackId,
        title: meta.title,
        artist: meta.artist,
        album: meta.album,
        duration: meta.duration,
        coverArt: meta.coverArt,
        folder: folderName,
        format: file.name.split('.').pop()?.toLowerCase(),
        size: file.size,
        dateAdded: Date.now(),
        isFavorite: false,
        playCount: 0,
        lyrics: meta.lyrics,
      };

      newTracks.push(track);
      blobsMap.set(trackId, file);
    }

    await dbSaveMultipleTracks(newTracks, blobsMap);
    setTracks((prev) => [...newTracks, ...prev]);

    updateSettings({
      hasGrantedPermission: true,
      hasCompletedOnboarding: true,
    });
    setIsOnboardingStep2(false);
  };

  // Load demo songs
  const handleUseDemo = async () => {
    const demos = getDemoTracks();
    await dbSaveMultipleTracks(demos);
    setTracks(demos);
    updateSettings({
      hasGrantedPermission: true,
      hasCompletedOnboarding: true,
    });
    setIsOnboardingStep2(false);
  };

  // Filter and sort tracks
  const visibleTracks = useMemo(() => {
    return tracks
      .filter((t) => t && !settings.hiddenTrackIds.includes(t.id))
      .filter((t) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const title = (t.title || '').toLowerCase();
        const artist = (t.artist || '').toLowerCase();
        const album = (t.album || '').toLowerCase();
        const folder = (t.folder || '').toLowerCase();
        return (
          title.includes(q) ||
          artist.includes(q) ||
          album.includes(q) ||
          folder.includes(q)
        );
      })
      .filter((t) => {
        if (activeTab === 'favorites') return !!t.isFavorite;
        return true;
      })
      .sort((a, b) => {
        const aTitle = a.title || '';
        const bTitle = b.title || '';
        const aArtist = a.artist || '';
        const bArtist = b.artist || '';
        const aDur = typeof a.duration === 'number' && !isNaN(a.duration) ? a.duration : 0;
        const bDur = typeof b.duration === 'number' && !isNaN(b.duration) ? b.duration : 0;
        const aDate = a.dateAdded || 0;
        const bDate = b.dateAdded || 0;

        if (sortKey === 'title') return aTitle.localeCompare(bTitle);
        if (sortKey === 'artist') return aArtist.localeCompare(bArtist);
        if (sortKey === 'duration') return bDur - aDur;
        return bDate - aDate;
      });
  }, [tracks, settings.hiddenTrackIds, searchQuery, activeTab, sortKey]);

  // Playlist management
  const handleCreatePlaylist = () => {
    const name = prompt("Enter playlist name:", "My Raag Mix");
    if (name && name.trim()) {
      const newPl: Playlist = {
        id: `pl-${Date.now()}`,
        name: name.trim(),
        trackIds: [],
        createdAt: Date.now(),
      };
      const updated = [...playlists, newPl];
      setPlaylists(updated);
      dbSavePlaylists(updated);
    }
  };

  const handleRescanAudio = async () => {
    if (isNativeAndroid()) {
      try {
        const scanned = await getAllDeviceAudio();
        if (scanned.length > 0) {
          await dbSaveMultipleTracks(scanned);
          setTracks(scanned);
        }
      } catch (err) {
        console.warn("Error rescanning device audio:", err);
      }
    } else {
      folderInputRef.current?.click();
    }
  };

  // =========================================================================
  // SCREEN RESOLUTION (NON-BLOCKING SPLASH HANDOFF + ZERO HOOK DRIFT)
  // =========================================================================
  let activeScreen: React.ReactNode;

  if (!isLoaded) {
    activeScreen = <div className="min-h-screen w-full bg-[#050505]" />;
  } else if (!settings.hasCompletedOnboarding || (!settings.hasGrantedPermission && tracks.length === 0)) {
    activeScreen = !isOnboardingStep2 ? (
      <OnboardingScreen
        currentLanguage={settings.language}
        onSelectLanguage={(lang) => updateSettings({ language: lang })}
        onGetStarted={() => setIsOnboardingStep2(true)}
      />
    ) : (
      <AccessFlowScreen
        language={settings.language}
        denialCount={denialCount}
        onDenialIncrement={() => setDenialCount((prev) => prev + 1)}
        onSetDenialCount={(count) => setDenialCount(count)}
        onUseDemo={handleUseDemo}
        onFilesSelected={processAudioFiles}
        onNativeTracksFound={async (scannedTracks) => {
          try {
            if (scannedTracks && scannedTracks.length > 0) {
              await dbSaveMultipleTracks(scannedTracks);
              setTracks((prev) => {
                const map = new Map<string, Track>();
                scannedTracks.forEach((t) => {
                  if (t && t.id) map.set(t.id, t);
                });
                prev.forEach((t) => {
                  if (t && t.id && !map.has(t.id)) map.set(t.id, t);
                });
                return Array.from(map.values());
              });
            } else {
              // No audio found on device; fallback to demo tracks
              const demos = getDemoTracks();
              await dbSaveMultipleTracks(demos);
              setTracks(demos);
            }
          } catch (err) {
            console.warn('Error saving scanned tracks:', err);
          } finally {
            // ALWAYS navigate to the Library screen
            updateSettings({
              hasGrantedPermission: true,
              hasCompletedOnboarding: true,
            });
            setIsOnboardingStep2(false);
            // Prompt Android 13+ notification permission for lock screen & media notification controls
            requestAndroidNotificationPermission();
          }
        }}
      />
    );
  } else {
    const t = TRANSLATIONS[settings.language];
    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
    const favoritesCount = tracks.filter((t) => t.isFavorite).length;
    const appearanceTokens = computeAppearanceTokens(settings.theme, settings.accentColor);
    const density = settings.listDensity || 'cozy';
    const trackContainerClass =
      density === 'grid'
        ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 px-4 pt-1'
        : density === 'compact'
        ? 'grid grid-cols-1 md:grid-cols-2 gap-1 px-2'
        : 'grid grid-cols-1 md:grid-cols-2 gap-1.5 px-2';

    activeScreen = (
    <div
      className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden transition-colors duration-200"
      style={{
        backgroundColor: 'var(--bg-surface)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Custom Wallpaper Backdrop Layer */}
      {settings.wallpaperImage && (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <img
            src={settings.wallpaperImage}
            alt=""
            className="w-full h-full object-cover scale-110"
            style={{ filter: `blur(${settings.wallpaperBlur ?? 8}px)` }}
          />
          <div
            className="absolute inset-0 transition-colors duration-200"
            style={{
              backgroundColor: appearanceTokens.isLight
                ? `rgba(248, 250, 252, ${(settings.wallpaperDim ?? 60) / 100})`
                : `rgba(5, 5, 5, ${(settings.wallpaperDim ?? 60) / 100})`,
            }}
          />
        </div>
      )}

      {/* Hidden file inputs for manual folder/file import on web */}
      {!isNativeAndroid() && (
        <>
          <input
            ref={folderInputRef}
            type="file"
            // @ts-expect-error webkitdirectory is standard
            webkitdirectory="true"
            directory="true"
            multiple
            accept="audio/*"
            onChange={(e) => e.target.files && processAudioFiles(e.target.files)}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg"
            onChange={(e) => e.target.files && processAudioFiles(e.target.files)}
            className="hidden"
          />
        </>
      )}

      {/* Main Container */}
      <div className="relative z-10 flex-1 flex flex-col max-w-md md:max-w-4xl mx-auto w-full pb-[calc(env(safe-area-inset-bottom,0px)+7rem)]">
        {/* Top App Bar with PWA install button */}
        <TopAppBar
          language={settings.language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAddFiles={isNativeAndroid() ? handleRescanAudio : () => fileInputRef.current?.click()}
          currentSort={sortKey}
          onSortChange={setSortKey}
          canInstall={!!deferredInstallPrompt}
          onInstallApp={handleInstallApp}
        />

        {/* Filter Pills */}
        <FilterPills
          language={settings.language}
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setSelectedGroup(null);
          }}
          favoritesCount={favoritesCount}
        />

        {/* Group Filter Breadcrumb if drilling into Folder/Artist/Album */}
        {selectedGroup && (
          <div
            className="px-4 py-2 flex items-center justify-between border-y"
            style={{
              backgroundColor: 'var(--card-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <button
              onClick={() => setSelectedGroup(null)}
              className="flex items-center gap-2 text-xs font-semibold hover:underline"
              style={{ color: 'var(--accent-color)' }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to all {activeTab}</span>
            </button>
            <span
              className="text-xs font-medium truncate max-w-[180px]"
              style={{ color: 'var(--text-secondary)' }}
            >
              {selectedGroup.name}
            </span>
          </div>
        )}

        {/* Tab Content Rendering */}
        <div className="flex-1 py-1">
          {selectedGroup ? (
            <div className={trackContainerClass}>
              {selectedGroup.tracks.map((track) => (
                <TrackItem
                  key={track.id}
                  track={track}
                  density={density}
                  isPlaying={isPlaying && currentTrack?.id === track.id}
                  isActive={currentTrack?.id === track.id}
                  onPlay={() => playTrack(track)}
                  onToggleFavorite={handleToggleFavorite}
                  onAddToQueueNext={handleAddToQueueNext}
                  onHideTrack={handleHideTrack}
                  onDeleteTrack={handleDeleteTrack}
                  onShowInfo={setInfoModalTrack}
                />
              ))}
            </div>
          ) : activeTab === 'songs' || activeTab === 'favorites' ? (
            visibleTracks.length > 0 ? (
              <div className={trackContainerClass}>
                {visibleTracks.map((track) => (
                  <TrackItem
                    key={track.id}
                    track={track}
                    density={density}
                    isPlaying={isPlaying && currentTrack?.id === track.id}
                    isActive={currentTrack?.id === track.id}
                    onPlay={() => playTrack(track)}
                    onToggleFavorite={handleToggleFavorite}
                    onAddToQueueNext={handleAddToQueueNext}
                    onHideTrack={handleHideTrack}
                    onDeleteTrack={handleDeleteTrack}
                    onShowInfo={setInfoModalTrack}
                  />
                ))}
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center p-12 text-center gap-3"
                style={{ color: 'var(--text-secondary)' }}
              >
                <div
                  className="w-16 h-16 rounded-full border flex items-center justify-center"
                  style={{
                    backgroundColor: 'var(--card-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <Music className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {activeTab === 'favorites' ? t.noFavoritesFound : t.noTracksFound}
                </h4>
                <p className="text-xs max-w-xs" style={{ color: 'var(--text-muted)' }}>
                  Tap below to select a music folder or add audio files.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 px-5 py-2.5 rounded-full text-xs font-semibold shadow-md flex items-center gap-2"
                  style={{
                    backgroundColor: 'var(--accent-color)',
                    color: 'var(--accent-contrast)',
                  }}
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.addFiles}</span>
                </button>
              </div>
            )
          ) : (
            <GroupedListView
              type={activeTab as 'folders' | 'artists' | 'albums' | 'playlists'}
              tracks={tracks}
              playlists={playlists}
              onSelectGroup={(name, groupTracks) => setSelectedGroup({ name, tracks: groupTracks })}
              onCreatePlaylist={handleCreatePlaylist}
            />
          )}
        </div>
      </div>

      {/* Floating Bottom Mini-Player */}
      <MiniPlayer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        progressPercent={progressPercent}
        onTogglePlay={handlePlayPause}
        onNext={handleNextTrack}
        onExpand={() => setIsNowPlayingOpen(true)}
      />

      {/* Full-Screen Now Playing Sheet */}
      <NowPlayingSheet
        isOpen={isNowPlayingOpen}
        onClose={() => setIsNowPlayingOpen(false)}
        language={settings.language}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        repeatMode={repeatMode}
        isShuffle={isShuffle}
        onTogglePlay={handlePlayPause}
        onNext={handleNextTrack}
        onPrev={handlePrevTrack}
        onSeek={handleSeek}
        onToggleRepeat={handleToggleRepeat}
        onToggleShuffle={handleToggleShuffle}
        onToggleFavorite={handleToggleFavorite}
        onDeleteTrack={handleDeleteTrack}
        onHideTrack={handleHideTrack}
        onShowInfo={setInfoModalTrack}
        queue={queue}
        onSelectQueueTrack={playTrack}
        onRemoveFromQueue={(id) => setQueue((prev) => prev.filter((t) => t.id !== id))}
        onClearQueue={() => setQueue([])}
        equalizerEnabled={settings.equalizerEnabled}
        onToggleEqualizerEnabled={(enabled) => {
          audioEngine.setEqualizerEnabled(enabled);
          updateSettings({ equalizerEnabled: enabled });
        }}
        equalizerGains={settings.equalizerGains}
        activePreset={settings.equalizerPreset}
        onGainChange={(idx, val) => {
          const updated = normalizeEqGains(settings.equalizerGains);
          updated[idx] = val;
          audioEngine.setEqualizerGains(updated, true);
          updateSettings({
            equalizerEnabled: true,
            equalizerGains: updated,
            equalizerPreset: 'custom',
          });
        }}
        onSelectPreset={(presetKey) => {
          audioEngine.setEqualizerEnabled(true);
          const gains = audioEngine.applyPreset(presetKey);
          updateSettings({
            equalizerEnabled: true,
            equalizerGains: gains,
            equalizerPreset: presetKey,
          });
        }}
        visualizerEnabled={settings.visualizerEnabled}
        visualizerStyle={settings.visualizerStyle}
        onToggleVisualizerEnabled={(enabled) => {
          audioEngine.setVisualizerEnabled(enabled);
          updateSettings({ visualizerEnabled: enabled });
        }}
        onSelectVisualizerStyle={(style) => {
          updateSettings({ visualizerStyle: style, visualizerEnabled: true });
        }}
        playlists={playlists}
        playbackSpeed={settings.playbackSpeed}
        preservesPitch={settings.preservesPitch}
        sleepTimerMinutes={settings.sleepTimerMinutes}
        sleepTimerTarget={settings.sleepTimerTarget}
        onUpdateTrackMetadata={handleUpdateTrackMetadata}
        onUpdateTrackLyrics={handleUpdateTrackLyrics}
        onAddTrackToPlaylist={handleAddTrackToPlaylist}
        onCreatePlaylistWithTrack={handleCreatePlaylistWithTrack}
        onShareTrack={handleShareTrack}
        onUpdateSpeed={(speed, preserves) =>
          updateSettings({
            playbackSpeed: speed,
            ...(preserves !== undefined ? { preservesPitch: preserves } : {}),
          })
        }
        onMakeRingtone={handleMakeRingtone}
        onSetSleepTimer={(mins) =>
          updateSettings({
            sleepTimerMinutes: mins,
            sleepTimerTarget: mins ? Date.now() + mins * 60 * 1000 : null,
          })
        }
        dynamicGradient={dynamicGradient}
      />

      {/* Directional Slide Settings Panel */}
      <SettingsScreen
        isOpen={isSettingsOpen}
        settings={settings}
        listeningStats={listeningStats}
        tracks={tracks}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onUpdateSettings={updateSettings}
        onBack={() => setIsSettingsOpen(false)}
        onRescanFolders={handleRescanAudio}
        onClearStorage={async () => {
          await dbClearStorage();
          setTracks([]);
          setCurrentTrack(null);
          setIsPlaying(false);
          setQueue([]);
        }}
        hiddenTracks={tracks.filter((t) => settings.hiddenTrackIds.includes(t.id))}
        onUnhideTrack={handleUnhideTrack}
        recentlyDeleted={settings.recentlyDeleted}
        onRestoreDeletedTrack={handleRestoreDeletedTrack}
        onPermanentDelete={handlePermanentDelete}
        canInstall={!!deferredInstallPrompt}
        onInstallApp={handleInstallApp}
        activeVersion={activeVersion}
        onCheckForUpdates={handleManualCheckUpdates}
        onSimulateUpdate={handleSimulateUpdate}
        isCheckingUpdates={isCheckingUpdates}
        updateStatusMessage={updateToast}
        updateStatusType={updateStatusType}
      />

      {/* Track Info Modal */}
      <TrackInfoModal
        track={infoModalTrack}
        onClose={() => setInfoModalTrack(null)}
      />

      {/* OTA Update Available Popup Modal */}
      {availableUpdate && availableUpdate.remoteVersion && (
        <UpdateModal
          currentVersion={availableUpdate.currentVersion}
          remoteVersion={availableUpdate.remoteVersion}
          notes={availableUpdate.notes || 'Latest UI & playback improvements'}
          bundleUrl={availableUpdate.bundleUrl || OTA_BUNDLE_URL}
          checksum={availableUpdate.checksum}
          onClose={() => setAvailableUpdate(null)}
        />
      )}

      {/* Floating Update Notification Toast */}
      {updateToast && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full border text-xs font-medium shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200 max-w-[90vw] ${
            updateStatusType === 'error'
              ? 'bg-[#18181C] border-rose-500/40 text-rose-300'
              : updateStatusType === 'success'
              ? 'bg-[#18181C] border-emerald-500/40 text-emerald-300'
              : 'bg-[#18181C] border-sky-500/40 text-white'
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              updateStatusType === 'error'
                ? 'bg-rose-400'
                : updateStatusType === 'success'
                ? 'bg-emerald-400'
                : 'bg-sky-400 animate-pulse'
            }`}
          />
          <span className="truncate">{updateToast}</span>
        </div>
      )}
    </div>
    );
  }

  return (
    <>
      {showSplash && (
        <SplashScreen
          isAppReady={isLoaded}
          onExited={() => setShowSplash(false)}
        />
      )}
      {activeScreen}
    </>
  );
};
