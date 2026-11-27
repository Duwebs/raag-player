import React, { useEffect, useState } from 'react';
import {
  Activity,
  BellRing,
  Check,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Gauge,
  ListPlus,
  Moon,
  Music,
  PenLine,
  Plus,
  Share2,
  Trash2,
} from 'lucide-react';
import { Playlist, Track, VisualizerStyle } from '../types';
import { ExtractedPalette } from '../utils/colorExtractor';
import { AnimatedBottomSheet } from './MotionPrimitives';

type SubView = 'menu' | 'edit' | 'playlist' | 'speed' | 'sleep' | 'confirmDelete';

interface TrackActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  playlists: Playlist[];
  palette: ExtractedPalette;
  playbackSpeed: number;
  preservesPitch: boolean;
  sleepTimerMinutes: number | null;
  sleepTimerTarget: number | null;
  visualizerEnabled: boolean;
  visualizerStyle: VisualizerStyle;
  onUpdateMetadata: (trackId: string, title: string, artist: string) => void;
  onAddTrackToPlaylist: (playlistId: string, trackId: string) => void;
  onCreatePlaylistWithTrack: (name: string, trackId: string) => void;
  onShareTrack: (track: Track) => void;
  onOpenVisualizer: () => void;
  onUpdateSpeed: (speed: number, preservesPitch?: boolean) => void;
  onMakeRingtone: (track: Track) => void;
  onSetSleepTimer: (minutes: number | null) => void;
  onHideTrack: (trackId: string) => void;
  onDeleteTrack: (trackId: string) => void;
}

const SPEED_PRESETS = [0.75, 0.85, 1.0, 1.15, 1.25, 1.5, 2.0];
const SLEEP_PRESETS: Array<{ label: string; minutes: number | null }> = [
  { label: 'Turn off timer', minutes: null },
  { label: '15 minutes', minutes: 15 },
  { label: '30 minutes', minutes: 30 },
  { label: '45 minutes', minutes: 45 },
  { label: '60 minutes', minutes: 60 },
  { label: '90 minutes', minutes: 90 },
];

const VISUALIZER_NAMES: Record<VisualizerStyle, string> = {
  harmony: 'Harmony',
  bounce: 'Bounce',
  pulse: 'Pulse',
  bars: 'Classic Bars',
};

