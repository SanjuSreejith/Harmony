import React, { useState, useRef, useEffect } from 'react';
import { RotateCcw, RotateCw } from 'lucide-react';

export default function MusicScrubber({
  currentTime = 0,
  duration = 0,
  buffered = 0,
  isLoading = false,
  onSeek
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);
  const [hoverPercent, setHoverPercent] = useState(null);
  const [showRemaining, setShowRemaining] = useState(false);

  const barRef = useRef(null);

  // Fallback to reasonable 3-minute duration if metadata not yet resolved so scrubber is always interactive
  const safeDuration = (typeof duration === 'number' && duration > 0 && isFinite(duration)) ? duration : 180;
  
  // Guard: If track is loading and hasn't started playing, strictly lock display time to 0
  const isInitialBuffering = isLoading && (!currentTime || currentTime < 1);
  const displayTime = isDragging 
    ? dragValue 
    : (isInitialBuffering ? 0 : (typeof currentTime === 'number' && isFinite(currentTime) ? currentTime : 0));
  const progressPercent = (safeDuration > 0 && !isInitialBuffering) 
    ? Math.min(100, Math.max(0, (displayTime / safeDuration) * 100)) 
    : 0;
  const safeBuffered = (typeof buffered === 'number' && isFinite(buffered)) ? buffered : 0;
  const bufferPercent = Math.min(100, Math.max(0, safeBuffered));

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function getTimeFromEvent(e) {
    if (!barRef.current || safeDuration <= 0) return 0;
    const rect = barRef.current.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = clickX / rect.width;
    return percent * safeDuration;
  }

  // Pointer scrub events with native pointer capture
  function handlePointerDown(e) {
    if (barRef.current && barRef.current.setPointerCapture) {
      try {
        barRef.current.setPointerCapture(e.pointerId);
      } catch (err) {}
    }
    setIsDragging(true);
    const targetTime = getTimeFromEvent(e);
    setDragValue(targetTime);
  }

  function handlePointerMove(e) {
    if (isDragging) {
      const targetTime = getTimeFromEvent(e);
      setDragValue(targetTime);
    } else if (duration > 0 && barRef.current) {
      const rect = barRef.current.getBoundingClientRect();
      if (rect.width > 0) {
        const percent = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
        setHoverPercent(percent);
      }
    }
  }

  function handlePointerUp(e) {
    if (isDragging) {
      setIsDragging(false);
      const targetTime = getTimeFromEvent(e);
      if (onSeek) onSeek(targetTime);
    }
    if (barRef.current && barRef.current.releasePointerCapture) {
      try {
        barRef.current.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  }

  function handlePointerCancel(e) {
    setIsDragging(false);
    if (barRef.current && barRef.current.releasePointerCapture) {
      try {
        barRef.current.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  }

  function handleMouseLeave() {
    if (!isDragging) {
      setHoverPercent(null);
    }
  }

  function jumpRelative(offsetSeconds) {
    if (onSeek) {
      const target = Math.max(0, Math.min(safeDuration, displayTime + offsetSeconds));
      onSeek(target);
    }
  }

  return (
    <div className="space-y-1.5 select-none">
      {/* Floating Scrubber Track */}
      <div
        ref={barRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onMouseLeave={handleMouseLeave}
        className="relative h-9 -my-1 flex items-center cursor-pointer group touch-none select-none"
      >
        {/* Hover / Drag Time Tooltip Bubble */}
        {(isDragging || hoverPercent !== null) && safeDuration > 0 && (
          <div
            className="absolute -top-7 px-2 py-0.5 rounded-lg bg-slate-900/95 backdrop-blur-md border border-emerald-500/40 text-[10px] font-mono text-emerald-300 shadow-2xl pointer-events-none -translate-x-1/2 transition-opacity z-30"
            style={{
              left: `${isDragging ? progressPercent : (hoverPercent || 0) * 100}%`
            }}
          >
            {formatTime(isDragging ? dragValue : (hoverPercent || 0) * safeDuration)}
          </div>
        )}

        {/* Background Track Rail */}
        <div className={`w-full rounded-full bg-white/10 overflow-hidden relative transition-all duration-150 shadow-inner ${
          isDragging ? 'h-2' : 'h-1.5 group-hover:h-2'
        }`}>
          {/* Buffer Progress */}
          <div
            className="absolute inset-y-0 left-0 bg-white/20 rounded-full transition-all duration-300"
            style={{ width: `${bufferPercent}%` }}
          />

          {/* Active Playback Gradient with Neon Glow */}
          <div
            className={`absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.7)] ${
              isDragging ? 'transition-none' : 'transition-[width] duration-300 ease-linear'
            }`}
            style={{ width: `${progressPercent}%` }}
          />

          {/* Buffering Shimmer when loading */}
          {isInitialBuffering && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent animate-pulse pointer-events-none" />
          )}
        </div>

        {/* Scrubber Knob Thumb - Always sleekly visible, magnifies on drag/hover */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full pointer-events-none z-20 ${
            isDragging
              ? 'w-4 h-4 bg-white shadow-[0_0_16px_rgba(52,211,153,0.95)] border-2 border-emerald-400 scale-125 ring-4 ring-emerald-500/30 transition-none'
              : 'w-3.5 h-3.5 bg-white shadow-[0_0_12px_rgba(52,211,153,0.85)] border-2 border-emerald-400 scale-100 group-hover:scale-125 transition-[left,transform] duration-300 ease-linear'
          }`}
          style={{ left: `${progressPercent}%` }}
        />
      </div>

      {/* Time Display & 10s Jump Controls */}
      <div className="flex items-center justify-between text-xs font-medium text-slate-400 px-0.5">
        <span className="font-mono text-slate-300">{formatTime(displayTime)}</span>

        {/* Quick -10s and +10s Jump buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => jumpRelative(-10)}
            className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/5 transition-colors flex items-center gap-0.5 text-[10px]"
            title="Rewind 10 seconds"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>10</span>
          </button>
          <button
            onClick={() => jumpRelative(10)}
            className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/5 transition-colors flex items-center gap-0.5 text-[10px]"
            title="Forward 10 seconds"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>10</span>
          </button>
        </div>

        {/* Toggle Total vs Remaining Time on click */}
        <button
          onClick={() => setShowRemaining(!showRemaining)}
          className="font-mono hover:text-emerald-400 transition-colors text-right"
          title="Tap to toggle remaining time"
        >
          {showRemaining
            ? `-${formatTime(Math.max(0, safeDuration - displayTime))}`
            : formatTime(duration > 0 ? duration : safeDuration)}
        </button>
      </div>
    </div>
  );
}
