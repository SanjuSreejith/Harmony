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

  componentDidMount() {
    window.addEventListener('online', this.handleAutoRecover);
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleAutoRecover);
  }

  handleAutoRecover = () => {
    if (this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const isOffline = typeof navigator !== 'undefined' && (!navigator.onLine || /network|fetch|offline|load failed|abort/i.test(this.state.error?.message || ''));

      // If network temporarily drops in background or browser switches apps:
      // NEVER unmount the music player or interrupt playback!
      if (isOffline) {
        return this.props.children;
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
