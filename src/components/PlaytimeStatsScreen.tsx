import React, { useMemo, useState, useEffect } from 'react';
import {
  ChevronLeft,
  Clock,
  Music2,
  Calendar,
  Award,
  Play,
  Disc3,
} from 'lucide-react';
import { ListeningStatsStore, Track } from '../types';
import {
  PlaytimeFilterTab,
  PlaytimeSortMode,
  buildPlaytimeViewData,
  formatDateLabel,
  formatPlaytime,
  getActiveDates,
  getLocalDateKey,
} from '../utils/playtimeStats';

interface PlaytimeStatsScreenProps {
  stats: ListeningStatsStore;
  tracks: Track[];
  isPlaying?: boolean;
  onBack: () => void;
}

const SongThumbnail: React.FC<{ coverArt?: string; title: string }> = ({ coverArt, title }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [coverArt]);

  if (coverArt && !hasError) {
    return (
      <img
        src={coverArt}
        alt={title}
        onError={() => setHasError(true)}
        className="w-11 h-11 rounded-xl object-cover shrink-0 bg-[#161619] border border-white/5"
      />
    );
  }

  return (
    <div className="w-11 h-11 rounded-xl bg-[#161619] border border-[#222228] flex items-center justify-center shrink-0 text-zinc-500">
      <Music2 className="w-5 h-5" />
    </div>
  );
};