export const TrackActionSheet: React.FC<TrackActionSheetProps> = ({
  isOpen,
  onClose,
  track,
  playlists,
  palette,
  playbackSpeed,
  preservesPitch,
  sleepTimerMinutes,
  sleepTimerTarget,
  visualizerEnabled,
  visualizerStyle,
  onUpdateMetadata,
  onAddTrackToPlaylist,
  onCreatePlaylistWithTrack,
  onShareTrack,
  onOpenVisualizer,
  onUpdateSpeed,
  onMakeRingtone,
  onSetSleepTimer,
  onHideTrack,
  onDeleteTrack,
}) => {
  const [subView, setSubView] = useState<SubView>('menu');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftArtist, setDraftArtist] = useState('');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [imgErr, setImgErr] = useState(false);

  useEffect(() => {
    if (isOpen && track) {
      setSubView('menu');
      setDraftTitle(track.title);
      setDraftArtist(track.artist);
      setNewPlaylistName('');
      setImgErr(false);
    }
  }, [isOpen, track?.id]);

  if (!track) return null;

  const isLight = palette.isLight;
  const dividerColor = isLight ? 'rgba(43,33,24,0.12)' : 'rgba(255,255,255,0.10)';
  const subtleBg = isLight ? 'rgba(43,33,24,0.08)' : 'rgba(255,255,255,0.08)';
  const hoverClass = isLight ? 'hover:bg-black/5 active:bg-black/10' : 'hover:bg-white/5 active:bg-white/10';
  const [domR = 0, domG = 0, domB = 0] = palette.dominantRgb
    .split(',')
    .map((n) => parseInt(n.trim(), 10) || 0);
  const isRedBackdrop = domR > 125 && domG < 85 && domB < 85;
  const dangerColor = isLight ? '#B91C1C' : isRedBackdrop ? '#FFE4E6' : '#F87171';

  const remainingSleepMin =
    sleepTimerTarget && sleepTimerTarget > Date.now()
      ? Math.max(1, Math.ceil((sleepTimerTarget - Date.now()) / 60000))
      : sleepTimerMinutes;

  const handleSaveMetadata = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = draftTitle.trim() || track.title;
    const cleanArtist = draftArtist.trim() || 'Unknown Artist';
    onUpdateMetadata(track.id, cleanTitle, cleanArtist);
    setSubView('menu');
  };

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPlaylistName.trim();
    if (!name) return;
    onCreatePlaylistWithTrack(name, track.id);
    setNewPlaylistName('');
    onClose();
  };

  return (
    <AnimatedBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      zIndexClass="z-[60]"
      backgroundColor={palette.sheetBackground}
      borderColor={dividerColor}
      maxHeightClass="max-h-[85dvh]"
    >
      <div className="px-4 pb-6 pt-1 space-y-2 select-none" style={{ color: palette.textColor }}>
        {/* Header with Track Info + Metadata Edit Trigger (or Back when in subView) */}
        {subView === 'menu' ? (
          <div className="px-1.5 pb-3 flex items-center gap-3 border-b" style={{ borderColor: dividerColor }}>
            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-black/25 flex items-center justify-center shadow">
              {track.coverArt && !imgErr ? (
                <img
                  src={track.coverArt}
                  alt={track.title}
                  className="w-full h-full object-cover"
                  onError={() => setImgErr(true)}
                />
              ) : (
                <Music className="w-5 h-5" style={{ color: palette.subTextColor }} />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-bold truncate leading-snug">{track.title}</h3>
              <p className="text-xs truncate mt-0.5" style={{ color: palette.subTextColor }}>
                {track.artist}
              </p>
            </div>

            <button
              onClick={() => {
                setDraftTitle(track.title);
                setDraftArtist(track.artist);
                setSubView('edit');
              }}
              className={`min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-colors ${hoverClass}`}
              style={{ color: palette.subTextColor }}
              aria-label="Edit song info"
            >
              <PenLine className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="px-1 pb-2.5 flex items-center gap-2 border-b" style={{ borderColor: dividerColor }}>
            <button
              onClick={() => setSubView('menu')}
              className={`min-w-[44px] min-h-[44px] -ml-1 rounded-full flex items-center justify-center transition-colors ${hoverClass}`}
              aria-label="Back to actions"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold tracking-tight">
              {subView === 'edit' && 'Edit Track Info'}
              {subView === 'playlist' && 'Add to Playlist'}
              {subView === 'speed' && 'Playback Speed'}
              {subView === 'sleep' && 'Sleep Timer'}
              {subView === 'confirmDelete' && 'Delete Track'}
            </h3>
          </div>
        )}

        {/* Main 8-Row Menu */}
        {subView === 'menu' && (
          <div className="pt-1 space-y-0.5">
            <ActionRow
              icon={<ListPlus className="w-5 h-5" />}
              label="Add to playlist"
              trailing={<ChevronRight className="w-4 h-4 opacity-50" />}
              hoverClass={hoverClass}
              onClick={() => setSubView('playlist')}
            />

            <ActionRow
              icon={<Share2 className="w-5 h-5" />}
              label="Share"
              hoverClass={hoverClass}
              onClick={() => {
                onShareTrack(track);
                onClose();
              }}
            />

            <ActionRow
              icon={<Activity className="w-5 h-5" />}
              label="Music visualizer"
              trailing={
                <span className="text-xs font-medium opacity-75">
                  {visualizerEnabled ? `ON · ${VISUALIZER_NAMES[visualizerStyle]}` : 'OFF'}
                </span>
              }
              hoverClass={hoverClass}
              onClick={() => {
                onClose();
                window.setTimeout(() => onOpenVisualizer(), 140);
              }}
            />

            <ActionRow
              icon={<Gauge className="w-5 h-5" />}
              label="Speed"
              trailing={
                <span className="text-xs font-medium opacity-75">
                  {playbackSpeed.toFixed(2).replace(/\.00$/, '.0')}x
                  {!preservesPitch ? ' · Slowed+Reverb' : ''}
                </span>
              }
              hoverClass={hoverClass}
              onClick={() => setSubView('speed')}
            />

            <ActionRow
              icon={<BellRing className="w-5 h-5" />}
              label="Make as a ringtone"
              hoverClass={hoverClass}
              onClick={() => {
                onMakeRingtone(track);
                onClose();
              }}
            />

            <ActionRow
              icon={<Moon className="w-5 h-5" />}
              label="Sleep timer"
              trailing={
                <span className="text-xs font-medium opacity-75">
                  {remainingSleepMin ? `${remainingSleepMin}m left` : 'Off'}
                </span>
              }
              hoverClass={hoverClass}
              onClick={() => setSubView('sleep')}
            />

            <ActionRow
              icon={<EyeOff className="w-5 h-5" />}
              label="Hide"
              hoverClass={hoverClass}
              onClick={() => {
                onHideTrack(track.id);
                onClose();
              }}
            />

            <ActionRow
              icon={<Trash2 className="w-5 h-5" />}
              label="Delete"
              colorOverride={dangerColor}
              hoverClass={hoverClass}
              onClick={() => setSubView('confirmDelete')}
            />
          </div>
        )}

        {/* SubView: Edit Metadata */}
        {subView === 'edit' && (
          <form onSubmit={handleSaveMetadata} className="pt-2 px-1 space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: palette.subTextColor }}>
                Song Title
              </label>
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border text-sm font-medium focus:outline-none"
                style={{
                  backgroundColor: subtleBg,
                  borderColor: dividerColor,
                  color: palette.textColor,
                }}
                placeholder="Song title"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: palette.subTextColor }}>
                Artist
              </label>
              <input
                type="text"
                value={draftArtist}
                onChange={(e) => setDraftArtist(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border text-sm font-medium focus:outline-none"
                style={{
                  backgroundColor: subtleBg,
                  borderColor: dividerColor,
                  color: palette.textColor,
                }}
                placeholder="Artist name"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setSubView('menu')}
                className="flex-1 min-h-[44px] rounded-xl font-semibold text-sm border transition-colors"
                style={{ borderColor: dividerColor, backgroundColor: subtleBg }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 min-h-[44px] rounded-xl font-semibold text-sm transition-transform active:scale-95"
                style={{
                  backgroundColor: isLight ? '#2B2118' : '#FFFFFF',
                  color: isLight ? '#FFFDF8' : '#18181B',
                }}
              >
                Save Changes
              </button>
            </div>
          </form>
        )}

        {/* SubView: Add to Playlist */}
        {subView === 'playlist' && (
          <div className="pt-2 px-1 space-y-3">
            <form onSubmit={handleCreatePlaylist} className="flex items-center gap-2">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="New playlist name..."
                className="flex-1 min-h-[44px] px-3.5 rounded-xl border text-sm focus:outline-none"
                style={{
                  backgroundColor: subtleBg,
                  borderColor: dividerColor,
                  color: palette.textColor,
                }}
              />
              <button
                type="submit"
                disabled={!newPlaylistName.trim()}
                className="min-h-[44px] px-4 rounded-xl font-semibold text-sm flex items-center gap-1.5 disabled:opacity-40 transition-transform active:scale-95"
                style={{
                  backgroundColor: isLight ? '#2B2118' : '#FFFFFF',
                  color: isLight ? '#FFFDF8' : '#18181B',
                }}
              >
                <Plus className="w-4 h-4" />
                Create
              </button>
            </form>

            {playlists.length === 0 ? (
              <p className="text-xs py-5 text-center" style={{ color: palette.subTextColor }}>
                No playlists yet. Create your first playlist above.
              </p>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                {playlists.map((pl) => {
                  const alreadyIn = pl.trackIds.includes(track.id);
                  return (
                    <button
                      key={pl.id}
                      onClick={() => {
                        onAddTrackToPlaylist(pl.id, track.id);
                        onClose();
                      }}
                      className={`w-full min-h-[48px] px-3.5 rounded-xl flex items-center justify-between text-left transition-colors ${hoverClass}`}
                      style={{ backgroundColor: alreadyIn ? subtleBg : 'transparent' }}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{pl.name}</div>
                        <div className="text-xs" style={{ color: palette.subTextColor }}>
                          {pl.trackIds.length} {pl.trackIds.length === 1 ? 'song' : 'songs'}
                        </div>
                      </div>
                      {alreadyIn ? (
                        <Check className="w-4 h-4 shrink-0" />
                      ) : (
                        <Plus className="w-4 h-4 opacity-60 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SubView: Playback Speed & Pitch */}
        {subView === 'speed' && (
          <div className="pt-2 px-1 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: palette.subTextColor }}>
                Current Speed
              </span>
              <span className="text-xl font-bold tabular-nums">
                {playbackSpeed.toFixed(2).replace(/\.00$/, '.0')}x
              </span>
            </div>

            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.05"
              value={playbackSpeed}
              onChange={(e) => onUpdateSpeed(parseFloat(e.target.value), preservesPitch)}
              className="w-full h-2 rounded-full accent-current cursor-pointer"
              aria-label="Playback speed slider"
            />

            <div className="flex flex-wrap gap-2">
              {SPEED_PRESETS.map((val) => {
                const active = Math.abs(playbackSpeed - val) < 0.01;
                return (
                  <button
                    key={val}
                    onClick={() => onUpdateSpeed(val, preservesPitch)}
                    className="min-h-[40px] px-3.5 rounded-full text-xs font-bold border transition-transform active:scale-95"
                    style={{
                      backgroundColor: active ? (isLight ? '#2B2118' : '#FFFFFF') : subtleBg,
                      color: active ? (isLight ? '#FFFDF8' : '#18181B') : palette.textColor,
                      borderColor: active ? 'transparent' : dividerColor,
                    }}
                  >
                    {val}x
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                const enableSlowed = preservesPitch;
                onUpdateSpeed(enableSlowed ? 0.85 : 1.0, !enableSlowed);
              }}
              className="w-full min-h-[50px] px-4 rounded-2xl border flex items-center justify-between transition-colors"
              style={{
                backgroundColor: !preservesPitch ? (isLight ? '#2B2118' : '#FFFFFF') : subtleBg,
                color: !preservesPitch ? (isLight ? '#FFFDF8' : '#18181B') : palette.textColor,
                borderColor: dividerColor,
              }}
            >
              <div className="text-left">
                <div className="text-sm font-bold">Slowed + Reverb Mode</div>
                <div className="text-[11px] opacity-75">
                  Deep pitch shift at 0.85x with hall decay
                </div>
              </div>
              <span className="text-xs font-bold uppercase tracking-wide">
                {!preservesPitch ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        )}

        {/* SubView: Sleep Timer */}
        {subView === 'sleep' && (
          <div className="pt-1 space-y-1">
            {SLEEP_PRESETS.map((opt) => {
              const isSelected =
                opt.minutes === null ? !sleepTimerTarget : sleepTimerMinutes === opt.minutes;
              return (
                <button
                  key={opt.label}
                  onClick={() => {
                    onSetSleepTimer(opt.minutes);
                    onClose();
                  }}
                  className={`w-full min-h-[48px] px-3.5 rounded-xl flex items-center justify-between text-sm font-medium transition-colors ${hoverClass}`}
                  style={{ backgroundColor: isSelected ? subtleBg : 'transparent' }}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="w-4 h-4" />}
                </button>
              );
            })}
          </div>
        )}

        {/* SubView: Confirm Delete */}
        {subView === 'confirmDelete' && (
          <div className="pt-2 px-1 space-y-4">
            <p className="text-sm leading-relaxed" style={{ color: palette.subTextColor }}>
              Move <span className="font-semibold" style={{ color: palette.textColor }}>"{track.title}"</span> to Recently Deleted? You can restore it later from Settings.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSubView('menu')}
                className="flex-1 min-h-[44px] rounded-xl font-semibold text-sm border"
                style={{ borderColor: dividerColor, backgroundColor: subtleBg }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteTrack(track.id);
                  onClose();
                }}
                className="flex-1 min-h-[44px] rounded-xl font-semibold text-sm bg-red-600 text-white active:scale-95 transition-transform"
              >
                Move to Trash
              </button>
            </div>
          </div>
        )}
      </div>
    </AnimatedBottomSheet>
  );
};

interface ActionRowProps {
  icon: React.ReactNode;
  label: string;
  trailing?: React.ReactNode;
  colorOverride?: string;
  hoverClass: string;
  onClick: () => void;
}

const ActionRow: React.FC<ActionRowProps> = ({
  icon,
  label,
  trailing,
  colorOverride,
  hoverClass,
  onClick,
}) => (
  <button
    onClick={onClick}
    className={`w-full min-h-[48px] px-2.5 rounded-xl flex items-center gap-3.5 text-left transition-colors ${hoverClass}`}
    style={colorOverride ? { color: colorOverride } : undefined}
  >
    <span className="w-6 flex items-center justify-center shrink-0 opacity-90">{icon}</span>
    <span className="flex-1 text-[15px] font-medium truncate">{label}</span>
    {trailing && <span className="shrink-0">{trailing}</span>}
  </button>
);
