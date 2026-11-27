import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Pause, Play } from 'lucide-react';
import { Track } from '../types';
import { RaagLogo } from './RaagLogo';

const SHEET_DURATION_MS = 320;
const SHEET_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)';

/**
 * Manages mount/enter states so overlays animate cleanly both on enter and exit.
 */
export function useAnimatedPresence(isOpen: boolean, durationMs = SHEET_DURATION_MS) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isEntered, setIsEntered] = useState(false);

  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    let timer = 0;

    if (isOpen) {
      setShouldRender(true);
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setIsEntered(true);
        });
      });
    } else {
      setIsEntered(false);
      timer = window.setTimeout(() => {
        setShouldRender(false);
      }, durationMs);
    }

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(timer);
    };
  }, [isOpen, durationMs]);

  return { shouldRender, isEntered };
}

/**
 * Detects mobile/tablet landscape viewport (wide + horizontal orientation).
 */
export function useIsLandscape(): boolean {
  const check = () => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 560 && window.innerWidth > window.innerHeight;
  };

  const [isLandscape, setIsLandscape] = useState<boolean>(check);

  useEffect(() => {
    const onResize = () => setIsLandscape(check());
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  return isLandscape;
}

interface AnimatedBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  zIndexClass?: string;
  backgroundColor?: string;
  borderColor?: string;
  backdropColor?: string;
  maxHeightClass?: string;
  fullHeight?: boolean;
  showDragHandle?: boolean;
  topBanner?: React.ReactNode;
  children: React.ReactNode;
}

export const AnimatedBottomSheet: React.FC<AnimatedBottomSheetProps> = ({
  isOpen,
  onClose,
  zIndexClass = 'z-50',
  backgroundColor = '#121214',
  borderColor = '#1E1E22',
  backdropColor = 'rgba(0, 0, 0, 0.72)',
  maxHeightClass = 'max-h-[86vh]',
  fullHeight = false,
  showDragHandle = true,
  topBanner,
  children,
}) => {
  const { shouldRender, isEntered } = useAnimatedPresence(isOpen);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);

  useEffect(() => {
    if (!isOpen) {
      setDragY(0);
      setIsDragging(false);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    startYRef.current = e.clientY;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const delta = Math.max(0, e.clientY - startYRef.current);
    setDragY(delta);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragY > 75) {
      setDragY(0);
      onClose();
    } else {
      setDragY(0);
    }
  };

  const translateStyle = isEntered
    ? `translate3d(0, ${dragY}px, 0)`
    : 'translate3d(0, 100%, 0)';

  return (
    <div
      className={`fixed inset-0 ${zIndexClass} flex flex-col justify-end overflow-hidden`}
      onClick={onClose}
    >
      {/* Smooth Dimmed Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-md transition-opacity"
        style={{
          backgroundColor: backdropColor,
          opacity: isEntered ? 1 : 0,
          transitionDuration: `${SHEET_DURATION_MS}ms`,
          transitionTimingFunction: SHEET_EASING,
        }}
      />

      {/* Sheet Wrapper */}
      <div
        className={`relative w-full max-w-md sm:max-w-lg mx-auto flex flex-col ${
          fullHeight ? 'h-full' : ''
        }`}
        style={{
          transform: translateStyle,
          transitionProperty: isDragging ? 'none' : 'transform',
          transitionDuration: `${SHEET_DURATION_MS}ms`,
          transitionTimingFunction: SHEET_EASING,
          willChange: 'transform',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {topBanner && <div className="shrink-0">{topBanner}</div>}

        <div
          className={`w-full border-t rounded-t-[28px] shadow-2xl flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom,0px)] ${
            fullHeight ? 'flex-1' : maxHeightClass
          }`}
          style={{
            backgroundColor,
            borderColor,
          }}
        >
          {showDragHandle && (
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onClick={onClose}
              className="w-full py-2.5 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none shrink-0"
              aria-label="Drag down or tap to close"
            >
              <ChevronDown className="w-5 h-5 opacity-40" />
            </div>
          )}

          <div className="flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

interface AnimatedSlidePanelProps {
  isOpen: boolean;
  direction?: 'left' | 'right';
  zIndexClass?: string;
  children: React.ReactNode;
}

export const AnimatedSlidePanel: React.FC<AnimatedSlidePanelProps> = ({
  isOpen,
  direction = 'right',
  zIndexClass = 'z-40',
  children,
}) => {
  const { shouldRender, isEntered } = useAnimatedPresence(isOpen);

  if (!shouldRender) return null;

  const offscreen = direction === 'left' ? 'translate3d(-100%, 0, 0)' : 'translate3d(100%, 0, 0)';

  return (
    <div className={`fixed inset-0 ${zIndexClass} overflow-hidden`}>
      {/* Subtle dimmer under directional panel */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity pointer-events-none"
        style={{
          opacity: isEntered ? 1 : 0,
          transitionDuration: `${SHEET_DURATION_MS}ms`,
          transitionTimingFunction: SHEET_EASING,
        }}
      />
      <div
        className="relative w-full h-full overflow-y-auto overflow-x-hidden"
        style={{
          transform: isEntered ? 'translate3d(0, 0, 0)' : offscreen,
          transitionProperty: 'transform',
          transitionDuration: `${SHEET_DURATION_MS}ms`,
          transitionTimingFunction: SHEET_EASING,
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  );
};

interface CompactTrackHeaderProps {
  track: Track;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  textColor?: string;
  subTextColor?: string;
  accentColor?: string;
}

export const CompactTrackHeader: React.FC<CompactTrackHeaderProps> = ({
  track,
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  textColor = '#FFFFFF',
  subTextColor = 'rgba(255,255,255,0.72)',
  accentColor = '#FFFFFF',
}) => {
  const [imgErr, setImgErr] = useState(false);

  useEffect(() => {
    setImgErr(false);
  }, [track.id, track.coverArt]);

  const pct = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div className="px-5 pt-[calc(env(safe-area-inset-top,0px)+14px)] pb-4 flex items-center gap-3.5 select-none">
      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-[#050505] border border-white/10 flex items-center justify-center shadow-md">
        {track.coverArt && !imgErr ? (
          <img
            src={track.coverArt}
            alt={track.title}
            className="w-full h-full object-cover"
            onError={() => setImgErr(true)}
          />
        ) : (
          <RaagLogo size={40} contained={false} />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="min-w-0">
          <h4 className="text-[15px] font-bold truncate leading-tight" style={{ color: textColor }}>
            {track.title}
          </h4>
          <p className="text-xs truncate" style={{ color: subTextColor }}>
            {track.artist}
          </p>
        </div>

        {/* Mini live track progress line */}
        <div className="w-full h-1 rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{ width: `${pct}%`, backgroundColor: accentColor }}
          />
        </div>
      </div>

      <button
        onClick={onTogglePlay}
        className="w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-transform shrink-0"
        style={{ color: textColor }}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="w-6 h-6 fill-current" />
        ) : (
          <Play className="w-6 h-6 fill-current ml-0.5" />
        )}
      </button>
    </div>
  );
};
