import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Track,
  Playlist,
  UserSettings,
  TabType,
  RepeatMode,
} from './types';
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
import { audioEngine } from './utils/audioEngine';
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
import {
  notifyAppReady,
  getActiveBundleVersion,
  checkRemoteUpdate,
  getMockUpdate,
  UpdateCheckResult,
  OTA_BUNDLE_URL,
} from './utils/otaUpdater';
import { ArrowLeft, Plus, Music } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DEFAULT_SETTINGS: UserSettings = {
  language: 'en',
  hasCompletedOnboarding: false,
  hasGrantedPermission: false,
  theme: 'dark',
  accentColor: '#2563EB',
  playtimeSeconds: 0,
  sleepTimerMinutes: null,
  sleepTimerTarget: null,
  playbackSpeed: 1.0,
  preservesPitch: true,
  gapless: true,
  crossfade: 0,
  equalizerGains: [0, 0, 0, 0, 0],
  equalizerPreset: 'flat',
  hiddenTrackIds: [],
  recentlyDeleted: [],
};

export const App: React.FC = () => {
  // App Settings
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
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
        setUpdateToast(null);
        setAvailableUpdate(res);
      } else {
        const msg = `Already up to date (v${res.currentVersion})`;
        setUpdateToast(msg);
        setUpdateStatusType('success');
        setTimeout(() => setUpdateToast(null), 4000);
      }
    } catch (err: unknown) {
      setIsCheckingUpdates(false);
      const msg = (err as Error)?.message || 'Failed to connect to update server';
      setUpdateToast(msg);
      setUpdateStatusType('error');
      setTimeout(() => setUpdateToast(null), 6000);
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
        if (savedSettings) {
          setSettings((prev) => ({ ...prev, ...savedSettings }));
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
    };

    const onDurationChange = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const onPlay = () => {
      setIsPlaying(true);
      audioEngine.updateMediaSessionPlaybackState(true);
    };
    const onPause = () => {
      setIsPlaying(false);
      audioEngine.updateMediaSessionPlaybackState(false);
    };

    const onEnded = () => {
      handleTrackEnded();
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

  // 4. Track listening duration
  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(() => {
        setSettings((prev) => {
          const newPlaytime = prev.playtimeSeconds + 1;
          dbSaveSettings({ playtimeSeconds: newPlaytime });
          return { ...prev, playtimeSeconds: newPlaytime };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

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

  // 6. Update MediaSession API
  useEffect(() => {
    if (currentTrack) {
      audioEngine.updateMediaSession(currentTrack, {
        onPlay: handlePlayPause,
        onPause: handlePlayPause,
        onNext: handleNextTrack,
        onPrev: handlePrevTrack,
        onSeek: handleSeek,
      });
    }
  }, [currentTrack]);

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
  const playTrack = async (track: Track) => {
    audioEngine.initAudioContext();
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
    audioEngine.setEqualizerGains(settings.equalizerGains);

    try {
      await audio.play();
      setCurrentTrack(track);
      setIsPlaying(true);
      setDuration(track.duration || audio.duration || 0);

      track.playCount += 1;
      dbSaveTrack(track);

      // Prompt Android 13+ notification permission for lock screen & media notification controls
      requestAndroidNotificationPermission();
    } catch (err) {
      console.warn("Audio play prevented:", err);
    }
  };

  const handlePlayPause = () => {
    audioEngine.initAudioContext();
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
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const handleNextTrack = () => {
    const list = queue.length > 0 ? queue : visibleTracks;
    if (list.length === 0) return;

    if (!currentTrack) {
      playTrack(list[0]);
      return;
    }

    const currentIndex = list.findIndex((t) => t.id === currentTrack.id);
    let nextIndex = 0;

    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * list.length);
    } else {
      nextIndex = (currentIndex + 1) % list.length;
    }

    playTrack(list[nextIndex]);
  };

  const handlePrevTrack = () => {
    const audio = audioEngine.getAudioElement();
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    const list = queue.length > 0 ? queue : visibleTracks;
    if (list.length === 0) return;

    const currentIndex = list.findIndex((t) => t.id === currentTrack?.id);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : list.length - 1;
    playTrack(list[prevIndex]);
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

  const updateSettings = (newPartial: Partial<UserSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newPartial };
      dbSaveSettings(updated);
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

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white font-medium">
        Loading Raag Player...
      </div>
    );
  }

  // =========================================================================
  // ONBOARDING FLOW:
  // Step 1: Language Selection
  // Step 2: Auto-Trigger Native Access & Multi-Stage Denial Screens
  // =========================================================================
  if (!settings.hasCompletedOnboarding || (!settings.hasGrantedPermission && tracks.length === 0)) {
    if (!isOnboardingStep2) {
      return (
        <OnboardingScreen
          currentLanguage={settings.language}
          onSelectLanguage={(lang) => updateSettings({ language: lang })}
          onGetStarted={() => setIsOnboardingStep2(true)}
        />
      );
    }

    return (
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
  }

  // =========================================================================
  // SETTINGS SCREEN
  // =========================================================================
  if (isSettingsOpen) {
    return (
      <SettingsScreen
        settings={settings}
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
    );
  }

  // =========================================================================
  // MAIN LIBRARY VIEW (HOME)
  // =========================================================================
  const t = TRANSLATIONS[settings.language];
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const favoritesCount = tracks.filter((t) => t.isFavorite).length;

  return (
    <div
      className={`min-h-screen w-full text-white flex flex-col justify-between overflow-x-hidden ${
        settings.theme === 'pure-black' ? 'bg-[#000000]' : 'bg-[#050505]'
      }`}
    >
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
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full pb-28">
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
          <div className="px-4 py-2 flex items-center justify-between bg-[#121214] border-y border-[#1E1E22]">
            <button
              onClick={() => setSelectedGroup(null)}
              className="flex items-center gap-2 text-xs font-semibold text-[#38BDF8] hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to all {activeTab}</span>
            </button>
            <span className="text-xs text-zinc-400 font-medium truncate max-w-[180px]">
              {selectedGroup.name}
            </span>
          </div>
        )}

        {/* Tab Content Rendering */}
        <div className="flex-1 py-1">
          {selectedGroup ? (
            <div className="space-y-1 px-1">
              {selectedGroup.tracks.map((track) => (
                <TrackItem
                  key={track.id}
                  track={track}
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
              <div className="space-y-1 px-1">
                {visibleTracks.map((track) => (
                  <TrackItem
                    key={track.id}
                    track={track}
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
              <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-500 gap-3">
                <div className="w-16 h-16 rounded-full bg-[#121214] border border-[#1E1E22] flex items-center justify-center text-zinc-500">
                  <Music className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-semibold text-zinc-300">
                  {activeTab === 'favorites' ? t.noFavoritesFound : t.noTracksFound}
                </h4>
                <p className="text-xs text-zinc-600 max-w-xs">
                  Tap below to select a music folder or add audio files.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 px-5 py-2.5 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-md flex items-center gap-2"
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
        onShowInfo={setInfoModalTrack}
        queue={queue}
        onSelectQueueTrack={playTrack}
        onRemoveFromQueue={(id) => setQueue((prev) => prev.filter((t) => t.id !== id))}
        onClearQueue={() => setQueue([])}
        equalizerGains={settings.equalizerGains}
        activePreset={settings.equalizerPreset}
        onGainChange={(idx, val) => {
          const updated = [...settings.equalizerGains];
          updated[idx] = val;
          audioEngine.setEqualizerGains(updated);
          updateSettings({ equalizerGains: updated, equalizerPreset: 'custom' });
        }}
        onSelectPreset={(presetKey) => {
          const gains = audioEngine.applyPreset(presetKey);
          updateSettings({ equalizerGains: gains, equalizerPreset: presetKey });
        }}
        dynamicGradient={dynamicGradient}
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
};
