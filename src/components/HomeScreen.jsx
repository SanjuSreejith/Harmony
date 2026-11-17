import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Sparkles,
  Flame,
  Clock,
  Radio,
  Music,
  Loader2,
  Sliders,
  Compass,
  Headphones,
  Settings,
  Download,
  Check,
  Heart,
  Globe,
  Repeat,
  History,
  Plus,
  WifiOff,
  RotateCw,
  Cloud,
  Laptop
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { getTrendingTracks, getRecommendations, getServerSelection, setServerSelection, SERVER_MODES } from '../services/api';
import { ALL_INDIAN_LANGUAGES } from '../constants/languages';
import AddToPlaylistModal from './AddToPlaylistModal';
import { reRankRecommendations } from '../services/reinforcementLearning';
import { detectLanguage, detectGenre } from '../services/telemetry';

const MOOD_FILTERS = [
  { id: 'all', label: 'All Vibes' },
  { id: 'Romantic', label: '❤️ Romantic' },
  { id: 'Chill', label: '☕ Relax / Lo-Fi' },
  { id: 'Workout', label: '💪 Gym Energy' },
  { id: 'Focus/Study', label: '🧠 Study Focus' },
  { id: 'Night Drive', label: '🚗 Night Drive' },
  { id: 'Party', label: '🎉 Dance Party' },
  { id: 'Devotional', label: '🙏 Devotional' }
];

