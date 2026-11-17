import React, { useMemo, useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Mic2, Loader2 } from 'lucide-react';

export default function LyricsView() {
  const { lyrics, isLoadingLyrics, currentTime, seekTo } = usePlayer();
  const activeLineRef = useRef(null);
  const containerRef = useRef(null);

  // Parse LRC formatted lyrics: [00:12.34] lyric line text
  const parsedLyrics = useMemo(() => {
    if (!lyrics?.syncedLyrics) return null;

    const lines = lyrics.syncedLyrics.split('\n');
    const result = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

    for (const line of lines) {
      const match = line.match(timeRegex);
      if (match) {
        const mins = parseInt(match[1], 10);
        const secs = parseInt(match[2], 10);
        const ms = parseInt(match[3].padEnd(3, '0').slice(0, 3), 10);
        const timeInSeconds = mins * 60 + secs + ms / 1000;
        const text = match[4].trim();
        result.push({ time: timeInSeconds, text });
      }
    }

    return result.sort((a, b) => a.time - b.time);
  }, [lyrics]);

  // Find active line index
  const activeIndex = useMemo(() => {
    if (!parsedLyrics || parsedLyrics.length === 0) return -1;
    for (let i = parsedLyrics.length - 1; i >= 0; i--) {
      if (currentTime >= parsedLyrics[i].time - 0.2) {
        return i;
      }
    }
    return 0;
  }, [parsedLyrics, currentTime]);

  // Auto scroll to active lyric line smoothly
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [activeIndex]);

  if (isLoadingLyrics) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
        <p className="text-xs font-medium">Fetching synchronized lyrics...</p>
      </div>
    );
  }

  if (!lyrics || (!lyrics.syncedLyrics && !lyrics.plainLyrics)) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-center px-4">
        <Mic2 className="w-10 h-10 mb-3 opacity-30 text-slate-400" />
        <p className="text-sm font-semibold text-slate-400">No lyrics available</p>
        <p className="text-xs text-slate-600 mt-1 max-w-[240px]">
          We couldn't find verified lyrics for this track on LRCLIB.
        </p>
      </div>
    );
  }

  // Synced Karaoke View
  if (parsedLyrics && parsedLyrics.length > 0) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full overflow-y-auto px-4 py-8 space-y-6 no-scrollbar text-center"
      >
        {parsedLyrics.map((line, idx) => {
          const isActive = idx === activeIndex;
          const isPassed = idx < activeIndex;

          return (
            <p
              key={idx}
              ref={isActive ? activeLineRef : null}
              onClick={() => seekTo(line.time)}
              className={`transition-all duration-300 cursor-pointer font-bold select-none ${
                isActive
                  ? 'text-white text-xl sm:text-2xl scale-105 drop-shadow-[0_0_12px_rgba(255,255,255,0.7)]'
                  : isPassed
                  ? 'text-slate-500 text-base sm:text-lg opacity-60 hover:opacity-100'
                  : 'text-slate-400 text-base sm:text-lg opacity-40 hover:opacity-80'
              }`}
            >
              {line.text || '♪ ♪ ♪'}
            </p>
          );
        })}
      </div>
    );
  }

  // Plain lyrics fallback
  return (
    <div className="w-full h-full overflow-y-auto px-4 py-6 whitespace-pre-line text-center text-slate-300 leading-relaxed no-scrollbar text-sm">
      {lyrics.plainLyrics}
    </div>
  );
}