export const PlaytimeStatsScreen: React.FC<PlaytimeStatsScreenProps> = ({
  stats,
  tracks,
  isPlaying = false,
  onBack,
}) => {
  const todayKey = getLocalDateKey();
  const [filter, setFilter] = useState<PlaytimeFilterTab>('today');
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  const [sortBy, setSortBy] = useState<PlaytimeSortMode>('time');

  const activeDates = useMemo(() => getActiveDates(stats), [stats]);

  const summary = useMemo(
    () =>
      buildPlaytimeViewData({
        store: stats,
        filter,
        selectedDate,
        sortBy,
        tracks,
      }),
    [stats, filter, selectedDate, sortBy, tracks]
  );

  const filterTitle =
    filter === 'today'
      ? 'Today'
      : filter === 'all-time'
      ? 'All Time'
      : formatDateLabel(selectedDate);

  return (
    <div className="min-h-screen w-full bg-[#050505] text-white flex flex-col pb-12">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 bg-[#050505]/95 backdrop-blur-md px-4 pt-4 pb-3 flex items-center justify-between border-b border-[#1A1A1E]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-[#161619] border border-[#222228] flex items-center justify-center text-zinc-300 hover:text-white active:scale-95 transition-all"
            aria-label="Back to Settings"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-tight">
              Playtime Stats
            </h1>
            <p className="text-[11px] text-zinc-500">
              Your listening breakdown
            </p>
          </div>
        </div>

        {isPlaying && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/25 text-[#38BDF8] text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
            <span>Live</span>
          </div>
        )}
      </header>

      <main className="p-4 space-y-4 max-w-md mx-auto w-full">
        {/* Filter Tabs */}
        <div className="bg-[#0a0a0a] border border-[#1E1E22] p-1 rounded-2xl grid grid-cols-3 gap-1">
          {(
            [
              { id: 'today', label: 'Today' },
              { id: 'all-time', label: 'All Time' },
              { id: 'by-date', label: 'By Date' },
            ] as const
          ).map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-[#2563EB] text-white shadow-md shadow-blue-600/20'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* By Date Picker & Quick Dates Strip */}
        {filter === 'by-date' && (
          <div className="bg-[#0a0a0a] border border-[#1E1E22] rounded-[20px] p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
                <Calendar className="w-4 h-4 text-[#38BDF8]" />
                <span>Select Date</span>
              </div>
              <input
                type="date"
                max={todayKey}
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
                className="bg-[#121214] border border-[#222228] text-zinc-200 text-xs font-mono rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#38BDF8] [color-scheme:dark]"
                aria-label="Choose calendar date"
              />
            </div>

            {activeDates.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {activeDates.map((dateKey) => {
                  const isSelected = dateKey === selectedDate;
                  const daySec = stats.dailyTotals[dateKey]?.durationSeconds || 0;
                  return (
                    <button
                      key={dateKey}
                      onClick={() => setSelectedDate(dateKey)}
                      className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#2563EB]/20 border-[#38BDF8]/50 text-[#38BDF8]'
                          : 'bg-[#121214] border-[#1E1E22] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span>{formatDateLabel(dateKey, false)}</span>
                      {daySec > 0 && (
                        <span className="text-[10px] font-mono opacity-75">
                          · {formatPlaytime(daySec)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Summary Header Card */}
        <section className="bg-[#0a0a0a] border border-[#1E1E22] rounded-[22px] p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block">
                {filterTitle} Playtime
              </span>
              <div className="text-3xl font-bold tracking-tight text-white font-mono mt-1">
                {formatPlaytime(summary.totalSeconds)}
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-[#121214] border border-[#1E1E22] flex items-center justify-center text-[#38BDF8] shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#121214] border border-[#1E1E22] text-xs font-medium text-zinc-300">
              <Play className="w-3 h-3 text-[#38BDF8] fill-[#38BDF8]" />
              {summary.totalPlays} {summary.totalPlays === 1 ? 'play' : 'plays'}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#121214] border border-[#1E1E22] text-xs font-medium text-zinc-300">
              <Disc3 className="w-3 h-3 text-zinc-400" />
              {summary.songCount} {summary.songCount === 1 ? 'song' : 'songs'}
            </span>
            {summary.topSong && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/25 text-xs font-medium text-[#38BDF8] max-w-full">
                <Award className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Top: {summary.topSong.title}</span>
              </span>
            )}
          </div>

          {summary.migratedLegacySeconds > 0 && (
            <p className="text-[11px] text-zinc-500 pt-1 border-t border-[#1A1A1E]">
              Includes {formatPlaytime(summary.migratedLegacySeconds)} recorded prior to per-song tracking.
            </p>
          )}
        </section>

        {/* Ranked Songs Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-zinc-200 tracking-tight">
              Ranked Songs
            </h2>

            {/* Sort Toggle */}
            <div className="bg-[#0a0a0a] border border-[#1E1E22] p-0.5 rounded-xl inline-flex items-center gap-0.5">
              <button
                onClick={() => setSortBy('time')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  sortBy === 'time'
                    ? 'bg-[#18181C] text-[#38BDF8] border border-white/5'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Most Time
              </button>
              <button
                onClick={() => setSortBy('plays')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  sortBy === 'plays'
                    ? 'bg-[#18181C] text-[#38BDF8] border border-white/5'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Most Played
              </button>
            </div>
          </div>

          {summary.items.length > 0 ? (
            <div className="space-y-2.5">
              {summary.items.map((item) => (
                <div
                  key={item.trackId}
                  className="bg-[#0a0a0a] border border-[#1E1E22] rounded-[18px] p-3.5 space-y-2.5"
                >
                  <div className="flex items-center gap-3">
                    {/* Rank Badge */}
                    <span
                      className={`w-7 text-xs font-mono font-bold shrink-0 text-center ${
                        item.rank === 1
                          ? 'text-[#38BDF8]'
                          : item.rank <= 3
                          ? 'text-zinc-200'
                          : 'text-zinc-500'
                      }`}
                    >
                      #{item.rank}
                    </span>

                    {/* Song Art / Fallback */}
                    <SongThumbnail coverArt={item.coverArt} title={item.title} />

                    {/* Song Title & Artist */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate leading-snug">
                        {item.title}
                      </p>
                      <p className="text-xs text-zinc-400 truncate mt-0.5">
                        {item.artist}
                      </p>
                    </div>

                    {/* Play Count Pill & Exact Duration */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs font-mono font-semibold text-[#38BDF8]">
                        {formatPlaytime(item.durationSeconds)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#161619] border border-[#222228] text-[10px] font-medium text-zinc-300">
                        {item.playCount} {item.playCount === 1 ? 'play' : 'plays'}
                      </span>
                    </div>
                  </div>

                  {/* Relative Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-[#161619] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#38BDF8] transition-all duration-300"
                      style={{ width: `${item.progressPercent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#0a0a0a] border border-[#1E1E22] rounded-[22px] p-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[#121214] border border-[#1E1E22] flex items-center justify-center mx-auto text-zinc-500">
                <Music2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-zinc-200 pt-1">
                {filter === 'today'
                  ? 'No songs played today yet'
                  : filter === 'by-date'
                  ? `No listening activity on ${formatDateLabel(selectedDate)}`
                  : 'No per-song listening stats yet'}
              </p>
              <p className="text-xs text-zinc-500 max-w-[240px] mx-auto leading-relaxed">
                Play any track in Raag Player and your listening time and play counts will appear here.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