export default function HomeScreen() {
  const {
    playTrack,
    currentTrack,
    isPlaying,
    history,
    preferences,
    updatePreferences,
    selectedLanguage,
    setSelectedLanguage,
    getAffinityProfile,
    setShowPreferencesModal,
    setShowSettingsModal,
    downloadTrack,
    isDownloaded,
    toggleFavorite,
    isFavorite,
    favorites,
    downloadedTracks,
    isInstalled,
    triggerInstall,
    showToast
  } = usePlayer();

  const [serverMode, setServerMode] = useState(() => getServerSelection().mode || SERVER_MODES.AUTO);

  useEffect(() => {
    function onServerChanged(e) {
      if (e.detail) setServerMode(e.detail);
    }
    window.addEventListener('harmoniq:server-mode-changed', onServerChanged);
    return () => window.removeEventListener('harmoniq:server-mode-changed', onServerChanged);
  }, []);

  function handleQuickToggleServer() {
    const nextMode = serverMode === SERVER_MODES.CLOUD ? SERVER_MODES.USB : SERVER_MODES.CLOUD;
    setServerSelection(nextMode);
    setServerMode(nextMode);
    window.dispatchEvent(new CustomEvent('harmoniq:server-mode-changed', { detail: nextMode }));
    if (showToast) {
      if (nextMode === SERVER_MODES.CLOUD) {
        showToast('Switched to 24/7 Cloud Server (Render) ☁️', 'info');
      } else {
        showToast('Switched to Local PC Server (LAN/USB) 💻', 'info');
      }
    }
  }

  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [activeMood, setActiveMood] = useState(preferences.mood || 'Chill');
  const [recommendations, setRecommendations] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [trendingTracks, setTrendingTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [playlistModalTrack, setPlaylistModalTrack] = useState(null);

  const pendingRecsRef = useRef(null);
  const lastUserMoodRef = useRef(activeMood);
  const lastUserLangRef = useRef(selectedLanguage);
  const autoApplyTimerRef = useRef(null);

  function applyPending(dataToApply = null) {
    const target = dataToApply || pendingRecsRef.current;
    if (!target) return;
    if (autoApplyTimerRef.current) clearTimeout(autoApplyTimerRef.current);
    setIsTransitioning(true);
    setTimeout(() => {
      setRecommendations(target);
      pendingRecsRef.current = null;
      setIsTransitioning(false);
      setIsRefreshing(false);
    }, 200);
  }

  function handleManualRefresh() {
    setIsRefreshing(true);
    if (pendingRecsRef.current) {
      applyPending(pendingRecsRef.current);
    } else {
      setIsTransitioning(true);
      setTimeout(() => {
        setIsTransitioning(false);
        setIsRefreshing(false);
      }, 500);
    }
  }

  useEffect(() => {
    function onRefreshEvent() {
      handleManualRefresh();
    }
    window.addEventListener('harmoniq:refresh-home', onRefreshEvent);
    return () => window.removeEventListener('harmoniq:refresh-home', onRefreshEvent);
  }, []);

  const affinity = getAffinityProfile
    ? getAffinityProfile()
    : { topArtists: [], topGenres: [], topLanguages: [], frequentTracks: [], totalPlays: 0 };

  const greeting = (() => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  // Fetch telemetry-driven recommendations dynamically whenever current track, history, or preferences change
  useEffect(() => {
    let isCancelled = false;
    setLoadingRecs(true);

    const currentAffinity = getAffinityProfile
      ? getAffinityProfile()
      : { topArtists: [], topGenres: [], topLanguages: [], frequentTracks: [], totalPlays: 0 };

    const refTrack = currentTrack || currentAffinity.latestTrack || (history.length > 0 ? history[0] : null);

    // Detected language of current track or latest listened track
    const activeTrackLang = refTrack
      ? detectLanguage(refTrack)
      : (currentAffinity.currentLanguage || 'Malayalam');

    const userLanguages = preferences.languages && preferences.languages.length > 0
      ? preferences.languages
      : ['Malayalam', 'Telugu', 'Hindi'];

    const userGenres = preferences.genres && preferences.genres.length > 0
      ? preferences.genres
      : ['Melody Love Songs', 'Devotional & Bhakti'];

    const userArtists = preferences.artists && preferences.artists.length > 0
      ? preferences.artists
      : ['KJ Yesudas', 'Sid Sriram', 'Vineeth Sreenivasan'];

    const engagedLanguages = [
      ...new Set([
        activeTrackLang,
        ...(currentAffinity.engagedLanguages || []),
        ...(currentAffinity.topLanguages || []).map(l => l.name),
        ...userLanguages
      ])
    ].filter(Boolean);

    // If user played a Malayalam song, activeTrackLang is 'Malayalam'. That takes precedence!
    const effectiveLang = (selectedLanguage && selectedLanguage !== 'all')
      ? selectedLanguage
      : (activeTrackLang || (engagedLanguages.length > 0 ? engagedLanguages[0] : 'Malayalam'));

    const payload = {
      languages: userLanguages,
      engagedLanguages: engagedLanguages,
      preferredGenres: userGenres,
      preferredArtists: userArtists,
      currentLanguage: activeTrackLang,
      activeLanguage: effectiveLang,
      latestTrack: refTrack,
      topArtists: currentAffinity.topArtists,
      topGenres: currentAffinity.topGenres,
      frequentTracks: currentAffinity.frequentTracks,
      favorites: favorites || [],
      mood: activeMood,
      recentHistory: history.slice(0, 10)
    };

    getRecommendations(payload)
      .then((data) => {
        if (!isCancelled && data) {
          // Phonetic and title similarity deduplicator to eliminate multiple uploads of the same song
          function areTitlesSimilar(title1, title2) {
            if (!title1 || !title2) return false;
            const clean = t => t.toLowerCase()
              .replace(/#/g, ' ')
              .replace(/\[.*?\]|\(.*?\)/g, '')
              .replace(/[^a-z0-9]/g, '')
              .replace(/aa/g, 'a').replace(/ee/g, 'i').replace(/oo/g, 'u').replace(/th/g, 't').replace(/dh/g, 'd');
            const c1 = clean(title1);
            const c2 = clean(title2);
            if (!c1 || !c2) return false;
            if (c1 === c2) return true;
            const sub1 = c1.slice(0, 8);
            const sub2 = c2.slice(0, 8);
            if (sub1.length >= 6 && (c2.includes(sub1) || c1.includes(sub2))) return true;
            return false;
          }

          // Multi-Language Dynamic Blending for Smart AI Mix (Spotify Daily Mix style):
          // Balanced blend across primary language, secondary language, artist radio, and discovery
          const rawPool = [
            ...(data.languageMix?.tracks || []).slice(0, 8),
            ...(data.secondaryMix?.tracks || []).slice(0, 6),
            ...(data.artistMix?.tracks || []).slice(0, 5),
            ...(data.genreMix?.tracks || []).slice(0, 5),
            ...(data.discoverMix?.tracks || []).slice(0, 4)
          ];

          // Deduplicate rawPool: strictly exclude tracks already in Section 0 (Because You Listened To),
          // and ensure no duplicate song uploads within Smart AI Mix!
          const lastPlayedTracks = data.lastPlayedMix?.tracks || [];
          const uniqueSmartPool = [];
          for (const tr of rawPool) {
            if (!tr || !tr.id) continue;
            // Exclude if already in Section 0 by ID or title similarity
            if (lastPlayedTracks.some(prev => prev.id === tr.id || areTitlesSimilar(prev.title, tr.title))) continue;
            // Exclude if already in uniqueSmartPool by ID or title similarity
            if (uniqueSmartPool.some(prev => prev.id === tr.id || areTitlesSimilar(prev.title, tr.title))) continue;
            uniqueSmartPool.push(tr);
          }

          const rlContext = {
            mood: activeMood,
            currentLanguage: effectiveLang,
            activeLanguage: effectiveLang,
            frequentTrackIds: (currentAffinity.frequentTracks || []).map(t => t.id),
            recentArtists: history.slice(0, 5).map(t => t.artist),
            recentGenres: history.slice(0, 5).map(t => detectGenre(t))
          };

          const rankedData = {
            ...data,
            smartAIMix: reRankRecommendations(uniqueSmartPool, rlContext).slice(0, 16),
            lastPlayedMix: data.lastPlayedMix
              ? {
                  ...data.lastPlayedMix,
                  tracks: reRankRecommendations(data.lastPlayedMix.tracks, rlContext)
                }
              : null,
            languageMix: data.languageMix
              ? {
                  ...data.languageMix,
                  tracks: reRankRecommendations(data.languageMix.tracks, rlContext)
                }
              : null,
            secondaryMix: data.secondaryMix
              ? {
                  ...data.secondaryMix,
                  tracks: reRankRecommendations(data.secondaryMix.tracks, rlContext)
                }
              : null,
            artistMix: data.artistMix
              ? {
                  ...data.artistMix,
                  tracks: reRankRecommendations(data.artistMix.tracks, rlContext)
                }
              : null,
            genreMix: data.genreMix
              ? {
                  ...data.genreMix,
                  tracks: reRankRecommendations(data.genreMix.tracks, rlContext)
                }
              : null,
            moodMix: data.moodMix
              ? {
                  ...data.moodMix,
                  tracks: reRankRecommendations(data.moodMix.tracks, rlContext)
                }
              : null,
            discoverMix: data.discoverMix
              ? {
                  ...data.discoverMix,
                  tracks: reRankRecommendations(data.discoverMix.tracks, rlContext)
                }
              : null
          };

          const isFilterChange = (
            activeMood !== lastUserMoodRef.current ||
            selectedLanguage !== lastUserLangRef.current
          );
          lastUserMoodRef.current = activeMood;
          lastUserLangRef.current = selectedLanguage;

          // Initial load OR user filter change: update smoothly
          if (!recommendations || isFilterChange) {
            setRecommendations(rankedData);
            pendingRecsRef.current = null;
            setLoadingRecs(false);
          } else {
            // Calm update: save in pending ref so carousels don't suddenly twitch/jump under user's touch!
            pendingRecsRef.current = rankedData;
            setLoadingRecs(false);

            if (autoApplyTimerRef.current) clearTimeout(autoApplyTimerRef.current);
            // After 25s of calm reading, auto-apply softly with smooth fade
            autoApplyTimerRef.current = setTimeout(() => {
              applyPending(rankedData);
            }, 25000);
          }
        }
      })
      .catch((err) => {
        console.error('Recs error:', err);
        if (!isCancelled) setLoadingRecs(false);
      });

    return () => {
      isCancelled = true;
      if (autoApplyTimerRef.current) clearTimeout(autoApplyTimerRef.current);
    };
  }, [
    preferences?.languages?.join(','),
    preferences?.genres?.join(','),
    activeMood,
    selectedLanguage
  ]);

  // Fetch trending tracks by active / listened language
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    const currentAffinity = getAffinityProfile
      ? getAffinityProfile()
      : { currentLanguage: null };

    const trendingLang = (selectedLanguage && selectedLanguage !== 'all')
      ? selectedLanguage
      : ((currentAffinity.engagedLanguages?.[0]) || preferences.languages?.[0] || 'Malayalam');

    getTrendingTracks('trending', trendingLang)
      .then((data) => {
        if (!isCancelled) {
          setTrendingTracks(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Trending fetch error:', err);
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [
    preferences.languages,
    selectedLanguage
  ]);

  return (
    <div className="pb-36 md:pb-12 pt-4 px-4 md:px-0 max-w-md md:max-w-none mx-auto space-y-6">
      {/* App Header & Greeting */}
      <div className="flex items-center justify-between pt-2 gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Harmoniq
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
            {greeting}
          </h1>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          {/* Quick Server Switcher Badge (1-Tap Cloud / PC Switch) */}
          <button
            onClick={handleQuickToggleServer}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all border shadow-sm active:scale-95 ${
              serverMode === SERVER_MODES.CLOUD
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/25'
                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
            }`}
            title="Click to toggle between 24/7 Cloud Server and Local PC Server"
          >
            {serverMode === SERVER_MODES.CLOUD ? (
              <Cloud className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <Laptop className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="text-[11px] font-bold">
              {serverMode === SERVER_MODES.CLOUD ? 'Cloud' : (serverMode === SERVER_MODES.AUTO ? 'Auto' : 'PC')}
            </span>
          </button>

          {/* 1-Tap Compact Install Button in Header */}
          {!isInstalled && (
            <button
              onClick={triggerInstall}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold active:scale-95 transition-all shadow-sm"
              title="Install Web App"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="text-[11px]">Install</span>
            </button>
          )}

          {/* Subtle Refresh Button */}
          <button
            onClick={handleManualRefresh}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 active:scale-90 transition-all"
            title="Refresh Recommendations"
          >
            <RotateCw className={`w-3.5 h-3.5 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Preferences Button */}
          <button
            onClick={() => setShowPreferencesModal(true)}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 active:scale-90 transition-all"
            title="Music Preferences & Languages"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 active:scale-90 transition-all"
            title="App Settings"
          >
            <Settings className="w-3.5 h-3.5 text-slate-300" />
          </button>
        </div>
      </div>

      {/* 1. Mood & Vibe Filter Pills */}
      <section>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 py-1">
          {MOOD_FILTERS.map((m) => {
            const isSelected = activeMood === m.id;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setActiveMood(m.id);
                  if (m.id !== 'all') updatePreferences({ mood: m.id });
                }}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-emerald-500 text-black shadow-md font-bold'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Recommendations Container with Gentle Transition Fade */}
      <div className={`space-y-6 transition-opacity duration-300 ${isTransitioning ? 'opacity-40' : 'opacity-100'}`}>
        {/* Offline Mode Highlights (Displayed when disconnected) */}
        {!isOnline && (
          <section className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/20 space-y-3">
            <div className="flex items-center gap-2 text-amber-400">
              <WifiOff className="w-4 h-4 flex-shrink-0" />
              <h3 className="font-bold text-sm text-white">Offline Music Mode</h3>
            </div>
            <p className="text-xs text-slate-400">
              You are not connected to the internet. You can still play all your downloaded songs with full background playback.
            </p>
            {downloadedTracks && downloadedTracks.length > 0 ? (
              <div className="pt-2">
                <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-2">
                  Downloaded Songs ({downloadedTracks.length})
                </p>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-2 px-2">
                  {downloadedTracks.map((track, idx) => (
                    <div
                      key={`offline-${track.id}-${idx}`}
                      onClick={() => playTrack(track, downloadedTracks, idx)}
                      className="flex-shrink-0 w-28 group cursor-pointer active:scale-95 transition-transform"
                    >
                      <div className="relative w-28 h-28 rounded-xl overflow-hidden bg-slate-800 shadow-md">
                        <img
                          src={track.thumbnail}
                          alt={track.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[9px] font-bold text-emerald-400 border border-emerald-500/30">
                          Offline
                        </div>
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <div className="w-9 h-9 rounded-full bg-emerald-400 text-black flex items-center justify-center shadow-lg">
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </div>
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-white truncate mt-1">
                        {track.title}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {track.displayArtist || track.artist}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center space-y-1">
                <p className="text-xs text-slate-300 font-medium">No downloaded songs yet</p>
                <p className="text-[11px] text-slate-500">
                  Tap the download icon on any song while connected to internet to keep it for offline listening.
                </p>
              </div>
            )}
          </section>
        )}

        {/* 2. Similar to Recent Listen (Contextual Dynamic Station) */}
      {recommendations?.lastPlayedMix && recommendations.lastPlayedMix.tracks?.length > 0 && (
        <section>
          <div className="mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded-md bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0">
                <Music className="w-3 h-3" />
              </div>
              <h2 className="text-sm font-bold text-white tracking-tight truncate">
                {recommendations.lastPlayedMix.title}
              </h2>
            </div>
            {recommendations.lastPlayedMix.subtitle && (
              <p className="text-[11px] text-slate-400 truncate pl-7 mt-0.5">
                {recommendations.lastPlayedMix.subtitle}
              </p>
            )}
          </div>

          <div className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar pb-2 md:pb-3 -mx-4 px-4 md:mx-0 md:px-0">
            {recommendations.lastPlayedMix.tracks.map((track, idx) => (
              <div
                key={`last-played-${track.id}-${idx}`}
                onClick={() => playTrack(track, recommendations.lastPlayedMix.tracks, idx)}
                className="flex-shrink-0 w-32 group cursor-pointer active:scale-95 transition-transform"
              >
                <div className="relative w-32 h-32 rounded-2xl overflow-hidden bg-slate-800 shadow-lg border border-white/5">
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-cyan-400 text-black flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>
                <p className="text-xs font-semibold text-white truncate mt-1.5">
                  {track.title}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {track.artist}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2. Smart AI Mix */}
      {recommendations?.smartAIMix && recommendations.smartAIMix.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 shadow-sm shadow-emerald-500/20">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white tracking-tight">
                    Smart AI Mix
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-300 border border-emerald-500/30">
                    ✨ Adaptive Q-Learning
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tuned to your listening habits, skips, and favorite genres in real time
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar pb-2 md:pb-3 -mx-4 px-4 md:mx-0 md:px-0">
            {recommendations.smartAIMix.map((track, idx) => {
              // High match indicator for top recommendations
              const matchPercent = Math.max(88, 99 - idx * 2);
              return (
                <div
                  key={`rl-mix-${track.id}-${idx}`}
                  onClick={() => playTrack(track, recommendations.smartAIMix, idx)}
                  className="flex-shrink-0 w-32 group cursor-pointer active:scale-95 transition-transform"
                >
                  <div className="relative w-32 h-32 rounded-2xl overflow-hidden bg-slate-800 shadow-lg border border-white/5">
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[9px] font-bold text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shadow-sm">
                      <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                      {matchPercent}%
                    </div>
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-emerald-400 text-black flex items-center justify-center shadow-lg">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-white truncate mt-1.5">
                    {track.title}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {track.artist}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Recently Played Section */}
      {history && history.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-md bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0">
              <History className="w-3 h-3" />
            </div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              Recently Played
            </h2>
          </div>

          <div className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar pb-2 md:pb-3 -mx-4 px-4 md:mx-0 md:px-0">
            {history.slice(0, 15).map((track) => (
              <div
                key={`recent-${track.id}`}
                onClick={() => playTrack(track)}
                className="flex-shrink-0 w-28 group cursor-pointer active:scale-95 transition-transform"
              >
                <div className="relative w-28 h-28 rounded-2xl overflow-hidden bg-slate-800 shadow-md">
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>
                <p className="text-xs font-semibold text-white truncate mt-1.5">
                  {track.title}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {track.displayArtist || track.artist}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. On Repeat • Most Played (Frequently Repeated Tracks) */}
      {affinity.frequentTracks && affinity.frequentTracks.length > 0 && (
        <section>
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <Repeat className="w-3 h-3" />
              </div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                On Repeat • Most Played
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 truncate pl-7 mt-0.5">
              Your heavy rotation tracks
            </p>
          </div>

          <div className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar pb-2 md:pb-3 -mx-4 px-4 md:mx-0 md:px-0">
            {affinity.frequentTracks.map((track, idx) => (
              <div
                key={`freq-${track.id}-${idx}`}
                onClick={() => playTrack(track, affinity.frequentTracks, idx)}
                className="flex-shrink-0 w-28 group cursor-pointer active:scale-95 transition-transform"
              >
                <div className="relative w-28 h-28 rounded-2xl overflow-hidden bg-slate-800 shadow-md">
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {track.playCount && track.playCount > 1 && (
                    <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                      {track.playCount}x
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-9 h-9 rounded-full bg-emerald-400 text-black flex items-center justify-center shadow-lg">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>
                <p className="text-xs font-semibold text-white truncate mt-1.5">
                  {track.title}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {track.displayArtist || track.artist}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Language Mix Carousel (Primary Language) */}
      {recommendations?.languageMix && (
        <section>
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0">
                <Globe className="w-3 h-3" />
              </div>
              <h2 className="text-sm font-bold text-white tracking-tight truncate">
                {recommendations.languageMix.title}
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 truncate pl-7 mt-0.5">
              {recommendations.languageMix.subtitle || 'Regional Hits'}
            </p>
          </div>

          <div className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar pb-2 md:pb-3 -mx-4 px-4 md:mx-0 md:px-0">
            {recommendations.languageMix.tracks.map((track, idx) => (
              <div
                key={`lang-${track.id}-${idx}`}
                onClick={() => playTrack(track, recommendations.languageMix.tracks, idx)}
                className="flex-shrink-0 w-32 group cursor-pointer active:scale-95 transition-transform"
              >
                <div className="relative w-32 h-32 rounded-2xl overflow-hidden bg-slate-800 shadow-md">
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>
                <p className="text-xs font-semibold text-white truncate mt-1.5">
                  {track.title}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {track.artist}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4b. Secondary Language Mix Carousel (e.g. Top Telugu Hits / Top Malayalam Hits) */}
      {recommendations?.secondaryMix && recommendations.secondaryMix.tracks?.length > 0 && (
        <section>
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <Globe className="w-3 h-3" />
              </div>
              <h2 className="text-sm font-bold text-white tracking-tight truncate">
                {recommendations.secondaryMix.title}
              </h2>
            </div>
            {recommendations.secondaryMix.subtitle && (
              <p className="text-[11px] text-slate-400 truncate pl-7 mt-0.5">
                {recommendations.secondaryMix.subtitle}
              </p>
            )}
          </div>

          <div className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar pb-2 md:pb-3 -mx-4 px-4 md:mx-0 md:px-0">
            {recommendations.secondaryMix.tracks.map((track, idx) => (
              <div
                key={`sec-lang-${track.id}-${idx}`}
                onClick={() => playTrack(track, recommendations.secondaryMix.tracks, idx)}
                className="flex-shrink-0 w-32 group cursor-pointer active:scale-95 transition-transform"
              >
                <div className="relative w-32 h-32 rounded-2xl overflow-hidden bg-slate-800 shadow-md">
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>
                <p className="text-xs font-semibold text-white truncate mt-1.5">
                  {track.title}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {track.artist}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Artist Mix (Because You Love [Artist]) */}
      {recommendations?.artistMix && (
        <section>
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
                <Compass className="w-3 h-3" />
              </div>
              <h2 className="text-sm font-bold text-white tracking-tight truncate">
                {recommendations.artistMix.title}
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 truncate pl-7 mt-0.5">
              {recommendations.artistMix.subtitle || 'Artist Radio'}
            </p>
          </div>

          <div className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar pb-2 md:pb-3 -mx-4 px-4 md:mx-0 md:px-0">
            {recommendations.artistMix.tracks.map((track, idx) => (
              <div
                key={`art-${track.id}-${idx}`}
                onClick={() => playTrack(track, recommendations.artistMix.tracks, idx)}
                className="flex-shrink-0 w-28 group cursor-pointer active:scale-95 transition-transform"
              >
                <div className="relative w-28 h-28 rounded-2xl overflow-hidden bg-slate-800 shadow-md">
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>
                <p className="text-xs font-semibold text-white truncate mt-1.5">
                  {track.title}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {track.artist}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. Genre / Type Mix (e.g. Romantic, Lo-Fi, Hip-Hop) */}
      {recommendations?.genreMix && (
        <section>
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-3 h-3" />
              </div>
              <h2 className="text-sm font-bold text-white tracking-tight truncate">
                {recommendations.genreMix.title}
              </h2>
            </div>
            {recommendations.genreMix.subtitle && (
              <p className="text-[11px] text-slate-400 truncate pl-7 mt-0.5">
                {recommendations.genreMix.subtitle}
              </p>
            )}
          </div>

          <div className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar pb-2 md:pb-3 -mx-4 px-4 md:mx-0 md:px-0">
            {recommendations.genreMix.tracks.map((track, idx) => (
              <div
                key={`genre-${track.id}-${idx}`}
                onClick={() => playTrack(track, recommendations.genreMix.tracks, idx)}
                className="flex-shrink-0 w-28 group cursor-pointer active:scale-95 transition-transform"
              >
                <div className="relative w-28 h-28 rounded-2xl overflow-hidden bg-slate-800 shadow-md">
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>
                <p className="text-xs font-semibold text-white truncate mt-1.5">
                  {track.title}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {track.artist}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6b. Discover / Regional Viral Mix (e.g. Hindi / Tamil Viral Hits) */}
      {recommendations?.discoverMix && recommendations.discoverMix.tracks?.length > 0 && (
        <section>
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0">
                <Compass className="w-3 h-3" />
              </div>
              <h2 className="text-sm font-bold text-white tracking-tight truncate">
                {recommendations.discoverMix.title}
              </h2>
            </div>
            {recommendations.discoverMix.subtitle && (
              <p className="text-[11px] text-slate-400 truncate pl-7 mt-0.5">
                {recommendations.discoverMix.subtitle}
              </p>
            )}
          </div>

          <div className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar pb-2 md:pb-3 -mx-4 px-4 md:mx-0 md:px-0">
            {recommendations.discoverMix.tracks.map((track, idx) => (
              <div
                key={`discover-${track.id}-${idx}`}
                onClick={() => playTrack(track, recommendations.discoverMix.tracks, idx)}
                className="flex-shrink-0 w-28 group cursor-pointer active:scale-95 transition-transform"
              >
                <div className="relative w-28 h-28 rounded-2xl overflow-hidden bg-slate-800 shadow-md">
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>
                <p className="text-xs font-semibold text-white truncate mt-1.5">
                  {track.title}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {track.artist}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. Trending Tracks Feed with Quick Download & Like */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded-md bg-orange-500/20 text-orange-400 flex items-center justify-center flex-shrink-0">
            <Flame className="w-3 h-3" />
          </div>
          <h2 className="text-sm font-bold text-white tracking-tight">
            Trending Hits
          </h2>
        </div>

        {!isOnline ? (
          <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2 text-center">
            <WifiOff className="w-6 h-6 text-slate-500" />
            <p className="text-xs text-slate-400">Trending tracks require an internet connection</p>
          </div>
        ) : loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            <p className="text-xs font-medium">Loading music from YouTube...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {trendingTracks.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              const downloaded = isDownloaded(track.id);
              const isFav = isFavorite(track.id);

              return (
                <div
                  key={`${track.id}-${idx}`}
                  onClick={() => playTrack(track, trendingTracks, idx)}
                  className={`flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer transition-all active:scale-[0.98] ${
                    isCurrent
                      ? 'bg-emerald-500/15 border border-emerald-500/30'
                      : 'glass-card hover:bg-white/10'
                  }`}
                >
                  <span className={`text-xs font-bold w-6 text-center ${
                    idx === 0
                      ? 'text-amber-400 text-sm'
                      : idx === 1
                      ? 'text-slate-300 text-sm'
                      : idx === 2
                      ? 'text-amber-600 text-sm'
                      : 'text-slate-500'
                  }`}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </span>

                  <div className="relative w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden bg-slate-800">
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {isCurrent && isPlaying && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-1">
                        <span className="w-1 bg-emerald-400 rounded-full animate-eq-1" />
                        <span className="w-1 bg-cyan-400 rounded-full animate-eq-2" />
                        <span className="w-1 bg-emerald-400 rounded-full animate-eq-3" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
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
                  </div>

                  {/* Actions (Download & Favorite) */}
                  <div
                    className="flex items-center gap-1 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => downloadTrack(track)}
                      className="p-2 text-slate-400 hover:text-white"
                      title={downloaded ? 'Downloaded' : 'Download'}
                    >
                      {downloaded ? (
                        <Check className="w-4 h-4 text-emerald-400 stroke-[2.5px]" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setPlaylistModalTrack(track)}
                      className="p-2 text-slate-400 hover:text-white"
                      title="Add to Playlist"
                    >
                      <Plus className="w-4 h-4 text-emerald-400" />
                    </button>
                    <button
                      onClick={() => toggleFavorite(track)}
                      className="p-2 text-slate-400 hover:text-white"
                      title="Favorite"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isFav ? 'fill-red-500 text-red-500' : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      </div>

      {/* Add To Playlist Modal */}
      {playlistModalTrack && (
        <AddToPlaylistModal
          track={playlistModalTrack}
          isOpen={!!playlistModalTrack}
          onClose={() => setPlaylistModalTrack(null)}
        />
      )}
    </div>
  );
}
