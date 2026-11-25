import React, { useState, useEffect } from 'react';
import { ExternalLink, Sparkles, GraduationCap, Tv, BookOpen } from 'lucide-react';

interface PromoItem {
  id: string;
  badge: string;
  title: string;
  tagline: string;
  description: string;
  ctaText: string;
  link: string;
  accentColor: string;
  bgGlow: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PROMO_ITEMS: PromoItem[] = [
  {
    id: 'bcaprime',
    badge: 'STUDY APP',
    title: 'BCAPrime',
    tagline: 'BCA Notes, PYQs & AI Mock Tests',
    description: 'Free semester library, previous year solved papers, and smart AI study companion.',
    ctaText: 'Open BCAPrime',
    link: 'https://bcaprime.vercel.app',
    accentColor: '#38BDF8',
    bgGlow: 'radial-gradient(circle at 50% 20%, rgba(37,99,235,0.28) 0%, transparent 70%)',
    icon: GraduationCap,
  },
  {
    id: 'umino',
    badge: 'ANIME TRACKER',
    title: 'Umino',
    tagline: 'Discover & Rank Top Anime',
    description: 'Track seasonal releases, trending anime charts, and personalized recommendations.',
    ctaText: 'Discover Anime',
    link: 'https://github.com/Duwebs',
    accentColor: '#A855F7',
    bgGlow: 'radial-gradient(circle at 50% 20%, rgba(168,85,247,0.25) 0%, transparent 70%)',
    icon: Tv,
  },
  {
    id: 'sutradharini',
    badge: 'CULTURE & LORE',
    title: 'Sutradharini',
    tagline: 'Indian Mythology & Folk Stories',
    description: 'Timeless cultural legends, audio storytelling, and forgotten regional folklore.',
    ctaText: 'Read Stories',
    link: 'https://github.com/Duwebs',
    accentColor: '#F59E0B',
    bgGlow: 'radial-gradient(circle at 50% 20%, rgba(245,158,11,0.25) 0%, transparent 70%)',
    icon: BookOpen,
  },
];

export const NoArtAdCard: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-rotate promo cards every 8 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % PROMO_ITEMS.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const promo = PROMO_ITEMS[currentIndex];
  const IconComponent = promo.icon;

  const handleOpenLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(promo.link, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="relative w-full h-full bg-[#070709] border border-white/10 rounded-[24px] p-5 flex flex-col justify-between overflow-hidden shadow-2xl select-none group"
      style={{
        backgroundImage: promo.bgGlow,
      }}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
            {promo.badge}
          </span>
        </div>

        {/* Featured / Ad Pill Badge */}
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/15 tracking-wider uppercase backdrop-blur-sm">
          Featured
        </span>
      </div>

      {/* Middle Showcase Content */}
      <div className="flex flex-col items-center text-center z-10 py-1">
        <div
          className="w-13 h-13 rounded-2xl flex items-center justify-center mb-2.5 shadow-lg border border-white/10 p-3 transition-transform duration-300 group-hover:scale-105"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
        >
          <IconComponent
            className="w-7 h-7"
            // @ts-expect-error color prop
            style={{ color: promo.accentColor }}
          />
        </div>

        <h3 className="text-xl font-bold text-white tracking-tight leading-tight">
          {promo.title}
        </h3>
        <p
          className="text-xs font-semibold mt-1 tracking-tight"
          style={{ color: promo.accentColor }}
        >
          {promo.tagline}
        </p>
        <p className="text-[11px] text-zinc-400 mt-1 leading-snug line-clamp-2 px-2">
          {promo.description}
        </p>
      </div>

      {/* Bottom CTA Row & Rotation Dots */}
      <div className="flex flex-col gap-2 z-10">
        <button
          onClick={handleOpenLink}
          className="w-full py-2.5 rounded-xl font-semibold text-xs text-white shadow-md flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
          style={{
            backgroundColor: promo.accentColor,
            color: '#000000',
            fontWeight: 700,
          }}
        >
          <span>{promo.ctaText}</span>
          <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>

        {/* Subtle Dots for Manual / Auto Rotation */}
        <div className="flex items-center justify-center gap-1.5 pt-0.5">
          {PROMO_ITEMS.map((item, idx) => (
            <button
              key={item.id}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentIndex
                  ? 'w-5 bg-white'
                  : 'w-1.5 bg-white/20 hover:bg-white/40'
              }`}
              aria-label={`Go to ${item.title}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
