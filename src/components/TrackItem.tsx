import React, { useEffect, useState } from 'react';
import { MoreVertical, Heart, Plus, Trash2, EyeOff, Info, Play } from 'lucide-react';
import { ListDensity, Track } from '../types';
import { RaagLogo } from './RaagLogo';

interface TrackItemProps {
  track: Track;
  density?: ListDensity;
  isPlaying: boolean;
  isActive: boolean;
  onPlay: () => void;
  onToggleFavorite: (id: string) => void;
  onAddToQueueNext: (track: Track) => void;
  onHideTrack: (id: string) => void;
  onDeleteTrack: (track: Track) => void;
  onShowInfo: (track: Track) => void;
}

const formatDuration = (sec: number) => {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export const TrackItem: React.FC<TrackItemProps> = ({
  track,
  density = 'cozy',
  isPlaying,
  isActive,
  onPlay,
  onToggleFavorite,
  onAddToQueueNext,
  onHideTrack,
  onDeleteTrack,
  onShowInfo,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [track.coverArt, track.id]);

  const renderArtwork = (sizeClass: string) => (
    <div
      className={`relative ${sizeClass} overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm border`}
      style={{
        backgroundColor: 'var(--card-elevated)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {track.coverArt && !imgError ? (
        <img
          src={track.coverArt}
          alt={track.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-full bg-[#050505] flex items-center justify-center">
          <RaagLogo size={density === 'grid' ? 76 : 42} contained={false} />
        </div>
      )}

      {isActive && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center gap-0.5">
          {isPlaying ? (
            <div className="flex items-end gap-[2px] h-4">
              <span
                className="w-1 rounded-full animate-[bounce_0.8s_infinite]"
                style={{ height: '60%', backgroundColor: 'var(--accent-color)' }}
              />
              <span
                className="w-1 rounded-full animate-[bounce_0.6s_infinite_0.2s]"
                style={{ height: '100%', backgroundColor: 'var(--accent-color)' }}
              />
              <span
                className="w-1 rounded-full animate-[bounce_0.9s_infinite_0.4s]"
                style={{ height: '40%', backgroundColor: 'var(--accent-color)' }}
              />
            </div>
          ) : (
            <Play className="w-4 h-4 text-white fill-white" />
          )}
        </div>
      )}
    </div>
  );

  const renderContextMenu = () => (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 transition-all"
        style={{ color: 'var(--text-secondary)' }}
        aria-label="Track options"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
          <div
            className="absolute right-0 top-full mt-1 w-48 rounded-2xl shadow-2xl py-1.5 z-40 border divide-y animate-in fade-in zoom-in-95 duration-100"
            style={{
              backgroundColor: 'var(--card-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <div className="py-1">
              <button
                onClick={() => {
                  onAddToQueueNext(track);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-xs text-left hover:opacity-80 flex items-center gap-2.5"
              >
                <Plus className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
                <span>Play next</span>
              </button>
              <button
                onClick={() => {
                  onShowInfo(track);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-xs text-left hover:opacity-80 flex items-center gap-2.5"
              >
                <Info className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
                <span>Track info</span>
              </button>
            </div>

            <div className="py-1" style={{ borderColor: 'var(--border-subtle)' }}>
              <button
                onClick={() => {
                  onHideTrack(track.id);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-xs text-left hover:opacity-80 flex items-center gap-2.5"
              >
                <EyeOff className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
                <span>Hide from library</span>
              </button>
              <button
                onClick={() => {
                  onDeleteTrack(track);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-xs text-left text-rose-500 hover:bg-rose-500/10 flex items-center gap-2.5"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Delete track</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // GRID LAYOUT (2-column square album cards)
  if (density === 'grid') {
    return (
      <div
        onClick={onPlay}
        className="relative group flex flex-col p-2.5 rounded-2xl border transition-all duration-150 cursor-pointer select-none"
        style={{
          backgroundColor: isActive ? 'var(--accent-soft)' : 'var(--card-surface)',
          borderColor: isActive ? 'var(--accent-border)' : 'var(--border-subtle)',
        }}
      >
        <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-2.5">
          {renderArtwork('w-full h-full rounded-xl border-0')}
          {track.duration > 0 && (
            <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/65 backdrop-blur-sm text-[10px] font-mono font-medium text-white">
              {formatDuration(track.duration)}
            </span>
          )}
        </div>

        <div className="flex items-start justify-between gap-1 min-w-0">
          <div className="min-w-0 flex-1">
            <h4
              className="text-[13px] font-semibold truncate leading-snug"
              style={{ color: isActive ? 'var(--accent-color)' : 'var(--text-primary)' }}
            >
              {track.title}
            </h4>
            <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {track.artist}
            </p>
          </div>

          <div className="flex items-center shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onToggleFavorite(track.id)}
              className="w-7 h-7 rounded-full flex items-center justify-center active:scale-95 transition-all"
              style={{ color: track.isFavorite ? '#F43F5E' : 'var(--text-muted)' }}
              aria-label="Favorite"
            >
              <Heart className={`w-3.5 h-3.5 ${track.isFavorite ? 'fill-[#F43F5E]' : ''}`} />
            </button>
            {renderContextMenu()}
          </div>
        </div>
      </div>
    );
  }

  // COMPACT (40px) vs COZY (54px + duration/format badge)
  const isCompact = density === 'compact';

  return (
    <div
      onClick={onPlay}
      className={`relative group flex items-center justify-between rounded-2xl border transition-all duration-150 cursor-pointer select-none ${
        isCompact ? 'px-3.5 py-1.5' : 'px-4 py-3'
      }`}
      style={{
        backgroundColor: isActive ? 'var(--accent-soft)' : 'transparent',
        borderColor: isActive ? 'var(--accent-border)' : 'transparent',
      }}
    >
      <div className={`flex items-center min-w-0 flex-1 ${isCompact ? 'gap-3' : 'gap-3.5'}`}>
        {renderArtwork(isCompact ? 'w-10 h-10 rounded-[10px]' : 'w-[54px] h-[54px] rounded-[14px]')}

        <div className="min-w-0 flex-1 pr-2">
          <h4
            className={`${isCompact ? 'text-[14px]' : 'text-[15px]'} font-medium leading-tight truncate ${
              isActive ? 'font-semibold' : ''
            }`}
            style={{ color: isActive ? 'var(--accent-color)' : 'var(--text-primary)' }}
          >
            {track.title}
          </h4>
          <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
            <p className="text-[12px] truncate" style={{ color: 'var(--text-secondary)' }}>
              {track.artist}
              {!isCompact && track.folder ? ` • ${track.folder}` : ''}
            </p>
            {!isCompact && (track.duration > 0 || track.format) && (
              <span
                className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono border"
                style={{
                  backgroundColor: 'var(--card-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                {track.format ? track.format.toUpperCase() : 'AUDIO'}
                {track.duration > 0 ? ` · ${formatDuration(track.duration)}` : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onToggleFavorite(track.id)}
          className="w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all"
          style={{ color: track.isFavorite ? '#F43F5E' : 'var(--text-muted)' }}
          aria-label="Favorite"
        >
          <Heart className={`w-4 h-4 ${track.isFavorite ? 'fill-[#F43F5E]' : ''}`} />
        </button>

        {renderContextMenu()}
      </div>
    </div>
  );
};
