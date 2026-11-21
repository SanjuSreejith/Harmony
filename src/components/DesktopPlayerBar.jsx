import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Volume1,
  Heart,
  Download,
  CheckCircle2,
  ListMusic,
  Mic2,
  Maximize2,
  Moon,
  Sparkles
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import MusicScrubber from './MusicScrubber';

export default function DesktopPlayerBar() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    buffered,
    togglePlay,
    playNext,
    playPrevious,
    seekTo,
    isShuffle,
    setIsShuffle,
    repeatMode,
    toggleRepeatMode,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    toggleFavorite,
    isFavorite,
    downloadTrack,
    isDownloaded,
    downloadingTrackId,
    showQueueSheet,
    setShowQueueSheet,
    setShowSleepTimer,
    setIsNowPlayingExpanded,
    useDirectPlayer,
    audioQuality,
    isLoading
  } = usePlayer();

  if (!currentTrack) return null;

  const isFav = isFavorite(currentTrack.id);
  const isDown = isDownloaded(currentTrack.id);
  const isDownloading = downloadingTrackId === currentTrack.id;

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  const effectiveVolume = isMuted ? 0 : (volume ?? 1);

  return (
    <footer className="hidden md:flex fixed bottom-0 left-0 right-0 h-24 bg-[#08090f]/95 border-t border-white/10 backdrop-blur-2xl z-40 px-6 items-center justify-between select-none">
      {/* Left: Track Info */}
      <div className="flex items-center gap-4 w-72 min-w-0">
        <div
          onClick={() => setIsNowPlayingExpanded(true)}
          className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 cursor-pointer shadow-md group"
          title="Click to expand player"
        >
          <img
            src={currentTrack.thumbnail}
            alt={currentTrack.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Maximize2 className="w-4 h-4 text-white" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <h4
            onClick={() => setIsNowPlayingExpanded(true)}
            className="text-sm font-bold text-white truncate cursor-pointer hover:underline"
            title={currentTrack.title}
          >
            {currentTrack.title}
          </h4>
          <p className="text-xs text-slate-400 truncate mt-0.5">
            {currentTrack.displayArtist || currentTrack.artist || 'Unknown Artist'}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Favorite Button */}
          <button
            onClick={() => toggleFavorite(currentTrack)}
            title={isFav ? 'Remove from Favorites' : 'Add to Favorites'}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 active:scale-90 transition-all"
          >
            <Heart className={`w-4 h-4 ${isFav ? 'text-rose-500 fill-rose-500' : ''}`} />
          </button>

          {/* Download Button */}
          <button
            onClick={() => downloadTrack(currentTrack)}
            disabled={isDown || isDownloading}
            title={isDown ? 'Downloaded Offline' : 'Download for Offline Playback'}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 active:scale-90 transition-all disabled:cursor-default"
          >
            {isDown ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : isDownloading ? (
              <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Center: Playback Controls & Scrubber */}
      <div className="flex-1 max-w-2xl px-6 flex flex-col items-center gap-1.5">
        {/* Buttons Row */}
        <div className="flex items-center gap-4">
          {/* Shuffle */}
          <button
            onClick={() => setIsShuffle(!isShuffle)}
            title={`Shuffle: ${isShuffle ? 'On' : 'Off'}`}
            className={`p-2 rounded-xl transition-all ${
              isShuffle ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {/* Previous */}
          <button
            onClick={playPrevious}
            title="Previous (P)"
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          {/* Play / Pause Circular Button */}
          <button
            onClick={togglePlay}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            className="w-10 h-10 rounded-full bg-emerald-400 hover:bg-emerald-300 active:scale-95 text-black flex items-center justify-center shadow-lg shadow-emerald-500/25 transition-all"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={playNext}
            title="Next (N)"
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          {/* Repeat */}
          <button
            onClick={toggleRepeatMode}
            title={`Repeat: ${repeatMode}`}
            className={`p-2 rounded-xl transition-all ${
              repeatMode !== 'off' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
          </button>
        </div>

        {/* Scrubber Row */}
        {(() => {
          const safeDuration = duration > 5 ? duration : (currentTrack?.duration > 5 ? currentTrack.duration : 180);
          return (
            <div className="w-full flex items-center gap-3">
              <span className="text-[11px] font-mono text-slate-400 w-10 text-right">
                {formatTime(currentTime)}
              </span>
              <div className="flex-1">
                <MusicScrubber
                  currentTime={currentTime}
                  duration={safeDuration}
                  buffered={buffered}
                  isLoading={isLoading}
                  onSeek={seekTo}
                  hideTimeRow={true}
                />
              </div>
              <span className="text-[11px] font-mono text-slate-400 w-10 text-left">
                {formatTime(safeDuration)}
              </span>
            </div>
          );
        })()}
      </div>

      {/* Right: Actions & Volume */}
      <div className="flex items-center justify-end gap-3 w-72">
        {/* Lyrics Button */}
        <button
          onClick={() => setIsNowPlayingExpanded(true)}
          title="Synced Lyrics"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <Mic2 className="w-4 h-4" />
        </button>

        {/* Queue Button */}
        <button
          onClick={() => setShowQueueSheet(!showQueueSheet)}
          title="Play Queue"
          className={`p-2 rounded-xl transition-all ${
            showQueueSheet ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Sleep Timer Button */}
        <button
          onClick={() => setShowSleepTimer(true)}
          title="Sleep Timer"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <Moon className="w-4 h-4" />
        </button>

        {/* Volume Controls */}
        <div className="flex items-center gap-2 pl-2 border-l border-white/10">
          <button
            onClick={toggleMute}
            title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            {isMuted || effectiveVolume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : effectiveVolume < 0.5 ? (
              <Volume1 className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={effectiveVolume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 lg:w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            title={`Volume: ${Math.round(effectiveVolume * 100)}%`}
          />
        </div>

        {/* Expand Player */}
        <button
          onClick={() => setIsNowPlayingExpanded(true)}
          title="Expand Player"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all ml-1"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </footer>
  );
}
