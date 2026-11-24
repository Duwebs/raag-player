import React from 'react';

interface MascotIconProps {
  size?: number;
  className?: string;
}

export const MascotIcon: React.FC<MascotIconProps> = ({ size = 80, className = '' }) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center select-none ${className}`}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-lg"
      >
        {/* Headphone Band */}
        <path
          d="M 22 52 A 28 28 0 0 1 78 52"
          stroke="#38BDF8"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Bird Head */}
        <circle cx="50" cy="54" r="34" fill="#38BDF8" />
        <ellipse cx="50" cy="62" rx="26" ry="24" fill="#60A5FA" />

        {/* Headphone Earcups (Pink / Coral) */}
        <rect x="14" y="42" width="10" height="24" rx="5" fill="#F43F5E" />
        <rect x="76" y="42" width="10" height="24" rx="5" fill="#F43F5E" />

        {/* Big cute eyes */}
        <circle cx="41" cy="50" r="5" fill="#09090B" />
        <circle cx="42.5" cy="48.5" r="1.8" fill="#FFFFFF" />

        <circle cx="59" cy="50" r="5" fill="#09090B" />
        <circle cx="60.5" cy="48.5" r="1.8" fill="#FFFFFF" />

        {/* Cute Yellow / Amber Beak */}
        <polygon points="50,56 44,65 56,65" fill="#F59E0B" />
        <polygon points="50,56 46,62 54,62" fill="#FBBF24" />

        {/* Cheerful soundwave accents */}
        <circle cx="10" cy="54" r="2" fill="#38BDF8" opacity="0.6" />
        <circle cx="90" cy="54" r="2" fill="#38BDF8" opacity="0.6" />
      </svg>
    </div>
  );
};
