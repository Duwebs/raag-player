import React, { useMemo, useState, useEffect } from 'react';
import {
  ChevronLeft,
  Clock,
  Calendar,
  Award,
  Play,
  Disc3,
} from 'lucide-react';
import { ListeningStatsStore, Track } from '../types';
import { RaagLogo } from './RaagLogo';
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
    <div className="w-11 h-11 rounded-xl bg-[#050505] border border-[#222228] flex items-center justify-center shrink-0 overflow-hidden">
      <RaagLogo size={36} contained={false} />
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
    <div
      className="min-h-screen w-full flex flex-col pb-12 transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
    >
      {/* Top Bar */}
      <header
        className="sticky top-0 z-20 backdrop-blur-md px-4 pt-[calc(env(safe-area-inset-top,0px)+14px)] pb-3 flex items-center justify-between border-b"
        style={{ backgroundColor: 'var(--header-glass)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="min-w-[44px] min-h-[44px] rounded-full border flex items-center justify-center active:scale-95 transition-all"
            style={{
              backgroundColor: 'var(--card-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
            aria-label="Back to Settings"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-tight">
              Playtime Stats
            </h1>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Your listening breakdown
            </p>
          </div>
        </div>

        {isPlaying && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium"
            style={{
              backgroundColor: 'var(--accent-soft)',
              borderColor: 'var(--accent-border)',
              color: 'var(--accent-color)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--accent-color)' }}
            />
            <span>Live</span>
          </div>
        )}
      </header>

      <main className="p-4 space-y-4 max-w-md mx-auto w-full">
        {/* Filter Tabs */}
        <div
          className="border p-1 rounded-2xl grid grid-cols-3 gap-1"
          style={{ backgroundColor: 'var(--card-surface)', borderColor: 'var(--border-subtle)' }}
        >
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
                className="py-2 px-3 rounded-xl text-xs font-semibold transition-all"
                style={
                  active
                    ? {
                        backgroundColor: 'var(--accent-color)',
                        color: 'var(--accent-contrast)',
                        boxShadow: '0 4px 12px var(--accent-glow)',
                      }
                    : { color: 'var(--text-secondary)' }
                }
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* By Date Picker & Quick Dates Strip */}
        {filter === 'by-date' && (
          <div
            className="border rounded-[20px] p-3.5 space-y-3"
            style={{ backgroundColor: 'var(--card-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                <Calendar className="w-4 h-4" style={{ color: 'var(--accent-color)' }} />
                <span>Select Date</span>
              </div>
              <input
                type="date"
                max={todayKey}
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
                className="border text-xs font-mono rounded-xl px-3 py-1.5 focus:outline-none"
                style={{
                  backgroundColor: 'var(--card-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
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
                      className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5"
                      style={
                        isSelected
                          ? {
                              backgroundColor: 'var(--accent-soft)',
                              borderColor: 'var(--accent-border)',
                              color: 'var(--accent-color)',
                            }
                          : {
                              backgroundColor: 'var(--card-elevated)',
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--text-secondary)',
                            }
                      }
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
        <section
          className="border rounded-[22px] p-5 space-y-4"
          style={{ backgroundColor: 'var(--card-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <span
                className="text-[11px] font-semibold uppercase tracking-wider block"
                style={{ color: 'var(--text-muted)' }}
              >
                {filterTitle} Playtime
              </span>
              <div className="text-3xl font-bold tracking-tight font-mono mt-1">
                {formatPlaytime(summary.totalSeconds)}
              </div>
            </div>
            <div
              className="w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0"
              style={{
                backgroundColor: 'var(--card-elevated)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--accent-color)',
              }}
            >
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium"
              style={{
                backgroundColor: 'var(--card-elevated)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              <Play
                className="w-3 h-3"
                style={{ color: 'var(--accent-color)', fill: 'var(--accent-color)' }}
              />
              {summary.totalPlays} {summary.totalPlays === 1 ? 'play' : 'plays'}
            </span>
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium"
              style={{
                backgroundColor: 'var(--card-elevated)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              <Disc3 className="w-3 h-3" style={{ color: 'var(--text-secondary)' }} />
              {summary.songCount} {summary.songCount === 1 ? 'song' : 'songs'}
            </span>
            {summary.topSong && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium max-w-full"
                style={{
                  backgroundColor: 'var(--accent-soft)',
                  borderColor: 'var(--accent-border)',
                  color: 'var(--accent-color)',
                }}
              >
                <Award className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Top: {summary.topSong.title}</span>
              </span>
            )}
          </div>

          {summary.migratedLegacySeconds > 0 && (
            <p
              className="text-[11px] pt-1 border-t"
              style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)' }}
            >
              Includes {formatPlaytime(summary.migratedLegacySeconds)} recorded prior to per-song tracking.
            </p>
          )}
        </section>

        {/* Ranked Songs Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Ranked Songs
            </h2>

            {/* Sort Toggle */}
            <div
              className="border p-0.5 rounded-xl inline-flex items-center gap-0.5"
              style={{ backgroundColor: 'var(--card-surface)', borderColor: 'var(--border-subtle)' }}
            >
              <button
                onClick={() => setSortBy('time')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                style={
                  sortBy === 'time'
                    ? { backgroundColor: 'var(--card-elevated)', color: 'var(--accent-color)' }
                    : { color: 'var(--text-muted)' }
                }
              >
                Most Time
              </button>
              <button
                onClick={() => setSortBy('plays')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                style={
                  sortBy === 'plays'
                    ? { backgroundColor: 'var(--card-elevated)', color: 'var(--accent-color)' }
                    : { color: 'var(--text-muted)' }
                }
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
                  className="border rounded-[18px] p-3.5 space-y-2.5"
                  style={{
                    backgroundColor: 'var(--card-surface)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank Badge */}
                    <span
                      className="w-7 text-xs font-mono font-bold shrink-0 text-center"
                      style={{
                        color:
                          item.rank === 1
                            ? 'var(--accent-color)'
                            : item.rank <= 3
                            ? 'var(--text-primary)'
                            : 'var(--text-muted)',
                      }}
                    >
                      #{item.rank}
                    </span>

                    {/* Song Art / Fallback */}
                    <SongThumbnail coverArt={item.coverArt} title={item.title} />

                    {/* Song Title & Artist */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate leading-snug">
                        {item.title}
                      </p>
                      <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {item.artist}
                      </p>
                    </div>

                    {/* Play Count Pill & Exact Duration */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className="text-xs font-mono font-semibold"
                        style={{ color: 'var(--accent-color)' }}
                      >
                        {formatPlaytime(item.durationSeconds)}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full border text-[10px] font-medium"
                        style={{
                          backgroundColor: 'var(--card-elevated)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {item.playCount} {item.playCount === 1 ? 'play' : 'plays'}
                      </span>
                    </div>
                  </div>

                  {/* Relative Progress Bar */}
                  <div
                    className="w-full h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--card-elevated)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${item.progressPercent}%`,
                        backgroundColor: 'var(--accent-color)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="border rounded-[22px] p-8 text-center space-y-2"
              style={{
                backgroundColor: 'var(--card-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div
                className="w-12 h-12 rounded-2xl border flex items-center justify-center mx-auto"
                style={{
                  backgroundColor: 'var(--card-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                }}
              >
                <Music2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold pt-1">
                {filter === 'today'
                  ? 'No songs played today yet'
                  : filter === 'by-date'
                  ? `No listening activity on ${formatDateLabel(selectedDate)}`
                  : 'No per-song listening stats yet'}
              </p>
              <p
                className="text-xs max-w-[240px] mx-auto leading-relaxed"
                style={{ color: 'var(--text-muted)' }}
              >
                Play any track in Raag Player and your listening time and play counts will appear here.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
