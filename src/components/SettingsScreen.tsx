import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  HardDrive,
  Moon,
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
} from 'lucide-react';
import { UserSettings, LanguageCode, Track } from '../types';
import { TRANSLATIONS } from '../utils/translations';
import { PeacockMascot } from './PeacockMascot';

interface SettingsScreenProps {
  settings: UserSettings;
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
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
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
}) => {
  const t = TRANSLATIONS[settings.language];
  const [activeModal, setActiveModal] = useState<
    'theme' | 'sleepTimer' | 'hidden' | 'trash' | 'playback' | 'language' | 'about' | 'install' | null
  >(null);

  // Format playtime seconds into readable "Xh Ym Zs"
  const formatPlaytime = (seconds: number) => {
    if (!seconds) return '0s';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const themeLabels = {
    'pure-black': 'Pure Black (#000000)',
    'dark': 'Matte Dark (#050505)',
    'dynamic': 'Dynamic Art Tint',
  };

  const languagesList: { code: LanguageCode; name: string }[] = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिंदी (Hindi)' },
    { code: 'ta', name: 'தமிழ் (Tamil)' },
    { code: 'gu', name: 'ગુજરાતી (Gujarati)' },
    { code: 'mr', name: 'मराठी (Marathi)' },
    { code: 'pa', name: 'ਪੰਜਾਬੀ (Punjabi)' },
  ];

  return (
    <div className="min-h-screen w-full bg-[#050505] text-white flex flex-col pb-16">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#050505]/95 backdrop-blur-md px-4 pt-4 pb-3 flex items-center gap-3 border-b border-[#1A1A1E]">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-[#161619] border border-[#222228] flex items-center justify-center text-zinc-300 hover:text-white active:scale-95 transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <PeacockMascot size={32} />
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {t.settings}
          </h1>
        </div>
      </header>

      {/* Settings Groups */}
      <main className="p-4 space-y-4 max-w-md mx-auto w-full">
        {/* Group 1: Stats & Library */}
        <section className="bg-[#121214] border border-[#1E1E22] rounded-[22px] overflow-hidden divide-y divide-[#1A1A1E]">
          {/* Playtime */}
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3.5">
              <Clock className="w-5 h-5 text-zinc-400" />
              <span className="text-[15px] font-medium text-white">{t.playtime}</span>
            </div>
            <span className="text-sm font-semibold text-[#38BDF8] font-mono">
              {formatPlaytime(settings.playtimeSeconds)}
            </span>
          </div>

          {/* Add / Rescan Music Folder */}
          <button
            onClick={onRescanFolders}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 active:bg-white/10 transition-colors text-left"
          >
            <div className="flex items-center gap-3.5">
              <HardDrive className="w-5 h-5 text-zinc-400" />
              <div>
                <span className="text-[15px] font-medium text-white block">Add / Rescan Music Folder</span>
                <span className="text-xs text-zinc-500">Scan local device audio files</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </div>
          </button>
        </section>

        {/* Group 2: Appearance & Timer */}
        <section className="bg-[#121214] border border-[#1E1E22] rounded-[22px] overflow-hidden divide-y divide-[#1A1A1E]">
          {/* Theme */}
          <button
            onClick={() => setActiveModal('theme')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 active:bg-white/10 transition-colors text-left"
          >
            <div className="flex items-center gap-3.5">
              <Moon className="w-5 h-5 text-zinc-400" />
              <span className="text-[15px] font-medium text-white">{t.theme}</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span className="text-xs text-zinc-500">{themeLabels[settings.theme]}</span>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </div>
          </button>

          {/* Sleep Timer */}
          <button
            onClick={() => setActiveModal('sleepTimer')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 active:bg-white/10 transition-colors text-left"
          >
            <div className="flex items-center gap-3.5">
              <Timer className="w-5 h-5 text-zinc-400" />
              <span className="text-[15px] font-medium text-white">{t.sleepTimer}</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span className="text-xs text-zinc-500">
                {settings.sleepTimerMinutes ? `${settings.sleepTimerMinutes} min` : 'Off'}
              </span>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </div>
          </button>
        </section>

        {/* Group 3: Audio & App */}
        <section className="bg-[#121214] border border-[#1E1E22] rounded-[22px] overflow-hidden divide-y divide-[#1A1A1E]">
          {/* Hidden Files */}
          <button
            onClick={() => setActiveModal('hidden')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 active:bg-white/10 transition-colors text-left"
          >
            <div className="flex items-center gap-3.5">
              <EyeOff className="w-5 h-5 text-zinc-400" />
              <span className="text-[15px] font-medium text-white">{t.hiddenFiles}</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span className="text-xs text-zinc-500">{hiddenTracks.length} files</span>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </div>
          </button>

          {/* Recently Deleted */}
          <button
            onClick={() => setActiveModal('trash')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 active:bg-white/10 transition-colors text-left"
          >
            <div className="flex items-center gap-3.5">
              <Trash2 className="w-5 h-5 text-zinc-400" />
              <span className="text-[15px] font-medium text-white">{t.recentlyDeleted}</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span className="text-xs text-zinc-500">{recentlyDeleted.length} files</span>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </div>
          </button>

          {/* Playback Settings */}
          <button
            onClick={() => setActiveModal('playback')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 active:bg-white/10 transition-colors text-left"
          >
            <div className="flex items-center gap-3.5">
              <Sliders className="w-5 h-5 text-zinc-400" />
              <span className="text-[15px] font-medium text-white">{t.playbackSettings}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </button>

          {/* Language */}
          <button
            onClick={() => setActiveModal('language')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 active:bg-white/10 transition-colors text-left"
          >
            <div className="flex items-center gap-3.5">
              <Globe className="w-5 h-5 text-zinc-400" />
              <span className="text-[15px] font-medium text-white">{t.language}</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span className="text-xs text-zinc-500">
                {languagesList.find((l) => l.code === settings.language)?.name.split(' ')[0]}
              </span>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </div>
          </button>

          {/* Install Raag Player (PWA) */}
          <button
            onClick={() => {
              if (canInstall && onInstallApp) {
                onInstallApp();
              } else {
                setActiveModal('install');
              }
            }}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 active:bg-white/10 transition-colors text-left"
          >
            <div className="flex items-center gap-3.5">
              <Download className="w-5 h-5 text-[#38BDF8]" />
              <div>
                <span className="text-[15px] font-medium text-white block">Install Raag Player (PWA)</span>
                <span className="text-xs text-zinc-500">Add to home screen for 100% offline access</span>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-600/20 text-[#38BDF8] border border-blue-500/30 font-medium">
              Install
            </span>
          </button>

          {/* Check for Updates (OTA) */}
          <button
            onClick={onCheckForUpdates}
            disabled={isCheckingUpdates}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 active:bg-white/10 transition-colors text-left border-t border-white/5"
          >
            <div className="flex items-center gap-3.5">
              <RefreshCw className={`w-5 h-5 text-sky-400 ${isCheckingUpdates ? 'animate-spin' : ''}`} />
              <div>
                <span className="text-[15px] font-medium text-white block">Check for Updates</span>
                <span className="text-xs text-zinc-500">Live OTA Web Bundle Updater</span>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-sky-500/10 text-[#38BDF8] border border-sky-500/20 font-medium">
              {isCheckingUpdates ? 'Checking...' : 'Check'}
            </span>
          </button>

          {/* About */}
          <button
            onClick={() => setActiveModal('about')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 active:bg-white/10 transition-colors text-left"
          >
            <div className="flex items-center gap-3.5">
              <Info className="w-5 h-5 text-zinc-400" />
              <span className="text-[15px] font-medium text-white">{t.about}</span>
            </div>
            <span className="text-xs text-sky-400 font-mono">v{activeVersion} (Live)</span>
          </button>
        </section>
      </main>

      {/* Modals */}
      {/* Theme Modal */}
      {activeModal === 'theme' && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-md"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-md bg-[#121214] border-t border-[#1E1E22] rounded-t-[28px] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white">{t.theme}</h3>
            <div className="space-y-2">
              {(['pure-black', 'dark', 'dynamic'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    onUpdateSettings({ theme: mode });
                    setActiveModal(null);
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#161619] hover:bg-[#1E1E24] text-left transition-colors"
                >
                  <span className="text-sm font-medium text-zinc-200">
                    {themeLabels[mode]}
                  </span>
                  {settings.theme === mode && (
                    <Check className="w-5 h-5 text-[#38BDF8]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sleep Timer Modal */}
      {activeModal === 'sleepTimer' && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-md"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-md bg-[#121214] border-t border-[#1E1E22] rounded-t-[28px] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
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
                  className={`p-3.5 rounded-xl font-medium text-sm transition-all ${
                    settings.sleepTimerMinutes === mins
                      ? 'bg-[#2563EB] text-white shadow-md'
                      : 'bg-[#161619] text-zinc-300 hover:bg-[#1E1E24]'
                  }`}
                >
                  {mins === null ? 'Off' : `${mins} Minutes`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Language Modal */}
      {activeModal === 'language' && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-md"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-md bg-[#121214] border-t border-[#1E1E22] rounded-t-[28px] p-6 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white">{t.language}</h3>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {languagesList.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    onUpdateSettings({ language: lang.code });
                    setActiveModal(null);
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#161619] hover:bg-[#1E1E24] text-left transition-colors"
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
        </div>
      )}

      {/* Playback Settings Modal */}
      {activeModal === 'playback' && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-md"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-md bg-[#121214] border-t border-[#1E1E22] rounded-t-[28px] p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
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
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      settings.playbackSpeed === rate
                        ? 'bg-[#2563EB] text-white shadow-md'
                        : 'bg-[#18181C] text-zinc-300'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Slowed / Reverb Pitch Preservation Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-[#1E1E22]">
              <div>
                <span className="text-sm font-medium text-white block">Slowed + Reverb Tape Pitch</span>
                <span className="text-xs text-zinc-500">
                  {settings.preservesPitch ? 'Normal pitch preservation active' : 'Tape speed changes pitch (Chopped & Slowed)'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={!settings.preservesPitch}
                onChange={(e) => onUpdateSettings({ preservesPitch: !e.target.checked })}
                className="w-5 h-5 accent-[#2563EB] cursor-pointer"
              />
            </div>

            {/* Gapless */}
            <div className="flex items-center justify-between pt-2 border-t border-[#1E1E22]">
              <div>
                <span className="text-sm font-medium text-white block">{t.gapless}</span>
                <span className="text-xs text-zinc-500">Eliminates pauses between tracks</span>
              </div>
              <input
                type="checkbox"
                checked={settings.gapless}
                onChange={(e) => onUpdateSettings({ gapless: e.target.checked })}
                className="w-5 h-5 accent-[#2563EB] cursor-pointer"
              />
            </div>

            {/* Crossfade */}
            <div className="space-y-2 pt-2 border-t border-[#1E1E22]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">{t.crossfade}</span>
                <span className="text-xs font-mono text-[#38BDF8]">{settings.crossfade}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="1"
                value={settings.crossfade}
                onChange={(e) => onUpdateSettings({ crossfade: Number(e.target.value) })}
                className="w-full accent-[#2563EB]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Install PWA Modal */}
      {activeModal === 'install' && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-md"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-md bg-[#121214] border-t border-[#1E1E22] rounded-t-[28px] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <PeacockMascot size={48} />
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
              className="w-full py-3 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Hidden Files Modal */}
      {activeModal === 'hidden' && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-md"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-md max-h-[75vh] bg-[#121214] border-t border-[#1E1E22] rounded-t-[28px] p-6 shadow-2xl flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-3">{t.hiddenFiles}</h3>
            <div className="flex-1 overflow-y-auto space-y-2">
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
                      className="px-3 py-1.5 rounded-lg bg-blue-600/20 text-[#38BDF8] text-xs font-medium hover:bg-blue-600/30 transition-colors"
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
        </div>
      )}

      {/* Recently Deleted Modal */}
      {activeModal === 'trash' && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-md"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-md max-h-[75vh] bg-[#121214] border-t border-[#1E1E22] rounded-t-[28px] p-6 shadow-2xl flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-3">{t.recentlyDeleted}</h3>
            <div className="flex-1 overflow-y-auto space-y-2">
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
                        className="p-2 rounded-lg bg-blue-600/20 text-[#38BDF8] hover:bg-blue-600/30"
                        title={t.restore}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onPermanentDelete(item.track.id)}
                        className="p-2 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
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
        </div>
      )}

      {/* About Modal */}
      {activeModal === 'about' && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-md"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-md bg-[#121214] border-t border-[#1E1E22] rounded-t-[28px] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <PeacockMascot size={52} />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white">{t.about}</h3>
                <span className="text-xs text-[#38BDF8] font-mono">Raag Player v{activeVersion} (Live)</span>
              </div>
              <button
                onClick={onCheckForUpdates}
                disabled={isCheckingUpdates}
                className="px-3 py-1.5 rounded-full bg-blue-600/20 hover:bg-blue-600/30 text-sky-400 text-xs font-semibold border border-blue-500/30 flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdates ? 'animate-spin' : ''}`} />
                <span>{isCheckingUpdates ? 'Checking...' : 'Check Updates'}</span>
              </button>
            </div>
            {updateStatusMessage && (
              <div className="px-3.5 py-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                <span>{updateStatusMessage}</span>
              </div>
            )}
            {onSimulateUpdate && (
              <button
                onClick={() => {
                  setActiveModal(null);
                  onSimulateUpdate();
                }}
                className="w-full py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-sky-400 text-xs font-semibold border border-blue-500/25 flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>Test Update Popup (v1.0.1)</span>
              </button>
            )}
            <p className="text-xs text-zinc-300 leading-relaxed">
              <strong>Raag Player</strong> is an offline, mobile-first player with an authentic Peacock mascot, sleek matte-black interface, 5-band Web Audio hardware EQ, and Over-The-Air (OTA) live bundle updates.
            </p>
            <div className="p-3 rounded-xl bg-[#161619] text-xs text-zinc-400 space-y-1 font-mono">
              <div>OTA Live Updates: Active (@capgo/capacitor-updater)</div>
              <div>Web Audio API: Active (5-Band Hardware EQ)</div>
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
              className="w-full py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 text-xs font-semibold transition-colors"
            >
              Clear Offline Storage Cache
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
