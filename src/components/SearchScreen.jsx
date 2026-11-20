import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Loader2,
  Play,
  MoreVertical,
  Heart,
  Plus,
  ListPlus,
  Radio,
  Download,
  Check
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { searchMusic } from '../services/api';
import AddToPlaylistModal from './AddToPlaylistModal';

const QUICK_SEARCHES = [
  'Malayalam Melody Hits',
  'Sid Sriram',
  'KJ Yesudas Hits',
  'Arijit Singh',
  'Telugu Superhits',
  'Lo-Fi Slowed & Reverb',
  'Anirudh Ravichander',
  'AR Rahman Classics',
  'Trending Hits 2026'
];

export default function SearchScreen() {
  const {
    playTrack,
    currentTrack,
    isPlaying,
    addToQueue,
    playNextInQueue,
    toggleFavorite,
    isFavorite,
    downloadTrack,
    isDownloaded
  } = usePlayer();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeMenuTrackId, setActiveMenuTrackId] = useState(null);
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState(null);
  const debounceRef = useRef(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setLoading(true);
      searchMusic(query)
        .then((data) => {
          setResults(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Search error:', err);
          setLoading(false);
        });
    }, 150);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handleQuickSearch(tag) {
    setQuery(tag);
  }

  return (
    <div className="pb-36 md:pb-28 pt-4 px-0 max-w-md md:max-w-none mx-auto space-y-5 md:space-y-6">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-2xl font-black text-white tracking-tight">Search</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Find any song, artist, or video on YouTube (Ad-Free)
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Songs, artists, podcasts, lofi..."
          className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-white/10 border border-white/10 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-emerald-400/50 focus:bg-white/15 transition-all shadow-inner"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick Search Tags (When no search query) */}
      {!query && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Popular Searches
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_SEARCHES.map((tag) => (
              <button
                key={tag}
                onClick={() => handleQuickSearch(tag)}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-medium text-slate-300 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
          <p className="text-xs">Searching YouTube...</p>
        </div>
      )}

      {/* Search Results List */}
      {!loading && results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Top Results ({results.length})
          </p>

          <div className="space-y-2 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3 md:space-y-0">
            {results.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              const isFav = isFavorite(track.id);
              const isMenuOpen = activeMenuTrackId === track.id;

              return (
                <div
                  key={track.id}
                  className={`relative flex items-center gap-3 p-2.5 rounded-2xl transition-all ${
                    isCurrent
                      ? 'bg-emerald-500/15 border border-emerald-500/30'
                      : 'glass-card hover:bg-white/10'
                  }`}
                >
                  {/* Thumbnail with Click to Play */}
                  <div
                    onClick={() => playTrack(track, results, idx)}
                    className="relative w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden bg-slate-800 cursor-pointer shadow-md group"
                  >
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                    </div>

                    {isCurrent && isPlaying && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-1">
                        <span className="w-1 bg-emerald-400 rounded-full animate-eq-1" />
                        <span className="w-1 bg-cyan-400 rounded-full animate-eq-2" />
                        <span className="w-1 bg-emerald-400 rounded-full animate-eq-3" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div
                    onClick={() => playTrack(track, results, idx)}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <h3
                      className={`text-sm font-semibold truncate ${
                        isCurrent ? 'text-emerald-400' : 'text-white'
                      }`}
                    >
                      {track.title}
                    </h3>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {track.artist}
                    </p>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {track.durationStr || ''}
                    </span>
                  </div>

                  {/* Action Menu Button */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActiveMenuTrackId(isMenuOpen ? null : track.id)
                      }
                      className="p-2 text-slate-400 hover:text-white rounded-full transition-colors"
                      title="More options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Popover Action Menu */}
                    {isMenuOpen && (
                      <div className="absolute right-0 bottom-10 w-48 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-2xl z-40 space-y-1">
                        <button
                          onClick={() => {
                            playNextInQueue(track);
                            setActiveMenuTrackId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 rounded-xl"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Play Next</span>
                        </button>

                        <button
                          onClick={() => {
                            addToQueue(track);
                            setActiveMenuTrackId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 rounded-xl"
                        >
                          <ListPlus className="w-3.5 h-3.5" />
                          <span>Add to Queue</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedTrackForPlaylist(track);
                            setActiveMenuTrackId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 rounded-xl"
                        >
                          <Plus className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Add to Playlist</span>
                        </button>

                        <button
                          onClick={() => {
                            downloadTrack(track);
                            setActiveMenuTrackId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 rounded-xl"
                        >
                          {isDownloaded(track.id) ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5px]" />
                              <span className="text-emerald-400">Downloaded</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-3.5 h-3.5" />
                              <span>Download Offline</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            toggleFavorite(track);
                            setActiveMenuTrackId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 rounded-xl"
                        >
                          <Heart
                            className={`w-3.5 h-3.5 ${
                              isFav ? 'fill-red-500 text-red-500' : ''
                            }`}
                          />
                          <span>{isFav ? 'Remove Favorite' : 'Favorite'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add To Playlist Modal */}
      {selectedTrackForPlaylist && (
        <AddToPlaylistModal
          track={selectedTrackForPlaylist}
          isOpen={!!selectedTrackForPlaylist}
          onClose={() => setSelectedTrackForPlaylist(null)}
        />
      )}
    </div>
  );
}
