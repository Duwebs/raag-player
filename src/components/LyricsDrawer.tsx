import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ExternalLink,
  MessageSquareQuote,
  PenLine,
  Plus,
  Search,
  Upload,
  X,
} from 'lucide-react';
import { LanguageCode, LyricLine, Track } from '../types';
import { TRANSLATIONS } from '../utils/translations';
import { ExtractedPalette } from '../utils/colorExtractor';
import { AnimatedBottomSheet, CompactTrackHeader } from './MotionPrimitives';

/**
 * Parses .lrc timestamped lines (supporting [mm:ss], [mm:ss.xx], multiple tags per line) or plain text.
 */
export function parseLyricsLines(lyricsText?: string): LyricLine[] {
  if (!lyricsText || !lyricsText.trim()) return [];

  const rawLines = lyricsText.split(/\r?\n/);
  const result: LyricLine[] = [];
  const tagRegex = /\[(\d{1,3}):(\d{2}(?:\.\d{1,3})?)\]/g;

  for (const line of rawLines) {
    const matches = Array.from(line.matchAll(tagRegex));
    if (matches.length > 0) {
      const cleanText = line.replace(tagRegex, '').trim();
      if (!cleanText) continue;
      for (const m of matches) {
        const mins = parseInt(m[1], 10);
        const secs = parseFloat(m[2]);
        result.push({ time: mins * 60 + secs, text: cleanText });
      }
    } else {
      const trimmed = line.trim();
      // Skip LRC metadata tags like [ar:...], [ti:...], [al:...]
      if (trimmed && !/^\[[a-zA-Z]+:.*\]$/.test(trimmed)) {
        result.push({ time: -1, text: trimmed });
      }
    }
  }

  if (result.length > 0 && result.every((l) => l.time >= 0)) {
    return result.sort((a, b) => a.time - b.time);
  }
  return result;
}

/**
 * Computes active lyric index cleanly for synced .lrc playback.
 */
export function getActiveLyricIndex(lines: LyricLine[], currentTime: number): number {
  if (!lines.length) return -1;
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time >= 0 && lines[i].time <= currentTime + 0.3) {
      idx = i;
    } else if (lines[i].time > currentTime + 0.3) {
      break;
    }
  }
  return idx;
}

interface LyricsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  language: LanguageCode;
  track: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onUpdateLyrics: (newLyrics: string) => void;
  palette: ExtractedPalette;
}

