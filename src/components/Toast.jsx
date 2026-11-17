import React from 'react';
import { CheckCircle2, AlertCircle, Info, Sparkles, Download } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export default function Toast() {
  const { toast } = usePlayer();

  if (!toast) return null;

  const iconMap = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />,
    download: <Download className="w-4 h-4 text-cyan-400 animate-bounce flex-shrink-0" />,
    info: <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />,
  };

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] max-w-xs w-auto px-4 py-2.5 rounded-2xl glass-player shadow-2xl border border-white/15 flex items-center gap-2.5 pointer-events-none animate-in fade-in slide-in-from-top duration-300">
      {iconMap[toast.type] || iconMap.info}
      <p className="text-xs font-semibold text-white tracking-tight leading-tight">
        {toast.message}
      </p>
    </div>
  );
}
