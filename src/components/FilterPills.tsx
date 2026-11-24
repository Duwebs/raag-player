import React from 'react';
import { TabType, LanguageCode } from '../types';
import { TRANSLATIONS } from '../utils/translations';

interface FilterPillsProps {
  language: LanguageCode;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  favoritesCount: number;
}

export const FilterPills: React.FC<FilterPillsProps> = ({
  language,
  activeTab,
  onTabChange,
  favoritesCount,
}) => {
  const t = TRANSLATIONS[language];

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'songs', label: t.songs },
    { id: 'playlists', label: t.playlists },
    { id: 'folders', label: t.folders },
    { id: 'artists', label: t.artists },
    { id: 'albums', label: t.albums },
    { id: 'favorites', label: t.favorites, count: favoritesCount },
  ];

  return (
    <div className="w-full overflow-x-auto scrollbar-none py-2 px-4 flex items-center gap-2 select-none">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-200 active:scale-95 flex items-center gap-1.5 ${
              isActive
                ? 'bg-[#2563EB] text-white shadow-md shadow-blue-600/30 font-semibold'
                : 'bg-[#141417] text-zinc-300 hover:bg-[#1A1A1F] hover:text-white border border-[#1E1E22]'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-white/25 text-white' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
