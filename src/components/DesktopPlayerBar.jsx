import React, { useState, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Download,
  Check,
  Plus,
  Tv,
  Mic2,
  ListMusic,
  Volume2,
  Volume1,
  VolumeX,
  Maximize2,
  Music,
  Loader2
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import AddToPlaylistModal from './AddToPlaylistModal';

export default function DesktopPlayerBar() {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    togglePlay,
    playNext,
    playPrevious,
    currentTime,
    duration,
    buffered,
    seekTo,
    toggleFavorite,
    isFavorite,
    downloadTrack,
    isDownloaded,
    downloadingTrackId,
    repeatMode,
    toggleRepeatMode,
    isShuffle,
    setIsShuffle,
    isVideoMode,
    setIsVideoMode,
    showQueueSheet,
    setShowQueueSheet,
    setIsNowPlayingExpanded,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    audioQuality
  } = usePlayer();

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const [hoverScrubPercent, setHoverScrubPercent] = useState(null);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const progressBarRef = useRef(null);

  if (!currentTrack) return null;

  const safeDuration = (typeof duration === 'number' && duration > 0 && isFinite(duration))
    ? duration
    : (currentTrack.duration > 0 ? currentTrack.duration : 180);

  const displayTime = isScrubbing ? scrubValue : (typeof currentTime === 'number' && isFinite(currentTime) ? currentTime : 0);
  const progressPercent = safeDuration > 0 ? Math.min(100, Math.max(0, (displayTime / safeDuration) * 100)) : 0;
  const safeBuffered = (typeof buffered === 'number' && isFinite(buffered)) ? buffered : 0;
  const bufferPercent = Math.min(100, Math.max(0, safeBuffered));

  const isFav = isFavorite(currentTrack.id);
  const downloaded = isDownloaded(currentTrack.id);
  const isDownloading = downloadingTrackId === currentTrack.id;

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function handleProgressBarClick(e) {
    if (!progressBarRef.current || safeDuration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = clickX / rect.width;
    const newTime = percent * safeDuration;
    seekTo(newTime);
  }

  function handleProgressBarMouseMove(e) {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    setHoverScrubPercent(percent);
  }

  function handleProgressBarMouseLeave() {
    setHoverScrubPercent(null);
  }

  const qualityBadge = (() => {
    if (audioQuality === 'max') return '160k Studio';
    if (audioQuality === 'saver') return '64k Saver';
    return '130k AAC';
  })();

  return (
    <>
      <div className="hidden md:flex fixed bottom-0 left-0 right-0 h-24 bg-[#0a0d18]/95 backdrop-blur-2xl border-t border-white/10 z-40 px-6 items-center justify-between select-none">
        
        {/* Left Section: Current Track Artwork & Meta */}
        <div className="flex items-center gap-3.5 w-1/4 min-w-[240px] max-w-[340px]">
          <div
            onClick={() => setIsNowPlayingExpanded(true)}
            className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 cursor-pointer group shadow-lg border border-white/5"
            title="Click to expand Now Playing"
          >
            {currentTrack.thumbnail ? (
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400">
                <Music className="w-6 h-6" />
              </div>
            )}
            
            {/* Animated Equalizer Overlay when playing */}
            {isPlaying && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-[3px] backdrop-blur-[1px]">
                <span className="w-1 bg-emerald-400 rounded-full animate-eq-1" />
                <span className="w-1 bg-cyan-400 rounded-full animate-eq-2" />
                <span className="w-1 bg-emerald-400 rounded-full animate-eq-3" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h4
              onClick={() => setIsNowPlayingExpanded(true)}
              className="text-sm font-bold text-white truncate cursor-pointer hover:underline hover:text-emerald-300 transition-colors"
              title={currentTrack.title}
            >
              {currentTrack.title}
            </h4>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {currentTrack.artist}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-white/5 text-slate-400 border border-white/5">
                {qualityBadge}
              </span>
            </div>
          </div>

          {/* Quick Action Icons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => toggleFavorite(currentTrack)}
              className={`p-1.5 rounded-lg transition-colors ${
                isFav
                  ? 'text-red-500 hover:text-red-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title={isFav ? 'Remove from Favorites' : 'Add to Favorites'}
            >
              <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={() => downloadTrack(currentTrack)}
              disabled={isDownloading}
              className={`p-1.5 rounded-lg transition-colors ${
                downloaded
                  ? 'text-emerald-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title={downloaded ? 'Downloaded Offline' : 'Download for Offline'}
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              ) : downloaded ? (
                <Check className="w-4 h-4 stroke-[2.5px]" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={() => setShowPlaylistModal(true)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              title="Add to Playlist"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center Section: Primary Playback Engine & Scrubber */}
        <div className="flex-1 max-w-2xl px-6 flex flex-col items-center gap-1.5">
          {/* Controls Bar */}
          <div className="flex items-center gap-4">
            {/* Shuffle */}
            <button
              onClick={() => setIsShuffle(!isShuffle)}
              className={`p-2 rounded-lg transition-all relative ${
                isShuffle ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
              }`}
              title={`Shuffle: ${isShuffle ? 'On' : 'Off'}`}
            >
              <Shuffle className="w-4 h-4" />
              {isShuffle && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />
              )}
            </button>

            {/* Skip -10s */}
            <button
              onClick={() => seekTo(Math.max(0, currentTime - 10))}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              title="Rewind 10 seconds"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Previous Track */}
            <button
              onClick={playPrevious}
              className="p-2 text-slate-300 hover:text-white hover:scale-110 active:scale-95 transition-all"
              title="Previous Song (P)"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            {/* Main Play / Pause Button */}
            <button
              onClick={togglePlay}
              className="w-11 h-11 rounded-full bg-emerald-400 text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-[0_0_20px_rgba(52,211,153,0.4)] hover:bg-emerald-300"
              title="Play / Pause (Space)"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-black" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            {/* Next Track */}
            <button
              onClick={playNext}
              className="p-2 text-slate-300 hover:text-white hover:scale-110 active:scale-95 transition-all"
              title="Next Song (N)"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            {/* Skip +10s */}
            <button
              onClick={() => seekTo(Math.min(safeDuration, currentTime + 10))}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              title="Forward 10 seconds"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Repeat Mode */}
            <button
              onClick={toggleRepeatMode}
              className={`p-2 rounded-lg transition-all relative ${
                repeatMode !== 'off' ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
              }`}
              title={`Repeat: ${repeatMode}`}
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-4 h-4" />
              ) : (
                <Repeat className="w-4 h-4" />
              )}
              {repeatMode !== 'off' && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />
              )}
            </button>
          </div>

          {/* Scrubber Progress Bar */}
          <div className="w-full flex items-center gap-3">
            <span className="text-[11px] font-mono font-medium text-slate-400 w-10 text-right">
              {formatTime(displayTime)}
            </span>

            <div
              ref={progressBarRef}
              onClick={handleProgressBarClick}
              onMouseMove={handleProgressBarMouseMove}
              onMouseLeave={handleProgressBarMouseLeave}
              className="relative flex-1 h-2 bg-white/10 rounded-full cursor-pointer group py-1"
            >
              {/* Buffer Bar */}
              <div
                className="absolute top-1/2 -translate-y-1/2 left-0 h-1 bg-white/15 rounded-full transition-all duration-300"
                style={{ width: `${bufferPercent}%` }}
              />

              {/* Progress Bar */}
              <div
                className="absolute top-1/2 -translate-y-1/2 left-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full group-hover:h-1.5 transition-all shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                style={{ width: `${progressPercent}%` }}
              />

              {/* Hover Position Preview Line */}
              {hoverScrubPercent !== null && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-1.5 w-0.5 bg-white/60 pointer-events-none"
                  style={{ left: `${hoverScrubPercent * 100}%` }}
                />
              )}

              {/* Draggable Scrubber Knob */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none -ml-1.5"
                style={{ left: `${progressPercent}%` }}
              />
            </div>

            <span className="text-[11px] font-mono font-medium text-slate-400 w-10">
              {formatTime(safeDuration)}
            </span>
          </div>
        </div>

        {/* Right Section: Audio Utilities & Volume */}
        <div className="flex items-center justify-end gap-3 w-1/4 min-w-[240px] max-w-[340px]">
          {/* Video Toggle */}
          <button
            onClick={() => {
              setIsVideoMode(!isVideoMode);
              setIsNowPlayingExpanded(true);
            }}
            className={`p-2 rounded-lg transition-colors ${
              isVideoMode
                ? 'text-cyan-400 bg-cyan-500/10'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Music Video View"
          >
            <Tv className="w-4 h-4" />
          </button>

          {/* Lyrics Toggle */}
          <button
            onClick={() => setIsNowPlayingExpanded(true)}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            title="Lyrics & Visualizer"
          >
            <Mic2 className="w-4 h-4" />
          </button>

          {/* Queue Toggle */}
          <button
            onClick={() => setShowQueueSheet(!showQueueSheet)}
            className={`p-2 rounded-lg transition-colors relative ${
              showQueueSheet
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Play Queue"
          >
            <ListMusic className="w-4 h-4" />
          </button>

          {/* Volume Control */}
          <div className="flex items-center gap-2 group/vol">
            <button
              onClick={toggleMute}
              className="p-1.5 text-slate-400 hover:text-white transition-colors"
              title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            <div className="w-24 flex items-center">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-emerald-400 hover:h-1.5 transition-all"
                title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              />
            </div>
          </div>

          {/* Fullscreen Modal Expander */}
          <button
            onClick={() => setIsNowPlayingExpanded(true)}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            title="Expand Full Player"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showPlaylistModal && (
        <AddToPlaylistModal
          track={currentTrack}
          isOpen={showPlaylistModal}
          onClose={() => setShowPlaylistModal(false)}
        />
      )}
    </>
  );
}
