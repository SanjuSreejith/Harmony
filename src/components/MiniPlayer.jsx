import React from 'react';
import { Play, Pause, SkipForward, Heart, Music } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export default function MiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    togglePlay,
    playNext,
    currentTime,
    duration,
    toggleFavorite,
    isFavorite,
    setIsNowPlayingExpanded
  } = usePlayer();

  if (!currentTrack) return null;

  const safeDuration = duration > 5 ? duration : (currentTrack.duration > 5 ? currentTrack.duration : 180);
  const isInitialBuffering = isLoading && (!currentTime || currentTime < 1);
  const progressPercent = (safeDuration > 0 && !isInitialBuffering)
    ? Math.min(100, Math.max(0, (currentTime / safeDuration) * 100))
    : 0;
  const isFav = isFavorite(currentTrack.id);

  return (
    <div className="fixed bottom-[68px] left-0 right-0 z-30 px-3 py-1 pointer-events-auto">
      <div
        onClick={() => setIsNowPlayingExpanded(true)}
        className="max-w-md mx-auto relative overflow-hidden rounded-2xl bg-slate-900/90 backdrop-blur-xl shadow-2xl border border-white/15 cursor-pointer active:scale-[0.99] transition-transform"
      >
        {/* Progress bar line at top */}
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] transition-[width] duration-300 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between p-2.5 gap-3">
          {/* Track Thumbnail with Animated Equalizer Overlay when playing */}
          <div className="relative w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden bg-slate-800 shadow-md">
            {currentTrack.thumbnail ? (
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
                loading="eager"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400">
                <Music className="w-5 h-5" />
              </div>
            )}

            {/* Subtle animated sound wave overlay */}
            {isPlaying && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-[3px] backdrop-blur-[1px]">
                <span className="w-1 bg-emerald-400 rounded-full animate-eq-1" />
                <span className="w-1 bg-cyan-400 rounded-full animate-eq-2" />
                <span className="w-1 bg-emerald-400 rounded-full animate-eq-3" />
              </div>
            )}
          </div>

          {/* Title & Artist info */}
          <div className="flex-1 min-w-0 pr-1">
            <h4 className="text-sm font-bold text-white truncate leading-tight tracking-tight">
              {currentTrack.title}
            </h4>
            <p className="text-xs text-slate-400 truncate mt-0.5 flex items-center gap-1.5">
              <span>{currentTrack.displayArtist || currentTrack.artist || 'Harmoniq'}</span>
              {currentTrack.movie && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-500 truncate">{currentTrack.movie}</span>
                </>
              )}
            </p>
          </div>

          {/* Quick Controls */}
          <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
            {/* Favorite toggle */}
            <button
              onClick={() => toggleFavorite(currentTrack)}
              className="p-2 text-slate-400 hover:text-white transition-colors"
              aria-label="Favorite"
            >
              <Heart
                className={`w-5 h-5 transition-transform active:scale-125 ${
                  isFav ? 'fill-red-500 text-red-500' : ''
                }`}
              />
            </button>

            {/* Play / Pause button */}
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg active:scale-95 transition-transform relative"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isLoading && (
                <span className="absolute -inset-1 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin pointer-events-none" />
              )}
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            {/* Next Track button */}
            <button
              onClick={playNext}
              className="p-2 text-slate-300 hover:text-white transition-colors active:scale-90"
              aria-label="Next track"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
