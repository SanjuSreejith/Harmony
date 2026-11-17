import React from 'react';
import { X, Moon, Clock, Check } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export default function SleepTimerModal() {
  const {
    showSleepTimer,
    setShowSleepTimer,
    sleepTimerTime,
    startSleepTimer
  } = usePlayer();

  if (!showSleepTimer) return null;

  const timerOptions = [
    { label: '5 minutes', value: 5 },
    { label: '15 minutes', value: 15 },
    { label: '30 minutes', value: 30 },
    { label: '45 minutes', value: 45 },
    { label: '1 hour', value: 60 },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => setShowSleepTimer(false)}
    >
      <div
        className="w-full max-w-xs bg-slate-900 border border-white/10 rounded-3xl p-5 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Sleep Timer</h3>
          </div>
          <button
            onClick={() => setShowSleepTimer(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-full bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {sleepTimerTime !== null && (
          <div className="mb-4 p-3 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400 animate-spin" />
              <span className="text-xs font-semibold text-indigo-200">
                Stopping in: {Math.floor(sleepTimerTime / 60)}m {sleepTimerTime % 60}s
              </span>
            </div>
            <button
              onClick={() => startSleepTimer(0)}
              className="text-xs font-bold text-red-400 hover:underline"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="space-y-2">
          {timerOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => startSleepTimer(opt.value)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium text-slate-200 transition-colors text-left"
            >
              <span>{opt.label}</span>
              {sleepTimerTime !== null && Math.round(sleepTimerTime / 60) === opt.value && (
                <Check className="w-4 h-4 text-emerald-400" />
              )}
            </button>
          ))}

          {sleepTimerTime !== null && (
            <button
              onClick={() => startSleepTimer(0)}
              className="w-full p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-sm font-semibold text-red-400 transition-colors text-center mt-2"
            >
              Turn Off Timer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
