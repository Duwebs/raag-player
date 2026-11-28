import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  FileText,
  ListMusic,
  MoreVertical,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Sliders,
} from 'lucide-react';
import {
  LanguageCode,
  Playlist,
  RepeatMode,
  Track,
  VisualizerStyle,
} from '../types';
import {
  DEFAULT_DARK_PALETTE,
  ExtractedPalette,
  extractDominantColor,
} from '../utils/colorExtractor';
import { TRANSLATIONS } from '../utils/translations';
import { EqualizerDrawer } from './EqualizerDrawer';
import {
  LyricsDrawer,
  getActiveLyricIndex,
  parseLyricsLines,
} from './LyricsDrawer';
import { useAnimatedPresence, useIsLandscape } from './MotionPrimitives';
import { LiveVisualizerCanvas, VisualizerPickerSheet } from './MusicVisualizer';
import { AnimatedLikeButton } from './AnimatedLikeButton';
import { QueueDrawer } from './QueueDrawer';
import { RaagLogo } from './RaagLogo';
import { TrackActionSheet } from './TrackActionSheet';

interface NowPlayingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  language: LanguageCode;
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (time: number) => void;
  onToggleRepeat: () => void;
  onToggleShuffle: () => void;
  onToggleFavorite: (id: string) => void;
  onDeleteTrack: (id: string) => void;
  onHideTrack: (id: string) => void;
  onShowInfo: (track: Track) => void;
  queue: Track[];
  onSelectQueueTrack: (track: Track) => void;
  onRemoveFromQueue: (id: string) => void;
  onClearQueue: () => void;
  equalizerEnabled: boolean;
  onToggleEqualizerEnabled: (enabled: boolean) => void;
  equalizerGains: number[];
  activePreset: string;
  onGainChange: (index: number, value: number) => void;
  onSelectPreset: (presetKey: string) => void;
  visualizerEnabled: boolean;
  visualizerStyle: VisualizerStyle;
  onToggleVisualizerEnabled: (enabled: boolean) => void;
  onSelectVisualizerStyle: (style: VisualizerStyle) => void;
  playlists: Playlist[];
  playbackSpeed: number;
  preservesPitch: boolean;
  sleepTimerMinutes: number | null;
  sleepTimerTarget: number | null;
  sleepTimerEndOfTrack?: boolean;
  sleepRemainingSeconds?: number | null;
  onUpdateTrackMetadata: (trackId: string, title: string, artist: string) => void;
  onUpdateTrackLyrics: (trackId: string, lyrics: string) => void;
  onAddTrackToPlaylist: (playlistId: string, trackId: string) => void;
  onCreatePlaylistWithTrack: (name: string, trackId: string) => void;
  onShareTrack: (track: Track) => void;
  onUpdateSpeed: (speed: number, preservesPitch?: boolean) => void;
  onMakeRingtone: (track: Track) => void;
  onSetSleepTimer: (minutes: number | null, endOfTrack?: boolean) => void;
  dynamicGradient?: string;
}

const SHEET_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)';
const SHEET_DURATION_MS = 320;

function formatClock(secs: number): string {
  if (!Number.isFinite(secs) || secs < 0) return '0:00';
  const total = Math.floor(secs);
  const mins = Math.floor(total / 60);
  const rem = total % 60;
  return `${mins}:${rem.toString().padStart(2, '0')}`;
}

