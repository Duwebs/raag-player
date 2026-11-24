import React, { useState } from 'react';
import { Music, MoreVertical, Heart, Plus, Trash2, EyeOff, Info, Play } from 'lucide-react';
import { Track } from '../types';

interface TrackItemProps {
  track: Track;
  isPlaying: boolean;
  isActive: boolean;
  onPlay: () => void;
  onToggleFavorite: (id: string) => void;
  onAddToQueueNext: (track: Track) => void;
  onHideTrack: (id: string) => void;
  onDeleteTrack: (track: Track) => void;
  onShowInfo: (track: Track) => void;
}

export const TrackItem: React.FC<TrackItemProps> = ({
  track,
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

  const formatDuration = (sec: number) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      onClick={onPlay}
      className={`relative group flex items-center justify-between px-4 py-2.5 rounded-2xl transition-all duration-150 cursor-pointer select-none ${
        isActive
          ? 'bg-blue-600/10 border border-blue-500/20'
          : 'hover:bg-white/[0.03] active:bg-white/[0.06] border border-transparent'
      }`}
    >
      {/* Left: Thumbnail + Metadata */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* 48x48 rounded thumbnail */}
        <div className="relative w-12 h-12 rounded-[12px] bg-[#1A1A1E] border border-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-md">
          {track.coverArt ? (
            <img
              src={track.coverArt}
              alt={track.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <Music className="w-5 h-5 text-zinc-500" />
          )}

          {/* Playing animation overlay */}
          {isActive && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center gap-0.5">
              {isPlaying ? (
                <div className="flex items-end gap-[2px] h-4">
                  <span className="w-1 bg-[#38BDF8] rounded-full animate-[bounce_0.8s_infinite]" style={{ height: '60%' }} />
                  <span className="w-1 bg-[#38BDF8] rounded-full animate-[bounce_0.6s_infinite_0.2s]" style={{ height: '100%' }} />
                  <span className="w-1 bg-[#38BDF8] rounded-full animate-[bounce_0.9s_infinite_0.4s]" style={{ height: '40%' }} />
                </div>
              ) : (
                <Play className="w-4 h-4 text-white fill-white" />
              )}
            </div>
          )}
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1 pr-2">
          <h4
            className={`text-[15px] font-medium leading-tight truncate ${
              isActive ? 'text-[#38BDF8] font-semibold' : 'text-white'
            }`}
          >
            {track.title}
          </h4>
          <p className="text-[12px] text-[#8E8E93] truncate mt-0.5">
            {track.artist} {track.folder ? `• ${track.folder}` : ''}
          </p>
        </div>
      </div>

      {/* Right Actions: Favorite & Menu */}
      <div
        className="flex items-center gap-1 text-zinc-400"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onToggleFavorite(track.id)}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all text-zinc-400 hover:text-rose-500"
        >
          <Heart
            className={`w-4 h-4 ${
              track.isFavorite ? 'text-rose-500 fill-rose-500' : ''
            }`}
          />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all text-zinc-400 hover:text-white"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Context Menu Dropdown */}
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-48 bg-[#161619] border border-[#222228] rounded-2xl shadow-2xl py-1.5 z-40 divide-y divide-[#202026] animate-in fade-in zoom-in-95 duration-100">
                <div className="py-1">
                  <button
                    onClick={() => {
                      onAddToQueueNext(track);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-xs text-left text-zinc-200 hover:bg-white/5 flex items-center gap-2.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Play next</span>
                  </button>
                  <button
                    onClick={() => {
                      onShowInfo(track);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-xs text-left text-zinc-200 hover:bg-white/5 flex items-center gap-2.5"
                  >
                    <Info className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Track info</span>
                  </button>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      onHideTrack(track.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-xs text-left text-zinc-300 hover:bg-white/5 flex items-center gap-2.5"
                  >
                    <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Hide from library</span>
                  </button>
                  <button
                    onClick={() => {
                      onDeleteTrack(track);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-xs text-left text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Delete track</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
