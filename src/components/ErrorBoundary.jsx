import React from 'react';
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Harmoniq Crash Protected]', error, errorInfo);
    try {
      localStorage.setItem(
        'harmoniq_last_crash',
        JSON.stringify({
          message: error?.message,
          stack: error?.stack,
          info: errorInfo?.componentStack,
          time: Date.now()
        })
      );
    } catch (e) {}
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isOffline = typeof navigator !== 'undefined' && (!navigator.onLine || /network|fetch|offline|load failed|abort/i.test(this.state.error?.message || ''));

      if (isOffline) {
        return (
          <div className="min-h-screen bg-[#08080c] text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <WifiOff className="w-8 h-8" />
            </div>
            <div className="space-y-1.5 max-w-xs">
              <h2 className="text-lg font-bold text-white">You're Offline</h2>
              <p className="text-xs text-slate-400">
                No internet connection detected. Connect to Wi-Fi or mobile data to stream, or enjoy your downloaded music.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 w-full max-w-xs pt-2">
              <button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500 text-black text-xs font-bold shadow-lg hover:bg-emerald-400 active:scale-95 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Connection</span>
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-[#08080c] text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">Something interrupted playback</h2>
            <p className="text-xs text-slate-400 max-w-xs">
              Harmoniq caught and isolated the error safely. Tap below to resume your music.
            </p>
            {this.state.error?.message && (
              <p className="text-[10px] text-red-300 font-mono bg-red-950/60 p-2 rounded-xl border border-red-500/30 max-w-xs mx-auto break-words mt-2">
                {this.state.error.message}
              </p>
            )}
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-500 text-black text-xs font-bold shadow-lg hover:bg-emerald-400 active:scale-95 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Resume Harmoniq</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
