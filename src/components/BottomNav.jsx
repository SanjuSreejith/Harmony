import React from 'react';
import { Home, Search, Library, Moon, ListMusic } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export default function BottomNav({ activeTab, setActiveTab }) {
  const { sleepTimerTime, setShowSleepTimer, queue } = usePlayer();

  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'library', label: 'Library', icon: Library },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass-nav safe-bottom select-none">
      <div className="max-w-md mx-auto flex items-center justify-around px-4 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (activeTab === tab.id && tab.id === 'home') {
                  window.dispatchEvent(new CustomEvent('harmoniq:refresh-home'));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                  setActiveTab(tab.id);
                }
              }}
              className={`flex flex-col items-center justify-center py-1 px-4 transition-all duration-200 relative ${
                isActive ? 'text-emerald-400 scale-105' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className={`w-6 h-6 transition-transform ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className="text-[11px] font-medium tracking-tight mt-1">{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          );
        })}

        {/* Quick Sleep Timer trigger in navbar */}
        <button
          onClick={() => setShowSleepTimer(true)}
          className={`flex flex-col items-center justify-center py-1 px-3 transition-all ${
            sleepTimerTime !== null ? 'text-indigo-400' : 'text-slate-400 hover:text-white'
          }`}
          title="Sleep Timer"
        >
          <Moon className="w-6 h-6" />
          <span className="text-[11px] font-medium tracking-tight mt-1">
            {sleepTimerTime !== null
              ? `${Math.floor(sleepTimerTime / 60)}m`
              : 'Timer'}
          </span>
        </button>
      </div>
    </nav>
  );
}
