import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  HardDrive,
  Palette,
  Timer,
  EyeOff,
  Trash2,
  Sliders,
  Globe,
  Info,
  Check,
  RotateCcw,
  Download,
  Music2,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { UserSettings, LanguageCode, Track, ListeningStatsStore } from '../types';
import { TRANSLATIONS } from '../utils/translations';
import { RaagLogo } from './RaagLogo';
import { PlaytimeStatsScreen } from './PlaytimeStatsScreen';
import { AppearanceStudioScreen } from './AppearanceStudioScreen';
import { AnimatedBottomSheet, AnimatedSlidePanel } from './MotionPrimitives';
import { formatPlaytime } from '../utils/playtimeStats';
import { normalizeThemeMode } from '../utils/appearanceTheme';

interface SettingsScreenProps {
  isOpen?: boolean;
  settings: UserSettings;
  listeningStats: ListeningStatsStore;
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying?: boolean;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onBack: () => void;
  onRescanFolders: () => void;
  onClearStorage: () => void;
  hiddenTracks: Track[];
  onUnhideTrack: (id: string) => void;
  recentlyDeleted: { track: Track; deletedAt: number }[];
  onRestoreDeletedTrack: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  canInstall?: boolean;
  onInstallApp?: () => void;
  activeVersion: string;
  onCheckForUpdates: () => void;
  onSimulateUpdate?: () => void;
  isCheckingUpdates?: boolean;
  updateStatusMessage?: string | null;
  updateStatusType?: 'info' | 'success' | 'error';
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  isOpen = true,
  settings,
  listeningStats,
  tracks,
  currentTrack,
  isPlaying = false,
  onUpdateSettings,
  onBack,
  onRescanFolders,
  onClearStorage,
  hiddenTracks,
  onUnhideTrack,
  recentlyDeleted,
  onRestoreDeletedTrack,
  onPermanentDelete,
  canInstall,
  onInstallApp,
  activeVersion,
  onCheckForUpdates,
  onSimulateUpdate,
  isCheckingUpdates,
  updateStatusMessage,
  updateStatusType = 'info',
}) => {
  const t = TRANSLATIONS[settings.language];
  const [isPlaytimeStatsOpen, setIsPlaytimeStatsOpen] = useState(false);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<
    'sleepTimer' | 'hidden' | 'trash' | 'playback' | 'language' | 'about' | 'install' | null
  >(null);

  useEffect(() => {
    if (!isOpen) {
      setActiveModal(null);
      setIsPlaytimeStatsOpen(false);
      setIsAppearanceOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onHwBack = (e: Event) => {
      if (activeModal) {
        e.preventDefault();
        setActiveModal(null);
      } else if (isPlaytimeStatsOpen) {
        e.preventDefault();
        setIsPlaytimeStatsOpen(false);
      } else if (isAppearanceOpen) {
        e.preventDefault();
        setIsAppearanceOpen(false);
      }
    };
    window.addEventListener('raag:hardware-back', onHwBack);
    return () => window.removeEventListener('raag:hardware-back', onHwBack);
  }, [isOpen, activeModal, isPlaytimeStatsOpen, isAppearanceOpen]);

  const normalizedSurface = normalizeThemeMode(settings.theme);
  const themeLabels: Record<'amoled' | 'light' | 'system', string> = {
    amoled: 'AMOLED Black',
    light: 'Light',
    system: 'System',
  };
  const densityLabels: Record<string, string> = {
    compact: 'Compact',
    cozy: 'Cozy',
    grid: 'Grid',
  };
  const activeThemeSummary = `${themeLabels[normalizedSurface]} · ${
    densityLabels[settings.listDensity || 'cozy'] || 'Cozy'
  }`;

  const languagesList: { code: LanguageCode; name: string }[] = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिंदी (Hindi)' },
    { code: 'ta', name: 'தமிழ் (Tamil)' },
    { code: 'gu', name: 'ગુજરાતી (Gujarati)' },
    { code: 'mr', name: 'मराठी (Marathi)' },
    { code: 'pa', name: 'ਪੰਜਾਬੀ (Punjabi)' },
  ];

  return (
    <AnimatedSlidePanel isOpen={isOpen} direction="right" zIndexClass="z-40">
    <div
      className="min-h-screen w-full flex flex-col pb-[calc(env(safe-area-inset-bottom,0px)+4rem)] transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-20 backdrop-blur-md px-4 pt-[calc(env(safe-area-inset-top,0px)+14px)] pb-3 flex items-center gap-3 border-b"
        style={{ backgroundColor: 'var(--header-glass)', borderColor: 'var(--border-subtle)' }}
      >
        <button
          onClick={onBack}
          className="min-w-[44px] min-h-[44px] rounded-full border flex items-center justify-center active:scale-95 transition-all"
          style={{
            backgroundColor: 'var(--card-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2.5">
          <RaagLogo size={34} />
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {t.settings}
          </h1>
        </div>
      </header>

      {/* Settings Groups */}
      <main className="p-4 space-y-4 max-w-md md:max-w-2xl mx-auto w-full">
        {/* Group 1: Stats & Library */}
        <section
          className="border rounded-[22px] overflow-hidden divide-y"
          style={{
            backgroundColor: 'var(--card-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {/* Playtime */}
          <button
            onClick={() => setIsPlaytimeStatsOpen(true)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.99] transition-all text-left"
          >
            <div className="flex items-center gap-3.5">
              <Clock className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              <span className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>
                {t.playtime}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold font-mono" style={{ color: 'var(--accent-color)' }}>
                {formatPlaytime(Math.max(settings.playtimeSeconds, listeningStats.totalSeconds))}
              </span>
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </div>
          </button>

          {/* Add / Rescan Music Folder */}
          <button
            onClick={onRescanFolders}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-3.5">
              <HardDrive className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              <div>
                <span className="text-[15px] font-medium block" style={{ color: 'var(--text-primary)' }}>
                  Add / Rescan Music Folder
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Scan local device audio files
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </div>
          </button>
        </section>

        {/* Group 2: Appearance & Timer */}
        <section
          className="border rounded-[22px] overflow-hidden divide-y"
          style={{
            backgroundColor: 'var(--card-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {/* Appearance Studio (Theme + Layout + Accent + Wallpaper) */}
          <button
            onClick={() => setIsAppearanceOpen(true)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
          >
            <div className="flex items-center gap-3.5">
              <Palette className="w-5 h-5" style={{ color: 'var(--accent-color)' }} />
              <div>
                <span className="text-[15px] font-medium block" style={{ color: 'var(--text-primary)' }}>
                  Appearance Studio
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Layout, surface &amp; custom wallpaper
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: settings.accentColor || '#06B6D4' }}
              />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {activeThemeSummary}
              </span>
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </div>
          </button>

          {/* Sleep Timer */}
          <button
            onClick={() => setActiveModal('sleepTimer')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-3.5">
              <Timer className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              <span className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>
                {t.sleepTimer}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {settings.sleepTimerMinutes ? `${settings.sleepTimerMinutes} min` : 'Off'}
              </span>
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </div>
          </button>
        </section>

        {/* Group 3: Audio & App */}
        <section
          className="border rounded-[22px] overflow-hidden divide-y"
          style={{
            backgroundColor: 'var(--card-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {/* Hidden Files */}
          <button
            onClick={() => setActiveModal('hidden')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
          >
            <div className="flex items-center gap-3.5">
              <EyeOff className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              <span className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>
                {t.hiddenFiles}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {hiddenTracks.length} files
              </span>
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </div>
          </button>

          {/* Recently Deleted */}
          <button
            onClick={() => setActiveModal('trash')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-3.5">
              <Trash2 className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              <span className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>
                {t.recentlyDeleted}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {recentlyDeleted.length} files
              </span>
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </div>
          </button>

          {/* Playback Settings */}
          <button
            onClick={() => setActiveModal('playback')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-3.5">
              <Sliders className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              <span className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>
                {t.playbackSettings}
              </span>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </button>

          {/* Language */}
          <button
            onClick={() => setActiveModal('language')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-3.5">
              <Globe className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              <span className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>
                {t.language}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {languagesList.find((l) => l.code === settings.language)?.name.split(' ')[0]}
              </span>
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </div>
          </button>

          {/* Install Raag Player (PWA) - Only shown on Web browser, hidden inside native APK */}
          {!Capacitor.isNativePlatform() && (
            <button
              onClick={() => {
                if (canInstall && onInstallApp) {
                  onInstallApp();
                } else {
                  setActiveModal('install');
                }
              }}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex items-center gap-3.5">
                <Download className="w-5 h-5" style={{ color: 'var(--accent-color)' }} />
                <div>
                  <span className="text-[15px] font-medium block" style={{ color: 'var(--text-primary)' }}>
                    Install Raag Player (PWA)
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Add to home screen for 100% offline access
                  </span>
                </div>
              </div>
              <span
                className="text-xs px-2.5 py-1 rounded-full border font-medium"
                style={{
                  backgroundColor: 'var(--accent-soft)',
                  color: 'var(--accent-color)',
                  borderColor: 'var(--accent-border)',
                }}
              >
                Install
              </span>
            </button>
          )}

          {/* Check for Updates (OTA) */}
          <div style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="w-full flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3.5">
                <RefreshCw
                  className={`w-5 h-5 ${isCheckingUpdates ? 'animate-spin' : ''}`}
                  style={{ color: 'var(--accent-color)' }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>
                      Check for Updates
                    </span>
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full font-mono"
                      style={{
                        backgroundColor: 'var(--card-elevated)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      v{activeVersion}
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Live OTA Web Bundle Updater
                  </span>
                </div>
              </div>
              <button
                onClick={onCheckForUpdates}
                disabled={isCheckingUpdates}
                className="text-xs px-3 py-1.5 rounded-full border font-medium flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-60"
                style={{
                  backgroundColor: 'var(--accent-soft)',
                  color: 'var(--accent-color)',
                  borderColor: 'var(--accent-border)',
                }}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdates ? 'animate-spin' : ''}`} />
                <span>{isCheckingUpdates ? 'Checking...' : 'Check'}</span>
              </button>
            </div>

            {/* In-row Status Message Feedback */}
            {updateStatusMessage && (
              <div className="px-5 pb-3.5 pt-0">
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium max-w-full animate-in fade-in slide-in-from-top-1 duration-150 ${
                    updateStatusType === 'error'
                      ? 'bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444]'
                      : updateStatusType === 'success'
                      ? 'bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E]'
                      : 'bg-sky-500/15 border border-sky-500/30 text-sky-400'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      updateStatusType === 'error'
                        ? 'bg-[#EF4444]'
                        : updateStatusType === 'success'
                        ? 'bg-[#22C55E]'
                        : 'bg-sky-400 animate-pulse'
                    }`}
                  />
                  <span className="font-medium break-all">{updateStatusMessage}</span>
                </div>
              </div>
            )}
          </div>

          {/* About */}
          <button
            onClick={() => setActiveModal('about')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-3.5">
              <Info className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              <span className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>
                {t.about}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono" style={{ color: 'var(--accent-color)' }}>
                v{activeVersion}
              </span>
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </div>
          </button>
        </section>
      </main>

      {/* Modals */}

      {/* Sleep Timer Modal */}
      <AnimatedBottomSheet
        isOpen={activeModal === 'sleepTimer'}
        onClose={() => setActiveModal(null)}
        zIndexClass="z-50"
        backgroundColor="#121214"
        borderColor="#1E1E22"
      >
        <div className="px-6 pb-6 pt-2 space-y-4">
          <h3 className="text-lg font-bold text-white">{t.sleepTimer}</h3>
          <p className="text-xs text-zinc-400">
            Music will smoothly fade out over the final 20 seconds.
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {[null, 15, 30, 45, 60].map((mins) => (
              <button
                key={String(mins)}
                onClick={() => {
                  onUpdateSettings({
                    sleepTimerMinutes: mins,
                    sleepTimerTarget: mins ? Date.now() + mins * 60 * 1000 : null,
                  });
                  setActiveModal(null);
                }}
                className={`min-h-[48px] p-3.5 rounded-xl font-medium text-sm transition-all ${
                  settings.sleepTimerMinutes === mins
                    ? 'shadow-md'
                    : 'bg-[#161619] text-zinc-300 hover:bg-[#1E1E24]'
                }`}
                style={
                  settings.sleepTimerMinutes === mins
                    ? { backgroundColor: 'var(--accent-color)', color: 'var(--accent-contrast)' }
                    : undefined
                }
              >
                {mins === null ? 'Off' : `${mins} Minutes`}
              </button>
            ))}
          </div>
        </div>
      </AnimatedBottomSheet>

      {/* Language Modal */}
      <AnimatedBottomSheet
        isOpen={activeModal === 'language'}
        onClose={() => setActiveModal(null)}
        zIndexClass="z-50"
        backgroundColor="#121214"
        borderColor="#1E1E22"
      >
        <div className="px-6 pb-6 pt-2 space-y-3">
          <h3 className="text-lg font-bold text-white">{t.language}</h3>
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {languagesList.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  onUpdateSettings({ language: lang.code });
                  setActiveModal(null);
                }}
                className="w-full min-h-[48px] flex items-center justify-between p-3.5 rounded-xl bg-[#161619] hover:bg-[#1E1E24] text-left transition-colors"
              >
                <span className="text-sm font-medium text-zinc-200">
                  {lang.name}
                </span>
                {settings.language === lang.code && (
                  <Check className="w-5 h-5 text-[#38BDF8]" />
                )}
              </button>
            ))}
          </div>
        </div>
      </AnimatedBottomSheet>

      {/* Playback Settings Modal */}
      <AnimatedBottomSheet
        isOpen={activeModal === 'playback'}
        onClose={() => setActiveModal(null)}
        zIndexClass="z-50"
        backgroundColor="#121214"
        borderColor="#1E1E22"
      >
        <div className="px-6 pb-6 pt-2 space-y-5">
          <h3 className="text-lg font-bold text-white">{t.playbackSettings}</h3>

          {/* Speed */}
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {t.speed} ({settings.playbackSpeed}x)
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                <button
                  key={rate}
                  onClick={() => onUpdateSettings({ playbackSpeed: rate })}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    settings.playbackSpeed === rate ? 'shadow-md' : 'bg-[#18181C] text-zinc-300'
                  }`}
                  style={
                    settings.playbackSpeed === rate
                      ? { backgroundColor: 'var(--accent-color)', color: 'var(--accent-contrast)' }
                      : undefined
                  }
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {/* Slowed / Reverb Pitch Preservation Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-[#1E1E22] min-h-[48px]">
            <div>
              <span className="text-sm font-medium text-white block">Slowed + Reverb Tape Pitch</span>
              <span className="text-xs text-zinc-500">
                {settings.preservesPitch ? 'Normal pitch preservation active' : 'Tape speed pitch drop + 25% stereo reverb'}
              </span>
            </div>
            <input
              type="checkbox"
              checked={!settings.preservesPitch}
              onChange={(e) => onUpdateSettings({ preservesPitch: !e.target.checked })}
              className="w-5 h-5 cursor-pointer"
              style={{ accentColor: 'var(--accent-color)' }}
            />
          </div>

          {/* Gapless */}
          <div className="flex items-center justify-between pt-2 border-t border-[#1E1E22] min-h-[48px]">
            <div>
              <span className="text-sm font-medium text-white block">{t.gapless}</span>
              <span className="text-xs text-zinc-500">Eliminates pauses between tracks</span>
            </div>
            <input
              type="checkbox"
              checked={settings.gapless}
              onChange={(e) => onUpdateSettings({ gapless: e.target.checked })}
              className="w-5 h-5 cursor-pointer"
              style={{ accentColor: 'var(--accent-color)' }}
            />
          </div>

          {/* Crossfade */}
          <div className="space-y-2 pt-2 border-t border-[#1E1E22]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">{t.crossfade}</span>
              <span className="text-xs font-mono" style={{ color: 'var(--accent-color)' }}>
                {settings.crossfade}s
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="12"
              step="1"
              value={settings.crossfade}
              onChange={(e) => onUpdateSettings({ crossfade: Number(e.target.value) })}
              className="w-full"
              style={{ accentColor: 'var(--accent-color)' }}
            />
          </div>
        </div>
      </AnimatedBottomSheet>

      {/* Install PWA Modal */}
      <AnimatedBottomSheet
        isOpen={activeModal === 'install'}
        onClose={() => setActiveModal(null)}
        zIndexClass="z-50"
        backgroundColor="#121214"
        borderColor="#1E1E22"
      >
        <div className="px-6 pb-6 pt-2 space-y-4">
          <div className="flex items-center gap-3">
            <RaagLogo size={48} animated />
            <div>
              <h3 className="text-lg font-bold text-white">Install Raag Player</h3>
              <span className="text-xs text-zinc-400">Native Android PWA Experience</span>
            </div>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed">
            To install Raag Player on Android or Chrome:
          </p>

          <div className="bg-[#18181C] rounded-2xl p-4 text-xs text-zinc-300 space-y-2">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-600/20 text-[#38BDF8] font-bold flex items-center justify-center flex-shrink-0">1</span>
              <span>Tap your browser&apos;s <strong>menu (three vertical dots ⋮)</strong> at the top right.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-600/20 text-[#38BDF8] font-bold flex items-center justify-center flex-shrink-0">2</span>
              <span>Select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-600/20 text-[#38BDF8] font-bold flex items-center justify-center flex-shrink-0">3</span>
              <span>Enjoy full-screen, 100% offline local music with zero ads.</span>
            </div>
          </div>

          <button
            onClick={() => setActiveModal(null)}
            className="w-full min-h-[44px] py-3 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold transition-colors"
          >
            Got it
          </button>
        </div>
      </AnimatedBottomSheet>

      {/* Hidden Files Modal */}
      <AnimatedBottomSheet
        isOpen={activeModal === 'hidden'}
        onClose={() => setActiveModal(null)}
        zIndexClass="z-50"
        backgroundColor="#121214"
        borderColor="#1E1E22"
        maxHeightClass="max-h-[75dvh]"
      >
        <div className="px-6 pb-6 pt-2 flex flex-col">
          <h3 className="text-lg font-bold text-white mb-3">{t.hiddenFiles}</h3>
          <div className="space-y-2">
            {hiddenTracks.length > 0 ? (
              hiddenTracks.map((trk) => (
                <div
                  key={trk.id}
                  className="p-3 bg-[#161619] rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-white truncate">{trk.title}</div>
                    <div className="text-xs text-zinc-400 truncate">{trk.artist}</div>
                  </div>
                  <button
                    onClick={() => onUnhideTrack(trk.id)}
                    className="min-h-[44px] px-3.5 rounded-lg bg-blue-600/20 text-[#38BDF8] text-xs font-medium hover:bg-blue-600/30 transition-colors"
                  >
                    {t.restore}
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center text-zinc-500 py-8 text-sm">
                No hidden files
              </div>
            )}
          </div>
        </div>
      </AnimatedBottomSheet>

      {/* Recently Deleted Modal */}
      <AnimatedBottomSheet
        isOpen={activeModal === 'trash'}
        onClose={() => setActiveModal(null)}
        zIndexClass="z-50"
        backgroundColor="#121214"
        borderColor="#1E1E22"
        maxHeightClass="max-h-[75dvh]"
      >
        <div className="px-6 pb-6 pt-2 flex flex-col">
          <h3 className="text-lg font-bold text-white mb-3">{t.recentlyDeleted}</h3>
          <div className="space-y-2">
            {recentlyDeleted.length > 0 ? (
              recentlyDeleted.map((item) => (
                <div
                  key={item.track.id}
                  className="p-3 bg-[#161619] rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-white truncate">{item.track.title}</div>
                    <div className="text-xs text-zinc-400 truncate">{item.track.artist}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onRestoreDeletedTrack(item.track.id)}
                      className="min-w-[44px] min-h-[44px] rounded-lg bg-blue-600/20 text-[#38BDF8] hover:bg-blue-600/30 flex items-center justify-center"
                      title={t.restore}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onPermanentDelete(item.track.id)}
                      className="min-w-[44px] min-h-[44px] rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 flex items-center justify-center"
                      title={t.deletePermanently}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-zinc-500 py-8 text-sm">
                {t.emptyTrash}
              </div>
            )}
          </div>
        </div>
      </AnimatedBottomSheet>

      {/* About Modal */}
      <AnimatedBottomSheet
        isOpen={activeModal === 'about'}
        onClose={() => setActiveModal(null)}
        zIndexClass="z-50"
        backgroundColor="#121214"
        borderColor="#1E1E22"
      >
        <div className="px-6 pb-6 pt-2 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E1E22]">
            <div className="flex items-center gap-3">
              <RaagLogo size={44} />
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">About Raag Player</h3>
                <p className="text-xs text-zinc-400">Offline Music Experience</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-[#38BDF8] text-xs font-mono font-medium">
              v{activeVersion}
            </span>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">
            <strong>Raag Player</strong> is an offline, mobile-first player featuring the signature minimalist Tanpura emblem, sleek matte-black interface, 10-band Web Audio hardware EQ, and Over-The-Air (OTA) live bundle updates.
          </p>
          <div className="p-3 rounded-xl bg-[#161619] text-xs text-zinc-400 space-y-1 font-mono">
            <div>OTA Live Updates: Active (@capgo/capacitor-updater)</div>
            <div>Web Audio API: Active (10-Band Hardware EQ)</div>
            <div>MediaStore: Android Native Direct Scanner</div>
            <div>IndexedDB: Persistent Local Storage</div>
          </div>
          <button
            onClick={() => {
              if (confirm('Clear all offline cache and reset player?')) {
                onClearStorage();
                setActiveModal(null);
              }
            }}
            className="w-full min-h-[44px] py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 text-xs font-semibold transition-colors"
          >
            Clear Offline Storage Cache
          </button>
        </div>
      </AnimatedBottomSheet>

      {/* Nested Slide Panels for Playtime Stats & Appearance Studio */}
      <AnimatedSlidePanel
        isOpen={isOpen && isPlaytimeStatsOpen}
        direction="right"
        zIndexClass="z-[45]"
      >
        <PlaytimeStatsScreen
          stats={listeningStats}
          tracks={tracks}
          isPlaying={isPlaying}
          onBack={() => setIsPlaytimeStatsOpen(false)}
        />
      </AnimatedSlidePanel>

      <AnimatedSlidePanel
        isOpen={isOpen && isAppearanceOpen}
        direction="right"
        zIndexClass="z-[45]"
      >
        <AppearanceStudioScreen
          settings={settings}
          tracks={tracks}
          currentTrack={currentTrack}
          onUpdateSettings={onUpdateSettings}
          onBack={() => setIsAppearanceOpen(false)}
        />
      </AnimatedSlidePanel>
    </div>
    </AnimatedSlidePanel>
  );
};
