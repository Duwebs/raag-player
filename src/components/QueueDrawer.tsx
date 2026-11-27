import React from 'react';
import { ListMusic, Music, Play, Trash2, X } from 'lucide-react';
import { LanguageCode, Track } from '../types';
import { TRANSLATIONS } from '../utils/translations';
import { AnimatedBottomSheet } from './MotionPrimitives';

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  language: LanguageCode;
  queue: Track[];
  currentTrack: Track | null;
  onSelectTrack: (track: Track) => void;
  onRemoveFromQueue: (trackId: string) => void;
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
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  return (
    <AnimatedBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      zIndexClass="z-[60]"
      backgroundColor="#121216"
      borderColor="rgba(255,255,255,0.12)"
      maxHeightClass="max-h-[78dvh]"
    >
      <div className="flex flex-col min-h-0 text-white select-none">
        {/* Header */}
        <div className="px-5 pb-3.5 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <ListMusic className="w-5 h-5 text-sky-400" />
            <h3 className="text-lg font-bold tracking-tight">{t.queue}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 font-semibold">
              {queue.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {queue.length > 0 && (
              <button
                onClick={onClearQueue}
                className="min-h-[44px] px-3 text-xs font-medium text-rose-400 hover:text-rose-300 transition-colors flex items-center"
              >
                {t.clearQueue}
              </button>
            )}
            <button
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors flex items-center justify-center"
              aria-label="Close queue"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Queue List */}
        <div className="px-4 py-3 pb-6 space-y-1.5 overflow-y-auto max-h-[56dvh]">
          {queue.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">
              Queue is empty
            </div>
          ) : (
            queue.map((track) => {
              const isPlayingNow = currentTrack?.id === track.id;
              return (
                <div
                  key={track.id}
                  onClick={() => {
                    onSelectTrack(track);
                    onClose();
                  }}
                  className={`flex items-center justify-between p-2.5 min-h-[56px] rounded-2xl border transition-all cursor-pointer ${
                    isPlayingNow
                      ? 'bg-sky-500/15 border-sky-500/40'
                      : 'bg-zinc-900/50 border-white/5 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                      {track.coverArt ? (
                        <img
                          src={track.coverArt}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Music className="w-4 h-4 text-zinc-500" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-sm font-semibold truncate ${
                          isPlayingNow ? 'text-sky-400' : 'text-white'
                        }`}
                      >
                        {track.title}
                      </div>
                      <div className="text-xs text-zinc-400 truncate">
                        {track.artist}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isPlayingNow && (
                      <Play className="w-4 h-4 text-sky-400 fill-current mr-1" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFromQueue(track.id);
                      }}
                      className="min-w-[44px] min-h-[44px] rounded-full hover:bg-white/10 text-zinc-500 hover:text-rose-400 transition-colors flex items-center justify-center"
                      aria-label={`Remove ${track.title} from queue`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AnimatedBottomSheet>
  );
};
