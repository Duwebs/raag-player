import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  Heart,
  MoreVertical,
  Play,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Shuffle,
  SlidersVertical,
  ListMusic,
  Share2,
  Info,
  Trash2,
} from 'lucide-react';
import { Track, RepeatMode, LanguageCode } from '../types';
import { TRANSLATIONS } from '../utils/translations';
import {
  extractDominantColor,
  DEFAULT_DARK_PALETTE,
  ExtractedPalette,
} from '../utils/colorExtractor';
import { EqualizerDrawer } from './EqualizerDrawer';
import { LyricsDrawer } from './LyricsDrawer';
import { QueueDrawer } from './QueueDrawer';
import { NoArtAdCard } from './NoArtAdCard';

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
  onDeleteTrack: (track: Track) => void;
  onShowInfo: (track: Track) => void;
  queue: Track[];
  onSelectQueueTrack: (track: Track) => void;
  onRemoveFromQueue: (id: string) => void;
  onClearQueue: () => void;
  // Equalizer
  equalizerGains: number[];
  activePreset: string;
  onGainChange: (index: number, val: number) => void;
  onSelectPreset: (preset: string) => void;
  dynamicGradient?: string;
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
  onShowInfo,
  queue,
  onSelectQueueTrack,
  onRemoveFromQueue,
  onClearQueue,
  equalizerGains,
  activePreset,
  onGainChange,
  onSelectPreset,
}) => {
  const t = TRANSLATIONS[language];
  const [isEqOpen, setIsEqOpen] = useState(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [palette, setPalette] = useState<ExtractedPalette>(DEFAULT_DARK_PALETTE);

  useEffect(() => {
    setImgError(false);
    if (currentTrack?.coverArt) {
      extractDominantColor(currentTrack.coverArt).then(setPalette);
    } else {
      setPalette(DEFAULT_DARK_PALETTE);
    }
  }, [currentTrack?.coverArt, currentTrack?.id]);

  // Formatter for timestamps (e.g. 0:04, 2:30)
  const formatTime = (timeInSec: number) => {
    if (!timeInSec || isNaN(timeInSec)) return '0:00';
    const m = Math.floor(timeInSec / 60);
    const s = Math.floor(timeInSec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Find preview lyric line
  const currentLyricLine = useMemo(() => {
    if (!currentTrack?.lyrics) return null;
    const lines = currentTrack.lyrics.split('\n');
    const lrcRegex = /\[(\d{2}):(\d{2}(?:\.\d{1,3})?)\](.*)/;
    let foundText = '';

    for (const line of lines) {
      const match = line.match(lrcRegex);
      if (match) {
        const m = parseInt(match[1], 10);
        const s = parseFloat(match[2]);
        const time = m * 60 + s;
        if (time <= currentTime + 0.3) {
          foundText = match[3].trim();
        } else {
          break;
        }
      }
    }
    return foundText || null;
  }, [currentTrack?.lyrics, currentTime]);

  if (!isOpen || !currentTrack) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-6 select-none"
      style={{
        backgroundColor: palette.solidBackground,
        opacity: 1,
      }}
    >
      {/* Top Header Bar: Clean Lark Style */}
      <header className="px-5 pt-4 pb-2 flex items-center justify-between z-10">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all"
          style={{ color: palette.iconColor }}
          aria-label="Collapse player"
        >
          <ChevronDown className="w-7 h-7 stroke-[2.5]" />
        </button>

        <div className="flex flex-col items-center">
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: palette.subTextColor }}
          >
            PLAYING FROM
          </span>
          <span
            className="text-xs font-semibold truncate max-w-[200px]"
            style={{ color: palette.textColor }}
          >
            {currentTrack.folder || 'Raag Music Library'}
          </span>
        </div>

        {/* Empty space for symmetric balance */}
        <div className="w-10 h-10" />
      </header>

      {/* Main Center Area: Large 24px Radius Square Album Artwork (No Bleed-Through) */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 py-2 z-10 max-w-md mx-auto w-full">
        <div
          className="relative w-full aspect-square max-w-[340px] rounded-[24px] overflow-hidden group"
          style={{
            backgroundColor: palette.isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
            boxShadow: palette.isLight
              ? '0 18px 36px -12px rgba(43,33,24,0.22)'
              : '0 20px 40px -15px rgba(0,0,0,0.65)',
          }}
        >
          {currentTrack.coverArt && !imgError ? (
            <img
              src={currentTrack.coverArt}
              alt={currentTrack.title}
              className="w-full h-full object-cover select-none transform transition-transform duration-700 ease-out group-hover:scale-105"
              onError={() => setImgError(true)}
            />
          ) : (
            <NoArtAdCard />
          )}
        </div>
      </main>

      {/* Bottom Control Section */}
      <footer className="px-6 pb-6 pt-2 z-10 max-w-md mx-auto w-full flex flex-col gap-4">
        {/* Track Info Row: Title & Artist on left; Heart & 3-Dot Menu on right */}
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-3">
            <h2
              className="text-2xl font-bold tracking-tight truncate leading-tight"
              style={{ color: palette.textColor }}
            >
              {currentTrack.title}
            </h2>
            <p
              className="text-base font-normal truncate mt-0.5"
              style={{ color: palette.subTextColor }}
            >
              {currentTrack.artist}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Heart Favorite Action */}
            <button
              onClick={() => onToggleFavorite(currentTrack.id)}
              className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all"
              style={{
                color: currentTrack.isFavorite ? '#F43F5E' : palette.iconColor,
              }}
              aria-label="Favorite toggle"
            >
              <Heart
                className={`w-6 h-6 transition-colors ${
                  currentTrack.isFavorite ? 'fill-[#F43F5E]' : 'stroke-[2]'
                }`}
              />
            </button>

            {/* 3-Dot More Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all"
                style={{ color: palette.iconColor }}
                aria-label="Track options"
              >
                <MoreVertical className="w-5 h-5 stroke-[2]" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenu(false)}
                  />
                  <div
                    className="absolute right-0 bottom-full mb-2 w-48 rounded-2xl shadow-2xl py-2 z-50 border"
                    style={{
                      backgroundColor: palette.isLight ? '#FFFFFF' : '#18181C',
                      borderColor: palette.isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
                      color: palette.textColor,
                    }}
                  >
                    <button
                      onClick={() => {
                        onShowInfo(currentTrack);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs flex items-center gap-2.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <Info className="w-4 h-4 opacity-75" />
                      <span>Track Details</span>
                    </button>
                    <button
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: currentTrack.title,
                            text: `${currentTrack.title} - ${currentTrack.artist}`,
                          });
                        }
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs flex items-center gap-2.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <Share2 className="w-4 h-4 opacity-75" />
                      <span>Share Song</span>
                    </button>
                    <button
                      onClick={() => {
                        onDeleteTrack(currentTrack);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-rose-500 hover:bg-rose-500/10 flex items-center gap-2.5 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-rose-500" />
                      <span>Delete Track</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Progress Seekbar */}
        <div className="space-y-1.5">
          <div className="relative w-full h-5 flex items-center group cursor-pointer">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.5}
              value={currentTime}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="w-full h-1 rounded-lg appearance-none cursor-pointer focus:outline-none transition-all"
              style={{
                accentColor: palette.barProgress,
                backgroundColor: palette.barBackground,
              }}
            />
          </div>

          <div
            className="flex items-center justify-between text-xs font-semibold px-0.5 font-mono select-none"
            style={{ color: palette.subTextColor }}
          >
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Tactile Primary Playback Controls: Oversized Rewind, Thick Pause/Play (NO white circle wrapper), Next */}
        <div className="flex items-center justify-around py-1">
          {/* Previous Track / Rewind */}
          <button
            onClick={onPrev}
            className="w-16 h-16 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ color: palette.iconColor }}
            aria-label="Previous Track"
          >
            <SkipBack className="w-9 h-9 fill-current stroke-none" />
          </button>

          {/* Pause / Play: Lark Player Style Thick Rounded Bars (NO white circle background) */}
          <button
            onClick={onTogglePlay}
            className="w-16 h-16 rounded-full flex items-center justify-center active:scale-95 transition-transform"
            style={{ color: palette.iconColor }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              /* Two thick solid vertical bars with rounded ends (like Lark Player in Screenshot 1) */
              <div className="flex items-center gap-2">
                <div
                  className="w-3.5 h-11 rounded-full"
                  style={{ backgroundColor: palette.iconColor }}
                />
                <div
                  className="w-3.5 h-11 rounded-full"
                  style={{ backgroundColor: palette.iconColor }}
                />
              </div>
            ) : (
              /* Large solid play triangle */
              <Play
                className="w-11 h-11 fill-current stroke-none ml-1"
                style={{ color: palette.iconColor }}
              />
            )}
          </button>

          {/* Next Track / Fast Forward */}
          <button
            onClick={onNext}
            className="w-16 h-16 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ color: palette.iconColor }}
            aria-label="Next Track"
          >
            <SkipForward className="w-9 h-9 fill-current stroke-none" />
          </button>
        </div>

        {/* Bottom Utility Bar: Equalizer, Lyrics, Repeat / Queue */}
        <div
          className="pt-2 flex items-center justify-between border-t select-none"
          style={{
            borderColor: palette.isLight
              ? 'rgba(43, 33, 24, 0.12)'
              : 'rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Equalizer trigger */}
          <button
            onClick={() => setIsEqOpen(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all"
            style={{ color: palette.iconColor }}
            title={t.equalizer}
          >
            <SlidersVertical className="w-5 h-5 stroke-[2]" />
          </button>

          {/* Center: Lyrics Preview Line */}
          <button
            onClick={() => setIsLyricsOpen(true)}
            className="flex-1 px-3 text-center truncate py-1.5 transition-colors cursor-pointer"
          >
            {currentLyricLine ? (
              <span
                className="text-xs font-semibold tracking-wide animate-pulse"
                style={{ color: palette.isLight ? '#B45309' : '#38BDF8' }}
              >
                “{currentLyricLine}”
              </span>
            ) : (
              <span
                className="text-xs font-medium tracking-wide flex items-center justify-center gap-1"
                style={{ color: palette.subTextColor }}
              >
                <span>{language === 'hi' ? '[संगीत]' : t.lyrics}</span>
              </span>
            )}
          </button>

          {/* Right: Repeat Mode & Queue Drawer */}
          <div className="flex items-center gap-1">
            {/* Repeat Toggle */}
            <button
              onClick={onToggleRepeat}
              className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-all"
              style={{
                color:
                  repeatMode !== 'off'
                    ? palette.isLight
                      ? '#B45309'
                      : '#38BDF8'
                    : palette.subTextColor,
              }}
              title={`Repeat: ${repeatMode}`}
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <Repeat className="w-4 h-4 stroke-[2]" />
              )}
            </button>

            {/* Shuffle Toggle */}
            <button
              onClick={onToggleShuffle}
              className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-all"
              style={{
                color: isShuffle
                  ? palette.isLight
                    ? '#B45309'
                    : '#38BDF8'
                  : palette.subTextColor,
              }}
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4 stroke-[2]" />
            </button>

            {/* Queue drawer trigger */}
            <button
              onClick={() => setIsQueueOpen(true)}
              className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all relative"
              style={{ color: palette.iconColor }}
              title={t.queue}
            >
              <ListMusic className="w-5 h-5 stroke-[2]" />
              {queue.length > 0 && (
                <span
                  className="absolute top-2 right-2 w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: palette.isLight ? '#B45309' : '#38BDF8',
                  }}
                />
              )}
            </button>
          </div>
        </div>
      </footer>

      {/* Drawers */}
      <EqualizerDrawer
        isOpen={isEqOpen}
        onClose={() => setIsEqOpen(false)}
        language={language}
        currentGains={equalizerGains}
        activePreset={activePreset}
        onGainChange={onGainChange}
        onSelectPreset={onSelectPreset}
      />

      <LyricsDrawer
        isOpen={isLyricsOpen}
        onClose={() => setIsLyricsOpen(false)}
        language={language}
        lyricsText={currentTrack.lyrics}
        currentTime={currentTime}
        onSeek={onSeek}
      />

      <QueueDrawer
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        language={language}
        queue={queue}
        currentTrack={currentTrack}
        onSelectTrack={onSelectQueueTrack}
        onRemoveFromQueue={onRemoveFromQueue}
        onClearQueue={onClearQueue}
      />
    </div>
  );
};
