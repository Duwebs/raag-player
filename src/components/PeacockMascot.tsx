import React from 'react';

interface PeacockMascotProps {
  size?: number;
  className?: string;
}

export const PeacockMascot: React.FC<PeacockMascotProps> = ({ size = 80, className = '' }) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center select-none ${className}`}
    >
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_8px_20px_rgba(2,132,199,0.35)]"
      >
        <defs>
          {/* Royal Blue to Teal Head Gradient */}
          <linearGradient id="peacockBody" x1="60" y1="36" x2="60" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0284C7" />
            <stop offset="55%" stopColor="#0369A1" />
            <stop offset="100%" stopColor="#0D9488" />
          </linearGradient>

          {/* Feather Crest Eye Gradients */}
          <radialGradient id="crestEye" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="50%" stopColor="#059669" />
            <stop offset="85%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#F59E0B" />
          </radialGradient>

          {/* Headphones Headband Gradient */}
          <linearGradient id="headbandGrad" x1="20" y1="35" x2="100" y2="35" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FB7185" />
            <stop offset="50%" stopColor="#F43F5E" />
            <stop offset="100%" stopColor="#E11D48" />
          </linearGradient>

          {/* Beak Gradient */}
          <linearGradient id="beakGrad" x1="60" y1="68" x2="60" y2="84" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FCD34D" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>

        {/* --- Three Peacock Feather Crests (Kalgi) on Top --- */}
        {/* Left Crest */}
        <path d="M 52 42 Q 44 26 38 18" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
        <ellipse cx="37" cy="16" rx="5" ry="7" transform="rotate(-25 37 16)" fill="url(#crestEye)" />
        <circle cx="37" cy="16" r="2" fill="#042F2E" />

        {/* Center Crest (Tallest) */}
        <path d="M 60 40 L 60 12" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
        <ellipse cx="60" cy="10" rx="5.5" ry="7.5" fill="url(#crestEye)" />
        <circle cx="60" cy="10" r="2.2" fill="#042F2E" />

        {/* Right Crest */}
        <path d="M 68 42 Q 76 26 82 18" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
        <ellipse cx="83" cy="16" rx="5" ry="7" transform="rotate(25 83 16)" fill="url(#crestEye)" />
        <circle cx="83" cy="16" r="2" fill="#042F2E" />

        {/* --- Over-Ear Headphone Band (Arching behind crest base) --- */}
        <path
          d="M 26 68 C 26 36 94 36 94 68"
          stroke="url(#headbandGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />

        {/* --- Peacock Face & Plumage Body --- */}
        <circle cx="60" cy="68" r="34" fill="url(#peacockBody)" />
        {/* Subtle royal teal chest patch */}
        <ellipse cx="60" cy="80" rx="24" ry="19" fill="#14B8A6" opacity="0.35" />

        {/* White Eye Patches (Signature Peacock eye markings) */}
        <ellipse cx="48" cy="62" rx="9" ry="8" fill="#F8FAFC" />
        <ellipse cx="72" cy="62" rx="9" ry="8" fill="#F8FAFC" />

        {/* Cute Expressive Pupils */}
        <circle cx="49" cy="63" r="5" fill="#09090B" />
        <circle cx="50.5" cy="61.5" r="1.8" fill="#FFFFFF" />

        <circle cx="71" cy="63" r="5" fill="#09090B" />
        <circle cx="72.5" cy="61.5" r="1.8" fill="#FFFFFF" />

        {/* Signature Indian Peacock Cheek Markings (Turquoise Dots) */}
        <circle cx="37" cy="74" r="1.5" fill="#5EEAD4" opacity="0.8" />
        <circle cx="41" cy="77" r="1.5" fill="#5EEAD4" opacity="0.8" />
        <circle cx="83" cy="74" r="1.5" fill="#5EEAD4" opacity="0.8" />
        <circle cx="79" cy="77" r="1.5" fill="#5EEAD4" opacity="0.8" />

        {/* Golden Indian Beak */}
        <polygon points="60,68 53,79 67,79" fill="url(#beakGrad)" />
        <polygon points="60,68 56,76 64,76" fill="#FBBF24" />
        <path d="M 53 79 Q 60 83 67 79 Z" fill="#B45309" />

        {/* --- Sleek Pink/Coral Over-Ear Headphone Cushions --- */}
        {/* Left Ear Cushion */}
        <rect x="18" y="56" width="12" height="26" rx="6" fill="#F43F5E" />
        <rect x="22" y="60" width="5" height="18" rx="2.5" fill="#FDA4AF" opacity="0.6" />

        {/* Right Ear Cushion */}
        <rect x="90" y="56" width="12" height="26" rx="6" fill="#F43F5E" />
        <rect x="93" y="60" width="5" height="18" rx="2.5" fill="#FDA4AF" opacity="0.6" />
      </svg>
    </div>
  );
};

export const MascotIcon = PeacockMascot;
