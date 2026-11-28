import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { RaagLogo } from './RaagLogo';

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
];

const PreviewThumb: React.FC<{
  src?: string;
  alt: string;
  logoSize?: number;
  className?: string;
}> = ({ src, alt, logoSize = 26, className = 'w-full h-full' }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        className={`${className} object-cover`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className={`${className} bg-[#050505] flex items-center justify-center`}>
      <RaagLogo size={logoSize} contained={false} />
    </div>
  );
};

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
    return tracks.slice(0, 3).map((t, i) => {
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
    } catch (err) {
      setWallpaperError(
        err instanceof Error ? err.message : 'Unable to load selected gallery photo'
      );
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
      className="h-[100dvh] w-full flex flex-col overflow-hidden transition-colors duration-200 select-none"
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

      {/* Single-Row Compact Header */}
      <header
        className="shrink-0 z-20 backdrop-blur-md px-4 pt-[calc(env(safe-area-inset-top,0px)+10px)] pb-2.5 flex items-center justify-between gap-2 border-b"
        style={{
          backgroundColor: 'var(--header-glass)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full border flex items-center justify-center active:scale-95 transition-all shrink-0"
            style={{
              backgroundColor: 'var(--card-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
            aria-label="Back to Settings"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-[17px] font-bold tracking-tight whitespace-nowrap truncate">
              Appearance Studio
            </h1>
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: activeAccent }}
            />
          </div>
        </div>

        <button
          onClick={handleResetDefaults}
          className="h-9 px-3 rounded-full border text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all whitespace-nowrap shrink-0"
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

      {/* Zero-Scroll 100dvh Stage */}
      <main className="flex-1 min-h-0 max-w-md md:max-w-2xl mx-auto w-full px-3.5 py-2.5 pb-[calc(env(safe-area-inset-bottom,0px)+10px)] flex flex-col justify-between gap-2 overflow-y-auto no-scrollbar scrollbar-none">
        {/* 1. COMPACT LIVE INTERACTIVE MINI-PREVIEW (~168px tall) */}
        <section
          className="relative rounded-[22px] border p-2.5 shadow-lg overflow-hidden shrink-0"
          style={{
            backgroundColor: previewTokens.bgSurface,
            borderColor: previewTokens.borderSubtle,
            color: previewTokens.textPrimary,
          }}
        >
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

          <div className="relative z-10 flex flex-col gap-2">
            {/* Miniature Bar + Pills */}
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-1.5">
                <RaagLogo size={20} />
                <span className="text-xs font-bold tracking-tight whitespace-nowrap">
                  Raag Player
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="px-2 py-0.5 rounded-full text-[9px] font-semibold"
                  style={{
                    backgroundColor: previewTokens.accentColor,
                    color: previewTokens.accentContrast,
                  }}
                >
                  Songs
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-[9px] font-medium border"
                  style={{
                    backgroundColor: previewTokens.cardSurface,
                    borderColor: previewTokens.borderSubtle,
                    color: previewTokens.textSecondary,
                  }}
                >
                  Playlists
                </span>
                <Search className="w-3 h-3 ml-0.5" style={{ color: previewTokens.textSecondary }} />
                <SlidersHorizontal className="w-3 h-3" style={{ color: previewTokens.textSecondary }} />
              </div>
            </div>

            {/* Live Morphed List / Grid */}
            {activeDensity === 'grid' ? (
              <div className="grid grid-cols-2 gap-2">
                {previewTracks.slice(0, 2).map((item, idx) => (
                  <div
                    key={item.id}
                    className="rounded-xl p-1.5 border flex items-center gap-2 transition-all min-w-0"
                    style={{
                      backgroundColor:
                        idx === 0 ? previewTokens.accentSoft : previewTokens.cardSurface,
                      borderColor:
                        idx === 0 ? previewTokens.accentBorder : previewTokens.borderSubtle,
                    }}
                  >
                    <div
                      className="w-11 h-11 rounded-lg overflow-hidden shrink-0"
                      style={{ backgroundColor: previewTokens.cardElevated }}
                    >
                      <PreviewThumb
                        src={'coverArt' in item ? item.coverArt : undefined}
                        alt={item.title}
                        logoSize={28}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
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
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {previewTracks.slice(0, 2).map((item, idx) => {
                  const isCompact = activeDensity === 'compact';
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between rounded-xl border transition-all ${
                        isCompact ? 'px-2 py-1' : 'px-2.5 py-1.5'
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
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div
                          className={`${
                            isCompact ? 'w-6 h-6 rounded-md' : 'w-8 h-8 rounded-lg'
                          } overflow-hidden shrink-0`}
                          style={{ backgroundColor: previewTokens.cardElevated }}
                        >
                          <PreviewThumb
                            src={'coverArt' in item ? item.coverArt : undefined}
                            alt={item.title}
                            logoSize={isCompact ? 18 : 22}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`${
                              isCompact ? 'text-[10px]' : 'text-[11px]'
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
                          <p
                            className="text-[9px] truncate"
                            style={{ color: previewTokens.textSecondary }}
                          >
                            {item.artist}
                          </p>
                        </div>
                      </div>
                      <span
                        className="text-[9px] font-mono shrink-0 ml-2"
                        style={{ color: previewTokens.textMuted }}
                      >
                        {item.duration}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Slim Floating Mini-Player Preview */}
            <div
              className="relative overflow-hidden rounded-xl border px-2 py-1.5 flex items-center justify-between backdrop-blur-md"
              style={{
                backgroundColor: previewTokens.miniplayerGlass,
                borderColor: previewTokens.borderSubtle,
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-black/10 dark:bg-white/10">
                <div className="h-full w-2/3" style={{ backgroundColor: previewTokens.accentColor }} />
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-6 h-6 rounded-md overflow-hidden shrink-0"
                  style={{ backgroundColor: previewTokens.cardElevated }}
                >
                  <PreviewThumb
                    src={miniNowPlaying?.coverArt}
                    alt={miniNowPlaying?.title || 'Track'}
                    logoSize={18}
                  />
                </div>
                <p className="text-[10px] font-semibold truncate">
                  {miniNowPlaying?.title || 'Bairan'}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: previewTokens.accentColor,
                    color: previewTokens.accentContrast,
                  }}
                >
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                </span>
                <SkipForward className="w-3 h-3 fill-current" style={{ color: previewTokens.textSecondary }} />
              </div>
            </div>
          </div>
        </section>

        {/* 2. COMPACT LAYOUT DENSITY PILLS */}
        <section className="space-y-1.5 shrink-0">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Layout Density
            </span>
            <span className="text-[11px] font-semibold" style={{ color: activeAccent }}>
              {activeDensity === 'compact'
                ? 'Small · 40px'
                : activeDensity === 'cozy'
                ? 'Medium · 54px'
                : 'Grid · Cards'}
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
                { id: 'compact', label: 'Small', Icon: LayoutList },
                { id: 'cozy', label: 'Medium', Icon: Rows3 },
                { id: 'grid', label: 'Grid', Icon: LayoutGrid },
              ] as const
            ).map(({ id, label, Icon }) => {
              const selected = activeDensity === id;
              return (
                <button
                  key={id}
                  onClick={() => onUpdateSettings({ listDensity: id })}
                  className="py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap"
                  style={
                    selected
                      ? {
                          backgroundColor: 'var(--accent-soft)',
                          color: activeAccent,
                          boxShadow: `inset 0 0 0 1px var(--accent-border)`,
                        }
                      : { color: 'var(--text-secondary)' }
                  }
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 3. SURFACE MODE SEGMENTED BAR (Dark · Light · System — zero cutoff) */}
        <section className="space-y-1.5 shrink-0">
          <div className="px-0.5">
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
                { id: 'amoled', label: 'Dark', Icon: Moon },
                { id: 'light', label: 'Light', Icon: Sun },
                { id: 'system', label: 'System', Icon: Smartphone },
              ] as const
            ).map(({ id, label, Icon }) => {
              const selected = activeSurface === id;
              return (
                <button
                  key={id}
                  onClick={() => onUpdateSettings({ theme: id })}
                  className="py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap"
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
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 4. BOTTOM CONTROL DOCK: ACCENT SWATCHES + GALLERY WALLPAPER */}
        <section
          className="rounded-[20px] border p-3 space-y-2.5 shrink-0"
          style={{
            backgroundColor: 'var(--card-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {/* Accent Color Swatches + Custom (+) Picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Accent Color
              </span>
              <span className="text-[11px] font-semibold" style={{ color: activeAccent }}>
                {activeSwatch ? activeSwatch.name : activeAccent.toUpperCase()}
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
                    className="relative w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-95 shrink-0"
                    style={{
                      backgroundColor: swatch.hex,
                      boxShadow: selected
                        ? `0 0 0 2.5px var(--card-surface), 0 0 0 4.5px ${swatch.hex}`
                        : '0 2px 6px rgba(0,0,0,0.22)',
                    }}
                    aria-label={swatch.name}
                  >
                    {selected && (
                      <Check
                        className="w-4 h-4 stroke-[2.5]"
                        style={{ color: getContrastTextColor(swatch.hex) }}
                      />
                    )}
                  </button>
                );
              })}

              <label
                title="Pick Custom Color"
                className="relative w-9 h-9 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer active:scale-95 transition-all overflow-hidden shrink-0"
                style={{
                  borderColor: !activeSwatch ? activeAccent : 'var(--border-subtle)',
                  backgroundColor: !activeSwatch ? activeAccent : 'var(--card-elevated)',
                  color: !activeSwatch ? previewTokens.accentContrast : 'var(--text-primary)',
                }}
              >
                <Plus className="w-4 h-4" />
                <input
                  type="color"
                  value={activeAccent}
                  onChange={(e) => onUpdateSettings({ accentColor: e.target.value })}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  aria-label="Custom color picker"
                />
              </label>
            </div>
          </div>

          {/* Wallpaper Picker + Compact Sliders when Active */}
          <div
            className="pt-2.5 border-t space-y-2"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-xs font-semibold block">Custom Wallpaper</span>
                <span className="text-[11px] truncate block" style={{ color: 'var(--text-muted)' }}>
                  {settings.wallpaperImage
                    ? 'Active across library backdrop'
                    : 'Gallery image behind tracks'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {settings.wallpaperImage && (
                  <button
                    onClick={() => onUpdateSettings({ wallpaperImage: undefined })}
                    className="w-8 h-8 rounded-xl border flex items-center justify-center text-rose-500 hover:bg-rose-500/10 active:scale-95 transition-all"
                    style={{ borderColor: 'var(--border-subtle)' }}
                    aria-label="Remove wallpaper"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => wallpaperInputRef.current?.click()}
                  disabled={isProcessingPhoto}
                  className="h-8 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-60 whitespace-nowrap"
                  style={{
                    backgroundColor: activeAccent,
                    color: previewTokens.accentContrast,
                  }}
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  <span>
                    {isProcessingPhoto ? 'Loading...' : settings.wallpaperImage ? 'Change' : 'Gallery'}
                  </span>
                </button>
              </div>
            </div>

            {wallpaperError && (
              <p className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-2.5 py-1.5">
                {wallpaperError}
              </p>
            )}

            {settings.wallpaperImage && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span style={{ color: 'var(--text-secondary)' }}>Blur</span>
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

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span style={{ color: 'var(--text-secondary)' }}>Dim</span>
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
          </div>
        </section>
      </main>
    </div>
  );
};
