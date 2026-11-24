import React from 'react';
import { X, Music, HardDrive, Calendar, Clock, Folder } from 'lucide-react';
import { Track } from '../types';

interface TrackInfoModalProps {
  track: Track | null;
  onClose: () => void;
}

export const TrackInfoModal: React.FC<TrackInfoModalProps> = ({ track, onClose }) => {
  if (!track) return null;

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#121214] border border-[#1E1E22] rounded-[24px] p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-[#1E1E22]">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-[#38BDF8]" />
            <h3 className="text-base font-bold text-white">Track Information</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0">
            {track.coverArt ? (
              <img src={track.coverArt} alt={track.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl">🎵</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-white truncate">{track.title}</h4>
            <p className="text-xs text-zinc-400 truncate">{track.artist}</p>
            <p className="text-[11px] text-zinc-500 truncate">{track.album || 'Unknown Album'}</p>
          </div>
        </div>

        <div className="bg-[#0A0A0C] rounded-xl p-3.5 space-y-2.5 text-xs text-zinc-300">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-zinc-500">
              <Clock className="w-3.5 h-3.5" /> Duration
            </span>
            <span className="font-mono text-white">{formatDuration(track.duration)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-zinc-500">
              <HardDrive className="w-3.5 h-3.5" /> File Size
            </span>
            <span className="font-mono text-white">{formatFileSize(track.size)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-zinc-500">
              <Folder className="w-3.5 h-3.5" /> Folder
            </span>
            <span className="text-white truncate max-w-[150px]">{track.folder || 'Downloads'}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-zinc-500">
              <Calendar className="w-3.5 h-3.5" /> Date Added
            </span>
            <span className="text-white">{formatDate(track.dateAdded)}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};
