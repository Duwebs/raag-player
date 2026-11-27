import React, { useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  Moon,
  Sun,
  Smartphone,
  LayoutList,
  Rows3,
  LayoutGrid,
  Plus,
  Check,
  ImagePlus,
  Trash2,
  RotateCcw,
  Music,
  Play,
  SkipForward,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { ListDensity, Track, UserSettings } from '../types';
import {
  ACCENT_SWATCHES,
  DEFAULT_ACCENT_COLOR,
  compressWallpaperFile,
  computeAppearanceTokens,
  getContrastTextColor,
  normalizeThemeMode,
} from '../utils/appearanceTheme';
import { PeacockMascot } from './PeacockMascot';

interface AppearanceStudioScreenProps {
  settings: UserSettings;
  tracks: Track[];
  currentTrack: Track | null;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  onBack: () => void;
}

const PREVIEW_FALLBACK_TRACKS = [
  { id: 'p1', title: 'Midnight Raga', artist: 'Arijit Ensemble', duration: '4:18', badge: 'FLAC' },
  { id: 'p2', title: 'Saffron Horizon', artist: 'Anoushka Shankar', duration: '3:52', badge: 'MP3' },
  { id: 'p3', title: 'Monsoon Breeze', artist: 'Nucleya Collective', duration: '3:26', badge: 'AAC' },
  { id: 'p4', title: 'Peacock Dawn', artist: 'Pritam Studio', duration: '4:46', badge: 'MP3' },
];

export const AppearanceStudioScreen: React.FC<AppearanceStudioScreenProps> = ({
  settings,
  tracks,
  currentTrack,
  onUpdateSettings,
  onBack,
}) => {
  const wallpaperInputRef = useRef<HTMLInputElement>(null);
  const [wallpaperError, setWallpaperError] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  const activeSurface = normalizeThemeMode(settings.theme);
  const activeDensity: ListDensity = settings.listDensity || 'cozy';
  const activeAccent = settings.accentColor || DEFAULT_ACCENT_COLOR;
  const wallpaperBlur = settings.wallpaperBlur ?? 8;
  const wallpaperDim = settings.wallpaperDim ?? 60;

  const previewTokens = useMemo(
    () => computeAppearanceTokens(activeSurface, activeAccent),
    [activeSurface, activeAccent]
  );

  const activeSwatch = ACCENT_SWATCHES.find(
    (s) => s.hex.toLowerCase() === activeAccent.toLowerCase()
  );

  const previewTracks = useMemo(() => {
    if (tracks.length === 0) return PREVIEW_FALLBACK_TRACKS;
    return tracks.slice(0, 4).map((t, i) => {
      const m = Math.floor((t.duration || 215) / 60);
      const s = Math.floor((t.duration || 215) % 60);
      return {
        id: t.id || `tr-${i}`,
        title: t.title || 'Unknown Title',
        artist: t.artist || 'Unknown Artist',
        coverArt: t.coverArt,
        duration: `${m}:${s < 10 ? '0' : ''}${s}`,
        badge: (t.format || 'MP3').toUpperCase(),
      };
    });
  }, [tracks]);

  const miniNowPlaying = currentTrack || tracks[0] || null;

  const handleWallpaperPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setWallpaperError(null);
    setIsProcessingPhoto(true);
    try {
      const compressedDataUrl = await compressWallpaperFile(file);
      onUpdateSettings({ wallpaperImage: compressedDataUrl });
    } catch {
      setWallpaperError('Could not load selected image. Try a JPG or PNG photo.');
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleResetDefaults = () => {
    onUpdateSettings({
      theme: 'amoled',
      accentColor: DEFAULT_ACCENT_COLOR,
      listDensity: 'cozy',
      wallpaperImage: undefined,
      wallpaperBlur: 8,
      wallpaperDim: 60,
    });
    setWallpaperError(null);
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col pb-12 transition-colors duration-200"
      style={{
        backgroundColor: 'var(--bg-surface)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Hidden Gallery Photo Input */}
      <input
        ref={wallpaperInputRef}
        type="file"
        accept="image/*"
        onChange={handleWallpaperPick}
        className="hidden"
      />

      {/* Header */}
      <header
        className="sticky top-0 z-20 backdrop-blur-md px-4 pt-4 pb-3 flex items-center justify-between border-b"
        style={{
          backgroundColor: 'var(--header-glass)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full border flex items-center justify-center active:scale-95 transition-all"
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
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Appearance Studio</h1>
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: activeAccent }}
              />
            </div>
            <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              Raag Player visual engine
            </p>
          </div>
        </div>

        <button
          onClick={handleResetDefaults}
          className="px-3 py-1.5 rounded-full border text-xs font-medium flex items-center gap-1.5 active:scale-95 transition-all"
          style={{
            backgroundColor: 'var(--card-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </header>

      <main className="p-4 space-y-5 max-w-md mx-auto w-full">
        {/* 1. LIVE INTERACTIVE PREVIEW CARD */}
        <section
          className="relative rounded-[26px] border p-3.5 shadow-xl overflow-hidden"
          style={{
            backgroundColor: previewTokens.bgSurface,
            borderColor: previewTokens.borderSubtle,
            color: previewTokens.textPrimary,
          }}
        >
          {/* Live Custom Wallpaper Backdrop inside Preview */}
          {settings.wallpaperImage && (
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
              <img
                src={settings.wallpaperImage}
                alt=""
                className="w-full h-full object-cover scale-110"
                style={{ filter: `blur(${wallpaperBlur}px)` }}
              />
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: previewTokens.isLight
                    ? `rgba(248, 250, 252, ${wallpaperDim / 100})`
                    : `rgba(5, 5, 5, ${wallpaperDim / 100})`,
                }}
              />
            </div>
          )}

          {/* Foreground Interactive Mockup */}
          <div className="relative z-10 flex flex-col gap-3">
            {/* Miniature App Bar */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <PeacockMascot size={22} />
                <span className="text-sm font-bold tracking-tight">Raag Player</span>
              </div>
              <div className="flex items-center gap-2" style={{ color: previewTokens.textSecondary }}>
                <Search className="w-3.5 h-3.5" />
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Miniature Filter Pills */}
            <div className="flex items-center gap-1.5 px-1 overflow-hidden">
              <span
                className="px-3 py-1 rounded-full text-[11px] font-semibold shadow-sm"
                style={{
                  backgroundColor: previewTokens.accentColor,
                  color: previewTokens.accentContrast,
                }}
              >
                Songs
              </span>
              {['Playlists', 'Folders', 'Artists'].map((tab) => (
                <span
                  key={tab}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium border"
                  style={{
                    backgroundColor: previewTokens.cardSurface,
                    borderColor: previewTokens.borderSubtle,
                    color: previewTokens.textSecondary,
                  }}
                >
                  {tab}
                </span>
              ))}
            </div>

            {/* Live Morphed Song List / Grid Preview */}
            {activeDensity === 'grid' ? (
              <div className="grid grid-cols-2 gap-2 px-1">
                {previewTracks.slice(0, 4).map((item, idx) => (
                  <div
                    key={item.id}
                    className="rounded-xl p-1.5 border transition-all"
                    style={{
                      backgroundColor:
                        idx === 0 ? previewTokens.accentSoft : previewTokens.cardSurface,
                      borderColor:
                        idx === 0 ? previewTokens.accentBorder : previewTokens.borderSubtle,
                    }}
                  >
                    <div
                      className="w-full aspect-square rounded-lg mb-1.5 overflow-hidden flex items-center justify-center relative"
                      style={{ backgroundColor: previewTokens.cardElevated }}
                    >
                      {'coverArt' in item && item.coverArt ? (
                        <img
                          src={item.coverArt}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Music className="w-4 h-4" style={{ color: previewTokens.textMuted }} />
                      )}
                      <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/65 text-[8px] font-mono text-white">
                        {item.duration}
                      </span>
                    </div>
                    <p
                      className="text-[11px] font-semibold truncate"
                      style={{
                        color: idx === 0 ? previewTokens.accentColor : previewTokens.textPrimary,
                      }}
                    >
                      {item.title}
                    </p>
                    <p
                      className="text-[9px] truncate"
                      style={{ color: previewTokens.textSecondary }}
                    >
                      {item.artist}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1.5 px-1">
                {previewTracks.slice(0, activeDensity === 'compact' ? 4 : 3).map((item, idx) => {
                  const isCompact = activeDensity === 'compact';
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between rounded-xl border transition-all ${
                        isCompact ? 'px-2.5 py-1.5' : 'px-3 py-2'
                      }`}
                      style={{
                        backgroundColor:
                          idx === 0
                            ? previewTokens.accentSoft
                            : settings.wallpaperImage
                            ? previewTokens.cardSurface
                            : 'transparent',
                        borderColor:
                          idx === 0 ? previewTokens.accentBorder : previewTokens.borderSubtle,
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`${
                            isCompact ? 'w-7 h-7 rounded-md' : 'w-10 h-10 rounded-lg'
                          } overflow-hidden flex items-center justify-center shrink-0`}
                          style={{ backgroundColor: previewTokens.cardElevated }}
                        >
                          {'coverArt' in item && item.coverArt ? (
                            <img
                              src={item.coverArt}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Music
                              className={isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'}
                              style={{ color: previewTokens.textMuted }}
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`${
                              isCompact ? 'text-[11px]' : 'text-[12px]'
                            } font-semibold truncate`}
                            style={{
                              color:
                                idx === 0
                                  ? previewTokens.accentColor
                                  : previewTokens.textPrimary,
                            }}
                          >
                            {item.title}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <p
                              className="text-[10px] truncate"
                              style={{ color: previewTokens.textSecondary }}
                            >
                              {item.artist}
                            </p>
                            {!isCompact && (
                              <span
                                className="text-[8px] px-1 py-0.5 rounded font-mono border shrink-0"
                                style={{
                                  backgroundColor: previewTokens.cardElevated,
                                  borderColor: previewTokens.borderSubtle,
                                  color: previewTokens.textSecondary,
                                }}
                              >
                                {item.badge} · {item.duration}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Miniature Floating Mini-Player */}
            <div
              className="relative overflow-hidden rounded-2xl border p-2 flex items-center justify-between backdrop-blur-md"
              style={{
                backgroundColor: previewTokens.miniplayerGlass,
                borderColor: previewTokens.borderSubtle,
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-black/10 dark:bg-white/10">
                <div
                  className="h-full w-2/3"
                  style={{ backgroundColor: previewTokens.accentColor }}
                />
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
                  style={{ backgroundColor: previewTokens.cardElevated }}
                >
                  {miniNowPlaying?.coverArt ? (
                    <img
                      src={miniNowPlaying.coverArt}
                      alt={miniNowPlaying.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Music className="w-3.5 h-3.5" style={{ color: previewTokens.textMuted }} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold truncate">
                    {miniNowPlaying?.title || 'Bairan'}
                  </p>
                  <p className="text-[9px] truncate" style={{ color: previewTokens.textSecondary }}>
                    {miniNowPlaying?.artist || 'Banjaare'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: previewTokens.accentColor,
                    color: previewTokens.accentContrast,
                  }}
                >
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                </span>
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ color: previewTokens.textSecondary }}
                >
                  <SkipForward className="w-3.5 h-3.5 fill-current" />
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. SONG LAYOUT & ALBUM SIZE */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Song Layout & Album Size
            </span>
            <span className="text-[11px] font-mono" style={{ color: activeAccent }}>
              {activeDensity === 'compact'
                ? 'Compact · 40px'
                : activeDensity === 'cozy'
                ? 'Cozy · 54px'
                : 'Grid · 2-Col'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'compact', label: 'Compact', sub: 'Small 40px', Icon: LayoutList },
                { id: 'cozy', label: 'Cozy', sub: 'Medium 54px', Icon: Rows3 },
                { id: 'grid', label: 'Grid', sub: 'Big Cards', Icon: LayoutGrid },
              ] as const
            ).map(({ id, label, sub, Icon }) => {
              const selected = activeDensity === id;
              return (
                <button
                  key={id}
                  onClick={() => onUpdateSettings({ listDensity: id })}
                  className="p-3 rounded-2xl border flex flex-col items-center text-center gap-1.5 active:scale-[0.98] transition-all"
                  style={{
                    backgroundColor: selected ? 'var(--accent-soft)' : 'var(--card-surface)',
                    borderColor: selected ? activeAccent : 'var(--border-subtle)',
                  }}
                >
                  <Icon
                    className="w-5 h-5"
                    style={{ color: selected ? activeAccent : 'var(--text-secondary)' }}
                  />
                  <div>
                    <div
                      className="text-xs font-semibold"
                      style={{ color: selected ? activeAccent : 'var(--text-primary)' }}
                    >
                      {label}
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {sub}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 3. SURFACE MODE */}
        <section className="space-y-2.5">
          <div className="px-1">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Surface Mode
            </span>
          </div>

          <div
            className="p-1 rounded-2xl border grid grid-cols-3 gap-1"
            style={{
              backgroundColor: 'var(--card-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {(
              [
                { id: 'amoled', label: 'AMOLED Black', Icon: Moon },
                { id: 'light', label: 'Light', Icon: Sun },
                { id: 'system', label: 'System', Icon: Smartphone },
              ] as const
            ).map(({ id, label, Icon }) => {
              const selected = activeSurface === id;
              return (
                <button
                  key={id}
                  onClick={() => onUpdateSettings({ theme: id })}
                  className="py-2.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  style={
                    selected
                      ? {
                          backgroundColor: activeAccent,
                          color: previewTokens.accentContrast,
                          boxShadow: `0 4px 12px ${previewTokens.accentGlow}`,
                        }
                      : { color: 'var(--text-secondary)' }
                  }
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 4. SIGNATURE ACCENT SWATCHES + CUSTOM PICKER */}
        <section
          className="rounded-[22px] border p-4 space-y-3.5"
          style={{
            backgroundColor: 'var(--card-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Accent Swatch
            </span>
            <span className="text-xs font-medium" style={{ color: activeAccent }}>
              {activeSwatch ? activeSwatch.name : `Custom · ${activeAccent.toUpperCase()}`}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            {ACCENT_SWATCHES.map((swatch) => {
              const selected = activeAccent.toLowerCase() === swatch.hex.toLowerCase();
              return (
                <button
                  key={swatch.id}
                  onClick={() => onUpdateSettings({ accentColor: swatch.hex })}
                  title={swatch.name}
                  className="relative w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-95"
                  style={{
                    backgroundColor: swatch.hex,
                    boxShadow: selected
                      ? `0 0 0 3px var(--card-surface), 0 0 0 5px ${swatch.hex}`
                      : '0 2px 8px rgba(0,0,0,0.25)',
                  }}
                  aria-label={swatch.name}
                >
                  {selected && (
                    <Check
                      className="w-5 h-5 stroke-[2.5]"
                      style={{ color: getContrastTextColor(swatch.hex) }}
                    />
                  )}
                </button>
              );
            })}

            {/* Custom Hex Color Picker (+) */}
            <label
              title="Pick Custom Color"
              className="relative w-11 h-11 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer active:scale-95 transition-all overflow-hidden"
              style={{
                borderColor: !activeSwatch ? activeAccent : 'var(--border-subtle)',
                backgroundColor: !activeSwatch ? activeAccent : 'var(--card-elevated)',
                color: !activeSwatch ? previewTokens.accentContrast : 'var(--text-primary)',
              }}
            >
              <Plus className="w-5 h-5" />
              <input
                type="color"
                value={activeAccent}
                onChange={(e) => onUpdateSettings({ accentColor: e.target.value })}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                aria-label="Custom color picker"
              />
            </label>
          </div>
        </section>

        {/* 5. CUSTOM BACKGROUND WALLPAPER + BLUR & DIM SLIDERS */}
        <section
          className="rounded-[22px] border p-4 space-y-4"
          style={{
            backgroundColor: 'var(--card-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-sm font-semibold block">Custom Wallpaper</span>
              <span className="text-xs block" style={{ color: 'var(--text-secondary)' }}>
                {settings.wallpaperImage
                  ? 'Personal backdrop active across library'
                  : 'Choose a gallery photo behind your music'}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {settings.wallpaperImage && (
                <button
                  onClick={() => onUpdateSettings({ wallpaperImage: undefined })}
                  className="w-9 h-9 rounded-xl border flex items-center justify-center text-rose-500 hover:bg-rose-500/10 active:scale-95 transition-all"
                  style={{ borderColor: 'var(--border-subtle)' }}
                  aria-label="Remove wallpaper"
                  title="Remove wallpaper"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => wallpaperInputRef.current?.click()}
                disabled={isProcessingPhoto}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-60"
                style={{
                  backgroundColor: activeAccent,
                  color: previewTokens.accentContrast,
                }}
              >
                <ImagePlus className="w-4 h-4" />
                <span>{isProcessingPhoto ? 'Loading...' : settings.wallpaperImage ? 'Change' : 'Gallery'}</span>
              </button>
            </div>
          </div>

          {wallpaperError && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
              {wallpaperError}
            </p>
          )}

          {settings.wallpaperImage && (
            <div
              className="space-y-4 pt-3 border-t"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              {/* Background Blur Slider (0-24px) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Background Blur
                  </span>
                  <span className="font-mono font-semibold" style={{ color: activeAccent }}>
                    {wallpaperBlur}px
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={24}
                  step={1}
                  value={wallpaperBlur}
                  onChange={(e) => onUpdateSettings({ wallpaperBlur: Number(e.target.value) })}
                  className="w-full h-1.5 rounded-full cursor-pointer"
                  style={{ accentColor: activeAccent }}
                />
              </div>

              {/* Overlay Dim Slider (30%-85%) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Overlay Dim
                  </span>
                  <span className="font-mono font-semibold" style={{ color: activeAccent }}>
                    {wallpaperDim}%
                  </span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={85}
                  step={1}
                  value={wallpaperDim}
                  onChange={(e) => onUpdateSettings({ wallpaperDim: Number(e.target.value) })}
                  className="w-full h-1.5 rounded-full cursor-pointer"
                  style={{ accentColor: activeAccent }}
                />
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
