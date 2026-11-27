import React, { useEffect, useRef, useState } from 'react';
import {
  AudioLines,
  Bluetooth,
  Disc,
  Disc3,
  Flame,
  Headphones,
  Mic,
  MicVocal,
  Music,
  Music2,
  Music4,
  Radio,
  Smile,
  Sparkles,
  Speaker,
  Volume2,
  Waves,
  Zap,
} from 'lucide-react';
import { LanguageCode, Track } from '../types';
import {
  EQUALIZER_BAND_LABELS,
  EQUALIZER_PRESETS,
  audioEngine,
  normalizeEqGains,
} from '../utils/audioEngine';
import { TRANSLATIONS } from '../utils/translations';
import { ExtractedPalette } from '../utils/colorExtractor';
import { AnimatedBottomSheet, CompactTrackHeader } from './MotionPrimitives';

interface EqualizerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  language: LanguageCode;
  track: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  eqEnabled: boolean;
  onToggleEqEnabled: (enabled: boolean) => void;
  currentGains: number[];
  activePreset: string;
  onGainChange: (index: number, value: number) => void;
  onSelectPreset: (presetKey: string) => void;
  palette: ExtractedPalette;
}

const PRESET_ICONS: Record<string, React.FC<{ className?: string }>> = {
  custom: AudioLines,
  bassBooster: Speaker,
  vocalBooster: Mic,
  trebleBooster: Radio,
  normal: Smile,
  pop: Music4,
  hiphop: Headphones,
  rock: Flame,
  electronic: Disc3,
  heavyMetal: Zap,
  rnb: MicVocal,
  folk: Music,
  dance: Sparkles,
  jazz: Music2,
  classic: Disc,
  latin: Waves,
};

interface BandSliderProps {
  gain: number;
  label: string;
  isLight: boolean;
  enabled: boolean;
  onChange: (val: number) => void;
}

const BandSlider: React.FC<BandSliderProps> = ({
  gain,
  label,
  isLight,
  enabled,
  onChange,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);

  const calculateGainFromPointer = (clientY: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pad = 8;
    const top = rect.top + pad;
    const bottom = rect.bottom - pad;
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

  const clampedGain = Math.max(-12, Math.min(12, Math.round(gain || 0)));
  // Center is 50%, range [-12, +12] -> [0%, 100%]
  const thumbPct = ((clampedGain + 12) / 24) * 100;
  const barBottomPct = Math.min(50, thumbPct);
  const barHeightPct = Math.abs(thumbPct - 50);

  const readout = clampedGain > 0 ? `+${clampedGain}` : `${clampedGain}`;
  const fgColor = isLight ? '#2B2118' : '#FFFFFF';
  const railColor = isLight ? 'rgba(43, 33, 24, 0.22)' : 'rgba(255, 255, 255, 0.22)';

  return (
    <div className="flex flex-col items-center justify-between select-none">
      {/* Live Signed dB Readout (+3, 0, -1) */}
      <span
        className="text-[11px] font-mono tabular-nums font-medium mb-1.5 transition-opacity"
        style={{
          color: clampedGain !== 0 ? fgColor : isLight ? 'rgba(43,33,24,0.55)' : 'rgba(255,255,255,0.6)',
          opacity: enabled ? 1 : 0.45,
        }}
      >
        {readout}
      </span>

      {/* Interactive Vertical Rail (132px) */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        className="relative w-full h-[132px] flex items-center justify-center cursor-pointer touch-none"
        role="slider"
        aria-valuenow={clampedGain}
        aria-valuemin={-12}
        aria-valuemax={12}
        aria-label={`${label} Hz`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
            e.preventDefault();
            onChange(Math.min(12, clampedGain + 1));
          } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
            e.preventDefault();
            onChange(Math.max(-12, clampedGain - 1));
          }
        }}
      >
        {/* Rail Background Groove */}
        <div
          className="relative w-[1.5px] h-[116px] rounded-full"
          style={{ backgroundColor: railColor }}
        >
          {/* Active Center-Origin Pill extending from 0dB */}
          {barHeightPct > 0.5 && (
            <div
              className="absolute left-1/2 -translate-x-1/2 w-1.5 rounded-full transition-all duration-75"
              style={{
                bottom: `${barBottomPct}%`,
                height: `${barHeightPct}%`,
                backgroundColor: fgColor,
                opacity: enabled ? 0.95 : 0.4,
              }}
            />
          )}

          {/* Thumb Dot */}
          <div
            className="absolute left-1/2 -translate-x-1/2 translate-y-1/2 w-2.5 h-2.5 rounded-full shadow-sm transition-[bottom] duration-75"
            style={{
              bottom: `${thumbPct}%`,
              backgroundColor: fgColor,
              opacity: enabled ? 1 : 0.5,
            }}
          />
        </div>
      </div>

      {/* Frequency Label */}
      <span
        className="text-[11px] font-medium tabular-nums mt-1.5"
        style={{
          color: isLight ? 'rgba(43,33,24,0.65)' : 'rgba(255,255,255,0.65)',
          opacity: enabled ? 1 : 0.5,
        }}
      >
        {label}
      </span>
    </div>
  );
};

