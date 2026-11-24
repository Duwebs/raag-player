import React, { useState } from 'react';
import { Sparkles, ArrowRight, X, DownloadCloud, CheckCircle2 } from 'lucide-react';
import { PeacockMascot } from './PeacockMascot';
import { downloadAndApplyUpdate } from '../utils/otaUpdater';

interface UpdateModalProps {
  currentVersion: string;
  remoteVersion: string;
  notes: string;
  bundleUrl: string;
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  currentVersion,
  remoteVersion,
  notes,
  bundleUrl,
  onClose,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUpdate = async () => {
    setIsUpdating(true);
    setProgress(5);
    setErrorMsg(null);

    try {
      await downloadAndApplyUpdate(bundleUrl, remoteVersion, (p) => {
        setProgress(p);
      });
    } catch (err: unknown) {
      console.error('Update failed:', err);
      setIsUpdating(false);
      setErrorMsg((err as Error)?.message || 'Failed to download update. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm bg-[#121214] border border-[#1E1E22] rounded-[24px] p-6 shadow-2xl flex flex-col gap-4 relative animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Close Button (disabled while updating) */}
        {!isUpdating && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Mascot & Header Badge */}
        <div className="flex flex-col items-center text-center pt-2">
          <div className="relative mb-3">
            <PeacockMascot size={72} />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 border-2 border-[#121214] flex items-center justify-center shadow-lg">
              <DownloadCloud className="w-3.5 h-3.5 text-white stroke-[2.5]" />
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-[#38BDF8] text-[12px] font-semibold tracking-wide mb-2">
            <Sparkles className="w-3 h-3 text-sky-400" />
            Update Available • v{remoteVersion}
          </span>

          <h3 className="text-xl font-bold text-white tracking-tight">
            New Version Ready
          </h3>
        </div>

        {/* Version Comparison Box */}
        <div className="bg-[#18181C] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
              Current
            </span>
            <span className="text-sm font-semibold text-zinc-300">
              v{currentVersion}
            </span>
          </div>

          <div className="w-8 h-8 rounded-full bg-blue-600/15 border border-blue-500/30 flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-[#38BDF8]" />
          </div>

          <div className="flex flex-col text-right">
            <span className="text-[11px] uppercase tracking-wider text-sky-400 font-semibold">
              New Version
            </span>
            <span className="text-sm font-bold text-white">
              v{remoteVersion}
            </span>
          </div>
        </div>

        {/* Release Notes */}
        <div className="bg-[#16161A] border border-white/5 rounded-2xl p-3.5 text-left">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
            What&apos;s New
          </span>
          <p className="text-xs text-zinc-300 leading-relaxed font-normal">
            {notes}
          </p>
        </div>

        {/* Error message if any */}
        {errorMsg && (
          <p className="text-xs text-rose-400 text-center bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5">
            {errorMsg}
          </p>
        )}

        {/* Progress or CTA Buttons */}
        {isUpdating ? (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs text-zinc-300 font-medium">
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                Downloading update...
              </span>
              <span className="text-sky-400 font-bold">{progress}%</span>
            </div>

            <div className="w-full h-2.5 bg-[#1E1E24] rounded-full overflow-hidden p-0.5 border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-sky-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[11px] text-zinc-500 text-center">
              Please wait while the new bundle is applied
            </p>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            <button
              onClick={handleUpdate}
              className="w-full py-3.5 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white font-semibold text-[15px] shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>Update Now</span>
            </button>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-full text-zinc-400 hover:text-white text-xs font-medium transition-colors"
            >
              Later
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