export const NowPlayingSheet: React.FC<NowPlayingSheetProps> = ({
  isOpen,
  onClose,
  language,
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  repeatMode,
  isShuffle,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
  onToggleRepeat,
  onToggleShuffle,
  onToggleFavorite,
  onDeleteTrack,
  onHideTrack,
  onShowInfo,
  queue,
  onSelectQueueTrack,
  onRemoveFromQueue,
  onClearQueue,
  equalizerEnabled,
  onToggleEqualizerEnabled,
  equalizerGains,
  activePreset,
  onGainChange,
  onSelectPreset,
  visualizerEnabled,
  visualizerStyle,
  onToggleVisualizerEnabled,
  onSelectVisualizerStyle,
  playlists,
  playbackSpeed,
  preservesPitch,
  sleepTimerMinutes,
  sleepTimerTarget,
  sleepTimerEndOfTrack = false,
  sleepRemainingSeconds = null,
  onUpdateTrackMetadata,
  onUpdateTrackLyrics,
  onAddTrackToPlaylist,
  onCreatePlaylistWithTrack,
  onShareTrack,
  onUpdateSpeed,
  onMakeRingtone,
  onSetSleepTimer,
  dynamicGradient,
}) => {
  const { shouldRender, isEntered } = useAnimatedPresence(isOpen, SHEET_DURATION_MS);
  const isLandscape = useIsLandscape();
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const [palette, setPalette] = useState<ExtractedPalette>(DEFAULT_DARK_PALETTE);
  const [imgErr, setImgErr] = useState(false);

  // Nested bottom-sheet drawers
  const [showEq, setShowEq] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showTrackMenu, setShowTrackMenu] = useState(false);
  const [showVisualizerPicker, setShowVisualizerPicker] = useState(false);

  // Seekbar interaction state
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const seekTrackRef = useRef<HTMLDivElement>(null);

  // Pull-down to dismiss full-screen sheet
  const [sheetDragY, setSheetDragY] = useState(0);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const dragStartY = useRef<number | null>(null);

  // Landscape lyrics auto-scroll ref
  const landscapeLyricRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    setImgErr(false);
    let cancelled = false;
    if (currentTrack?.coverArt) {
      extractDominantColor(currentTrack.coverArt).then((pal) => {
        if (!cancelled) setPalette(pal);
      });
    } else {
      setPalette(DEFAULT_DARK_PALETTE);
    }
    return () => {
      cancelled = true;
    };
  }, [currentTrack?.id, currentTrack?.coverArt]);

  // Close nested drawers gracefully when NowPlaying closes
  useEffect(() => {
    if (!isOpen) {
      setShowEq(false);
      setShowLyrics(false);
      setShowQueue(false);
      setShowTrackMenu(false);
      setShowVisualizerPicker(false);
      setSheetDragY(0);
      setIsDraggingSheet(false);
      dragStartY.current = null;
    }
  }, [isOpen]);

  // Coordinate hardware Back button for nested sheets inside NowPlaying
  useEffect(() => {
    if (!isOpen) return;
    const handleHardwareBack = (e: Event) => {
      if (showVisualizerPicker) {
        e.preventDefault();
        setShowVisualizerPicker(false);
      } else if (showTrackMenu) {
        e.preventDefault();
        setShowTrackMenu(false);
      } else if (showEq) {
        e.preventDefault();
        setShowEq(false);
      } else if (showLyrics) {
        e.preventDefault();
        setShowLyrics(false);
      } else if (showQueue) {
        e.preventDefault();
        setShowQueue(false);
      }
    };
    window.addEventListener('raag:hardware-back', handleHardwareBack);
    return () => window.removeEventListener('raag:hardware-back', handleHardwareBack);
  }, [isOpen, showVisualizerPicker, showTrackMenu, showEq, showLyrics, showQueue]);

  const parsedLyrics = useMemo(
    () => parseLyricsLines(currentTrack?.lyrics),
    [currentTrack?.lyrics]
  );
  const activeLyricIdx = useMemo(
    () => getActiveLyricIndex(parsedLyrics, currentTime),
    [parsedLyrics, currentTime]
  );

  // Smooth auto-scroll active line in Landscape view
  useEffect(() => {
    if (isLandscape && isOpen && activeLyricIdx >= 0) {
      landscapeLyricRefs.current[activeLyricIdx]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [isLandscape, isOpen, activeLyricIdx]);

  if (!shouldRender || !currentTrack) return null;

  const displayTime = isDraggingSeek ? dragTime : currentTime;
  const progressRatio = duration > 0 ? Math.min(1, Math.max(0, displayTime / duration)) : 0;

  const updateSeekFromClientX = (clientX: number, commit: boolean) => {
    const el = seekTrackRef.current;
    if (!el || duration <= 0) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const target = ratio * duration;
    setDragTime(target);
    if (commit) onSeek(target);
  };

  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragStartY.current = e.clientY;
    setIsDraggingSheet(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleHeaderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartY.current === null) return;
    const delta = e.clientY - dragStartY.current;
    if (delta > 0) setSheetDragY(delta);
  };

  const handleHeaderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartY.current === null) return;
    const delta = e.clientY - dragStartY.current;
    dragStartY.current = null;
    setIsDraggingSheet(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore release errors when pointer already left
    }
    if (delta > 96) {
      setSheetDragY(0);
      onClose();
    } else {
      setSheetDragY(0);
    }
  };

  const backgroundStyle = currentTrack.coverArt
    ? palette.gradientBackground
    : dynamicGradient || palette.gradientBackground;

  const hasCoverArt = Boolean(currentTrack.coverArt && !imgErr);
  const vinylHighlightBorder = palette.isLight
    ? 'rgba(43,33,24,0.22)'
    : 'rgba(255,255,255,0.16)';

  const sheetTransform = !isEntered
    ? 'translate3d(0, 100%, 0)'
    : sheetDragY > 0
    ? `translate3d(0, ${sheetDragY}px, 0)`
    : 'translate3d(0, 0, 0)';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden select-none"
      style={{
        background: backgroundStyle,
        color: palette.textColor,
        transform: sheetTransform,
        transitionProperty: isDraggingSheet ? 'none' : 'transform',
        transitionDuration: `${SHEET_DURATION_MS}ms`,
        transitionTimingFunction: SHEET_EASING,
        willChange: 'transform',
      }}
    >
      {/* Top Backdrop Scrim for Clean Contrast */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: palette.isLight
            ? 'radial-gradient(circle at 50% 18%, rgba(255,255,255,0.25), transparent 70%)'
            : 'radial-gradient(circle at 50% 18%, rgba(255,255,255,0.06), rgba(0,0,0,0.34) 85%)',
        }}
      />

      {isLandscape ? (
        /* ==================== LANDSCAPE VINYL + SYNCED LYRICS STAGE ==================== */
        <div
          className="relative z-10 flex-1 min-h-0 flex flex-col px-5 pt-[calc(env(safe-area-inset-top,0px)+8px)] pb-[calc(env(safe-area-inset-bottom,0px)+10px)]"
        >
          {/* Compact Top Utility Row */}
          <div
            className="flex items-center justify-between shrink-0"
            onPointerDown={handleHeaderPointerDown}
            onPointerMove={handleHeaderPointerMove}
            onPointerUp={handleHeaderPointerUp}
            onPointerCancel={handleHeaderPointerUp}
          >
            <button
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{ color: palette.iconColor }}
              aria-label="Minimize player"
            >
              <ChevronDown className="w-6 h-6" />
            </button>

            <div className="min-w-0 text-center px-3">
              <div className="text-sm font-bold truncate">{currentTrack.title}</div>
              <div className="text-[11px] truncate" style={{ color: palette.subTextColor }}>
                {currentTrack.artist}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowEq(true)}
                className="relative min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center active:scale-90 transition-transform"
                style={{ color: palette.iconColor }}
                aria-label="Equalizer"
              >
                <Sliders className="w-5 h-5" />
                {equalizerEnabled && (
                  <span
                    className="absolute bottom-1 text-[8px] font-extrabold tracking-wider px-1 rounded"
                    style={{
                      backgroundColor: palette.textColor,
                      color: palette.sheetBackground,
                    }}
                  >
                    ON
                  </span>
                )}
              </button>

              <button
                onClick={() => setShowLyrics(true)}
                className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center active:scale-90 transition-transform"
                style={{ color: palette.iconColor }}
                aria-label="Edit lyrics"
              >
                <FileText className="w-5 h-5" />
              </button>

              <button
                onClick={() => setShowTrackMenu(true)}
                className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center active:scale-90 transition-transform"
                style={{ color: palette.iconColor }}
                aria-label="Track options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Two-Column Stage */}
          <div className="flex-1 min-h-0 grid grid-cols-12 gap-5 items-center pt-1">
            {/* Left Column: Rotating Vinyl Turntable + Swinging Tonearm */}
            <div className="col-span-5 h-full flex items-center justify-center">
              <div className="relative flex items-center justify-center w-[min(60dvh,250px)] h-[min(60dvh,250px)]">
                {/* Ambient Platter Halo */}
                <div
                  className="absolute -inset-2 rounded-full blur-xl opacity-45"
                  style={{
                    backgroundColor: palette.isLight
                      ? 'rgba(43,33,24,0.2)'
                      : `rgba(${palette.dominantRgb}, 0.6)`,
                  }}
                />

                {/* Rotating Vinyl Record */}
                <div
                  className="relative w-full h-full rounded-full animate-vinyl-spin shadow-[0_20px_50px_rgba(0,0,0,0.65)] flex items-center justify-center"
                  style={{
                    animationPlayState: isPlaying ? 'running' : 'paused',
                    border: `2px solid ${vinylHighlightBorder}`,
                    background:
                      'radial-gradient(circle at center, #111113 0%, #1c1c20 38%, #0d0d0f 65%, #19191d 84%, #09090b 100%)',
                  }}
                >
                  {/* Concentric Vinyl Micro-Grooves */}
                  <div
                    className="absolute inset-2 rounded-full opacity-70 pointer-events-none"
                    style={{
                      backgroundImage:
                        'repeating-radial-gradient(circle at center, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 2px, transparent 7px)',
                    }}
                  />

                  {/* Specular Vinyl Light Wedge */}
                  <div
                    className="absolute inset-0 rounded-full opacity-25 pointer-events-none"
                    style={{
                      background:
                        'conic-gradient(from 25deg, transparent 0deg, rgba(255,255,255,0.35) 35deg, transparent 75deg, transparent 180deg, rgba(255,255,255,0.28) 215deg, transparent 255deg)',
                    }}
                  />

                  {/* Center Cover Art Label */}
                  <div className="relative w-[46%] h-[46%] rounded-full overflow-hidden border-[3px] border-neutral-900 shadow-lg bg-zinc-900 flex items-center justify-center">
                    {hasCoverArt ? (
                      <img
                        src={currentTrack.coverArt}
                        alt={currentTrack.title}
                        className="w-full h-full object-cover"
                        onError={() => setImgErr(true)}
                      />
                    ) : (
                      <div className="w-full h-full bg-[#050505] flex items-center justify-center">
                        <RaagLogo size={76} animated={isPlaying} contained={false} />
                      </div>
                    )}
                    {/* Chrome Spindle Pin */}
                    <span className="absolute w-3 h-3 rounded-full bg-zinc-200 border border-black/60 shadow-inner" />
                  </div>
                </div>

                {/* Turntable Tonearm Needle */}
                <div
                  className="pointer-events-none absolute -top-3 -right-3 w-24 h-36 origin-[76%_16%]"
                  style={{
                    transform: isPlaying ? 'rotate(-4deg)' : 'rotate(-28deg)',
                    transition: 'transform 520ms cubic-bezier(0.32, 0.72, 0, 1)',
                  }}
                >
                  <svg viewBox="0 0 96 144" className="w-full h-full drop-shadow-lg">
                    {/* Gimbal Pivot Base */}
                    <circle cx="72" cy="22" r="14" fill="#27272A" stroke="rgba(255,255,255,0.28)" strokeWidth="2" />
                    <circle cx="72" cy="22" r="5" fill="#D4D4D8" />
                    {/* Curved Chrome Tonearm Tube */}
                    <path
                      d="M 72 22 C 70 62, 58 84, 34 114"
                      fill="none"
                      stroke="#E4E4E7"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                    />
                    {/* Headshell & Cartridge */}
                    <g transform="translate(24 109) rotate(-36)">
                      <rect x="0" y="0" width="14" height="22" rx="3" fill="#18181B" stroke="#A1A1AA" strokeWidth="1.5" />
                      <circle cx="7" cy="18" r="2" fill="#F43F5E" />
                    </g>
                  </svg>
                </div>
              </div>
            </div>

            {/* Right Column: Auto-Scrolling Lyrics + Minimal Controls */}
            <div className="col-span-7 h-full min-h-0 flex flex-col justify-between">
              {/* Synced Lyrics Viewport */}
              <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 no-scrollbar scrollbar-none flex flex-col">
                {parsedLyrics.length > 0 ? (
                  <div className="my-auto space-y-2.5 py-6">
                    {parsedLyrics.map((line, idx) => {
                      const isActive = idx === activeLyricIdx;
                      const canSeek = line.time >= 0;
                      return (
                        <button
                          key={`${idx}-${line.text.slice(0, 12)}`}
                          ref={(el) => {
                            landscapeLyricRefs.current[idx] = el;
                          }}
                          onClick={() => canSeek && onSeek(line.time)}
                          disabled={!canSeek}
                          className={`block w-full text-left rounded-xl px-2 py-1 transition-all duration-300 ${
                            isActive
                              ? 'text-xl sm:text-2xl font-extrabold leading-snug scale-[1.01] origin-left'
                              : 'text-base sm:text-lg font-semibold leading-snug opacity-35 hover:opacity-65'
                          }`}
                          style={{ color: palette.textColor }}
                        >
                          {line.text}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="m-auto text-center space-y-3 max-w-xs">
                    <p className="text-xl font-bold opacity-85">No lyrics for this track</p>
                    <p className="text-xs leading-relaxed" style={{ color: palette.subTextColor }}>
                      Paste plain or synced (.lrc) lyrics to sing along while the record spins.
                    </p>
                    <button
                      onClick={() => setShowLyrics(true)}
                      className="min-h-[44px] px-5 rounded-full text-xs font-bold tracking-wide transition-transform active:scale-95"
                      style={{
                        backgroundColor: palette.isLight ? '#2B2118' : '#FFFFFF',
                        color: palette.isLight ? '#FFFDF8' : '#18181B',
                      }}
                    >
                      Add or Search Lyrics
                    </button>
                  </div>
                )}
              </div>

              {/* Slim Seekbar + Transport Bar */}
              <div className="shrink-0 pt-2 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-medium tabular-nums w-9 text-right" style={{ color: palette.subTextColor }}>
                    {formatClock(displayTime)}
                  </span>
                  <div
                    ref={seekTrackRef}
                    onPointerDown={(e) => {
                      setIsDraggingSeek(true);
                      e.currentTarget.setPointerCapture(e.pointerId);
                      updateSeekFromClientX(e.clientX, false);
                    }}
                    onPointerMove={(e) => {
                      if (isDraggingSeek) updateSeekFromClientX(e.clientX, false);
                    }}
                    onPointerUp={(e) => {
                      if (!isDraggingSeek) return;
                      updateSeekFromClientX(e.clientX, true);
                      setIsDraggingSeek(false);
                      try {
                        e.currentTarget.releasePointerCapture(e.pointerId);
                      } catch {
                        // ignore
                      }
                    }}
                    className="relative flex-1 h-7 flex items-center cursor-pointer touch-none"
                  >
                    <div
                      className="w-full h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: palette.barBackground }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${progressRatio * 100}%`,
                          backgroundColor: palette.barProgress,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-[11px] font-medium tabular-nums w-9" style={{ color: palette.subTextColor }}>
                    {formatClock(duration)}
                  </span>
                </div>

                {/* Minimal Landscape Transport: Favorite, Prev, Play/Pause, Next, Queue */}
                <div className="flex items-center justify-between px-2">
                  <AnimatedLikeButton
                    isFavorite={currentTrack.isFavorite}
                    onToggle={() => onToggleFavorite(currentTrack.id)}
                    sizeClass="w-6 h-6"
                    buttonClassName="min-w-[44px] min-h-[44px]"
                    activeColor={palette.isLight ? '#E11D48' : '#FB7185'}
                    inactiveColor={palette.iconColor}
                    ariaLabel="Favorite"
                  />

                  <div className="flex items-center gap-6">
                    <button
                      onClick={onPrev}
                      className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center active:scale-90 transition-transform"
                      style={{ color: palette.iconColor }}
                      aria-label="Previous track"
                    >
                      <SkipBack className="w-7 h-7 fill-current" />
                    </button>

                    <button
                      onClick={onTogglePlay}
                      className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                      style={{
                        backgroundColor: palette.isLight ? '#2B2118' : '#FFFFFF',
                        color: palette.isLight ? '#FFFDF8' : '#18181B',
                      }}
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? (
                        <Pause className="w-6 h-6 fill-current" />
                      ) : (
                        <Play className="w-6 h-6 fill-current ml-0.5" />
                      )}
                    </button>

                    <button
                      onClick={onNext}
                      className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center active:scale-90 transition-transform"
                      style={{ color: palette.iconColor }}
                      aria-label="Next track"
                    >
                      <SkipForward className="w-7 h-7 fill-current" />
                    </button>
                  </div>

                  <button
                    onClick={() => setShowQueue(true)}
                    className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center active:scale-90 transition-transform"
                    style={{ color: palette.iconColor }}
                    aria-label="Queue"
                  >
                    <ListMusic className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ==================== PORTRAIT NOW PLAYING SHEET ==================== */
        <div className="relative z-10 flex-1 min-h-0 flex flex-col justify-between max-w-md w-full mx-auto px-6 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-[calc(env(safe-area-inset-bottom,0px)+18px)]">
          {/* Header with Drag-to-Dismiss */}
          <div
            className="flex items-center justify-between shrink-0 touch-none"
            onPointerDown={handleHeaderPointerDown}
            onPointerMove={handleHeaderPointerMove}
            onPointerUp={handleHeaderPointerUp}
            onPointerCancel={handleHeaderPointerUp}
          >
            <button
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] -ml-2 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{ color: palette.iconColor }}
              aria-label="Minimize player"
            >
              <ChevronDown className="w-7 h-7" />
            </button>

            <div className="flex flex-col items-center">
              <span
                className="text-[11px] font-bold tracking-[0.2em] uppercase opacity-75"
                style={{ color: palette.subTextColor }}
              >
                Now Playing
              </span>
            </div>

            <button
              onClick={() => setShowVisualizerPicker(true)}
              className="min-w-[44px] min-h-[44px] -mr-2 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{ color: palette.iconColor }}
              aria-label="Music visualizer"
              title="Music visualizer"
            >
              <span
                className={`w-2 h-2 rounded-full mr-1 ${
                  visualizerEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'
                }`}
              />
              <span className="text-[10px] font-bold tracking-wider uppercase opacity-80">
                FX
              </span>
            </button>
          </div>

          {/* Center Artwork or Promo Card */}
          <div className="flex-1 min-h-0 flex items-center justify-center py-3">
            <div className="w-full max-w-[320px] max-h-[42dvh] aspect-square rounded-[26px] overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.45)] relative">
              {hasCoverArt ? (
                <img
                  src={currentTrack.coverArt}
                  alt={currentTrack.title}
                  className={`w-full h-full object-cover transition-transform duration-500 ${
                    isPlaying ? 'scale-100' : 'scale-[0.97]'
                  }`}
                  onError={() => setImgErr(true)}
                />
              ) : (
                <div className="w-full h-full bg-[#050505] border border-white/10 flex flex-col items-center justify-center relative overflow-hidden">
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: isPlaying
                        ? 'radial-gradient(circle at 50% 45%, rgba(245,158,11,0.14) 0%, rgba(255,255,255,0.03) 45%, transparent 72%)'
                        : 'radial-gradient(circle at 50% 45%, rgba(255,255,255,0.05) 0%, transparent 70%)',
                    }}
                  />
                  <RaagLogo
                    size={144}
                    animated={isPlaying}
                    withWordmark
                    contained={false}
                    className="relative z-10"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Lower Controls Section */}
          <div className="shrink-0 space-y-4">
            {/* Title, Artist, Heart, and Three-Dot Sheet Trigger */}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => onShowInfo(currentTrack)}
                className="min-w-0 flex-1 text-left"
              >
                <h2 className="text-[22px] font-extrabold tracking-tight truncate leading-tight">
                  {currentTrack.title}
                </h2>
                <p
                  className="text-sm font-medium truncate mt-0.5"
                  style={{ color: palette.subTextColor }}
                >
                  {currentTrack.artist}
                </p>
              </button>

              <div className="flex items-center shrink-0 -mr-2">
                <AnimatedLikeButton
                  isFavorite={currentTrack.isFavorite}
                  onToggle={() => onToggleFavorite(currentTrack.id)}
                  sizeClass="w-6 h-6"
                  buttonClassName="min-w-[44px] min-h-[44px]"
                  activeColor={palette.isLight ? '#E11D48' : '#FB7185'}
                  inactiveColor={palette.iconColor}
                  ariaLabel={currentTrack.isFavorite ? 'Remove favorite' : 'Add favorite'}
                />

                <button
                  onClick={() => setShowTrackMenu(true)}
                  className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ color: palette.iconColor }}
                  aria-label="More track options"
                >
                  <MoreVertical className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Live Visualizer right above Seekbar */}
            <div>
              <LiveVisualizerCanvas
                enabled={visualizerEnabled}
                isPlaying={isPlaying}
                styleType={visualizerStyle}
                palette={palette}
              />

              {/* Interactive Seekbar */}
              <div
                ref={seekTrackRef}
                onPointerDown={(e) => {
                  setIsDraggingSeek(true);
                  e.currentTarget.setPointerCapture(e.pointerId);
                  updateSeekFromClientX(e.clientX, false);
                }}
                onPointerMove={(e) => {
                  if (isDraggingSeek) updateSeekFromClientX(e.clientX, false);
                }}
                onPointerUp={(e) => {
                  if (!isDraggingSeek) return;
                  updateSeekFromClientX(e.clientX, true);
                  setIsDraggingSeek(false);
                  try {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  } catch {
                    // ignore
                  }
                }}
                className="relative w-full h-8 flex items-center cursor-pointer touch-none"
              >
                <div
                  className="w-full h-1.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: palette.barBackground }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${progressRatio * 100}%`,
                      backgroundColor: palette.barProgress,
                    }}
                  />
                </div>
                <span
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full shadow-md transition-transform ${
                    isDraggingSeek ? 'w-4 h-4 scale-110' : 'w-3 h-3'
                  }`}
                  style={{
                    left: `${progressRatio * 100}%`,
                    backgroundColor: palette.barProgress,
                  }}
                />
              </div>

              <div
                className="flex items-center justify-between text-xs font-medium tabular-nums -mt-1"
                style={{ color: palette.subTextColor }}
              >
                <span>{formatClock(displayTime)}</span>
                <span>{formatClock(duration)}</span>
              </div>
            </div>

            {/* Primary Playback Controls */}
            <div className="flex items-center justify-center gap-9 py-1">
              <button
                onClick={onPrev}
                className="min-w-[52px] min-h-[52px] rounded-full flex items-center justify-center active:scale-90 transition-transform"
                style={{ color: palette.iconColor }}
                aria-label="Previous track"
              >
                <SkipBack className="w-8 h-8 fill-current" />
              </button>

              <button
                onClick={onTogglePlay}
                className="w-[68px] h-[68px] rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-transform"
                style={{
                  backgroundColor: palette.isLight ? '#2B2118' : '#FFFFFF',
                  color: palette.isLight ? '#FFFDF8' : '#18181B',
                }}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 fill-current" />
                ) : (
                  <Play className="w-8 h-8 fill-current ml-1" />
                )}
              </button>

              <button
                onClick={onNext}
                className="min-w-[52px] min-h-[52px] rounded-full flex items-center justify-center active:scale-90 transition-transform"
                style={{ color: palette.iconColor }}
                aria-label="Next track"
              >
                <SkipForward className="w-8 h-8 fill-current" />
              </button>
            </div>

            {/* Bottom Utility Dock: EQ (+ ON badge), Lyrics, Repeat, Shuffle, Queue */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setShowEq(true)}
                className="relative min-w-[44px] min-h-[44px] flex flex-col items-center justify-center active:scale-90 transition-transform"
                style={{ color: palette.iconColor }}
                aria-label={t.equalizer}
              >
                <Sliders className="w-5 h-5" />
                {equalizerEnabled && (
                  <span
                    className="mt-0.5 text-[8px] font-extrabold leading-none tracking-wider"
                    style={{ color: palette.textColor }}
                  >
                    ON
                  </span>
                )}
              </button>

              <button
                onClick={() => setShowLyrics(true)}
                className={`min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-90 transition-transform ${
                  currentTrack.lyrics ? 'opacity-100' : 'opacity-70'
                }`}
                style={{ color: palette.iconColor }}
                aria-label={t.lyrics}
              >
                <FileText className="w-5 h-5" />
              </button>

              <button
                onClick={onToggleRepeat}
                className={`min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-90 transition-transform ${
                  repeatMode === 'off' ? 'opacity-65' : 'opacity-100'
                }`}
                style={{ color: palette.iconColor }}
                aria-label={`Repeat: ${repeatMode}`}
              >
                {repeatMode === 'one' ? (
                  <Repeat1 className="w-5 h-5" />
                ) : (
                  <Repeat className="w-5 h-5" />
                )}
              </button>

              <button
                onClick={onToggleShuffle}
                className={`min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-90 transition-transform ${
                  isShuffle ? 'opacity-100' : 'opacity-65'
                }`}
                style={{ color: palette.iconColor }}
                aria-label={`Shuffle: ${isShuffle ? 'On' : 'Off'}`}
              >
                <Shuffle className="w-5 h-5" />
              </button>

              <button
                onClick={() => setShowQueue(true)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-90 transition-transform"
                style={{ color: palette.iconColor }}
                aria-label={t.queue}
              >
                <ListMusic className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SLIDING SUB-SHEETS ==================== */}
      <EqualizerDrawer
        isOpen={showEq}
        onClose={() => setShowEq(false)}
        language={language}
        track={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        onTogglePlay={onTogglePlay}
        eqEnabled={equalizerEnabled}
        onToggleEqEnabled={onToggleEqualizerEnabled}
        currentGains={equalizerGains}
        activePreset={activePreset}
        onGainChange={onGainChange}
        onSelectPreset={onSelectPreset}
        palette={palette}
      />

      <LyricsDrawer
        isOpen={showLyrics}
        onClose={() => setShowLyrics(false)}
        language={language}
        track={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        onTogglePlay={onTogglePlay}
        onSeek={onSeek}
        onUpdateLyrics={(lyrics) => onUpdateTrackLyrics(currentTrack.id, lyrics)}
        palette={palette}
      />

      <QueueDrawer
        isOpen={showQueue}
        onClose={() => setShowQueue(false)}
        language={language}
        queue={queue}
        currentTrack={currentTrack}
        onSelectTrack={onSelectQueueTrack}
        onRemoveFromQueue={onRemoveFromQueue}
        onClearQueue={onClearQueue}
      />

      <TrackActionSheet
        isOpen={showTrackMenu}
        onClose={() => setShowTrackMenu(false)}
        track={currentTrack}
        playlists={playlists}
        palette={palette}
        playbackSpeed={playbackSpeed}
        preservesPitch={preservesPitch}
        sleepTimerMinutes={sleepTimerMinutes}
        sleepTimerTarget={sleepTimerTarget}
        sleepTimerEndOfTrack={sleepTimerEndOfTrack}
        sleepRemainingSeconds={sleepRemainingSeconds}
        visualizerEnabled={visualizerEnabled}
        visualizerStyle={visualizerStyle}
        onUpdateMetadata={onUpdateTrackMetadata}
        onAddTrackToPlaylist={onAddTrackToPlaylist}
        onCreatePlaylistWithTrack={onCreatePlaylistWithTrack}
        onShareTrack={onShareTrack}
        onOpenVisualizer={() => setShowVisualizerPicker(true)}
        onUpdateSpeed={onUpdateSpeed}
        onMakeRingtone={onMakeRingtone}
        onSetSleepTimer={onSetSleepTimer}
        onHideTrack={(trackId) => {
          onHideTrack(trackId);
          onClose();
        }}
        onDeleteTrack={(trackId) => {
          onDeleteTrack(trackId);
          onClose();
        }}
      />

      <VisualizerPickerSheet
        isOpen={showVisualizerPicker}
        onClose={() => setShowVisualizerPicker(false)}
        enabled={visualizerEnabled}
        selectedStyle={visualizerStyle}
        palette={palette}
        onToggleEnabled={onToggleVisualizerEnabled}
        onSelectStyle={onSelectVisualizerStyle}
      />
    </div>
  );
};
