import React, { useRef } from 'react';
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

interface BandSliderProps {
  gain: number;
  label: string;
  role: string;
  onChange: (val: number) => void;
}

const BandSlider: React.FC<BandSliderProps> = ({ gain, label, role, onChange }) => {
  const trackRef = useRef<HTMLDivElement>(null);

  const calculateGainFromPointer = (clientY: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    // 8px inset so 16px thumb stays centered within bounds
    const top = rect.top + 8;
    const bottom = rect.bottom - 8;
    const clampedY = Math.max(top, Math.min(bottom, clientY));
    const ratio = (bottom - clampedY) / (bottom - top);
    const rawVal = -12 + ratio * 24;
    onChange(Math.round(rawVal));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    calculateGainFromPointer(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      calculateGainFromPointer(e.clientY);
    }
  };

  // Convert gain (-12 to +12) to percentage (0% to 100%)
  const percentage = Math.max(0, Math.min(100, ((gain + 12) / 24) * 100));
  // 140px container with 124px effective travel for 16px thumb
  const bottomPx = 8 + (percentage / 100) * 124;
  const fillHeightPx = (percentage / 100) * 124;

  const formatDb = (val: number) => {
    if (val > 0) return `+${val}dB`;
    return `${val}dB`;
  };

  return (
    <div className="flex flex-col items-center justify-between h-full select-none">
      {/* Top dB Readout */}
      <span className="text-[11px] font-mono tabular-nums font-semibold text-[#3B82F6] mb-1.5">
        {formatDb(gain)}
      </span>

      {/* Vertical Slider Track: 140px Height with touch-action: none */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        className="relative w-full h-[140px] flex items-center justify-center cursor-pointer touch-none"
        role="slider"
        aria-valuenow={gain}
        aria-valuemin={-12}
        aria-valuemax={12}
        aria-label={`${label} (${role})`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
            e.preventDefault();
            onChange(Math.min(12, gain + 1));
          } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
            e.preventDefault();
            onChange(Math.max(-12, gain - 1));
          }
        }}
      >
        {/* Track Groove */}
        <div className="w-1.5 h-[124px] bg-[#1C1C22] rounded-full relative overflow-hidden">
          {/* Zero dB Center Tick */}
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/20 -translate-y-1/2 z-0" />
          {/* Active Blue Fill Track below thumb */}
          <div
            className="absolute bottom-0 left-0 w-full bg-[#3B82F6] rounded-full transition-[height] duration-75"
            style={{ height: `${fillHeightPx}px` }}
          />
        </div>

        {/* 16px White Tactile Thumb */}
        <div
          className="absolute left-1/2 w-4 h-4 rounded-full bg-white shadow-md shadow-black/70 border border-black/10 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-[bottom] duration-75"
          style={{ bottom: `${bottomPx}px` }}
        />
      </div>

      {/* Bottom Labels: Crisp Frequency & Compact Role */}
      <div className="text-center mt-1.5 flex flex-col items-center">
        <span className="text-[11px] font-semibold text-white tracking-tight leading-tight block">
          {label}
        </span>
        <span className="text-[9px] font-medium text-[#8E8E93] tracking-wider mt-0.5 block uppercase">
          {role}
        </span>
      </div>
    </div>
  );
};

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

  const BANDS = [
    { freq: EQUALIZER_FREQUENCIES[0] || 60, label: '60Hz', role: 'SUB' },
    { freq: EQUALIZER_FREQUENCIES[1] || 230, label: '230Hz', role: 'BASS' },
    { freq: EQUALIZER_FREQUENCIES[2] || 910, label: '910Hz', role: 'MID' },
    { freq: EQUALIZER_FREQUENCIES[3] || 3600, label: '3.6k', role: 'HIGH' },
    { freq: EQUALIZER_FREQUENCIES[4] || 14000, label: '14k', role: 'AIR' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#0D0D0F] border-t border-[#1E1E22] rounded-t-[28px] p-5 shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header: Clean Single-Line Alignment */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-lg font-bold text-white tracking-wide truncate">
              {t.equalizer}
            </h3>
            <span className="whitespace-nowrap text-[11px] px-2.5 py-0.5 rounded-full bg-blue-600/20 text-[#38BDF8] font-medium border border-blue-500/30 flex-shrink-0">
              5-Band EQ
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => onSelectPreset('flat')}
              className="p-2 rounded-full hover:bg-white/10 active:scale-95 text-zinc-400 hover:text-white transition-all"
              title="Reset to Flat"
              aria-label="Reset to Flat"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 active:scale-95 text-zinc-400 hover:text-white transition-all"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Presets Row: Edge-to-Edge Scrollable Strip */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 block">
            {t.presets}
          </span>
          <div className="flex items-center gap-2 overflow-x-auto px-4 -mx-4 pb-1 no-scrollbar scrollbar-none">
            {Object.entries(EQUALIZER_PRESETS).map(([key, item]) => {
              const isSelected = activePreset === key;
              return (
                <button
                  key={key}
                  onClick={() => onSelectPreset(key)}
                  className={`shrink-0 text-xs px-3.5 py-1.5 rounded-full font-medium transition-all ${
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

        {/* 5-Band Vertical Sliders Card: strict grid-cols-5 gap-1.5 w-full */}
        <div className="bg-[#121214] border border-[#1E1E22] rounded-2xl px-3 py-4 shadow-inner">
          <div className="grid grid-cols-5 gap-1.5 w-full">
            {BANDS.map((band, idx) => (
              <BandSlider
                key={band.freq}
                gain={currentGains[idx] || 0}
                label={band.label}
                role={band.role}
                onChange={(val) => onGainChange(idx, val)}
              />
            ))}
          </div>
        </div>

        {/* Footer info note */}
        <p className="text-[11px] text-zinc-500 text-center leading-relaxed">
          Processed via Web Audio BiquadFilters in real-time. Presets apply smoothly without distortion.
        </p>
      </div>
    </div>
  );
};
