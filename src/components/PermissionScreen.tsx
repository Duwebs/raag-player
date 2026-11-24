import React, { useRef } from 'react';
import { Music, FolderOpen, PlayCircle, Sparkles } from 'lucide-react';
import { LanguageCode } from '../types';
import { TRANSLATIONS } from '../utils/translations';
import { MascotIcon } from './MascotIcon';
import { MosaicBackground } from './MosaicBackground';

interface PermissionScreenProps {
  language: LanguageCode;
  onSelectFolder: (files: FileList | File[]) => void;
  onUseDemo: () => void;
  onSkip: () => void;
}

export const PermissionScreen: React.FC<PermissionScreenProps> = ({
  language,
  onSelectFolder,
  onUseDemo,
  onSkip,
}) => {
  const t = TRANSLATIONS[language];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleDirectoryPicker = async () => {
    // Check if modern File System Access API window.showDirectoryPicker is available
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
        const files: File[] = [];

        // Scan recursively for audio files
        async function scanDirectory(handle: FileSystemDirectoryHandle) {
          // @ts-expect-error values() is supported in modern FileSystemDirectoryHandle
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
          onSelectFolder(files);
          return;
        }
      } catch (err) {
        // User cancelled or browser rejected
        console.warn("Directory picker cancelled or unsupported, opening file fallback:", err);
      }
    }

    // Fallback: Trigger standard multi-file or directory input
    if (folderInputRef.current) {
      folderInputRef.current.click();
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onSelectFolder(e.target.files);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#050505] text-white flex flex-col justify-between p-6 overflow-hidden">
      <MosaicBackground />

      {/* Hidden inputs for standard directory & multiple audio selection */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is standard in WebKit/Blink
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

      {/* Brand Header */}
      <div className="relative z-10 flex flex-col items-center pt-8 pb-4 text-center">
        <MascotIcon size={76} className="mb-3" />
        <span className="text-xl font-bold tracking-tight text-white mb-2">
          {t.appTitle}
        </span>
        <h2 className="text-xl font-bold text-zinc-100 max-w-xs leading-snug">
          {t.allowTitle}
        </h2>
        <p className="text-sm text-raag-gray max-w-xs mt-1.5 leading-relaxed">
          {t.allowSub}
        </p>
      </div>

      {/* Android 13/14 Style Native Permission Modal Card */}
      <div className="relative z-10 w-full max-w-sm mx-auto mb-4">
        <div className="bg-[#121214] border border-[#1E1E22] rounded-[26px] p-6 shadow-2xl flex flex-col items-center text-center">
          {/* Permission Icon */}
          <div className="w-14 h-14 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[#38BDF8] mb-4">
            <Music className="w-7 h-7" />
          </div>

          <h3 className="text-[17px] font-semibold text-white mb-2 leading-snug">
            {t.allowPrompt}
          </h3>

          <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
            Raag Player reads audio files directly on your device. Your songs never leave your phone.
          </p>

          <div className="w-full flex flex-col gap-2.5">
            {/* Primary Action: Select Folder / Files */}
            <button
              onClick={handleDirectoryPicker}
              className="w-full py-3.5 px-4 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white font-semibold text-[15px] shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2"
            >
              <FolderOpen className="w-4 h-4" />
              <span>{t.allowBtn}</span>
            </button>

            {/* Quick Option: Demo Music */}
            <button
              onClick={onUseDemo}
              className="w-full py-3 px-4 rounded-full bg-[#1A1A1E] hover:bg-[#222227] active:scale-[0.98] text-amber-400 font-medium text-[14px] border border-amber-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{t.useDemoBtn}</span>
            </button>

            {/* Dismiss / Skip */}
            <button
              onClick={onSkip}
              className="w-full py-2.5 px-4 rounded-full text-zinc-400 hover:text-zinc-200 text-[14px] font-medium transition-colors"
            >
              {t.denyBtn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
