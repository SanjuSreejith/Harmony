import React, { useState, useEffect } from 'react';
import {
  Heart,
  Clock,
  FolderPlus,
  Play,
  Trash2,
  HardDrive,
  Download,
  Share2,
  Smartphone,
  ChevronRight,
  Music,
  Sliders,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export default function LibraryScreen() {
  const {
    favorites,
    history,
    playlists,
    downloadedTracks,
    offlineSizeMB,
    deleteDownloadedTrack,
    createPlaylist,
    deletePlaylist,
    removeTrackFromPlaylist,
    playTrack,
    setShowSettingsModal,
    downloadAll,
    getRLInsights,
    resetRLModel
  } = usePlayer();

  const [activeView, setActiveView] = useState('main'); // 'main' | 'favorites' | 'downloads' | 'history' | playlistId
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    function handleNav(e) {
      if (e.detail) setActiveView(e.detail);
    }
    window.addEventListener('harmoniq:nav-library', handleNav);
    return () => window.removeEventListener('harmoniq:nav-library', handleNav);
  }, []);

  function handleCreatePlaylist(e) {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    createPlaylist(newPlaylistName);
    setNewPlaylistName('');
    setShowCreateModal(false);
  }

  // 1. Viewing Downloaded / Offline Songs
  if (activeView === 'downloads') {
    return (
      <div className="pb-36 md:pb-12 pt-4 px-4 md:px-0 max-w-md md:max-w-none mx-auto md:mx-0 space-y-4">
        <button
          onClick={() => setActiveView('main')}
          className="text-xs text-emerald-400 font-semibold flex items-center gap-1 hover:underline"
        >
          ← Back to Library
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <HardDrive className="w-6 h-6 text-cyan-400" />
              Offline Downloads
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {downloadedTracks.length} {downloadedTracks.length === 1 ? 'song' : 'songs'} • {offlineSizeMB} MB
            </p>
          </div>

          {downloadedTracks.length > 0 && (
            <button
              onClick={() => playTrack(downloadedTracks[0], downloadedTracks, 0)}
              className="w-12 h-12 rounded-full bg-cyan-400 text-black flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              title="Play all offline"
            >
              <Play className="w-6 h-6 fill-current ml-0.5" />
            </button>
          )}
        </div>

        {downloadedTracks.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-2">
            <Download className="w-10 h-10 mx-auto opacity-30 text-cyan-400" />
            <p className="text-sm font-semibold text-slate-300">No offline songs yet</p>
            <p className="text-xs max-w-xs mx-auto">
              Tap the download icon on any song to save it for 100% offline playback without internet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 space-y-0 pt-2">
            {downloadedTracks.map((track, idx) => (
              <div
                key={track.id}
                onClick={() => playTrack(track, downloadedTracks, idx)}
                className="flex items-center gap-3 p-2.5 rounded-2xl glass-card hover:bg-white/10 cursor-pointer active:scale-[0.98] transition-all"
              >
                <img
                  src={track.thumbnail}
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {track.title}
                  </p>
                  <p className="text-xs text-slate-400 truncate mt-0.5 flex items-center gap-1.5">
                    <span>{track.artist}</span>
                    <span className="text-cyan-400 text-[10px]">
                      • {(track.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteDownloadedTrack(track.id);
                  }}
                  className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                  title="Delete download"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 1.5. Viewing AI Taste Profile (Reinforcement Learning Insights)
  if (activeView === 'ai-profile') {
    const insights = getRLInsights
      ? getRLInsights()
      : { totalInteractions: 0, satisfactionRate: 100, learningPhase: 'Active', topGenres: [], topArtists: [] };

    return (
      <div className="pb-36 md:pb-12 pt-4 px-4 md:px-0 max-w-md md:max-w-none mx-auto md:mx-0 space-y-4 animate-in fade-in">
        <button
          onClick={() => setActiveView('main')}
          className="text-xs text-emerald-400 font-semibold flex items-center gap-1 hover:underline"
        >
          ← Back to Library
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">AI Taste Profile</h1>
            <p className="text-xs text-slate-400 mt-0.5">Personalized to your unique music taste</p>
          </div>
        </div>

        {/* Status card */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-950/60 via-teal-950/40 to-slate-900 border border-emerald-500/30 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Model Stage</span>
            <span className="text-xs font-bold text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
              {insights.learningPhase}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
              <p className="text-[11px] text-slate-400">Total Interactions</p>
              <p className="text-xl font-black text-white mt-0.5">{insights.totalInteractions}</p>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
              <p className="text-[11px] text-slate-400">Positive Reward</p>
              <p className="text-xl font-black text-emerald-400 mt-0.5">{insights.satisfactionRate}%</p>
            </div>
          </div>
        </div>

        {/* Top Learned Genres */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Learned Genres (Q-Values)
          </h3>
          {insights.topGenres.length === 0 ? (
            <div className="p-4 rounded-2xl bg-white/5 text-center text-xs text-slate-400">
              Listen to songs and like your favorites to train the AI preference model!
            </div>
          ) : (
            insights.topGenres.map((g) => (
              <div key={g.genre} className="p-3 rounded-2xl glass-card flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">{g.genre}</p>
                  <p className="text-[10px] text-slate-400">{g.interactions} interaction events</p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  +{g.score}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Top Learned Artists */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Learned Artists (Bandit Affinities)
          </h3>
          {insights.topArtists.length === 0 ? (
            <div className="p-4 rounded-2xl bg-white/5 text-center text-xs text-slate-400">
              Play or favorite your favorite artists to boost their affinity!
            </div>
          ) : (
            insights.topArtists.map((a) => (
              <div key={a.artist} className="p-3 rounded-2xl glass-card flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">{a.artist}</p>
                  <p className="text-[10px] text-slate-400">{a.interactions} interaction events</p>
                </div>
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                  +{a.score}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Reset Model Button */}
        <div className="pt-2">
          <button
            onClick={() => {
              if (window.confirm('Reset the AI Recommendation Model? It will begin learning fresh from new listens.')) {
                if (resetRLModel) resetRLModel();
                setActiveView('main');
              }
            }}
            className="w-full py-2.5 text-xs text-red-400 hover:text-red-300 rounded-xl bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 font-semibold transition-colors"
          >
            Reset AI Learning Model
          </button>
        </div>
      </div>
    );
  }

  // 2. Viewing Liked Songs
  if (activeView === 'favorites') {
    return (
      <div className="pb-36 md:pb-12 pt-4 px-4 md:px-0 max-w-md md:max-w-none mx-auto md:mx-0 space-y-4">
        <button
          onClick={() => setActiveView('main')}
          className="text-xs text-emerald-400 font-semibold flex items-center gap-1 hover:underline"
        >
          ← Back to Library
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Heart className="w-6 h-6 fill-red-500 text-red-500" />
              Liked Songs
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {favorites.length} {favorites.length === 1 ? 'song' : 'songs'} saved
            </p>
          </div>

          <div className="flex items-center gap-2">
            {favorites.length > 0 && (
              <>
                <button
                  onClick={() => downloadAll(favorites)}
                  className="p-2.5 rounded-full bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white"
                  title="Download all for offline play"
                >
                  <Download className="w-5 h-5 text-cyan-400" />
                </button>
                <button
                  onClick={() => playTrack(favorites[0], favorites, 0)}
                  className="w-12 h-12 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                >
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {favorites.length === 0 ? (
          <p className="text-xs text-slate-500 py-12 text-center">
            No liked songs yet. Tap the heart on any song to add it here!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 space-y-0 pt-2">
            {favorites.map((track, idx) => (
              <div
                key={track.id}
                onClick={() => playTrack(track, favorites, idx)}
                className="flex items-center gap-3 p-2.5 rounded-2xl glass-card hover:bg-white/10 cursor-pointer active:scale-[0.98] transition-all"
              >
                <img
                  src={track.thumbnail}
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {track.title}
                  </p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {track.artist}
                  </p>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {track.durationStr}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 3. Viewing custom playlist
  if (activeView !== 'main') {
    const pl = playlists.find((p) => p.id === activeView);
    if (!pl) {
      setActiveView('main');
      return null;
    }

    return (
      <div className="pb-36 md:pb-12 pt-4 px-4 md:px-0 max-w-md md:max-w-none mx-auto md:mx-0 space-y-4">
        <button
          onClick={() => setActiveView('main')}
          className="text-xs text-emerald-400 font-semibold flex items-center gap-1 hover:underline"
        >
          ← Back to Library
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">{pl.name}</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {pl.tracks.length} {pl.tracks.length === 1 ? 'song' : 'songs'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {pl.tracks.length > 0 && (
              <>
                <button
                  onClick={() => downloadAll(pl.tracks)}
                  className="p-2.5 rounded-full bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white"
                  title="Download all playlist tracks"
                >
                  <Download className="w-5 h-5 text-cyan-400" />
                </button>
                <button
                  onClick={() => playTrack(pl.tracks[0], pl.tracks, 0)}
                  className="w-11 h-11 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                >
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </button>
              </>
            )}

            <button
              onClick={() => {
                deletePlaylist(pl.id);
                setActiveView('main');
              }}
              className="p-2.5 text-slate-500 hover:text-red-400 rounded-full hover:bg-white/5 transition-colors"
              title="Delete playlist"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {pl.tracks.length === 0 ? (
          <p className="text-xs text-slate-500 py-12 text-center">
            This playlist is empty. Add songs to it from Now Playing or Search!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 space-y-0 pt-2">
            {pl.tracks.map((track, idx) => (
              <div
                key={`${track.id}-${idx}`}
                onClick={() => playTrack(track, pl.tracks, idx)}
                className="flex items-center gap-3 p-2.5 rounded-2xl glass-card hover:bg-white/10 cursor-pointer active:scale-[0.98] transition-all"
              >
                <img
                  src={track.thumbnail}
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {track.title}
                  </p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {track.artist}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTrackFromPlaylist(pl.id, track.id);
                  }}
                  className="p-2 text-slate-500 hover:text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 4. Main Library View
  return (
    <div className="pb-36 md:pb-12 pt-4 px-4 md:px-0 max-w-md md:max-w-none mx-auto md:mx-0 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-black text-white tracking-tight">Your Library</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white"
            title="App Settings"
          >
            <Sliders className="w-4 h-4 text-emerald-400" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-black text-xs font-bold shadow-md hover:bg-emerald-400 active:scale-95 transition-all"
          >
            <FolderPlus className="w-4 h-4" />
            <span>New Playlist</span>
          </button>
        </div>
      </div>

      {/* Hub Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Offline Downloads Card */}
        <div
          onClick={() => setActiveView('downloads')}
          className="p-4 rounded-3xl bg-gradient-to-br from-cyan-950/60 to-blue-950/40 border border-cyan-500/20 cursor-pointer shadow-lg active:scale-[0.98] transition-transform space-y-3"
        >
          <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Offline Music</h3>
            <p className="text-[11px] text-cyan-300/80 mt-0.5">
              {downloadedTracks.length} tracks • {offlineSizeMB} MB
            </p>
          </div>
        </div>

        {/* Liked Songs Card */}
        <div
          onClick={() => setActiveView('favorites')}
          className="p-4 rounded-3xl bg-gradient-to-br from-pink-950/60 to-purple-950/40 border border-pink-500/20 cursor-pointer shadow-lg active:scale-[0.98] transition-transform space-y-3"
        >
          <div className="w-11 h-11 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
            <Heart className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Liked Songs</h3>
            <p className="text-[11px] text-pink-300/80 mt-0.5">
              {favorites.length} tracks
            </p>
          </div>
        </div>
      </div>

      {/* AI Taste Profile Card */}
      <div
        onClick={() => setActiveView('ai-profile')}
        className="p-4 rounded-3xl bg-gradient-to-r from-emerald-950/50 via-teal-950/40 to-slate-900 border border-emerald-500/30 cursor-pointer shadow-lg active:scale-[0.98] transition-transform flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-white">AI Taste Profile</h3>
              <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded-full border border-emerald-500/30 font-bold">
                RL Model
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Reinforcement Learning agent auto-improving for you
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
      </div>

      {/* Custom User Playlists */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Playlists ({playlists.length})
        </h2>

        {playlists.length === 0 ? (
          <div className="p-6 rounded-2xl glass-card text-center space-y-2">
            <p className="text-xs text-slate-400">You haven't created any playlists yet.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-xs font-semibold text-emerald-400 hover:underline"
            >
              Create your first playlist
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 space-y-0">
            {playlists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => setActiveView(pl.id)}
                className="flex items-center justify-between p-3 rounded-2xl glass-card hover:bg-white/10 cursor-pointer active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
                    <Music className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{pl.name}</h4>
                    <p className="text-xs text-slate-400">
                      {pl.tracks.length} {pl.tracks.length === 1 ? 'song' : 'songs'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal for Creating Playlist */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <form
            onSubmit={handleCreatePlaylist}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs bg-slate-900 border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4"
          >
            <h3 className="text-base font-bold text-white">Create New Playlist</h3>
            <input
              type="text"
              autoFocus
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="e.g. Chill Vibes, Gym Pump"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-400"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-black hover:bg-emerald-400"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
