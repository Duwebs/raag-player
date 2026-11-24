import React, { useEffect, useRef, useState, useMemo } from 'react';
import { X, FileText, Upload } from 'lucide-react';
import { LyricLine, LanguageCode } from '../types';
import { TRANSLATIONS } from '../utils/translations';

interface LyricsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  language: LanguageCode;
  lyricsText?: string;
  currentTime: number;
  onSeek: (time: number) => void;
  onUpdateLyrics?: (newLyrics: string) => void;
}

export const LyricsDrawer: React.FC<LyricsDrawerProps> = ({
  isOpen,
  onClose,
  language,
  lyricsText,
  currentTime,
  onSeek,
  onUpdateLyrics,
}) => {
  const t = TRANSLATIONS[language];
  const activeLineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse LRC lines
  const parsedLines = useMemo<LyricLine[]>(() => {
    if (!lyricsText) return [];

    const lines = lyricsText.split('\n');
    const result: LyricLine[] = [];
    const lrcRegex = /\[(\d{2}):(\d{2}(?:\.\d{1,3})?)\](.*)/;

    for (const line of lines) {
      const match = line.match(lrcRegex);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseFloat(match[2]);
        const time = minutes * 60 + seconds;
        const text = match[3].trim();
        if (text) {
          result.push({ time, text });
        }
      } else if (line.trim()) {
        // Un-synced line
        result.push({ time: -1, text: line.trim() });
      }
    }

    return result.sort((a, b) => (a.time > 0 && b.time > 0 ? a.time - b.time : 0));
  }, [lyricsText]);

  // Find active line index
  const activeIndex = useMemo(() => {
    if (!parsedLines.length) return -1;
    let idx = -1;
    for (let i = 0; i < parsedLines.length; i++) {
      if (parsedLines[i].time >= 0 && parsedLines[i].time <= currentTime + 0.3) {
        idx = i;
      } else if (parsedLines[i].time > currentTime + 0.3) {
        break;
      }
    }
    return idx;
  }, [parsedLines, currentTime]);

  // Smooth auto-scroll to active line
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdateLyrics) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) onUpdateLyrics(text);
      };
      reader.readAsText(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md h-[80vh] bg-[#121214] border-t border-[#1E1E22] rounded-t-[30px] p-6 shadow-2xl flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1E1E22]">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#38BDF8]" />
            <h3 className="text-lg font-bold text-white tracking-wide">
              {t.lyrics}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".lrc,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            {onUpdateLyrics && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1 rounded-full bg-[#18181C] hover:bg-[#202026] text-xs text-zinc-300 border border-[#26262E] flex items-center gap-1.5 transition-colors"
                title="Import .LRC file"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import .LRC</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Lyrics Scrollable Area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto py-8 px-2 space-y-6 text-center select-none scrollbar-none"
        >
          {parsedLines.length > 0 ? (
            parsedLines.map((line, idx) => {
              const isActive = idx === activeIndex;
              return (
                <div
                  key={idx}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => line.time >= 0 && onSeek(line.time)}
                  className={`cursor-pointer transition-all duration-300 py-1.5 ${
                    isActive
                      ? 'text-[#38BDF8] text-xl font-bold scale-105'
                      : 'text-zinc-500 hover:text-zinc-300 text-base font-medium'
                  }`}
                >
                  {line.text}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2">
              <FileText className="w-10 h-10 stroke-[1.5]" />
              <p className="text-sm font-medium">{t.noLyrics}</p>
              <p className="text-xs text-zinc-600">
                You can import an .lrc file for synced karaoke playback
              </p>
            </div>
          )}
        </div>

        {/* Footer tip */}
        <div className="pt-2 text-center text-[11px] text-zinc-500 border-t border-[#1E1E22]">
          Tap any lyric line to jump directly to that timestamp
        </div>
      </div>
    </div>
  );
};
