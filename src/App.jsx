import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import HomeScreen from './components/HomeScreen';
import SearchScreen from './components/SearchScreen';
import LibraryScreen from './components/LibraryScreen';
import MiniPlayer from './components/MiniPlayer';
import BottomNav from './components/BottomNav';
import NowPlaying from './components/NowPlaying';
import QueueSheet from './components/QueueSheet';
import SleepTimerModal from './components/SleepTimerModal';
import PreferencesModal from './components/PreferencesModal';
import SettingsModal from './components/SettingsModal';
import BackgroundDirectPlayer from './components/BackgroundDirectPlayer';
import Toast from './components/Toast';

function MainApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    playNext,
    playPrevious,
    currentTime,
    duration,
    seekTo,
    toggleFavorite,
    toggleMute,
    volume,
    showToast
  } = usePlayer();

  // Desktop keyboard shortcuts (Space, Arrows, L, M, N, P)
  useEffect(() => {
    function handleKeyDown(e) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekTo(Math.min(duration, currentTime + 10));
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekTo(Math.max(0, currentTime - 10));
      } else if (e.key === 'l' || e.key === 'L') {
        if (currentTrack) toggleFavorite(currentTrack);
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      } else if (e.key === 'n' || e.key === 'N') {
        playNext();
      } else if (e.key === 'p' || e.key === 'P') {
        playPrevious();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTrack, currentTime, duration, isPlaying, volume]);

  return (
    <div className="min-h-screen bg-[#08080c] text-white flex flex-col relative selection:bg-emerald-500 selection:text-black">
      {/* Toast Notification Pill */}
      <Toast />

      {/* Persistent Offline Mode Banner */}
      {!isOnline && (
        <div className="sticky top-0 z-50 px-4 py-2 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-b border-amber-500/30 backdrop-blur-md flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="font-semibold">Offline Mode • Downloaded music ready</span>
          </div>
          <button
            onClick={() => setActiveTab('library')}
            className="px-2.5 py-1 rounded-lg bg-amber-400 text-black text-[11px] font-bold active:scale-95 transition-transform"
          >
            Downloads
          </button>
        </div>
      )}

      {/* Content Area - Full touch scroll support with safe bottom padding */}
      <main className="flex-1 w-full max-w-md mx-auto overflow-y-auto pb-44 px-0">
        {activeTab === 'home' && <HomeScreen onSearchSelect={() => setActiveTab('search')} />}
        {activeTab === 'search' && <SearchScreen />}
        {activeTab === 'library' && <LibraryScreen />}
      </main>

      {/* Floating Mini Player */}
      <MiniPlayer />

      {/* Fixed Bottom Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Fullscreen Now Playing Overlay */}
      <NowPlaying />

      {/* Queue Slide-up Sheet */}
      <QueueSheet />

      {/* Sleep Timer Modal */}
      <SleepTimerModal />

      {/* Music Preferences / Recommendation Modal */}
      <PreferencesModal />

      {/* App Settings Modal */}
      <SettingsModal />

      {/* Zero-latency ad-free fallback audio engine */}
      <BackgroundDirectPlayer />
    </div>
  );
}

export default function App() {
  return (
    <PlayerProvider>
      <MainApp />
    </PlayerProvider>
  );
}
