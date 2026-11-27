import React, { useEffect, useRef } from 'react';
import { VisualizerStyle } from '../types';
import { audioEngine } from '../utils/audioEngine';
import { AnimatedBottomSheet } from './MotionPrimitives';
import { ExtractedPalette } from '../utils/colorExtractor';

interface LiveVisualizerCanvasProps {
  enabled: boolean;
  isPlaying: boolean;
  styleType: VisualizerStyle;
  palette: ExtractedPalette;
}

/**
 * Renders live 60fps audio spectrum / waveform directly above the Now Playing seekbar.
 */
export const LiveVisualizerCanvas: React.FC<LiveVisualizerCanvasProps> = ({
  enabled,
  isPlaying,
  styleType,
  palette,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const freqData = new Uint8Array(64);
    const smoothed = new Float32Array(32);
    const peaks = new Float32Array(32);
    let rafId = 0;
    let phase = 0;

    const renderFrame = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth || 320;
      const height = canvas.clientHeight || 44;
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const hasRealAudio = isPlaying && audioEngine.getFrequencyData(freqData);
      let realEnergy = 0;
      if (hasRealAudio) {
        for (let i = 0; i < 32; i++) realEnergy += freqData[i];
      }

      phase += isPlaying ? 0.065 : 0.015;

      for (let i = 0; i < 32; i++) {
        let target = 0;
        if (isPlaying) {
          if (realEnergy > 12) {
            // Live FFT bin from AnalyserNode
            target = (freqData[i] || 0) / 255;
          } else {
            // Smooth fallback motion if device WebView mutes cross-source FFT capture
            const waveA = Math.sin(phase * 1.4 + i * 0.42) * 0.5 + 0.5;
            const waveB = Math.cos(phase * 0.9 - i * 0.27) * 0.5 + 0.5;
            target = 0.12 + 0.48 * waveA * waveB;
          }
        } else {
          target = 0.04;
        }
        smoothed[i] += (target - smoothed[i]) * (isPlaying ? 0.24 : 0.14);
        if (smoothed[i] > peaks[i]) {
          peaks[i] = smoothed[i];
        } else {
          peaks[i] = Math.max(smoothed[i], peaks[i] - 0.012);
        }
      }

      const rgb = palette.isLight ? '43, 33, 24' : '255, 255, 255';

      if (styleType === 'harmony') {
        // Layered translucent silk wave curves
        for (let layer = 0; layer < 2; layer++) {
          const pts = 20;
          ctx.beginPath();
          ctx.moveTo(0, height);
          for (let i = 0; i <= pts; i++) {
            const normX = i / pts;
            const x = normX * width;
            const binIdx = Math.min(31, Math.floor((normX < 0.5 ? normX : 1 - normX) * 28));
            const amp = smoothed[binIdx] * (height * (layer === 0 ? 0.85 : 0.62));
            const ripple = Math.sin(phase * (layer === 0 ? 1.1 : -1.4) + i * 0.65) * amp;
            const envelope = Math.sin(normX * Math.PI);
            const y = height - Math.max(2, (amp * 0.72 + Math.abs(ripple) * 0.28) * envelope);
            if (i === 0) {
              ctx.lineTo(x, y);
            } else {
              const prevX = ((i - 1) / pts) * width;
              const midX = (prevX + x) / 2;
              ctx.quadraticCurveTo(prevX, y, midX, y);
            }
          }
          ctx.lineTo(width, height);
          ctx.closePath();

          const grad = ctx.createLinearGradient(0, 0, 0, height);
          grad.addColorStop(0, `rgba(${rgb}, ${layer === 0 ? 0.48 : 0.28})`);
          grad.addColorStop(1, `rgba(${rgb}, 0.04)`);
          ctx.fillStyle = grad;
          ctx.fill();
        }
      } else if (styleType === 'bounce') {
        const barCount = 26;
        const gap = width / barCount;
        const barW = Math.max(2, gap * 0.52);
        for (let i = 0; i < barCount; i++) {
          const idx = Math.floor((i / barCount) * 24);
          const h = Math.max(3, smoothed[idx] * (height * 0.9));
          const x = i * gap + (gap - barW) / 2;
          const y = height - h;
          ctx.fillStyle = `rgba(${rgb}, ${0.35 + smoothed[idx] * 0.55})`;
          ctx.beginPath();
          ctx.roundRect(x, y, barW, h, barW / 2);
          ctx.fill();
        }
      } else if (styleType === 'pulse') {
        const bass = (smoothed[1] + smoothed[2] + smoothed[3]) / 3;
        const cx = width / 2;
        const cy = height;
        for (let rIdx = 3; rIdx >= 1; rIdx--) {
          const radius = (height * (0.38 * rIdx)) + bass * (height * 0.55 * rIdx);
          ctx.beginPath();
          ctx.arc(cx, cy, radius, Math.PI, 0);
          ctx.strokeStyle = `rgba(${rgb}, ${0.52 - rIdx * 0.12})`;
          ctx.lineWidth = rIdx === 1 ? 2.5 : 1.5;
          ctx.stroke();
        }
        // Symmetrical bass wing line
        ctx.beginPath();
        ctx.moveTo(0, height - 1);
        for (let x = 0; x <= width; x += 6) {
          const dist = Math.abs(x - cx) / cx;
          const env = Math.max(0, 1 - dist);
          const y = height - 2 - (bass * height * 0.78 * env * (0.7 + 0.3 * Math.cos(phase * 2 + dist * 6)));
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${rgb}, 0.85)`;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // Classic Bars (segmented peak meters)
        const barCount = 22;
        const gap = width / barCount;
        const barW = Math.max(3, gap * 0.62);
        for (let i = 0; i < barCount; i++) {
          const idx = Math.floor((i / barCount) * 24);
          const barH = Math.max(2, smoothed[idx] * (height - 4));
          const x = i * gap + (gap - barW) / 2;
          ctx.fillStyle = `rgba(${rgb}, 0.78)`;
          ctx.fillRect(x, height - barH, barW, barH);
          const peakY = Math.max(0, height - peaks[idx] * (height - 4) - 3);
          ctx.fillStyle = `rgba(${rgb}, 0.95)`;
          ctx.fillRect(x, peakY, barW, 2);
        }
      }

      ctx.restore();
      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [enabled, isPlaying, styleType, palette]);

  if (!enabled) return null;

  return (
    <div className="w-full h-11 overflow-hidden pointer-events-none select-none -mb-2">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};

interface VisualizerPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  enabled: boolean;
  selectedStyle: VisualizerStyle;
  palette: ExtractedPalette;
  onToggleEnabled: (enabled: boolean) => void;
  onSelectStyle: (style: VisualizerStyle) => void;
}

const VISUALIZER_OPTIONS: { id: VisualizerStyle; label: string }[] = [
  { id: 'harmony', label: 'Harmony' },
  { id: 'bounce', label: 'Bounce' },
  { id: 'pulse', label: 'Pulse' },
  { id: 'bars', label: 'Classic Bars' },
];

const VisualizerCardPreview: React.FC<{ id: VisualizerStyle; selected: boolean; isLight: boolean }> = ({
  id,
  selected,
  isLight,
}) => {
  const strokeColor = selected ? '#18181B' : isLight ? 'rgba(43,33,24,0.85)' : 'rgba(255,255,255,0.85)';
  const mutedColor = selected ? 'rgba(24,24,27,0.3)' : isLight ? 'rgba(43,33,24,0.28)' : 'rgba(255,255,255,0.28)';

  if (id === 'harmony') {
    return (
      <svg viewBox="0 0 96 36" className="w-full h-9">
        <path
          d="M2,34 Q22,6 42,24 T74,10 T94,34 Z"
          fill={mutedColor}
        />
        <path
          d="M6,34 Q30,14 52,22 T84,12 T94,34 Z"
          fill={strokeColor}
          opacity="0.7"
        />
      </svg>
    );
  }

  if (id === 'bounce') {
    const heights = [10, 18, 26, 16, 28, 20, 12, 24, 30, 18, 12];
    return (
      <div className="w-full h-9 flex items-end justify-center gap-1 px-2 pb-1">
        {heights.map((h, i) => (
          <span
            key={i}
            className="w-1 rounded-full animate-pulse"
            style={{
              height: `${h}px`,
              backgroundColor: i % 2 === 0 ? strokeColor : mutedColor,
              animationDelay: `${i * 90}ms`,
            }}
          />
        ))}
      </div>
    );
  }

  if (id === 'pulse') {
    return (
      <svg viewBox="0 0 96 36" className="w-full h-9">
        <path
          d="M 24 34 A 24 24 0 0 1 72 34"
          fill="none"
          stroke={mutedColor}
          strokeWidth="2"
        />
        <path
          d="M 33 34 A 15 15 0 0 1 63 34"
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
        />
        <circle cx="48" cy="30" r="5" fill={strokeColor} />
      </svg>
    );
  }

  const barHeights = [8, 16, 22, 14, 28, 20, 26, 18, 10];
  return (
    <div className="w-full h-9 flex items-end justify-center gap-1.5 px-2 pb-1">
      {barHeights.map((h, i) => (
        <span
          key={i}
          className="w-1.5 rounded-t-sm"
          style={{
            height: `${h}px`,
            backgroundColor: strokeColor,
            opacity: 0.85,
          }}
        />
      ))}
    </div>
  );
};

export const VisualizerPickerSheet: React.FC<VisualizerPickerSheetProps> = ({
  isOpen,
  onClose,
  enabled,
  selectedStyle,
  palette,
  onToggleEnabled,
  onSelectStyle,
}) => {
  return (
    <AnimatedBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      zIndexClass="z-[70]"
      backgroundColor={palette.sheetBackground}
      borderColor={palette.isLight ? 'rgba(43,33,24,0.12)' : 'rgba(255,255,255,0.12)'}
    >
      <div className="px-5 pb-6 space-y-5" style={{ color: palette.textColor }}>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight">Music visualizer</h3>

          <button
            onClick={() => onToggleEnabled(!enabled)}
            role="switch"
            aria-checked={enabled}
            aria-label="Toggle music visualizer"
            className="w-12 h-7 rounded-full p-0.5 transition-colors duration-200 flex items-center"
            style={{
              backgroundColor: enabled
                ? palette.isLight
                  ? '#2B2118'
                  : '#FFFFFF'
                : 'rgba(128,128,128,0.35)',
            }}
          >
            <span
              className="w-6 h-6 rounded-full shadow-md transition-transform duration-200"
              style={{
                backgroundColor: enabled ? palette.sheetBackground : '#FFFFFF',
                transform: enabled ? 'translateX(20px)' : 'translateX(0px)',
              }}
            />
          </button>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar scrollbar-none">
          {VISUALIZER_OPTIONS.map((opt) => {
            const isSelected = selectedStyle === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  onSelectStyle(opt.id);
                  if (!enabled) onToggleEnabled(true);
                }}
                className="shrink-0 w-[112px] min-h-[86px] rounded-2xl p-2.5 border flex flex-col items-center justify-between transition-all active:scale-95"
                style={{
                  backgroundColor: isSelected ? '#FFFFFF' : palette.sheetElevated,
                  borderColor: isSelected
                    ? '#FFFFFF'
                    : palette.isLight
                    ? 'rgba(43,33,24,0.12)'
                    : 'rgba(255,255,255,0.14)',
                  color: isSelected ? '#18181B' : palette.textColor,
                  opacity: enabled || isSelected ? 1 : 0.65,
                }}
              >
                <VisualizerCardPreview id={opt.id} selected={isSelected} isLight={palette.isLight} />
                <span className="text-xs font-semibold tracking-tight">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </AnimatedBottomSheet>
  );
};