export const EqualizerDrawer: React.FC<EqualizerDrawerProps> = ({
  isOpen,
  onClose,
  language,
  track,
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  eqEnabled,
  onToggleEqEnabled,
  currentGains,
  activePreset,
  onGainChange,
  onSelectPreset,
  palette,
}) => {
  const t = TRANSLATIONS[language];
  const [outputLabel, setOutputLabel] = useState('Phone Speaker');

  useEffect(() => {
    if (isOpen) {
      audioEngine.getAudioOutputLabel().then(setOutputLabel);
    }
  }, [isOpen]);

  const normalizedGains = normalizeEqGains(currentGains);
  const isBluetooth = /buds|bt|bluetooth|airpods|headset|wh-|wf-/i.test(outputLabel);

  return (
    <AnimatedBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      zIndexClass="z-[60]"
      backgroundColor={palette.sheetBackground}
      borderColor={palette.isLight ? 'rgba(43,33,24,0.12)' : 'rgba(255,255,255,0.12)'}
      backdropColor={palette.solidBackground}
      maxHeightClass="max-h-[82vh]"
      topBanner={
        track ? (
          <div style={{ backgroundColor: palette.solidBackground }}>
            <CompactTrackHeader
              track={track}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              onTogglePlay={onTogglePlay}
              textColor={palette.textColor}
              subTextColor={palette.subTextColor}
              accentColor={palette.barProgress}
            />
          </div>
        ) : null
      }
    >
      <div className="px-5 pb-6 flex flex-col gap-4" style={{ color: palette.textColor }}>
        {/* Header: Equalizer + Output Device + Master Switch */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[22px] font-bold tracking-tight leading-none">
              {t.equalizer}
            </h3>
            <div
              className="flex items-center gap-1.5 text-xs font-medium mt-2"
              style={{ color: palette.subTextColor }}
            >
              {isBluetooth ? (
                <Bluetooth className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="truncate max-w-[220px]">{outputLabel}</span>
            </div>
          </div>

          {/* Master ON/OFF Toggle Switch */}
          <button
            onClick={() => onToggleEqEnabled(!eqEnabled)}
            role="switch"
            aria-checked={eqEnabled}
            aria-label="Toggle Equalizer"
            className="w-12 h-7 rounded-full p-0.5 transition-colors duration-200 flex items-center shrink-0 min-h-[28px]"
            style={{
              backgroundColor: eqEnabled
                ? palette.isLight
                  ? '#2B2118'
                  : '#FFFFFF'
                : 'rgba(128,128,128,0.38)',
            }}
          >
            <span
              className="w-6 h-6 rounded-full shadow-md transition-transform duration-200"
              style={{
                backgroundColor: eqEnabled ? palette.sheetBackground : '#FFFFFF',
                transform: eqEnabled ? 'translateX(20px)' : 'translateX(0px)',
              }}
            />
          </button>
        </div>

        {/* 10-Band Vertical Interactive Sliders */}
        <div className="relative py-1">
          {/* Subtle Horizontal 0dB Dashed Guideline */}
          <div
            className="absolute left-1 right-1 top-1/2 -translate-y-0.5 border-t border-dotted pointer-events-none"
            style={{
              borderColor: palette.isLight ? 'rgba(43,33,24,0.2)' : 'rgba(255,255,255,0.22)',
            }}
          />
          <div className="grid grid-cols-10 gap-0.5 w-full relative z-10">
            {EQUALIZER_BAND_LABELS.map((label, idx) => (
              <BandSlider
                key={label}
                gain={normalizedGains[idx] ?? 0}
                label={label}
                isLight={palette.isLight}
                enabled={eqEnabled}
                onChange={(val) => {
                  if (!eqEnabled) onToggleEqEnabled(true);
                  onGainChange(idx, val);
                }}
              />
            ))}
          </div>
        </div>

        {/* 2-Column Scrollable 16-Preset Grid */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {Object.entries(EQUALIZER_PRESETS).map(([key, item]) => {
            const isSelected = eqEnabled && activePreset === key;
            const Icon = PRESET_ICONS[key] || Music;
            return (
              <button
                key={key}
                onClick={() => {
                  if (!eqEnabled) onToggleEqEnabled(true);
                  onSelectPreset(key);
                }}
                className="min-h-[82px] rounded-2xl p-3.5 border flex flex-col justify-between text-left active:scale-[0.98] transition-all"
                style={{
                  backgroundColor: isSelected ? '#FFFFFF' : palette.sheetElevated,
                  borderColor: isSelected
                    ? '#FFFFFF'
                    : palette.isLight
                    ? 'rgba(43,33,24,0.14)'
                    : 'rgba(255,255,255,0.16)',
                  color: isSelected ? '#18181B' : palette.textColor,
                }}
              >
                <Icon
                  className="w-5 h-5 stroke-[1.75]"
                  style={{
                    color: isSelected
                      ? '#18181B'
                      : palette.isLight
                      ? 'rgba(43,33,24,0.75)'
                      : 'rgba(255,255,255,0.8)',
                  }}
                />
                <span className="text-[14px] font-medium tracking-tight leading-snug pt-2">
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </AnimatedBottomSheet>
  );
};
