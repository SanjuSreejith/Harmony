import React from 'react';
import {
  Home,
  Search,
  Library,
  Heart,
  Download,
  Settings,
  Sparkles,
  Radio,
  DownloadCloud,
  CheckCircle2,
  Music2,
  Server
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export default function DesktopSidebar({ activeTab, setActiveTab }) {
  const {
    favorites,
    downloadedTracks,
    setShowPreferencesModal,
    setShowSettingsModal,
    useDirectPlayer,
    installPrompt,
    isInstalled,
    triggerInstall,
    audioQuality
  } = usePlayer();

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 h-full bg-[#090a10] border-r border-white/5 select-none flex-shrink-0">
      {/* Brand Header */}
      <div className="p-6 pb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20">
          <div className="w-full h-full bg-[#08080c] rounded-[14px] flex items-center justify-center">
            <Music2 className="w-5 h-5 text-emerald-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-base font-black tracking-tight text-white">Harmoniq</h1>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              PRO
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Ad-Free Music Player</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="px-3 py-2 space-y-1">
        <button
          onClick={() => setActiveTab('home')}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'home'
              ? 'bg-emerald-500/15 text-emerald-400 font-bold shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Home className={`w-4 h-4 ${activeTab === 'home' ? 'text-emerald-400' : 'text-slate-400'}`} />
          <span>Home</span>
        </button>

        <button
          onClick={() => setActiveTab('search')}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'search'
              ? 'bg-emerald-500/15 text-emerald-400 font-bold shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Search className={`w-4 h-4 ${activeTab === 'search' ? 'text-emerald-400' : 'text-slate-400'}`} />
          <span>Search</span>
        </button>

        <button
          onClick={() => setActiveTab('library')}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'library'
              ? 'bg-emerald-500/15 text-emerald-400 font-bold shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Library className={`w-4 h-4 ${activeTab === 'library' ? 'text-emerald-400' : 'text-slate-400'}`} />
          <span>Your Library</span>
        </button>
      </nav>

      {/* Library Quick Access */}
      <div className="px-3 pt-4 pb-2">
        <p className="px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
          Collections
        </p>
        <div className="space-y-1">
          <button
            onClick={() => setActiveTab('library')}
            className="w-full flex items-center justify-between px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform">
                <Heart className="w-3.5 h-3.5 fill-current" />
              </div>
              <span className="font-medium">Liked Songs</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">{favorites?.length || 0}</span>
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className="w-full flex items-center justify-between px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <Download className="w-3.5 h-3.5" />
              </div>
              <span className="font-medium">Offline Downloads</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">{downloadedTracks?.length || 0}</span>
          </button>
        </div>
      </div>

      {/* PWA Standalone Install Card (if not yet installed) */}
      {!isInstalled && installPrompt && (
        <div className="px-4 py-3 mx-3 my-2 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-slate-900 to-cyan-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <DownloadCloud className="w-4 h-4" />
            <span className="text-xs font-bold text-white">Install Desktop App</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed mb-2.5">
            Install Harmoniq as a lightweight standalone PC application.
          </p>
          <button
            onClick={triggerInstall}
            className="w-full py-1.5 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 active:scale-95 text-black font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
          >
            <span>Install Now</span>
          </button>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom Status & Settings */}
      <div className="p-4 border-t border-white/5 space-y-2">
        {/* Stream Engine Pill */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-[11px]">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${useDirectPlayer ? 'bg-cyan-400 animate-pulse' : 'bg-emerald-400'}`} />
            <span className="text-slate-400 font-medium">
              {useDirectPlayer ? 'Cloud Direct Stream' : 'PC Server 160kbps'}
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-500">
            {useDirectPlayer ? 'Auto-failover' : 'Lossless'}
          </span>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreferencesModal(true)}
            title="Music Preferences & Mood"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Vibes</span>
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            title="Settings & Server"
            className="flex items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
