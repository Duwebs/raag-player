import React, { useId } from 'react';

export interface RaagLogoProps {
  size?: number;
  animated?: boolean;
  withWordmark?: boolean;
  contained?: boolean;
  drawOnMount?: boolean;
  className?: string;
}

/**
 * Signature minimalist vector mark for Raag Player:
 * diagonally tilted Tanpura outline with inner Play triangle,
 * saffron gold tuning peg accent (#F59E0B), and 3 rhythmic soundwave bars.
 */
export const RAAG_TANPURA_PATH =
  'M 25.06 31.71 Q 27.6 30.8 29.3 28.5 L 41.2 12.1 C 43.0 9.6 46.8 9.8 48.1 12.1 C 49.3 14.3 47.3 16.9 44.8 14.7 L 33.2 31.4 Q 31.6 33.6 32.46 38.37 A 10.6 10.6 0 1 1 25.06 31.71 Z';

export const RAAG_PLAY_TRIANGLE_PATH =
  'M 20.2 38.4 Q 20.2 37.6 21.0 38.0 L 26.9 41.4 Q 27.7 41.9 26.9 42.5 L 21.0 45.9 Q 20.2 46.3 20.2 45.5 Z';

export const RaagLogo: React.FC<RaagLogoProps> = ({
  size = 48,
  animated = false,
  withWordmark = false,
  contained = true,
  drawOnMount = false,
  className = '',
}) => {
  const glowId = useId();
  const radiusStyle = contained ? { borderRadius: Math.round(size * 0.24) } : undefined;

  return (
    <div
      className={`inline-flex flex-col items-center justify-center select-none ${className}`}
    >
      <div
        className={`relative flex items-center justify-center shrink-0 overflow-hidden ${
          contained
            ? 'bg-[#050505] border border-white/10 shadow-[0_6px_22px_rgba(0,0,0,0.45)]'
            : ''
        }`}
        style={{
          width: size,
          height: size,
          ...radiusStyle,
        }}
      >
        <svg
          viewBox="0 0 64 64"
          width={size}
          height={size}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Raag Player logo"
        >
          <defs>
            <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="1.4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Tanpura / Sitar tilted silhouette outline */}
          <path
            d={RAAG_TANPURA_PATH}
            stroke="#FFFFFF"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            className={drawOnMount ? 'raag-draw-outline' : undefined}
          />

          {/* Solid white Play triangle inside circular resonator base */}
          <path
            d={RAAG_PLAY_TRIANGLE_PATH}
            fill="#FFFFFF"
            className={drawOnMount ? 'raag-draw-play' : undefined}
          />

          {/* Warm Saffron Gold tuning peg dot on upper-left of neck */}
          <circle
            cx="35.1"
            cy="12.9"
            r="2.15"
            fill="#F59E0B"
            filter={`url(#${glowId})`}
            style={{ transformOrigin: '35.1px 12.9px' }}
            className={
              drawOnMount
                ? 'raag-draw-gold'
                : animated
                ? 'raag-gold-breathe'
                : undefined
            }
          />

          {/* 3 vertical rounded soundwave bars: short, tall, medium */}
          <line
            x1="40.0"
            y1="29.8"
            x2="40.0"
            y2="37.2"
            stroke="#FFFFFF"
            strokeWidth="2.6"
            strokeLinecap="round"
            style={{ transformOrigin: '40.0px 33.5px' }}
            className={
              drawOnMount
                ? 'raag-bar-enter raag-bar-enter-1'
                : animated
                ? 'raag-wave-bar raag-wave-bar-1'
                : undefined
            }
          />
          <line
            x1="45.2"
            y1="24.2"
            x2="45.2"
            y2="42.8"
            stroke="#FFFFFF"
            strokeWidth="2.6"
            strokeLinecap="round"
            style={{ transformOrigin: '45.2px 33.5px' }}
            className={
              drawOnMount
                ? 'raag-bar-enter raag-bar-enter-2'
                : animated
                ? 'raag-wave-bar raag-wave-bar-2'
                : undefined
            }
          />
          <line
            x1="50.4"
            y1="28.0"
            x2="50.4"
            y2="39.0"
            stroke="#FFFFFF"
            strokeWidth="2.6"
            strokeLinecap="round"
            style={{ transformOrigin: '50.4px 33.5px' }}
            className={
              drawOnMount
                ? 'raag-bar-enter raag-bar-enter-3'
                : animated
                ? 'raag-wave-bar raag-wave-bar-3'
                : undefined
            }
          />
        </svg>
      </div>

      {withWordmark && (
        <span className="mt-3 text-[13px] font-bold tracking-[0.38em] text-white/90 uppercase pl-[0.38em]">
          RAAG
        </span>
      )}
    </div>
  );
};
