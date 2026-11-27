import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, Music } from 'lucide-react';
import { Track } from '../types';

interface MiniPlayerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  progressPercent: number;
  onTogglePlay: (e: React.MouseEvent) => void;
  onNext: (e: React.MouseEvent) => void;
  onExpand: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  currentTrack,
  isPlaying,
  progressPercent,
  onTogglePlay,
  onNext,
  onExpand,
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [currentTrack?.id]);
  return (
    <div className="fixed bottom-0 left-0 right-0 p-3 z-30 pointer-events-none pb-[calc(env(safe-area-inset-bottom,12px)+10px)]">
      <div
        onClick={onExpand}
        className="pointer-events-auto max-w-md mx-auto relative overflow-hidden backdrop-blur-xl border rounded-[20px] shadow-2xl p-2.5 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all duration-200"
        style={{
          backgroundColor: 'var(--miniplayer-glass)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {/* Tiny top progress bar */}
        {currentTrack && (
          <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-black/15 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${Math.min(100, Math.max(0, progressPercent))}%`,
                backgroundColor: 'var(--accent-color)',
              }}
            />
          </div>
        )}

        {/* Left: Thumbnail & Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1 pl-1">
          <div
            className="w-11 h-11 rounded-[12px] border overflow-hidden flex-shrink-0 flex items-center justify-center shadow-md"
            style={{
              backgroundColor: 'var(--card-elevated)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {currentTrack?.coverArt && !imgError ? (
              <img
                src={currentTrack.coverArt}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <Music className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            )}
          </div>

          <div className="min-w-0 flex-1 pr-2">
            {currentTrack ? (
              <>
                <h4
                  className="text-[14px] font-semibold truncate leading-tight"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {currentTrack.title}
                </h4>
                <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {currentTrack.artist}
                </p>
              </>
            ) : (
              <div
                className="text-[15px] font-bold tracking-wide"
                style={{ color: 'var(--text-primary)' }}
              >
                Tap to play
              </div>
            )}
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-1.5 pr-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onTogglePlay}
            className="w-10 h-10 rounded-full active:scale-95 flex items-center justify-center transition-all shadow-md"
            style={{
              backgroundColor: 'var(--accent-color)',
              color: 'var(--accent-contrast)',
            }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={onNext}
            className="w-10 h-10 rounded-full hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 flex items-center justify-center transition-all"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Next track"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
};
