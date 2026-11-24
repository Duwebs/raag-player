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

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

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
      .filter((t) => !settings.hiddenTrackIds.includes(t.id))
      .filter((t) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          t.album.toLowerCase().includes(q) ||
          (t.folder && t.folder.toLowerCase().includes(q))
        );
      })
      .filter((t) => {
        if (activeTab === 'favorites') return t.isFavorite;
        return true;
      })
      .sort((a, b) => {
        if (sortKey === 'title') return a.title.localeCompare(b.title);
        if (sortKey === 'artist') return a.artist.localeCompare(b.artist);
        if (sortKey === 'duration') return b.duration - a.duration;
        return b.dateAdded - a.dateAdded;
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
        onUseDemo={handleUseDemo}
        onFilesSelected={processAudioFiles}
        onNativeTracksFound={async (scannedTracks) => {
          if (scannedTracks.length > 0) {
            await dbSaveMultipleTracks(scannedTracks);
            setTracks((prev) => [...scannedTracks, ...prev]);
            updateSettings({
              hasGrantedPermission: true,
              hasCompletedOnboarding: true,
            });
            setIsOnboardingStep2(false);
          } else {
            // No audio found in default directories; preload demo tracks
            await handleUseDemo();
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
        onRescanFolders={() => folderInputRef.current?.click()}
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
      {/* Hidden file inputs for manual folder/file import */}
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

      {/* Main Container */}
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full pb-28">
        {/* Top App Bar with PWA install button */}
        <TopAppBar
          language={settings.language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAddFiles={() => fileInputRef.current?.click()}
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
    </div>
  );
};
