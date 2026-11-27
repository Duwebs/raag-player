import React, { useState } from 'react';
import { Search, ArrowUpDown, Settings, X, PlusCircle, Download } from 'lucide-react';
import { LanguageCode } from '../types';
import { TRANSLATIONS } from '../utils/translations';

interface TopAppBarProps {
  language: LanguageCode;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenSettings: () => void;
  onOpenAddFiles: () => void;
  currentSort: 'title' | 'artist' | 'duration' | 'date';
  onSortChange: (sort: 'title' | 'artist' | 'duration' | 'date') => void;
  canInstall?: boolean;
  onInstallApp?: () => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  language,
  searchQuery,
  onSearchChange,
  onOpenSettings,
  onOpenAddFiles,
  currentSort,
  onSortChange,
  canInstall,
  onInstallApp,
}) => {
  const t = TRANSLATIONS[language];
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-20 backdrop-blur-md px-4 pt-3 pb-2 transition-all border-b"
      style={{
        backgroundColor: 'var(--header-glass)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Primary Row */}
      <div className="flex items-center justify-between h-12">
        <div className="flex items-center gap-2">
          <span
            className="text-xl font-bold tracking-tight select-none"
            style={{ color: 'var(--text-primary)' }}
          >
            {t.appTitle}
          </span>
        </div>

        <div className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
          {/* PWA Install Button in Header */}
          {canInstall && onInstallApp && (
            <button
              onClick={onInstallApp}
              title="Install Raag Player App"
              className="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border active:scale-95 transition-all"
              style={{
                backgroundColor: 'var(--accent-soft)',
                color: 'var(--accent-color)',
                borderColor: 'var(--accent-border)',
              }}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
          )}

          {/* Add file button */}
          <button
            onClick={onOpenAddFiles}
            title={t.addFiles}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 transition-all"
          >
            <PlusCircle className="w-5 h-5 stroke-[2]" />
          </button>

          {/* Search trigger */}
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 transition-all"
            style={{ color: isSearchOpen ? 'var(--accent-color)' : undefined }}
          >
            <Search className="w-5 h-5 stroke-[2]" />
          </button>

          {/* Sort dropdown trigger */}
          <div className="relative">
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 transition-all"
            >
              <ArrowUpDown className="w-5 h-5 stroke-[2]" />
            </button>

            {isSortOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsSortOpen(false)}
                />
                <div
                  className="absolute right-0 mt-2 w-48 border rounded-2xl shadow-2xl py-2 z-40 animate-in fade-in zoom-in-95 duration-150"
                  style={{
                    backgroundColor: 'var(--card-surface)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div
                    className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {t.sortBy}
                  </div>
                  {(['title', 'artist', 'duration', 'date'] as const).map((key) => {
                    const labels = {
                      title: t.sortTitle,
                      artist: t.sortArtist,
                      duration: t.sortDuration,
                      date: t.sortDate,
                    };
                    const isSelected = currentSort === key;
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          onSortChange(key);
                          setIsSortOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                          isSelected ? 'font-semibold' : 'font-medium'
                        }`}
                        style={{
                          color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)',
                        }}
                      >
                        <span>{labels[key]}</span>
                        {isSelected && (
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: 'var(--accent-color)' }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Settings trigger */}
          <button
            onClick={onOpenSettings}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 transition-all"
          >
            <Settings className="w-5 h-5 stroke-[2]" />
          </button>
        </div>
      </div>

      {/* Expandable Search Input */}
      {isSearchOpen && (
        <div className="pt-1 pb-2 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full border text-sm rounded-full pl-10 pr-9 py-2 focus:outline-none"
              style={{
                backgroundColor: 'var(--card-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => {
              setIsSearchOpen(false);
              onSearchChange('');
            }}
            className="text-xs px-2 py-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
        </div>
      )}
    </header>
  );
};
