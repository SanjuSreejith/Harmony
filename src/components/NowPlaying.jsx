import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  Heart,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  ListMusic,
  Mic2,
  Tv,
  Radio,
  Moon,
  Volume2,
  VolumeX,
  PlusCircle,
  Download,
  Check,
  Loader2,
  Sliders,
  Gauge,
  Music,
  Cloud,
  Laptop
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { getServerSelection, setServerSelection, SERVER_MODES } from '../services/api';
import LyricsView from './LyricsView';
import AudioVisualizer from './AudioVisualizer';
import AddToPlaylistModal from './AddToPlaylistModal';
import MusicScrubber from './MusicScrubber';
import SyncedVideoPlayer from './SyncedVideoPlayer';
import { getAverageRGB } from '../services/colorExtractor';

export default function NowPlaying() {
  const {
    currentTrack,
    isPlaying,
    setIsPlaying,
    isLoading,
    togglePlay,
    pauseTrack,
    resumeTrack,
    syncAudioToVideo,
    isVideoMode,
    setIsVideoMode,
    audioRef,
    playNext,
    playPrevious,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    buffered,
    seekTo,
    isNowPlayingExpanded,
    setIsNowPlayingExpanded,
    repeatMode,
    toggleRepeatMode,
    isShuffle,
    setIsShuffle,
    autoplay,
    setAutoplay,
    toggleFavorite,
    isFavorite,
    setShowQueueSheet,
    setShowSleepTimer,
    setShowSettingsModal,
    sleepTimerTime,
    playlists,
    addTrackToPlaylist,
    downloadTrack,
    isDownloaded,
    downloadingTrackId,
    audioQuality,
    ambientGlow,
    playbackSpeed,
    setPlaybackSpeed,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    dominantColor,
    setDominantColor
  } = usePlayer();

  const [activeTab, setActiveTab] = useState('player'); // 'player' | 'lyrics' | 'video'
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [showSoundControls, setShowSoundControls] = useState(false);
  const [serverMode, setServerMode] = useState(() => getServerSelection().mode);

  useEffect(() => {
    function onServerModeChanged(e) {
      if (e.detail) setServerMode(e.detail);
    }
    window.addEventListener('harmoniq:server-mode-changed', onServerModeChanged);
    return () => window.removeEventListener('harmoniq:server-mode-changed', onServerModeChanged);
  }, []);

  function handleQuickToggleServer(e) {
    e.stopPropagation();
    const nextMode = serverMode === SERVER_MODES.CLOUD ? SERVER_MODES.AUTO : SERVER_MODES.CLOUD;
    setServerSelection(nextMode);
    setServerMode(nextMode);
    window.dispatchEvent(new CustomEvent('harmoniq:server-mode-changed', { detail: nextMode }));
  }

  // Swipe gesture state
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    if (!isSeeking) {
      setSeekValue(currentTime);
    }
  }, [currentTime, isSeeking]);

  // Extract ambient color when track thumbnail changes
  useEffect(() => {
    if (currentTrack?.thumbnail) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = currentTrack.thumbnail;
      img.onload = () => {
        const rgb = getAverageRGB(img);
        setDominantColor(rgb);
      };
    }
  }, [currentTrack?.thumbnail]);

  const videoCurrentTimeRef = useRef(0);

  // When track changes, reset tab to audio player mode and reset video time sync
  useEffect(() => {
    videoCurrentTimeRef.current = 0;
    setActiveTab('player');
  }, [currentTrack?.id]);

  function handleTabChange(nextTab) {
    if (nextTab === activeTab) return;

    if (nextTab === 'video') {
      // Switching to video: capture current audio timestamp
      const curTime = isFinite(currentTime) ? Math.max(0, currentTime) : 0;
      videoCurrentTimeRef.current = curTime;
      setIsVideoMode(true);
      // Silently pause background audio element so it does not double-play with the video
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setActiveTab('video');
      setIsPlaying(true);
    } else {
      // Switching back to audio or lyrics: sync time back to audio engine
      if (activeTab === 'video') {
        const targetSec = (typeof videoCurrentTimeRef.current === 'number' && isFinite(videoCurrentTimeRef.current) && videoCurrentTimeRef.current > 0)
          ? videoCurrentTimeRef.current
          : (isFinite(currentTime) && currentTime > 0 ? currentTime : 0);
        setIsVideoMode(false);
        setActiveTab(nextTab);
        syncAudioToVideo(targetSec);
        if (isPlaying) {
          resumeTrack(targetSec);
        }
      } else {
        setActiveTab(nextTab);
      }
    }
  }

  function handleCollapse() {
    if (activeTab === 'video') {
      const targetSec = (typeof videoCurrentTimeRef.current === 'number' && isFinite(videoCurrentTimeRef.current) && videoCurrentTimeRef.current > 0)
        ? videoCurrentTimeRef.current
        : (isFinite(currentTime) && currentTime > 0 ? currentTime : 0);
      setIsVideoMode(false);
      setActiveTab('player');
      try {
        syncAudioToVideo(targetSec);
        if (isPlaying) {
          resumeTrack(targetSec);
        }
      } catch (e) {}
    }
    setIsNowPlayingExpanded(false);
  }

  if (!isNowPlayingExpanded || !currentTrack) return null;

  const isFav = isFavorite(currentTrack.id);
  const downloaded = isDownloaded(currentTrack.id);
  const isDownloading = downloadingTrackId === currentTrack.id;

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function handleSeekChange(e) {
    setIsSeeking(true);
    setSeekValue(parseFloat(e.target.value));
  }

  function handleSeekCommit(e) {
    const val = parseFloat(e.target.value);
    seekTo(val);
    setIsSeeking(false);
  }

  // Touch Swipe Handlers for mobile gestures
  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e) {
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;

    // Vertical swipe down to dismiss
    if (diffY > 90 && Math.abs(diffX) < 80) {
      handleCollapse();
      return;
    }

    // Horizontal swipe on artwork for Next/Prev
    if (Math.abs(diffX) > 60 && Math.abs(diffY) < 60) {
      if (diffX < 0) {
        playNext(); // Swipe left -> Next
      } else {
        playPrevious(); // Swipe right -> Previous
      }
    }
  }

  const qualityBadge = (() => {
    if (audioQuality === 'max') return '160kbps Studio';
    if (audioQuality === 'saver') return '64kbps Saver';
    return '130kbps AAC';
  })();

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-50 bg-[#08080c] flex flex-col justify-between safe-top safe-bottom overflow-hidden animate-in fade-in slide-in-from-bottom duration-300"
    >
      {/* Dynamic Ambient Background Glow using dominant artwork color */}
      {ambientGlow && (
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 filter blur-[95px] transition-all duration-700"
          style={{
            background: `radial-gradient(circle at 50% 30%, rgba(${dominantColor}, 0.55), transparent 70%)`
          }}
        />
      )}

      <div className="relative z-10 w-full max-w-xl mx-auto h-full flex flex-col justify-between overflow-y-auto no-scrollbar py-2">
        {/* Top Header Bar */}
        <div className="px-5 pt-1 pb-2 flex items-center justify-between">
        <button
          onClick={handleCollapse}
          className="w-10 h-10 rounded-full flex items-center justify-center text-slate-300 hover:text-white bg-white/5 active:scale-90 transition-transform"
          aria-label="Collapse"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center">
          <span className="text-[10px] tracking-widest uppercase font-bold text-slate-400">
            Playing Ad-Free
          </span>
          <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Background Active
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Sound Controls Trigger (Speed & Volume) */}
          <button
            onClick={() => setShowSoundControls(!showSoundControls)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              showSoundControls
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-slate-300 hover:text-white bg-white/5'
            }`}
            title="Speed & Volume"
          >
            <Gauge className="w-4 h-4" />
          </button>

          {/* Settings Trigger */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-300 hover:text-white bg-white/5"
            title="Audio Quality & Settings"
          >
            <Sliders className="w-4 h-4 text-emerald-400" />
          </button>

          {/* Sleep Timer Indicator */}
          <button
            onClick={() => setShowSleepTimer(true)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              sleepTimerTime !== null
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
                : 'text-slate-400 hover:text-white bg-white/5'
            }`}
            title="Sleep timer"
          >
            <Moon className="w-4 h-4" />
          </button>

          {/* Queue Button */}
          <button
            onClick={() => setShowQueueSheet(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-300 hover:text-white bg-white/5 active:scale-90 transition-transform"
            title="Up Next Queue"
          >
            <ListMusic className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Speed & Volume Overlay (when toggled) */}
      {showSoundControls && (
        <div className="relative z-20 mx-6 p-3 rounded-2xl glass-card border border-white/10 space-y-3 animate-in fade-in slide-in-from-top-2">
          {/* Volume Control */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMute}
              className="text-slate-400 hover:text-white p-1"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <span className="text-[11px] font-mono text-slate-400 w-8 text-right">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>

          {/* Playback Speed Chips */}
          <div className="flex items-center justify-between pt-1 border-t border-white/5">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Speed:</span>
            <div className="flex gap-1.5">
              {[0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
                <button
                  key={s}
                  onClick={() => setPlaybackSpeed(s)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition-all ${
                    playbackSpeed === s
                      ? 'bg-emerald-500 text-black font-bold'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* View Switcher: Player / Lyrics / Video */}
      <div className="relative z-10 flex justify-center py-1">
        <div className="flex bg-white/10 p-1 rounded-full backdrop-blur-md">
          <button
            onClick={() => handleTabChange('player')}
            className={`px-4 py-1 rounded-full text-xs font-medium transition-all ${
              activeTab === 'player'
                ? 'bg-white text-black shadow-md font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Audio
          </button>
          <button
            onClick={() => handleTabChange('lyrics')}
            className={`px-4 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'lyrics'
                ? 'bg-white text-black shadow-md font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Mic2 className="w-3.5 h-3.5" />
            Lyrics
          </button>
          <button
            onClick={() => handleTabChange('video')}
            className={`px-4 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'video'
                ? 'bg-white text-black shadow-md font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            Video
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 py-2 overflow-hidden">
        {/* Audio Mode */}
        {activeTab === 'player' && (
          <div className="flex flex-col items-center justify-center my-auto space-y-3">
            {/* Album Artwork with Swipe Gestures */}
            <div className="relative w-full max-w-[310px] aspect-square rounded-3xl overflow-hidden shadow-2xl border border-white/10 glow-accent group select-none">
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none"
              />

              {/* Quality, Server & Offline Badges */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                <div
                  onClick={() => setShowSettingsModal(true)}
                  className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-semibold text-emerald-400 border border-emerald-500/30 cursor-pointer pointer-events-auto flex items-center gap-1 hover:bg-black/80 transition-colors"
                >
                  <span>{qualityBadge}</span>
                  {downloaded && <span className="text-cyan-300">• Offline</span>}
                </div>

                <button
                  onClick={handleQuickToggleServer}
                  className={`pointer-events-auto flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md border transition-all active:scale-95 shadow-md ${
                    serverMode === SERVER_MODES.CLOUD
                      ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40 hover:bg-cyan-900/80'
                      : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/80'
                  }`}
                  title="Switch between 24/7 Cloud Server and PC Server"
                >
                  {serverMode === SERVER_MODES.CLOUD ? (
                    <Cloud className="w-3 h-3 text-cyan-400" />
                  ) : (
                    <Laptop className="w-3 h-3 text-emerald-400" />
                  )}
                  <span>{serverMode === SERVER_MODES.CLOUD ? 'Cloud' : (serverMode === SERVER_MODES.AUTO ? 'Auto' : 'PC')}</span>
                </button>
              </div>
            </div>

            {/* Audio Visualizer underneath artwork */}
            <div className="w-full max-w-[280px]">
              <AudioVisualizer dominantColor={dominantColor} />
            </div>
          </div>
        )}

        {/* Lyrics Mode */}
        {activeTab === 'lyrics' && (
          <div className="w-full h-[360px] my-auto">
            <LyricsView />
          </div>
        )}

        {/* Video Mode: Synced YouTube Player with seamless time synchronization */}
        {activeTab === 'video' && (
          <SyncedVideoPlayer
            key={currentTrack.id}
            track={currentTrack}
            initialTime={videoCurrentTimeRef.current || currentTime || 0}
            isPlaying={isPlaying}
            onTimeUpdate={(t) => {
              videoCurrentTimeRef.current = t;
              setCurrentTime(t);
            }}
            onPlayStateChange={(playing) => {
              setIsPlaying(playing);
            }}
            onDurationChange={(dur) => {
              if (dur > 0) setDuration(dur);
            }}
            onEnded={() => playNext()}
            onSwitchToAudio={() => handleTabChange('player')}
          />
        )}
      </div>

      {/* Bottom Track Controls Section */}
      <div className="relative z-10 px-6 pb-6 pt-1">
        {/* Track Title, Artist, & Actions */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1 min-w-0 pr-3">
            <h2 className="text-xl font-bold text-white tracking-tight truncate">
              {currentTrack.title}
            </h2>
            <p className="text-sm font-medium text-slate-300 truncate mt-0.5">
              {currentTrack.displayArtist || currentTrack.artist || 'YouTube Music'}
            </p>
            {/* Rich credits tags: Movie, Actors, Singers */}
            {(currentTrack.movie || currentTrack.actors?.length > 0 || currentTrack.singers?.length > 0) && (
              <div className="flex items-center gap-1.5 mt-1.5 overflow-x-auto no-scrollbar text-[10px]">
                {currentTrack.movie && (
                  <span className="bg-white/10 px-2 py-0.5 rounded-full text-slate-300 font-medium flex-shrink-0">
                    🎬 {currentTrack.movie}
                  </span>
                )}
                {currentTrack.actors?.length > 0 && (
                  <span className="bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded-full text-cyan-300 font-medium flex-shrink-0">
                    ⭐ {currentTrack.actors.slice(0, 2).join(', ')}
                  </span>
                )}
                {currentTrack.singers?.length > 0 && (
                  <span className="bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full text-emerald-300 font-medium flex-shrink-0">
                    🎤 {currentTrack.singers.slice(0, 2).join(', ')}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Download Offline Button */}
            <button
              onClick={() => downloadTrack(currentTrack)}
              disabled={isDownloading}
              className={`p-2.5 rounded-full border transition-all active:scale-95 ${
                downloaded
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-white/5 text-slate-400 hover:text-white border-white/5'
              }`}
              title={downloaded ? 'Downloaded (Play Offline)' : 'Download to Play Offline'}
            >
              {isDownloading ? (
                <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
              ) : downloaded ? (
                <Check className="w-5 h-5 stroke-[2.5px]" />
              ) : (
                <Download className="w-5 h-5" />
              )}
            </button>

            {/* Add to Playlist button & Modal */}
            <div>
              <button
                onClick={() => setShowPlaylistMenu(true)}
                className="p-2.5 text-slate-400 hover:text-white rounded-full bg-white/5 active:scale-95 transition-transform"
                title="Add to Playlist"
              >
                <PlusCircle className="w-5 h-5" />
              </button>

              <AddToPlaylistModal
                track={currentTrack}
                isOpen={showPlaylistMenu}
                onClose={() => setShowPlaylistMenu(false)}
              />
            </div>

            {/* Favorite / Heart */}
            <button
              onClick={() => toggleFavorite(currentTrack)}
              className="p-2.5 text-slate-400 hover:text-white rounded-full bg-white/5 active:scale-125 transition-transform"
              aria-label="Favorite"
            >
              <Heart
                className={`w-6 h-6 transition-colors ${
                  isFav ? 'fill-red-500 text-red-500' : 'text-slate-300'
                }`}
              />
            </button>
          </div>
        </div>

        {/* High-Precision Interactive Scrubber & Time Preview */}
        <div className="mb-2">
          <MusicScrubber
            currentTime={currentTime}
            duration={duration > 0 ? duration : (currentTrack?.duration > 0 ? currentTrack.duration : 180)}
            buffered={buffered}
            isLoading={isLoading}
            onSeek={(targetTime) => {
              seekTo(targetTime);
              videoCurrentTimeRef.current = targetTime;
            }}
          />
        </div>

        {/* Playback Controls (Shuffle, Prev, Play/Pause, Next, Repeat) */}
        <div className="flex items-center justify-between px-2 pt-1">
          {/* Shuffle */}
          <button
            onClick={() => setIsShuffle(!isShuffle)}
            className={`p-2 transition-colors ${
              isShuffle ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
            title="Shuffle"
          >
            <Shuffle className="w-5 h-5" />
          </button>

          {/* Previous */}
          <button
            onClick={playPrevious}
            className="p-3 text-slate-200 hover:text-white active:scale-90 transition-transform"
            aria-label="Previous"
          >
            <SkipBack className="w-7 h-7 fill-current" />
          </button>

          {/* Play / Pause button (Large Center - operates both Audio & Video) */}
          <button
            onClick={togglePlay}
            disabled={isLoading}
            className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center glow-play active:scale-95 transition-transform shadow-2xl"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-3 border-black border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-7 h-7 fill-current" />
            ) : (
              <Play className="w-7 h-7 fill-current ml-1" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={playNext}
            className="p-3 text-slate-200 hover:text-white active:scale-90 transition-transform"
            aria-label="Next"
          >
            <SkipForward className="w-7 h-7 fill-current" />
          </button>

          {/* Repeat */}
          <button
            onClick={toggleRepeatMode}
            className={`p-2 transition-colors ${
              repeatMode !== 'off' ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
            title={`Repeat mode: ${repeatMode}`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-5 h-5" />
            ) : (
              <Repeat className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Video Mode Quick Switch Pill */}
        {activeTab === 'video' && (
          <div className="flex justify-center mt-2.5">
            <button
              onClick={() => handleTabChange('player')}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold active:scale-95 transition-transform shadow-md"
            >
              <Music className="w-3.5 h-3.5" />
              <span>Switch to Audio View</span>
            </button>
          </div>
        )}

        {/* Bottom Radio / Infinite Autoplay Toggle */}
        <div className="flex items-center justify-center mt-3">
          <button
            onClick={() => setAutoplay(!autoplay)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border transition-all ${
              autoplay
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-white/5 text-slate-400 border-white/10'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Infinite Radio: {autoplay ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
  );
}
