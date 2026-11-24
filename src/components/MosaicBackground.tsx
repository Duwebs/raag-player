import React from 'react';

export const MosaicBackground: React.FC = () => {
  const albums = [
    { title: 'Soul', bg: 'from-amber-700 to-amber-950', icon: '🎵' },
    { title: 'Echoes', bg: 'from-blue-700 to-indigo-950', icon: '🎸' },
    { title: 'Raag', bg: 'from-rose-800 to-pink-950', icon: '🪕' },
    { title: 'Night', bg: 'from-purple-800 to-violet-950', icon: '🌙' },
    { title: 'Sitar', bg: 'from-emerald-700 to-teal-950', icon: '✨' },
    { title: 'Waves', bg: 'from-cyan-700 to-sky-950', icon: '🌊' },
    { title: 'Bhangra', bg: 'from-orange-600 to-yellow-950', icon: '🥁' },
    { title: 'Lofi', bg: 'from-fuchsia-800 to-neutral-900', icon: '🎧' },
    { title: 'Chill', bg: 'from-slate-700 to-zinc-950', icon: '☕' },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* Tilted mosaic grid */}
      <div
        className="w-[140%] -left-[20%] -top-20 grid grid-cols-3 gap-3 opacity-25"
        style={{
          transform: 'rotate(-12deg) scale(1.05)',
        }}
      >
        {albums.map((album, idx) => (
          <div
            key={idx}
            className={`aspect-square rounded-2xl bg-gradient-to-br ${album.bg} p-3 flex flex-col justify-between border border-white/10 shadow-2xl relative overflow-hidden`}
          >
            {/* Vinyl record silhouette */}
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full border-4 border-black/40 bg-black/30 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-white/20 bg-black/60" />
            </div>
            <span className="text-xl">{album.icon}</span>
            <div className="text-[11px] font-semibold tracking-wider uppercase text-white/70">
              {album.title}
            </div>
          </div>
        ))}
      </div>

      {/* Dark Vignette and Fade gradient into #050505 */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/40 via-[#050505]/85 to-[#050505]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_transparent_20%,_#050505_80%)]" />
    </div>
  );
};
