import React from 'react';
import { X, ListMusic, Trash2, Play } from 'lucide-react';
import { Track, LanguageCode } from '../types';
import { TRANSLATIONS } from '../utils/translations';

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  language: LanguageCode;
  queue: Track[];
  currentTrack: Track | null;
  onSelectTrack: (track: Track) => void;
  onRemoveFromQueue: (id: string) => void;
  onClearQueue: () => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  isOpen,
  onClose,
  language,
  queue,
  currentTrack,
  onSelectTrack,
  onRemoveFromQueue,
  onClearQueue,
}) => {
  const t = TRANSLATIONS[language];
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md h-[80vh] bg-[#121214] border-t border-[#1E1E22] rounded-t-[30px] p-6 shadow-2xl flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1E1E22]">
          <div className="flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-[#38BDF8]" />
            <h3 className="text-lg font-bold text-white tracking-wide">
              {t.queue}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-medium">
              {queue.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {queue.length > 0 && (
              <button
                onClick={onClearQueue}
                className="px-3 py-1 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium border border-rose-500/20 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.clearQueue}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Queue List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-1 divide-y divide-[#18181C]">
          {queue.map((track, idx) => {
            const isCurrent = currentTrack?.id === track.id;
            return (
              <div
                key={`${track.id}-${idx}`}
                className={`pt-2 flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                  isCurrent ? 'bg-blue-600/10 border border-blue-500/20' : 'hover:bg-white/5'
                }`}
              >
                <div
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                  onClick={() => onSelectTrack(track)}
                >
                  <span className="text-xs font-mono text-zinc-500 w-5">
                    {idx + 1}
                  </span>
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                    {track.coverArt ? (
                      <img src={track.coverArt} alt={track.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs">
                        🎵
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pr-2">
                    <h5 className={`text-sm font-medium truncate ${isCurrent ? 'text-[#38BDF8]' : 'text-white'}`}>
                      {track.title}
                    </h5>
                    <p className="text-xs text-zinc-400 truncate">
                      {track.artist}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {isCurrent && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#2563EB] text-white mr-1">
                      Playing
                    </span>
                  )}
                  <button
                    onClick={() => onRemoveFromQueue(track.id)}
                    className="p-2 text-zinc-500 hover:text-rose-400 transition-colors"
                    title="Remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-2 text-center text-[11px] text-zinc-500 border-t border-[#1E1E22]">
          Continuous gapless queue • Auto-plays next in list
        </div>
      </div>
    </div>
  );
};
