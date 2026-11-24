import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  Heart,
  MoreVertical,
  Play,
  Pause,
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
import { EqualizerDrawer } from './EqualizerDrawer';
import { LyricsDrawer } from './LyricsDrawer';
import { QueueDrawer } from './QueueDrawer';

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
  dynamicGradient: string;
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
  dynamicGradient,
}) => {
  const t = TRANSLATIONS[language];
  const [isEqOpen, setIsEqOpen] = useState(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

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

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col justify-between overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-6"
      style={{
        background: dynamicGradient || 'linear-gradient(180deg, #321c14 0%, #150d09 50%, #050505 100%)',
      }}
    >
      {/* Top Header Bar */}
      <header className="px-5 pt-4 pb-2 flex items-center justify-between z-10">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 active:scale-95 text-white flex items-center justify-center transition-all backdrop-blur-md"
          aria-label="Collapse player"
        >
          <ChevronDown className="w-6 h-6 stroke-[2]" />
        </button>

        <div className="flex flex-col items-center">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
            Playing From
          </span>
          <span className="text-xs font-medium text-white/90 truncate max-w-[180px]">
            {currentTrack.folder || 'Raag Music Library'}
          </span>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 active:scale-95 text-white flex items-center justify-center transition-all backdrop-blur-md"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-[#161619] border border-[#222228] rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    onShowInfo(currentTrack);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs text-zinc-200 hover:bg-white/5 flex items-center gap-2.5"
                >
                  <Info className="w-4 h-4 text-zinc-400" />
                  <span>Track Details</span>
                </button>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: currentTrack.title, text: `${currentTrack.title} - ${currentTrack.artist}` });
                    }
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs text-zinc-200 hover:bg-white/5 flex items-center gap-2.5"
                >
                  <Share2 className="w-4 h-4 text-zinc-400" />
                  <span>Share Song</span>
                </button>
                <button
                  onClick={() => {
                    onDeleteTrack(currentTrack);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Delete Track</span>
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Main Center Area: Large 24px Radius Square Album Artwork */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 py-2 z-10 max-w-md mx-auto w-full">
        <div className="relative w-full aspect-square max-w-[340px] rounded-[24px] overflow-hidden shadow-2xl border border-white/10 group">
          {currentTrack.coverArt ? (
            <img
              src={currentTrack.coverArt}
              alt={currentTrack.title}
              className="w-full h-full object-cover select-none transform transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-[#18181C] flex flex-col items-center justify-center text-zinc-500">
              <span className="text-6xl mb-3">🎵</span>
              <span className="text-sm font-medium tracking-wide">Raag Player</span>
            </div>
          )}

          {/* Subtle Ambient Radial Inner Glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/10 pointer-events-none" />
        </div>
      </main>

      {/* Bottom Control Section */}
      <footer className="px-6 pb-6 pt-2 z-10 max-w-md mx-auto w-full flex flex-col gap-4">
        {/* Track Info & Heart Action */}
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-4">
            <h2 className="text-2xl font-bold text-white tracking-tight truncate leading-tight">
              {currentTrack.title}
            </h2>
            <p className="text-base text-zinc-400 font-normal truncate mt-0.5">
              {currentTrack.artist}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleFavorite(currentTrack.id)}
              className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all text-zinc-300 hover:text-rose-500"
              aria-label="Favorite toggle"
            >
              <Heart
                className={`w-6 h-6 transition-colors ${
                  currentTrack.isFavorite ? 'text-rose-500 fill-rose-500' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Progress Seekbar */}
        <div className="space-y-1.5">
          <div className="relative w-full h-6 flex items-center group cursor-pointer">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.5}
              value={currentTime}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white focus:outline-none transition-all group-hover:h-1.5"
            />
          </div>

          <div className="flex items-center justify-between text-xs font-medium text-zinc-400 px-0.5 font-mono select-none">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Tactile Primary Playback Controls: Oversized Previous, Play/Pause, Next */}
        <div className="flex items-center justify-around py-1">
          {/* Previous Track */}
          <button
            onClick={onPrev}
            className="w-14 h-14 rounded-full flex items-center justify-center text-zinc-200 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
            aria-label="Previous Track"
          >
            <SkipBack className="w-8 h-8 fill-current" />
          </button>

          {/* Huge Tactile Play/Pause Pill Button */}
          <button
            onClick={onTogglePlay}
            className="w-20 h-20 rounded-full bg-white text-black hover:bg-zinc-100 active:scale-95 flex items-center justify-center shadow-2xl shadow-white/20 transition-all"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-9 h-9 fill-black" />
            ) : (
              <Play className="w-9 h-9 fill-black ml-1" />
            )}
          </button>

          {/* Next Track */}
          <button
            onClick={onNext}
            className="w-14 h-14 rounded-full flex items-center justify-center text-zinc-200 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
            aria-label="Next Track"
          >
            <SkipForward className="w-8 h-8 fill-current" />
          </button>
        </div>

        {/* Bottom Utility Bar: EQ, Synced Lyrics Preview, Queue / Modes */}
        <div className="pt-2 flex items-center justify-between border-t border-white/10 text-zinc-400 select-none">
          {/* Equalizer trigger */}
          <button
            onClick={() => setIsEqOpen(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-95 hover:text-white transition-all"
            title={t.equalizer}
          >
            <SlidersVertical className="w-5 h-5 stroke-[2]" />
          </button>

          {/* Center: Lyrics Preview Line */}
          <button
            onClick={() => setIsLyricsOpen(true)}
            className="flex-1 px-3 text-center truncate py-1.5 hover:text-white transition-colors cursor-pointer"
          >
            {currentLyricLine ? (
              <span className="text-xs font-semibold text-[#38BDF8] tracking-wide animate-pulse">
                “{currentLyricLine}”
              </span>
            ) : (
              <span className="text-xs text-zinc-400 tracking-wide flex items-center justify-center gap-1">
                <span>{t.lyrics}</span>
              </span>
            )}
          </button>

          {/* Right: Repeat Mode & Queue Drawer */}
          <div className="flex items-center gap-1">
            {/* Repeat Toggle */}
            <button
              onClick={onToggleRepeat}
              className={`w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all ${
                repeatMode !== 'off' ? 'text-[#38BDF8]' : 'text-zinc-400 hover:text-white'
              }`}
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
              className={`w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all ${
                isShuffle ? 'text-[#38BDF8]' : 'text-zinc-400 hover:text-white'
              }`}
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4 stroke-[2]" />
            </button>

            {/* Queue drawer trigger */}
            <button
              onClick={() => setIsQueueOpen(true)}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-95 text-zinc-400 hover:text-white transition-all relative"
              title={t.queue}
            >
              <ListMusic className="w-5 h-5 stroke-[2]" />
              {queue.length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#38BDF8]" />
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
