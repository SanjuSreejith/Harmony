import React, { useState, useEffect } from 'react';
import {
  Home,
  Search,
  Library,
  Heart,
  Download,
  History,
  FolderPlus,
  Sliders,
  Settings,
  Moon,
  Sparkles,
  Wifi,
  Cloud,
  Laptop,
  CheckCircle2,
  Keyboard,
  DownloadCloud
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { getServerSelection, setServerSelection, SERVER_MODES } from '../services/api';

export default function DesktopSidebar({ activeTab, setActiveTab }) {
  const {
    favorites,
    downloadedTracks,
    history,
    playlists,
    sleepTimerTime,
    setShowSleepTimer,
    setShowPreferencesModal,
    setShowSettingsModal,
    isInstalled,
    triggerInstall,
    showToast
  } = usePlayer();

  const [serverMode, setServerMode] = useState(() => getServerSelection().mode || SERVER_MODES.AUTO);

  useEffect(() => {
    function onServerChanged(e) {
      if (e.detail) setServerMode(e.detail);
    }
    window.addEventListener('harmoniq:server-mode-changed', onServerChanged);
    return () => window.removeEventListener('harmoniq:server-mode-changed', onServerChanged);
  }, []);

  function handleSwitchMode(mode) {
    setServerSelection(mode);
    setServerMode(mode);
    window.dispatchEvent(new CustomEvent('harmoniq:server-mode-changed', { detail: mode }));
    if (mode === SERVER_MODES.CLOUD) {
      if (showToast) showToast('Switched to 24/7 Cloud Server (Render) ☁️', 'info');
    } else {
      if (showToast) showToast('Switched to Local PC Server (LAN/USB) 💻', 'info');
    }
  }

  const mainNavItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'library', label: 'Your Library', icon: Library },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-[#07090e]/95 backdrop-blur-xl border-r border-white/5 z-30 select-none">
      {/* Brand Header */}
      <div className="p-5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <span className="text-black font-black text-lg tracking-tighter">H</span>
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
              Harmoniq
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                PRO
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Ad-Free Music Engine</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="px-3 py-4 space-y-1">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Menu
        </p>
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (activeTab === item.id && item.id === 'home') {
                  window.dispatchEvent(new CustomEvent('harmoniq:refresh-home'));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                  setActiveTab(item.id);
                }
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Library Shortcuts */}
      <div className="px-3 py-2 flex-1 overflow-y-auto no-scrollbar space-y-1">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Collections
        </p>
        
        <button
          onClick={() => {
            setActiveTab('library');
            window.dispatchEvent(new CustomEvent('harmoniq:nav-library', { detail: 'favorites' }));
          }}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Heart className="w-3.5 h-3.5 fill-current" />
            </div>
            <span>Liked Songs</span>
          </div>
          <span className="text-[11px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">
            {favorites?.length || 0}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('library');
            window.dispatchEvent(new CustomEvent('harmoniq:nav-library', { detail: 'downloads' }));
          }}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Download className="w-3.5 h-3.5" />
            </div>
            <span>Offline Music</span>
          </div>
          <span className="text-[11px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">
            {downloadedTracks?.length || 0}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('library');
            window.dispatchEvent(new CustomEvent('harmoniq:nav-library', { detail: 'history' }));
          }}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <History className="w-3.5 h-3.5" />
            </div>
            <span>Recent Plays</span>
          </div>
          <span className="text-[11px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">
            {history?.length || 0}
          </span>
        </button>

        {/* User Playlists */}
        {playlists && playlists.length > 0 && (
          <div className="pt-2">
            <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Playlists ({playlists.length})
            </p>
            <div className="space-y-0.5 max-h-36 overflow-y-auto no-scrollbar">
              {playlists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => {
                    setActiveTab('library');
                    window.dispatchEvent(new CustomEvent('harmoniq:nav-library', { detail: pl.id }));
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 truncate transition-colors text-left"
                >
                  <span className="truncate">{pl.name}</span>
                  <span className="text-[10px] text-slate-500 ml-2">{pl.tracks?.length || 0}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts Hint */}
        <div className="pt-3">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
              <span>PC Shortcuts</span>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span>Play / Pause</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">Space</kbd>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span>Seek ±10s</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">← / →</kbd>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span>Next / Prev</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">N / P</kbd>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span>Like / Mute</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">L / M</kbd>
            </div>
          </div>
        </div>

        {/* 1-Click Server Switcher: PC Local vs 24/7 Cloud */}
        <div className="pt-2">
          <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-white">
                {serverMode === SERVER_MODES.CLOUD ? (
                  <Cloud className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <Laptop className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>Server Mode</span>
              </div>
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                serverMode === SERVER_MODES.CLOUD
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                {serverMode === SERVER_MODES.CLOUD ? '24/7 Cloud' : (serverMode === SERVER_MODES.AUTO ? 'Auto' : 'PC LAN')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <button
                onClick={() => handleSwitchMode(SERVER_MODES.CLOUD)}
                className={`py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1 ${
                  serverMode === SERVER_MODES.CLOUD
                    ? 'bg-cyan-400 text-black shadow-md'
                    : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title="Connect to 24/7 Render Cloud Server (works everywhere without PC)"
              >
                <Cloud className="w-3 h-3" />
                <span>Cloud</span>
              </button>

              <button
                onClick={() => handleSwitchMode(SERVER_MODES.USB)}
                className={`py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1 ${
                  serverMode === SERVER_MODES.USB || serverMode === SERVER_MODES.WIFI
                    ? 'bg-emerald-400 text-black shadow-md'
                    : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title="Connect to Local PC Server (Ultra-low latency streaming)"
              >
                <Laptop className="w-3 h-3" />
                <span>PC Server</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="p-3 border-t border-white/5 space-y-1 bg-[#05070b]">
        {!isInstalled && (
          <button
            onClick={triggerInstall}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black text-xs font-bold shadow-md hover:brightness-110 active:scale-95 transition-all mb-2"
          >
            <DownloadCloud className="w-4 h-4" />
            <span>Install Desktop App</span>
          </button>
        )}

        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => setShowPreferencesModal(true)}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-[10px]"
            title="Music Preferences & Languages"
          >
            <Sliders className="w-4 h-4 text-emerald-400 mb-1" />
            <span>Vibes</span>
          </button>

          <button
            onClick={() => setShowSleepTimer(true)}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-colors text-[10px] ${
              sleepTimerTime !== null
                ? 'text-indigo-400 bg-indigo-500/10'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Sleep Timer"
          >
            <Moon className="w-4 h-4 mb-1" />
            <span>{sleepTimerTime !== null ? `${Math.floor(sleepTimerTime / 60)}m` : 'Timer'}</span>
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-[10px]"
            title="App & Audio Settings"
          >
            <Settings className="w-4 h-4 text-slate-300 mb-1" />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
