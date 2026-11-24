import React, { useEffect, useRef } from 'react';
import { Lock, FolderOpen, Headphones, Sparkles } from 'lucide-react';
import { LanguageCode } from '../types';
import { TRANSLATIONS } from '../utils/translations';
import { PeacockMascot } from './PeacockMascot';
import { MosaicBackground } from './MosaicBackground';

interface AccessFlowScreenProps {
  language: LanguageCode;
  denialCount: number;
  onTriggerPicker: () => void;
  onUseDemo: () => void;
  onFilesSelected: (files: FileList | File[]) => void;
}

export const AccessFlowScreen: React.FC<AccessFlowScreenProps> = ({
  language,
  denialCount,
  onTriggerPicker,
  onUseDemo,
  onFilesSelected,
}) => {
  const t = TRANSLATIONS[language];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const hasAutoTriggered = useRef(false);

  // Directly trigger real browser file/folder picker
  const launchNativePicker = async () => {
    onTriggerPicker();

    // Check if modern File System Access API is supported
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
        const files: File[] = [];

        async function scanDirectory(handle: FileSystemDirectoryHandle) {
          // @ts-expect-error values() in FileSystemDirectoryHandle
          for await (const entry of handle.values()) {
            if (entry.kind === 'file') {
              const file = await entry.getFile();
              if (/\.(mp3|wav|flac|m4a|ogg|aac|opus)$/i.test(file.name)) {
                files.push(file);
              }
            } else if (entry.kind === 'directory') {
              await scanDirectory(entry);
            }
          }
        }

        await scanDirectory(dirHandle);

        if (files.length > 0) {
          onFilesSelected(files);
          return;
        } else {
          // Empty folder chosen
          handlePickerCancelled();
          return;
        }
      } catch (err: unknown) {
        // User closed or cancelled native picker
        console.log("Picker closed by user or cancelled:", err);
        handlePickerCancelled();
        return;
      }
    }

    // Fallback: Trigger standard multiple audio file or directory input
    if (folderInputRef.current) {
      folderInputRef.current.click();
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePickerCancelled = () => {
    // Increment denial count through callback
    // (handled in parent App.tsx)
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
    } else {
      handlePickerCancelled();
    }
  };

  // Auto-trigger on initial transition
  useEffect(() => {
    if (!hasAutoTriggered.current && denialCount === 0) {
      hasAutoTriggered.current = true;
      // Slight delay for smooth visual transition before OS picker opens
      const timer = setTimeout(() => {
        launchNativePicker();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-[#050505] text-white flex flex-col justify-between p-6 overflow-hidden">
      <MosaicBackground />

      {/* Hidden native input fallbacks for mobile browsers */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is standard for folders
        webkitdirectory="true"
        directory="true"
        multiple
        accept="audio/*"
        onChange={handleFileInputChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* ========================================================================= */}
      {/* CASE 1: Initial Transition (denialCount === 0)                            */}
      {/* ========================================================================= */}
      {denialCount === 0 && (
        <>
          <div className="relative z-10 flex flex-col items-center pt-10 text-center">
            <PeacockMascot size={88} className="mb-4" />
            <span className="text-xl font-bold tracking-tight text-white mb-2">
              {t.appTitle}
            </span>
            <h2 className="text-2xl font-bold text-zinc-100 max-w-xs leading-snug">
              {t.allowTitle}
            </h2>
            <p className="text-sm text-raag-gray max-w-xs mt-2 leading-relaxed">
              {t.allowSub}
            </p>
          </div>

          <div className="relative z-10 w-full max-w-sm mx-auto pb-6 space-y-3">
            <button
              onClick={launchNativePicker}
              className="w-full py-4 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white font-semibold text-[16px] shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2.5 transition-all"
            >
              <FolderOpen className="w-5 h-5" />
              <span>Select Music Folder / Audio Files</span>
            </button>

            <button
              onClick={onUseDemo}
              className="w-full py-3 rounded-full bg-[#161619] hover:bg-[#1E1E24] active:scale-[0.98] text-amber-400 font-medium text-sm border border-amber-500/20 flex items-center justify-center gap-2 transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{t.useDemoBtn}</span>
            </button>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* CASE 2: Denial State 1 (First Cancel/Deny: denialCount === 1)             */}
      {/* ========================================================================= */}
      {denialCount === 1 && (
        <div className="relative z-10 flex-1 flex flex-col justify-between max-w-sm mx-auto w-full py-8 animate-in fade-in duration-300">
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            {/* Golden Padlock Icon */}
            <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
              <Lock className="w-10 h-10 text-amber-400 stroke-[2.2]" />
            </div>

            <h2 className="text-2xl font-bold text-white tracking-tight leading-snug mb-3">
              Music and audio access required
            </h2>

            <p className="text-sm text-zinc-400 max-w-xs leading-relaxed">
              Music playback isn&apos;t possible without access. Please allow Raag Player to access your music files to listen offline.
            </p>
          </div>

          <div className="space-y-3 pt-6">
            <button
              onClick={launchNativePicker}
              className="w-full py-4 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white font-semibold text-[17px] shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
            >
              <span>Allow</span>
            </button>

            <button
              onClick={onUseDemo}
              className="w-full py-3 rounded-full text-zinc-400 hover:text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Or try with demo music</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CASE 2: Denial State 2 (Repeated Cancel/Deny: denialCount >= 2)           */}
      {/* ========================================================================= */}
      {denialCount >= 2 && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-[#16161A] border-t border-[#222228] rounded-t-[28px] p-6 shadow-2xl flex flex-col gap-5 animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="w-12 h-1.5 rounded-full bg-zinc-700 mx-auto" />

            <h2 className="text-xl font-bold text-white tracking-tight text-center">
              Music and audio access required
            </h2>

            {/* Custom Illustrated Banner Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-[#13132B] to-blue-950 border border-indigo-500/25 p-5 shadow-lg">
              {/* Background ambient accents */}
              <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-blue-500/20 blur-xl pointer-events-none" />
              <div className="absolute left-1/3 -top-6 w-20 h-20 rounded-full bg-indigo-500/20 blur-lg pointer-events-none" />

              <div className="flex items-center gap-4 relative z-10">
                {/* Visual Avatar with Headphones & Golden Lock */}
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center flex-shrink-0 shadow-md">
                  <Headphones className="w-8 h-8 text-white stroke-[2]" />
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#121214] border border-amber-500/40 flex items-center justify-center shadow-lg">
                    <Lock className="w-3.5 h-3.5 text-amber-400 stroke-[2.5]" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 block mb-1">
                    Offline Audio Storage
                  </span>
                  <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                    Raag Player runs completely offline. Your music stays private on your phone.
                  </p>
                </div>
              </div>
            </div>

            {/* Subtitle Message */}
            <p className="text-[13px] text-zinc-300 text-center leading-relaxed px-2">
              Music playback isn&apos;t possible without access. Please allow access to music and audio.
            </p>

            {/* Actions */}
            <div className="space-y-2.5 pt-1">
              <button
                onClick={launchNativePicker}
                className="w-full py-4 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white font-semibold text-[16px] shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all"
              >
                <span>Allow</span>
              </button>

              <button
                onClick={onUseDemo}
                className="w-full py-2.5 rounded-full text-zinc-400 hover:text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Load offline demo tracks</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
