import React, { useEffect } from 'react';
import { X, Trash2, Music, Play, Radio, Volume2, Sparkles, Plus, RefreshCw, Loader2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export default function QueueSheet() {
  const {
    showQueueSheet,
    setShowQueueSheet,
    queue,
    queueIndex,
    currentTrack,
    playTrack,
    removeFromQueue,
    clearQueue,
    autoplay,
    setAutoplay,
    mlSuggestions,
    isLoadingSuggestions,
    generateMLQueueForTrack,
    generateAIQueue,
    addSuggestionsToQueue,
    addToQueue
  } = usePlayer();

  useEffect(() => {
    if (showQueueSheet && currentTrack && mlSuggestions.length === 0) {
      generateMLQueueForTrack(currentTrack);
    }
  }, [showQueueSheet, currentTrack?.id]);

  if (!showQueueSheet) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-200">
      <div
        className="w-full max-w-md mx-auto h-[85vh] bg-[#0c101d] rounded-t-3xl border-t border-white/10 flex flex-col safe-bottom overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Play Queue</h3>
            <p className="text-xs text-slate-400">
              {queue.length} {queue.length === 1 ? 'song' : 'songs'} in queue
            </p>
          </div>

          <div className="flex items-center gap-2">
            {currentTrack && (
              <button
                onClick={() => generateAIQueue(currentTrack)}
                disabled={isLoadingSuggestions}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold hover:bg-cyan-500/25 active:scale-95 transition-all disabled:opacity-50"
                title="Populate upcoming queue with intelligent AI songs"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isLoadingSuggestions ? 'animate-spin' : ''}`} />
                <span>AI Queue</span>
              </button>
            )}

            {queue.length > 1 && (
              <button
                onClick={clearQueue}
                className="p-2 text-slate-400 hover:text-red-400 rounded-full hover:bg-white/5 transition-colors"
                title="Clear queue"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setShowQueueSheet(false)}
              className="p-2 text-slate-400 hover:text-white rounded-full bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Queue List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 no-scrollbar">
          {/* Now Playing section */}
          {currentTrack && (
            <div>
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider px-1">
                Now Playing
              </span>
              <div className="mt-2 flex items-center gap-3 p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <img
                  src={currentTrack.thumbnail}
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {currentTrack.title}
                  </p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {currentTrack.artist}
                  </p>
                </div>
                <Volume2 className="w-5 h-5 text-emerald-400 animate-pulse flex-shrink-0" />
              </div>
            </div>
          )}

          {/* Up Next section */}
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Up Next ({queue.length})
              </span>
              <button
                onClick={() => setAutoplay(!autoplay)}
                className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                  autoplay
                    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                    : 'text-slate-500 border-white/10'
                }`}
              >
                <Radio className="w-3 h-3" />
                Infinite Radio: {autoplay ? 'ON' : 'OFF'}
              </button>
            </div>

            {queue.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                Queue is empty. Infinite Radio will automatically queue similar tracks!
              </p>
            ) : (
              <div className="space-y-1.5">
                {queue.map((track, idx) => {
                  const isCurrent = idx === queueIndex;
                  return (
                    <div
                      key={`${track.id}-${idx}`}
                      onClick={() => playTrack(track, null, idx)}
                      className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors ${
                        isCurrent
                          ? 'bg-white/10 text-white'
                          : 'hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      <span className="text-xs font-mono text-slate-500 w-5 text-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <img
                        src={track.thumbnail}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold truncate ${isCurrent ? 'text-emerald-400' : 'text-slate-200'}`}>
                          {track.title}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {track.artist}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromQueue(idx);
                        }}
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
                        title="Remove from queue"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Smart ML Suggestions Section (Based on currently playing song) */}
          <div className="pt-2 border-t border-white/10">
            <div className="flex items-center justify-between px-1 mb-2.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                  AI Suggestions For You
                </span>
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  ML Tuned
                </span>
              </div>

              <div className="flex items-center gap-2">
                {mlSuggestions?.length > 0 && (
                  <button
                    onClick={() => addSuggestionsToQueue(mlSuggestions)}
                    className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add All</span>
                  </button>
                )}
                <button
                  onClick={() => currentTrack && generateMLQueueForTrack(currentTrack)}
                  className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition-colors"
                  title="Refresh ML Suggestions"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSuggestions ? 'animate-spin text-cyan-400' : ''}`} />
                </button>
              </div>
            </div>

            {isLoadingSuggestions && mlSuggestions.length === 0 ? (
              <div className="py-6 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                <p className="text-[11px] font-medium text-slate-400">
                  ML analyzing acoustic vectors & harmonies...
                </p>
              </div>
            ) : mlSuggestions?.length === 0 ? (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center space-y-2">
                <p className="text-xs text-slate-400">
                  Generate ML suggestions based on "{currentTrack?.title || 'current track'}"
                </p>
                <button
                  onClick={() => generateAIQueue(currentTrack)}
                  disabled={isLoadingSuggestions}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-black text-xs font-bold hover:bg-cyan-400 active:scale-95 transition-all flex items-center gap-1.5 mx-auto disabled:opacity-50 shadow-lg"
                >
                  {isLoadingSuggestions ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating AI Queue...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate AI Queue</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {mlSuggestions.slice(0, 10).map((suggestion, idx) => (
                  <div
                    key={`ml-sugg-${suggestion.id}-${idx}`}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group"
                  >
                    <div
                      onClick={() => playTrack(suggestion)}
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer pr-2"
                    >
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                        <img
                          src={suggestion.thumbnail}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Play className="w-4 h-4 text-white fill-current" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate group-hover:text-cyan-400 transition-colors">
                          {suggestion.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                            {suggestion.displayArtist || suggestion.artist}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 truncate max-w-[140px]">
                            {suggestion.mlReason || `${suggestion.mlMatchPercent || 92}% Match`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        addToQueue(suggestion);
                      }}
                      className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex-shrink-0 flex items-center gap-1 text-[10px] font-semibold"
                      title="Add to queue"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Queue</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
