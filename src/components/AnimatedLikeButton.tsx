import React, { useEffect, useRef, useState } from 'react';
import { Heart, Music2 } from 'lucide-react';

interface AnimatedLikeButtonProps {
  isFavorite: boolean;
  onToggle: (e?: React.MouseEvent) => void;
  sizeClass?: string;
  buttonClassName?: string;
  activeColor?: string;
  inactiveColor?: string;
  ariaLabel?: string;
}

type AnimPhase = 'idle' | 'compress' | 'note' | 'settle' | 'unlike';

/**
 * YouTube Music inspired tactile Like button:
 * Heart -> spring flip into glowing Music Note with burst ring & floating mini-notes -> settled Accent Heart.
 */
export const AnimatedLikeButton: React.FC<AnimatedLikeButtonProps> = ({
  isFavorite,
  onToggle,
  sizeClass = 'w-5 h-5',
  buttonClassName = 'min-w-[44px] min-h-[44px]',
  activeColor = 'var(--accent-color, #F43F5E)',
  inactiveColor = 'var(--text-muted)',
  ariaLabel,
}) => {
  const [phase, setPhase] = useState<AnimPhase>('idle');
  const timersRef = useRef<number[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  useEffect(() => clearTimers, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearTimers();
    const becomingLiked = !isFavorite;
    onToggle(e);

    if (becomingLiked) {
      setPhase('compress');
      timersRef.current.push(
        window.setTimeout(() => setPhase('note'), 85),
        window.setTimeout(() => setPhase('settle'), 535),
        window.setTimeout(() => setPhase('idle'), 790)
      );
    } else {
      setPhase('unlike');
      timersRef.current.push(window.setTimeout(() => setPhase('idle'), 210));
    }
  };

  const showMusicNote = phase === 'note';
  const showBurst = phase === 'note' || phase === 'settle';
  const color = showMusicNote || isFavorite ? activeColor : inactiveColor;

  let iconClass = `${sizeClass} transition-transform duration-150`;
  if (phase === 'compress') {
    iconClass = `${sizeClass} scale-[0.58] transition-transform duration-75`;
  } else if (phase === 'note') {
    iconClass = `${sizeClass} raag-like-note-pop`;
  } else if (phase === 'settle') {
    iconClass = `${sizeClass} raag-like-heart-settle`;
  } else if (phase === 'unlike') {
    iconClass = `${sizeClass} scale-[0.72] transition-transform duration-150`;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel || (isFavorite ? 'Remove from favorites' : 'Like song')}
      className={`relative rounded-full flex items-center justify-center overflow-visible select-none ${buttonClassName}`}
      style={{ color }}
    >
      {/* Expanding radial glow burst ring */}
      {showBurst && (
        <span
          className="pointer-events-none absolute inset-1 rounded-full border-2 raag-like-burst-ring"
          style={{ borderColor: color }}
        />
      )}

      {/* Floating mini music notes during the note morph beat */}
      {phase === 'note' && (
        <>
          <span
            className="pointer-events-none absolute text-[10px] font-bold leading-none raag-like-float-left"
            style={{ color }}
          >
            ♪
          </span>
          <span
            className="pointer-events-none absolute text-[10px] font-bold leading-none raag-like-float-right"
            style={{ color }}
          >
            ♫
          </span>
        </>
      )}

      {showMusicNote ? (
        <Music2
          className={iconClass}
          style={{ filter: `drop-shadow(0 0 8px ${activeColor})` }}
          strokeWidth={2.5}
        />
      ) : (
        <Heart
          className={`${iconClass} ${isFavorite ? 'fill-current' : ''}`}
          strokeWidth={2.1}
        />
      )}
    </button>
  );
};
