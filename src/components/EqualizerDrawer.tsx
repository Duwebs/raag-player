import React from 'react';
import { X, RotateCcw } from 'lucide-react';
import { EQUALIZER_FREQUENCIES, EQUALIZER_PRESETS } from '../utils/audioEngine';
import { LanguageCode } from '../types';
import { TRANSLATIONS } from '../utils/translations';

interface EqualizerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  language: LanguageCode;
  currentGains: number[];
  activePreset: string;
  onGainChange: (index: number, value: number) => void;
  onSelectPreset: (presetKey: string) => void;
}

export const EqualizerDrawer: React.FC<EqualizerDrawerProps> = ({
  isOpen,
  onClose,
  language,
  currentGains,
  activePreset,
  onGainChange,
  onSelectPreset,
}) => {
  const t = TRANSLATIONS[language];
  if (!isOpen) return null;

  const bandLabels = ['60Hz', '230Hz', '910Hz', '3.6kHz', '14kHz'];
  const bandNames = ['Sub-Bass', 'Bass', 'Mid', 'Treble', 'Air'];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#121214] border-t border-[#1E1E22] rounded-t-[30px] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col gap-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white tracking-wide">
              {t.equalizer}
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-600/20 text-[#38BDF8] font-medium border border-blue-500/30">
              5-Band Hardware EQ
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectPreset('flat')}
              className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              title="Reset to Flat"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Presets Row */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 block">
            {t.presets}
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {Object.entries(EQUALIZER_PRESETS).map(([key, item]) => {
              const isSelected = activePreset === key;
              return (
                <button
                  key={key}
                  onClick={() => onSelectPreset(key)}
                  className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-[#2563EB] text-white shadow-md shadow-blue-600/30 font-semibold'
                      : 'bg-[#18181C] text-zinc-300 hover:bg-[#202026] border border-[#26262E]'
                  }`}
                >
                  {item.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5-Band Vertical Sliders */}
        <div className="bg-[#0A0A0C] border border-[#1A1A1E] rounded-2xl p-5 flex items-center justify-between gap-3 shadow-inner">
          {EQUALIZER_FREQUENCIES.map((freq, idx) => {
            const gain = currentGains[idx] || 0;
            return (
              <div key={freq} className="flex flex-col items-center gap-3 flex-1">
                {/* dB value */}
                <span className="text-[11px] font-mono text-[#38BDF8] font-medium">
                  {gain > 0 ? `+${gain}` : gain}dB
                </span>

                {/* Vertical Range Slider */}
                <div className="h-36 flex items-center justify-center">
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="1"
                    value={gain}
                    onChange={(e) => onGainChange(idx, Number(e.target.value))}
                    className="w-32 h-1.5 accent-[#2563EB] bg-zinc-800 rounded-lg cursor-pointer -rotate-90"
                  />
                </div>

                {/* Labels */}
                <div className="text-center">
                  <span className="text-[11px] font-semibold text-zinc-200 block">
                    {bandLabels[idx]}
                  </span>
                  <span className="text-[9px] text-zinc-500 uppercase tracking-tighter block">
                    {bandNames[idx]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer tip */}
        <p className="text-[11px] text-zinc-500 text-center">
          Processed via Web Audio BiquadFilters in real-time. Presets apply smoothly without distortion.
        </p>
      </div>
    </div>
  );
};
