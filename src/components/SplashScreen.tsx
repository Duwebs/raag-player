import React, { useEffect, useState } from 'react';
import { RaagLogo } from './RaagLogo';

interface SplashScreenProps {
  isAppReady: boolean;
  onExited?: () => void;
}

const MIN_DISPLAY_MS = 1150;
const EXIT_CURTAIN_MS = 420;

export const SplashScreen: React.FC<SplashScreenProps> = ({ isAppReady, onExited }) => {
  const [minElapsed, setMinElapsed] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isUnmounted, setIsUnmounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMinElapsed(true);
    }, MIN_DISPLAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isAppReady || !minElapsed || isExiting) return;
    setIsExiting(true);
    const exitTimer = window.setTimeout(() => {
      setIsUnmounted(true);
      onExited?.();
    }, EXIT_CURTAIN_MS);
    return () => window.clearTimeout(exitTimer);
  }, [isAppReady, minElapsed, isExiting, onExited]);

  if (isUnmounted) return null;

  return (
    <div
      aria-hidden={isExiting}
      className={`fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center px-6 py-[env(safe-area-inset-top,0px)] select-none overflow-hidden ${
        isExiting ? 'pointer-events-none' : 'pointer-events-auto'
      }`}
      style={{
        transform: isExiting ? 'scale(1.06)' : 'scale(1)',
        opacity: isExiting ? 0 : 1,
        transition: `transform ${EXIT_CURTAIN_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${EXIT_CURTAIN_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        willChange: 'transform, opacity',
      }}
    >
      {/* Subtle warm radial atmosphere centered behind Tanpura mark */}
      <div
        className="pointer-events-none absolute w-72 h-72 rounded-full blur-3xl opacity-25"
        style={{
          background:
            'radial-gradient(circle, rgba(245,158,11,0.28) 0%, rgba(255,255,255,0.06) 45%, transparent 72%)',
        }}
      />

      <div className="relative flex flex-col items-center justify-center max-h-[80dvh]">
        <RaagLogo
          size={116}
          contained={false}
          drawOnMount
          withWordmark
          className="max-w-[34vmin]"
        />
      </div>
    </div>
  );
};
