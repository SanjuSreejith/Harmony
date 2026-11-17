import React, { useState, useEffect } from 'react';
import { X, Plus, FolderPlus, Check, Music } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export default function AddToPlaylistModal({ track, isOpen, onClose }) {
  const {
    playlists,
    createPlaylist,
    toggleTrackInPlaylist,
    isTrackInPlaylist
  } = usePlayer();

  const [isCreating, setIsCreating] = useState(playlists.length === 0);
  const [playlistName, setPlaylistName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsCreating(playlists.length === 0);
      setPlaylistName('');
    }
  }, [isOpen, playlists.length]);

  if (!isOpen || !track) return null;

  function handleCreateAndAdd(e) {
    e.preventDefault();
    if (!playlistName.trim()) return;
    createPlaylist(playlistName, track);
    setPlaylistName('');
    setIsCreating(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-slate-900 border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col safe-bottom max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <img
              src={track.thumbnail}
              alt=""
              className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
            />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">Add to Playlist</h3>
              <p className="text-[11px] text-slate-400 truncate">{track.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full bg-white/5 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2 no-scrollbar">
          {/* Create New Playlist Card / Form */}
          {isCreating ? (
            <form
              onSubmit={handleCreateAndAdd}
              className="p-3 rounded-2xl bg-white/5 border border-emerald-500/30 space-y-2.5 animate-in fade-in"
            >
              <p className="text-xs font-bold text-white">New Playlist</p>
              <input
                type="text"
                autoFocus
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                placeholder="e.g. Divine Beats, Chill Mood, Hits"
                className="w-full px-3 py-2 rounded-xl bg-white/10 text-white text-xs border border-white/10 focus:outline-none focus:border-emerald-400"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setPlaylistName('');
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!playlistName.trim()}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-40"
                >
                  Create & Add
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full p-3 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-purple-950/40 border border-emerald-500/30 flex items-center justify-between text-left hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Create New Playlist</p>
                  <p className="text-[10px] text-slate-400">Save this track to a new collection</p>
                </div>
              </div>
              <Plus className="w-4 h-4 text-emerald-400" />
            </button>
          )}

          {/* Existing Playlists */}
          <div className="pt-1 space-y-1.5">
            {playlists.length === 0 && !isCreating && (
              <p className="text-xs text-slate-500 py-6 text-center">
                No playlists yet. Tap "Create New Playlist" above!
              </p>
            )}

            {playlists.map((pl) => {
              const inPlaylist = isTrackInPlaylist(pl.id, track.id);

              return (
                <button
                  key={pl.id}
                  onClick={() => toggleTrackInPlaylist(pl.id, track)}
                  className={`w-full p-2.5 rounded-2xl border flex items-center justify-between text-left transition-all active:scale-[0.99] ${
                    inPlaylist
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-white'
                      : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 flex-shrink-0">
                      <Music className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold truncate ${inPlaylist ? 'text-emerald-400' : 'text-white'}`}>
                        {pl.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {pl.tracks.length} {pl.tracks.length === 1 ? 'song' : 'songs'}
                      </p>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {inPlaylist ? (
                      <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40">
                        <Check className="w-3.5 h-3.5 stroke-[3px]" />
                        <span>Added</span>
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-slate-400 hover:text-white">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Done */}
        <div className="pt-2 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-bold bg-white text-black hover:bg-slate-200 text-xs shadow-lg active:scale-95 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