export const LyricsDrawer: React.FC<LyricsDrawerProps> = ({
  isOpen,
  onClose,
  language,
  track,
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onSeek,
  onUpdateLyrics,
  palette,
}) => {
  const t = TRANSLATIONS[language];
  const activeLineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [showSearchActions, setShowSearchActions] = useState(false);
  const [draftLyrics, setDraftLyrics] = useState('');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
      setShowSearchActions(false);
      setStatusNotice(null);
    } else {
      setDraftLyrics(track?.lyrics || '');
    }
  }, [isOpen, track?.id, track?.lyrics]);

  const parsedLines = useMemo(() => parseLyricsLines(track?.lyrics), [track?.lyrics]);
  const activeIndex = useMemo(
    () => getActiveLyricIndex(parsedLines, currentTime),
    [parsedLines, currentTime]
  );

  useEffect(() => {
    if (isOpen && !isEditing && activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex, isOpen, isEditing]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result || '').trim();
      if (text) {
        onUpdateLyrics(text);
        setDraftLyrics(text);
        setShowSearchActions(false);
        setStatusNotice('Imported lyrics saved cleanly');
        setTimeout(() => setStatusNotice(null), 2500);
      }
    };
    reader.readAsText(file);
  };

  const handleSaveDraft = () => {
    onUpdateLyrics(draftLyrics.trim());
    setIsEditing(false);
    setStatusNotice(draftLyrics.trim() ? 'Lyrics saved to track' : 'Lyrics cleared');
    setTimeout(() => setStatusNotice(null), 2500);
  };

  const handleSearchWebLyrics = async () => {
    if (!track) return;
    const queryText = `${track.title} ${track.artist !== 'Unknown Artist' ? track.artist : ''} lyrics`.trim();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(queryText);
      }
    } catch {
      // ignore clipboard restriction
    }
    const url = `https://www.google.com/search?q=${encodeURIComponent(queryText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setStatusNotice('Copied query & opened lyrics search');
    setTimeout(() => setStatusNotice(null), 2800);
  };

  return (
    <AnimatedBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      zIndexClass="z-[60]"
      backgroundColor={palette.sheetBackground}
      borderColor={palette.isLight ? 'rgba(43,33,24,0.12)' : 'rgba(255,255,255,0.12)'}
      backdropColor={palette.solidBackground}
      maxHeightClass="max-h-[82vh]"
      fullHeight
      topBanner={
        track ? (
          <div style={{ backgroundColor: palette.solidBackground }}>
            <CompactTrackHeader
              track={track}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              onTogglePlay={onTogglePlay}
              textColor={palette.textColor}
              subTextColor={palette.subTextColor}
              accentColor={palette.barProgress}
            />
          </div>
        ) : null
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".lrc,.txt,text/plain"
        onChange={handleFileUpload}
        className="hidden"
      />

      <div
        className="flex-1 min-h-0 flex flex-col justify-between px-6 pb-6"
        style={{ color: palette.textColor }}
      >
        {/* Status Banner */}
        {statusNotice && (
          <div className="mb-2 px-3 py-1.5 rounded-full bg-black/25 text-xs font-medium text-center animate-in fade-in">
            {statusNotice}
          </div>
        )}

        {isEditing ? (
          /* Inline Lyrics Editor */
          <div className="flex-1 flex flex-col gap-3 min-h-0 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Edit Lyrics</h3>
                <p className="text-[11px]" style={{ color: palette.subTextColor }}>
                  Supports plain lines or [mm:ss.xx] .lrc timestamps
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border min-h-[36px]"
                style={{
                  backgroundColor: palette.sheetElevated,
                  borderColor: palette.isLight ? 'rgba(43,33,24,0.15)' : 'rgba(255,255,255,0.18)',
                }}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>.LRC File</span>
              </button>
            </div>

            <textarea
              value={draftLyrics}
              onChange={(e) => setDraftLyrics(e.target.value)}
              placeholder={`[00:12.50] Paste or type lyrics here...\n[00:18.00] Each timestamped line syncs live!`}
              className="flex-1 w-full rounded-2xl p-4 text-sm font-mono leading-relaxed resize-none focus:outline-none border"
              style={{
                backgroundColor: palette.sheetElevated,
                borderColor: palette.isLight ? 'rgba(43,33,24,0.16)' : 'rgba(255,255,255,0.18)',
                color: palette.textColor,
              }}
              autoFocus
            />

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 min-h-[44px] rounded-full border text-sm font-semibold flex items-center justify-center gap-1.5"
                style={{
                  borderColor: palette.isLight ? 'rgba(43,33,24,0.2)' : 'rgba(255,255,255,0.22)',
                }}
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
              <button
                onClick={handleSaveDraft}
                className="flex-1 min-h-[44px] rounded-full bg-white text-[#18181B] text-sm font-bold flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-transform"
              >
                <Check className="w-4 h-4" />
                <span>Save Lyrics</span>
              </button>
            </div>
          </div>
        ) : parsedLines.length > 0 ? (
          /* Scrollable Synced / Plain Lyrics View */
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-end gap-2 pb-2">
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 active:scale-95 transition-transform"
                style={{
                  backgroundColor: palette.sheetElevated,
                  borderColor: palette.isLight ? 'rgba(43,33,24,0.14)' : 'rgba(255,255,255,0.16)',
                }}
              >
                <PenLine className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 active:scale-95 transition-transform"
                style={{
                  backgroundColor: palette.sheetElevated,
                  borderColor: palette.isLight ? 'rgba(43,33,24,0.14)' : 'rgba(255,255,255,0.16)',
                }}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>.LRC</span>
              </button>
            </div>

            <div
              ref={containerRef}
              className="flex-1 overflow-y-auto py-8 px-2 space-y-5 text-center select-none scrollbar-none"
            >
              {parsedLines.map((line, idx) => {
                const hasTimestamps = line.time >= 0;
                const isActive = hasTimestamps ? idx === activeIndex : false;
                return (
                  <div
                    key={`${idx}-${line.time}`}
                    ref={isActive ? activeLineRef : null}
                    onClick={() => hasTimestamps && onSeek(line.time)}
                    className={`transition-all duration-300 py-1 ${
                      hasTimestamps ? 'cursor-pointer' : ''
                    } ${
                      isActive
                        ? 'text-2xl font-bold scale-[1.03]'
                        : !hasTimestamps
                        ? 'text-lg font-medium'
                        : 'text-lg font-medium opacity-45 hover:opacity-75'
                    }`}
                    style={{
                      color: isActive ? '#FFFFFF' : palette.textColor,
                    }}
                  >
                    {line.text}
                  </div>
                );
              })}
            </div>

            <div
              className="pt-2 text-center text-[11px] border-t"
              style={{
                color: palette.subTextColor,
                borderColor: palette.isLight ? 'rgba(43,33,24,0.12)' : 'rgba(255,255,255,0.12)',
              }}
            >
              {parsedLines.some((l) => l.time >= 0)
                ? 'Tap any lyric line to jump to that timestamp'
                : 'Synced timestamps (.lrc) can be added via Edit'}
            </div>
          </div>
        ) : (
          /* Clean Empty "No lyrics" State with (+) Add & (Search) Action Circles */
          <div className="flex-1 flex flex-col items-center justify-between py-6">
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center opacity-45"
                style={{ backgroundColor: palette.sheetElevated }}
              >
                <MessageSquareQuote className="w-11 h-11 stroke-[1.75]" />
              </div>
              <p className="text-base font-medium" style={{ color: palette.subTextColor }}>
                {t.noLyrics}
              </p>
            </div>

            {showSearchActions && (
              <div className="w-full mb-4 flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <button
                  onClick={handleSearchWebLyrics}
                  className="w-full min-h-[44px] px-4 rounded-2xl border flex items-center justify-between text-sm font-medium active:scale-[0.98] transition-all"
                  style={{
                    backgroundColor: palette.sheetElevated,
                    borderColor: palette.isLight ? 'rgba(43,33,24,0.14)' : 'rgba(255,255,255,0.18)',
                  }}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <ExternalLink className="w-4 h-4 shrink-0" />
                    <span className="truncate">Search “{track?.title}” lyrics online</span>
                  </span>
                  <span className="text-xs opacity-70 shrink-0">Copy &amp; Open</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full min-h-[44px] px-4 rounded-2xl border flex items-center justify-between text-sm font-medium active:scale-[0.98] transition-all"
                  style={{
                    backgroundColor: palette.sheetElevated,
                    borderColor: palette.isLight ? 'rgba(43,33,24,0.14)' : 'rgba(255,255,255,0.18)',
                  }}
                >
                  <span className="flex items-center gap-2.5">
                    <Upload className="w-4 h-4 shrink-0" />
                    <span>Import .lrc / .txt file from device</span>
                  </span>
                </button>
              </div>
            )}

            {/* Two Circular Action Buttons: (+) Add & (Search) */}
            <div className="flex items-center justify-center gap-5 pb-4">
              <button
                onClick={() => setIsEditing(true)}
                className="w-14 h-14 rounded-full border flex items-center justify-center active:scale-90 transition-transform"
                style={{
                  borderColor: palette.isLight ? 'rgba(43,33,24,0.3)' : 'rgba(255,255,255,0.35)',
                  color: palette.textColor,
                }}
                aria-label="Add Lyrics"
                title="Add Lyrics"
              >
                <Plus className="w-6 h-6" />
              </button>

              <button
                onClick={() => setShowSearchActions((prev) => !prev)}
                className="w-14 h-14 rounded-full bg-white text-[#18181B] flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                aria-label="Search or Import Lyrics"
                title="Search / Import .lrc"
              >
                <Search className="w-6 h-6 stroke-[2.2]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AnimatedBottomSheet>
  );
};
