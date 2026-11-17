import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  getAudioStreamUrl,
  getDirectAudioStreamUrl,
  getPlayableAudioStreamUrl,
  getFallbackStreamUrl,
  getRelatedTracks,
  getLyrics,
  prewarmTrack,
  getTrackDetails,
  CLOUD_FALLBACK_SERVER,
  PC_USB_SERVER,
  resolveServer
} from '../services/api';
import { recordListeningProgress, recordTrackStart, getAffinityProfile, detectLanguage } from '../services/telemetry';
import { recordRLReward, getRLInsights, resetRLModel, generateSmartQueueSuggestions } from '../services/reinforcementLearning';
import {
  getOfflineTracks,
  downloadTrackOffline,
  deleteOfflineTrack,
  clearAllOfflineTracks,
  getTotalOfflineSize,
  getOfflineTrackBlobUrl
} from '../services/offlineStorage';
import {
  isNativePlatform,
  setNativeVolume,
  startBackgroundAudio,
  updateBackgroundPlayback,
  stopBackgroundAudio,
  addMediaActionListener,
  addPlaybackEndedListener,
  addPlaybackTickListener,
  addPlaybackErrorListener,
  playNativeStream,
  pauseNativeStream,
  resumeNativeStream,
  seekNativeStream,
  checkBackgroundStatus,
  requestNotificationPermission,
  requestBatteryOptimization,
  openAppSettings
} from '../services/backgroundAudio';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);
  const pendingSeekRef = useRef(null);
  const audioCtxRef = useRef(null);
  const bassFilterRef = useRef(null);
  const trebleFilterRef = useRef(null);

  // Playback state
  const [currentTrack, setCurrentTrack] = useState(null);
  const currentTrackRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTimeState] = useState(0);
  const currentTimeRef = useRef(0);
  const setCurrentTime = (val) => {
    const safe = typeof val === 'number' && isFinite(val) ? val : 0;
    currentTimeRef.current = safe;
    setCurrentTimeState(safe);
  };

  const [duration, setDurationState] = useState(0);
  const durationRef = useRef(0);
  const setDuration = (val) => {
    const safe = typeof val === 'number' && isFinite(val) && val > 0 ? val : 0;
    durationRef.current = safe;
    setDurationState(safe);
  };
  const [buffered, setBuffered] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackError, setPlaybackError] = useState(null);
  const [useDirectPlayer, setUseDirectPlayer] = useState(false);

  // Active Indian language filter on Home
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    return localStorage.getItem('musicit_active_lang') || 'all';
  });

  useEffect(() => {
    localStorage.setItem('musicit_active_lang', selectedLanguage);
  }, [selectedLanguage]);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  const rlMilestonesRef = useRef({ longPlay: false, fullPlay: false, trackId: null });
  const prewarmedRef = useRef(new Set());
  function checkPrewarmNext() {
    if (queue.length > 0 && queueIndex < queue.length - 1) {
      const nextSong = queue[queueIndex + 1];
      if (nextSong && !prewarmedRef.current.has(nextSong.id)) {
        prewarmedRef.current.add(nextSong.id);
        prewarmTrack(nextSong.id, audioQuality);
      }
    } else if (mlSuggestions && mlSuggestions.length > 0) {
      const nextSong = mlSuggestions[0];
      if (nextSong && !prewarmedRef.current.has(nextSong.id)) {
        prewarmedRef.current.add(nextSong.id);
        prewarmTrack(nextSong.id, audioQuality);
      }
    }
  }

  // Queue & Modes
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [mlSuggestions, setMlSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // 'off' | 'all' | 'one'
  const [isShuffle, setIsShuffle] = useState(false);
  const [autoplay, setAutoplay] = useState(true); // Infinite radio mode
  const [isVideoMode, setIsVideoMode] = useState(false);
  const isVideoModeRef = useRef(isVideoMode);

  useEffect(() => {
    isVideoModeRef.current = isVideoMode;
  }, [isVideoMode]);

  // Live mutable refs to ensure audio event listeners and async routines always access latest state
  const queueRef = useRef(queue);
  const queueIndexRef = useRef(queueIndex);
  const repeatModeRef = useRef(repeatMode);
  const isShuffleRef = useRef(isShuffle);
  const autoplayRef = useRef(autoplay);
  const mlSuggestionsRef = useRef(mlSuggestions);
  const historyRef = useRef([]);
  const handleTrackEndedRef = useRef(null);
  const isReplenishingRef = useRef(false);
  const isAutoplayRef = useRef(false);
  const isEndingRef = useRef(false);

  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { queueIndexRef.current = queueIndex; }, [queueIndex]);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { isShuffleRef.current = isShuffle; }, [isShuffle]);
  useEffect(() => { autoplayRef.current = autoplay; }, [autoplay]);
  useEffect(() => { mlSuggestionsRef.current = mlSuggestions; }, [mlSuggestions]);

  // Lyrics
  const [lyrics, setLyrics] = useState(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);

  // Playback Speed & Volume
  const [playbackSpeed, setPlaybackSpeedState] = useState(1.0);
  const [volume, setVolumeState] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [dominantColor, setDominantColor] = useState('16, 185, 129');

  // Progressive Web App (PWA) installation state
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true) {
      setIsInstalled(true);
      return;
    }
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      showToast('Harmoniq installed successfully as a Web App!', 'success');
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setInstallPrompt(null);
      }
      return;
    }
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
      showToast("Tap the Share icon ⎋ and choose 'Add to Home Screen' to install Harmoniq.", "info");
    } else {
      showToast("To install Harmoniq: Tap your browser's menu (⋮) and select 'Install app' or 'Add to Home screen'.", "info");
    }
  };

  // Toast notifications
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  function showToast(message, type = 'info') {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type, id: Date.now() });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 2800);
  }

  function setPlaybackSpeed(speed) {
    setPlaybackSpeedState(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }

  function setVolume(vol) {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    if (isNativePlatform()) {
      setNativeVolume(clamped);
    }
    if (audioRef.current) {
      audioRef.current.volume = clamped;
      setIsMuted(clamped === 0);
    }
  }

  function toggleMute() {
    if (isMuted) {
      const v = volume || 1.0;
      if (isNativePlatform()) setNativeVolume(v);
      if (audioRef.current) audioRef.current.volume = v;
      setIsMuted(false);
    } else {
      if (isNativePlatform()) setNativeVolume(0);
      if (audioRef.current) audioRef.current.volume = 0;
      setIsMuted(true);
    }
  }

  // UI state
  const [isNowPlayingExpanded, setIsNowPlayingExpanded] = useState(false);
  const [showQueueSheet, setShowQueueSheet] = useState(false);
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [sleepTimerTime, setSleepTimerTime] = useState(null); // remaining seconds

  // Settings & Audio Quality
  const [audioQuality, setAudioQuality] = useState(() => {
    return localStorage.getItem('musicit_audio_quality') || 'high';
  });
  const audioQualityRef = useRef(audioQuality);
  useEffect(() => { audioQualityRef.current = audioQuality; }, [audioQuality]);
  const hasFailedOverRef = useRef(false);
  const [equalizerPreset, setEqualizerPreset] = useState(() => {
    return localStorage.getItem('musicit_eq_preset') || 'flat';
  });
  const [normalizeVolume, setNormalizeVolume] = useState(() => {
    return localStorage.getItem('musicit_normalize_vol') !== 'false';
  });
  const [ambientGlow, setAmbientGlow] = useState(() => {
    return localStorage.getItem('musicit_ambient_glow') !== 'false';
  });

  // Offline Downloads state
  const [downloadedTracks, setDownloadedTracks] = useState([]);
  const [downloadingTrackId, setDownloadingTrackId] = useState(null);
  const [offlineSizeMB, setOfflineSizeMB] = useState('0.0');

  // Preferences for Recommendations (User's Languages, Genres & Artists)
  const [preferences, setPreferences] = useState(() => {
    try {
      const stored = localStorage.getItem('musicit_preferences');
      if (stored) {
        const parsed = JSON.parse(stored);
        // If stored preferences only have the legacy default English template, upgrade to user-preferred Indian music
        if (
          parsed.languages?.length === 1 &&
          parsed.languages[0] === 'English' &&
          (parsed.artists?.includes('The Weeknd') || parsed.artists?.length === 0)
        ) {
          return {
            genres: ['❤️ Romantic Love Songs', '🙏 Devotional & Bhakti', '☕ Lo-Fi & Slowed Reverb'],
            artists: ['KJ Yesudas', 'Sid Sriram', 'Arijit Singh'],
            languages: ['Malayalam', 'Telugu', 'Hindi'],
            mood: 'Chill'
          };
        }
        return parsed;
      }
      return {
        genres: ['❤️ Romantic Love Songs', '🙏 Devotional & Bhakti', '☕ Lo-Fi & Slowed Reverb'],
        artists: ['KJ Yesudas', 'Sid Sriram', 'Arijit Singh'],
        languages: ['Malayalam', 'Telugu', 'Hindi'],
        mood: 'Chill'
      };
    } catch {
      return {
        genres: ['❤️ Romantic Love Songs', '🙏 Devotional & Bhakti'],
        artists: ['KJ Yesudas', 'Sid Sriram', 'Arijit Singh'],
        languages: ['Malayalam', 'Telugu', 'Hindi'],
        mood: 'Chill'
      };
    }
  });

  // Favorites, History, Playlists
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('musicit_favorites') || '[]');
    } catch {
      return [];
    }
  });

  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('musicit_history') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const [playlists, setPlaylists] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('musicit_playlists') || '[]');
    } catch {
      return [];
    }
  });

  // Persist settings
  useEffect(() => {
    localStorage.setItem('musicit_audio_quality', audioQuality);
  }, [audioQuality]);

  useEffect(() => {
    localStorage.setItem('musicit_eq_preset', equalizerPreset);
    if (equalizerPreset && equalizerPreset !== 'flat') {
      applyEqualizerPreset(equalizerPreset);
    }
  }, [equalizerPreset]);

  useEffect(() => {
    localStorage.setItem('musicit_normalize_vol', normalizeVolume);
  }, [normalizeVolume]);

  useEffect(() => {
    localStorage.setItem('musicit_ambient_glow', ambientGlow);
  }, [ambientGlow]);

  useEffect(() => {
    localStorage.setItem('musicit_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('musicit_playlists', JSON.stringify(playlists));
  }, [playlists]);

  useEffect(() => {
    localStorage.setItem('musicit_history', JSON.stringify(history.slice(0, 50)));
  }, [history]);

  // Load offline downloads on mount
  useEffect(() => {
    loadOfflineDownloads();
  }, []);

  async function loadOfflineDownloads() {
    const list = await getOfflineTracks();
    setDownloadedTracks(list);
    const size = await getTotalOfflineSize();
    setOfflineSizeMB(size);
  }

  // Request notification permission for background playback service on Android
  useEffect(() => {
    checkBackgroundStatus().then(status => {
      if (status.isNative && !status.notificationsGranted) {
        requestNotificationPermission();
      }
    }).catch(() => {});
  }, []);

  // Synchronize Android foreground service with music playback state, controls, and details
  useEffect(() => {
    if (currentTrack) {
      startBackgroundAudio(
        currentTrack.title,
        currentTrack.displayArtist || currentTrack.artist || 'Harmoniq',
        isPlaying,
        currentTimeRef.current || 0,
        durationRef.current || 180,
        currentTrack.thumbnail || ''
      );
    } else {
      stopBackgroundAudio();
    }
  }, [isPlaying, currentTrack?.id, currentTrack?.title, currentTrack?.thumbnail]);

  // Master live playback heartbeat for accurate timeline sync across ALL playback engines
  useEffect(() => {
    if (!isPlaying) return;

    let lastTickTime = Date.now();
    let tickCount = 0;

    const interval = setInterval(() => {
      tickCount++;
      const now = Date.now();
      const deltaSec = Math.max(0, (now - lastTickTime) / 1000);
      lastTickTime = now;

      const audio = audioRef.current;
      const isVideo = isVideoModeRef.current;

      if (!isVideo) {
        let cur = 0;
        // 1. If HTML5 audio element has an active stream playing
        if (audio && !audio.paused && !isNaN(audio.currentTime) && isFinite(audio.currentTime) && audio.currentTime > 0) {
          cur = audio.currentTime;
          if (audio.duration && isFinite(audio.duration) && audio.duration > 0 && audio.duration !== Infinity) {
            durationRef.current = audio.duration;
            setDuration(audio.duration);
          }
        } else {
          // 2. Direct player / background stream active: advance timer smoothly using wall clock delta!
          const prev = currentTimeRef.current || 0;
          cur = prev + deltaSec;
        }

        const dur = durationRef.current || (currentTrackRef.current?.duration > 0 ? currentTrackRef.current.duration : 180);

        // Auto-end track when reaching the end of duration
        if (dur > 5 && cur >= dur - 0.5) {
          cur = dur;
          if (!isEndingRef.current && handleTrackEndedRef.current) {
            handleTrackEndedRef.current();
          }
        }

        // Apply smooth time update unless user is actively dragging the slider
        if (pendingSeekRef.current === null || Math.abs(cur - pendingSeekRef.current) < 2) {
          currentTimeRef.current = cur;
          setCurrentTime(cur);
        }
      }

      // Live sync position and duration to Android system notification & MediaSession every 1000ms (every 4 ticks)
      if (tickCount % 4 === 0 && currentTrackRef.current) {
        const cur = currentTimeRef.current || 0;
        const dur = durationRef.current || 180;
        updateBackgroundPlayback(
          currentTrackRef.current.title,
          currentTrackRef.current.displayArtist || currentTrackRef.current.artist || 'Harmoniq',
          isPlaying,
          Math.floor(cur),
          Math.floor(dur),
          currentTrackRef.current.thumbnail || ''
        );
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Handle native Android notification media actions and Foreground Service events
  useEffect(() => {
    const subPromise = addMediaActionListener((action, position) => {
      if (action === 'toggle') {
        togglePlay();
      } else if (action === 'play') {
        resumeTrack();
      } else if (action === 'pause') {
        pauseTrack();
      } else if (action === 'next') {
        playNext();
      } else if (action === 'previous') {
        playPrevious();
      } else if (action === 'seek' && typeof position === 'number') {
        seekTo(position);
      } else if (action === 'stop') {
        pauseTrack();
        stopBackgroundAudio();
      }
    });

    // Native playbackEnded trigger for automatic next track advancement
    const endedPromise = addPlaybackEndedListener(() => {
      console.log('[Native Audio] Playback ended event received from service. Advancing to next track.');
      if (handleTrackEndedRef.current) {
        handleTrackEndedRef.current();
      }
    });

    // Live position and duration tick from native MediaPlayer in background
    const tickPromise = addPlaybackTickListener((positionSec, durationSec, isNativePlaying) => {
      if (typeof positionSec === 'number' && isFinite(positionSec)) {
        if (!isVideoModeRef.current) {
          currentTimeRef.current = positionSec;
          setCurrentTime(positionSec);
        }
      }
      if (typeof durationSec === 'number' && durationSec > 0 && isFinite(durationSec)) {
        durationRef.current = durationSec;
        setDuration(durationSec);
      }
      if (typeof isNativePlaying === 'boolean') {
        setIsPlaying(isNativePlaying);
      }
    });

    // Handle stream playback errors from native MediaPlayer gracefully
    const errorPromise = addPlaybackErrorListener((err) => {
      console.warn('[Native Audio] Native MediaPlayer error event:', err);
      // Fallback seamlessly to direct player
      setUseDirectPlayer(true);
      setIsPlaying(true);
      setIsLoading(false);
    });

    return () => {
      if (subPromise && subPromise.then) subPromise.then(handle => handle && handle.remove && handle.remove()).catch(() => {});
      if (endedPromise && endedPromise.then) endedPromise.then(handle => handle && handle.remove && handle.remove()).catch(() => {});
      if (tickPromise && tickPromise.then) tickPromise.then(handle => handle && handle.remove && handle.remove()).catch(() => {});
      if (errorPromise && errorPromise.then) errorPromise.then(handle => handle && handle.remove && handle.remove()).catch(() => {});
    };
  }, []);

  // Set up Audio element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.playsInline = true;
    audioRef.current = audio;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => {
      setIsPlaying(false);
      if (audio && !isNaN(audio.currentTime) && isFinite(audio.currentTime) && audio.currentTime > 0) {
        currentTimeRef.current = audio.currentTime;
        setCurrentTime(audio.currentTime);
      }
    };
    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => {
      setIsLoading(false);
      if (pendingSeekRef.current !== null && pendingSeekRef.current > 0) {
        try {
          audio.currentTime = pendingSeekRef.current;
        } catch (e) {}
        pendingSeekRef.current = null;
      }
    };
    const handleSeeked = () => {
      pendingSeekRef.current = null;
      if (typeof audio.currentTime === 'number' && isFinite(audio.currentTime)) {
        currentTimeRef.current = audio.currentTime;
        setCurrentTime(audio.currentTime);
      }
    };
    
    const handleTimeUpdate = () => {
      if (typeof audio.currentTime === 'number' && isFinite(audio.currentTime)) {
        if (!isVideoModeRef.current) {
          // Ignore transient stale updates while a seek is landing
          if (pendingSeekRef.current !== null && Math.abs(audio.currentTime - pendingSeekRef.current) > 2) {
            return;
          }
          setCurrentTime(audio.currentTime);
          currentTimeRef.current = audio.currentTime;
        }
      }
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0 && audio.duration !== Infinity) {
        setDuration(audio.duration);
      }
      try {
        if (audio.buffered && audio.buffered.length > 0) {
          const end = audio.buffered.end(audio.buffered.length - 1);
          const totalDur = (audio.duration && isFinite(audio.duration) && audio.duration > 0) ? audio.duration : 1;
          setBuffered((end / totalDur) * 100);
        }
      } catch (e) {}
      updatePositionState();

      // Record listening telemetry & affinity tracking (discounted priority if track was autoplayed)
      if (currentTrackRef.current) {
        recordListeningProgress(currentTrackRef.current, audio.currentTime, audio.duration || 0, isAutoplayRef.current);

        // Reinforcement Learning reward milestones
        const track = currentTrackRef.current;
        if (rlMilestonesRef.current.trackId === track.id) {
          if (!rlMilestonesRef.current.longPlay && (audio.currentTime > 40 || (audio.duration > 0 && audio.currentTime / audio.duration > 0.35))) {
            rlMilestonesRef.current.longPlay = true;
            recordRLReward(track, 'LONG_PLAY', { mood: preferences?.mood, isAutoplay: isAutoplayRef.current });
          }
          if (!rlMilestonesRef.current.fullPlay && audio.duration > 0 && audio.currentTime / audio.duration > 0.80) {
            rlMilestonesRef.current.fullPlay = true;
            recordRLReward(track, 'FULL_PLAY', { mood: preferences?.mood, isAutoplay: isAutoplayRef.current });
          }
        }
      }

      // Pre-warm next song for zero-latency gapless transitions (> 80%)
      if (audio.duration > 0 && audio.currentTime / audio.duration > 0.8) {
        checkPrewarmNext();
      }
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0 && audio.duration !== Infinity) {
        setDuration(audio.duration);
      }
      setIsLoading(false);
      updatePositionState();
      if (pendingSeekRef.current !== null && pendingSeekRef.current > 0) {
        try {
          audio.currentTime = pendingSeekRef.current;
        } catch (e) {}
        pendingSeekRef.current = null;
      }
    };

    const handleEnded = () => {
      if (handleTrackEndedRef.current) {
        handleTrackEndedRef.current();
      }
    };

    const handleError = (e) => {
      console.warn('[Audio Error on HTML5 audio element]', e);
      if (currentTrackRef.current) {
        // If HTML5 audio stream fails (e.g. Render 500 error or PC connection drop),
        // seamlessly switch to BackgroundDirectPlayer for 100% reliable zero-error playback!
        console.log('[Player] Server stream error. Seamlessly switching to Direct Player!');
        if (audioRef.current) {
          try {
            audioRef.current.pause();
            audioRef.current.removeAttribute('src');
            audioRef.current.load();
          } catch (err) {}
        }
        setUseDirectPlayer(true);
        setIsPlaying(true);
        setIsLoading(false);
        showToast('Connecting direct cloud audio stream...', 'info');
        return;
      }
      setIsLoading(false);
      setIsPlaying(false);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('seeked', handleSeeked);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('seeked', handleSeeked);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
    };
  }, []);

  // Web Audio API Equalizer Filter setup
  function applyEqualizerPreset(preset) {
    if (!preset || preset === 'flat') {
      if (!audioCtxRef.current) return;
    }

    if (!audioCtxRef.current && audioRef.current && preset && preset !== 'flat') {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }

        const source = ctx.createMediaElementSource(audioRef.current);
        const bassFilter = ctx.createBiquadFilter();
        bassFilter.type = 'lowshelf';
        bassFilter.frequency.value = 200;

        const trebleFilter = ctx.createBiquadFilter();
        trebleFilter.type = 'highshelf';
        trebleFilter.frequency.value = 3000;

        source.connect(bassFilter);
        bassFilter.connect(trebleFilter);
        trebleFilter.connect(ctx.destination);

        bassFilterRef.current = bassFilter;
        trebleFilterRef.current = trebleFilter;
      } catch (e) {
        // Ignored if browser restricts until user gesture
      }
    }

    if (bassFilterRef.current && trebleFilterRef.current) {
      if (preset === 'bass') {
        bassFilterRef.current.gain.value = 8;
        trebleFilterRef.current.gain.value = 0;
      } else if (preset === 'vocal') {
        bassFilterRef.current.gain.value = -3;
        trebleFilterRef.current.gain.value = 4;
      } else if (preset === 'treble') {
        bassFilterRef.current.gain.value = 0;
        trebleFilterRef.current.gain.value = 7;
      } else if (preset === 'electronic') {
        bassFilterRef.current.gain.value = 6;
        trebleFilterRef.current.gain.value = 5;
      } else {
        bassFilterRef.current.gain.value = 0;
        trebleFilterRef.current.gain.value = 0;
      }
    }
  }

  // Update System Media Session for background audio & lock screen controls
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.displayArtist || currentTrack.singers?.[0] || currentTrack.artist || 'Musicit',
        album: currentTrack.movie ? `${currentTrack.movie} (Ad-Free)` : 'YouTube Music (Ad-Free)',
        artwork: [
          { src: currentTrack.thumbnail, sizes: '96x96', type: 'image/jpeg' },
          { src: currentTrack.thumbnail, sizes: '128x128', type: 'image/jpeg' },
          { src: currentTrack.thumbnail, sizes: '192x192', type: 'image/jpeg' },
          { src: currentTrack.thumbnail, sizes: '256x256', type: 'image/jpeg' },
          { src: currentTrack.thumbnail, sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => togglePlay());
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrevious());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime != null) {
          seekTo(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        seekTo(Math.max(0, (audioRef.current?.currentTime || 0) - offset));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10;
        seekTo(Math.min(duration, (audioRef.current?.currentTime || 0) + offset));
      });
    } catch (e) {
      console.warn('MediaSession setup error:', e);
    }
  }, [currentTrack]);

  // Sync playbackState to MediaSession
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  function updatePositionState() {
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      const audio = audioRef.current;
      if (audio && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audio.duration,
            playbackRate: audio.playbackRate || 1.0,
            position: Math.min(audio.currentTime, audio.duration)
          });
        } catch (e) {}
      }
    }
  }

  // Sleep Timer countdown
  useEffect(() => {
    if (sleepTimerTime === null) return;
    if (sleepTimerTime <= 0) {
      pauseTrack();
      setSleepTimerTime(null);
      return;
    }

    const interval = setInterval(() => {
      setSleepTimerTime(t => (t > 1 ? t - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimerTime]);

  // Play a track (Supports Offline Blobs or Online Audio Stream)
  // isAutoplay = false: User explicitly clicked track (high priority manual selection)
  // isAutoplay = true: Automated transition (low priority in suggestion / preference calculations)
  async function playTrack(track, newQueue = null, index = null, isAutoplay = false, initialSeekTime = 0) {
    try {
      if (!track) return;

      // Handle offline playback gracefully (like Spotify / Apple Music)
      if (typeof navigator !== 'undefined' && !navigator.onLine && !isDownloaded(track.id)) {
        showToast("You're offline. Connect to internet or play downloaded music.", "warning");
        setIsLoading(false);
        setIsPlaying(false);
        return;
      }

      isAutoplayRef.current = Boolean(isAutoplay);
      setPlaybackError(null);
      setCurrentTrack(track);
      setIsLoading(true);

      // Immediately set duration from track metadata so scrubber works right away!
      let initialDuration = 0;
      if (typeof track.duration === 'number' && track.duration > 0 && isFinite(track.duration)) {
        initialDuration = track.duration;
      } else if (track.durationStr && typeof track.durationStr === 'string') {
        const parts = track.durationStr.split(':').map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          initialDuration = parts[0] * 60 + parts[1];
        } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
          initialDuration = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
      }
      if (initialDuration <= 0) {
        initialDuration = 210; // Default 3:30 safe duration so timeline is never empty
      }
      setDuration(initialDuration);
      durationRef.current = initialDuration;
      
      if (typeof initialSeekTime === 'number' && initialSeekTime > 0) {
        setCurrentTime(initialSeekTime);
        currentTimeRef.current = initialSeekTime;
        pendingSeekRef.current = initialSeekTime;
      } else {
        setCurrentTime(0);
        currentTimeRef.current = 0;
        pendingSeekRef.current = null;
      }

      // Record track start & update session language (with autoplay priority distinction)
      recordTrackStart(track, Boolean(isAutoplay));

      if (!isAutoplay) {
        recordRLReward(track, 'USER_SELECT', { mood: preferences?.mood });
      }

      if (newQueue) {
        setQueue(newQueue);
        setQueueIndex(index !== null ? index : newQueue.findIndex(t => t.id === track.id));
      } else if (index !== null) {
        setQueueIndex(index);
        if (queueRef.current.length - index < 8) {
          replenishQueueUnderneath(track);
        }
      } else {
        // User selected a song by themselves: reset queue to this song,
        // and asynchronously generate 25+ rich ML-ranked songs under the queue without blocking audio!
        setQueue([track]);
        setQueueIndex(0);
        setTimeout(() => {
          generateMLQueueForTrack(track, null);
        }, 150);
      }

      // Refresh ML suggestions state in background
      if (newQueue) {
        setTimeout(() => {
          generateMLQueueForTrack(track, newQueue);
        }, 150);
      }

      // Enrich track with singer, actor, composer details from backend asynchronously
      setTimeout(() => {
        getTrackDetails(track.id).then((details) => {
          if (details && currentTrackRef.current?.id === track.id) {
            const enriched = {
              ...track,
              singers: details.singers || track.singers || [],
              actors: details.actors || track.actors || [],
              musicDirector: details.musicDirector || track.musicDirector || null,
              movie: details.movie || track.movie || null,
              displayArtist: details.displaySubtitle || track.displayArtist || track.artist,
              language: details.language || track.language
            };
            setCurrentTrack(prev => (prev?.id === track.id ? { ...prev, ...enriched } : prev));
            recordTrackStart(enriched, isAutoplayRef.current);
          }
        }).catch(() => {});
      }, 100);

      // RL quick skip check safely
      try {
        if (currentTrackRef.current && currentTime < 15 && duration > 30) {
          recordRLReward(currentTrackRef.current, 'QUICK_SKIP', { mood: preferences?.mood });
        }
      } catch (e) {}
      rlMilestonesRef.current = { longPlay: false, fullPlay: false, trackId: track.id };

      // Add to history
      setHistory(prev => [track, ...prev.filter(t => t.id !== track.id)].slice(0, 50));

      // Reset auto-failover state for new track
      hasFailedOverRef.current = false;

      // Load lyrics in background asynchronously
      setTimeout(() => {
        fetchLyrics(track);
      }, 200);

      // Check if track is downloaded offline in IndexedDB
      let streamUrl = null;
      if (isDownloaded(track.id)) {
        try {
          streamUrl = await getOfflineTrackBlobUrl(track.id);
        } catch (e) {}
      }

      setUseDirectPlayer(false);

      if (!streamUrl) {
        try {
          streamUrl = await getPlayableAudioStreamUrl(track.id, audioQuality);
        } catch (e) {}
      }

      if (!streamUrl) {
        streamUrl = getAudioStreamUrl(track.id, audioQuality);
      }

      // Check if this stream is directed to the Render cloud server
      const isCloudStream = Boolean(streamUrl && streamUrl.includes('onrender.com'));
      if (isCloudStream) {
        // Render's datacenter IP is restricted from extracting direct audio streams by YouTube.
        // Immediately activate the zero-error Direct Player engine for flawless cloud playback!
        console.log('[Player] Cloud mode: activating direct player engine for track:', track.id);
        if (audioRef.current) {
          try {
            audioRef.current.pause();
            audioRef.current.removeAttribute('src');
            audioRef.current.load();
          } catch (e) {}
        }
        setUseDirectPlayer(true);
        setIsPlaying(true);
        setIsLoading(false);
        return;
      }

      // If running on native Android with a valid stream URL (PC server or local proxy):
      // Stream directly through the native Foreground Service's MediaPlayer.
      // This enables 100% background playback even when the app is completely exited, screen is off, or phone is locked (Spotify behavior)!
      if (isNativePlatform() && streamUrl && streamUrl.startsWith('http')) {
        console.log('[Player] Native Android: Starting native MediaPlayer in ForegroundService:', streamUrl);
        const played = await playNativeStream({
          url: streamUrl,
          title: track.title,
          artist: track.displayArtist || track.artist || 'Harmoniq',
          currentTime: initialSeekTime || 0,
          duration: initialDuration || 180,
          thumbnail: track.thumbnail || ''
        });

        if (played) {
          setIsPlaying(true);
          setIsLoading(false);
          setUseDirectPlayer(false);
          if (audioRef.current) {
            try {
              audioRef.current.pause();
              audioRef.current.removeAttribute('src');
              audioRef.current.load();
            } catch (e) {}
          }
          return;
        }
      }

      // Play stream via HTML5 audio element
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }

      const audio = audioRef.current;
      if (audio) {
        audio.src = streamUrl;
        audio.load();
        if (typeof initialSeekTime === 'number' && initialSeekTime > 0) {
          pendingSeekRef.current = initialSeekTime;
          try {
            audio.currentTime = initialSeekTime;
          } catch (e) {}
        }
        try {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            await playPromise;
            setIsPlaying(true);
            setUseDirectPlayer(false);
            if (typeof initialSeekTime === 'number' && initialSeekTime > 0) {
              try {
                if (Math.abs(audio.currentTime - initialSeekTime) > 2) {
                  audio.currentTime = initialSeekTime;
                }
              } catch (e) {}
            }
            if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
              audioCtxRef.current.resume().catch(() => {});
            }
          }
        } catch (err) {
          if (err.name === 'AbortError') return;
          console.warn('[Player] Local PC audio play failed:', err);
          // Fall back to direct player engine for uninterrupted playback!
          console.log('[Player] Falling back to direct player engine for track:', track.id);
          if (audio) {
            try {
              audio.pause();
              audio.removeAttribute('src');
              audio.load();
            } catch (e) {}
          }
          setUseDirectPlayer(true);
          setIsPlaying(true);
          setIsLoading(false);
          showToast('Connecting direct cloud audio stream...', 'info');
          return;
        }
      } else {
        setIsLoading(false);
        setIsPlaying(false);
      }
    } catch (err) {
      console.error('[Player] playTrack recovery:', err);
      setIsLoading(false);
    }
  }

  async function replenishQueueUnderneath(referenceTrack) {
    if (!referenceTrack || !referenceTrack.id || isReplenishingRef.current) return;
    isReplenishingRef.current = true;
    try {
      const res = await getRelatedTracks(referenceTrack.id);
      const candidates = Array.isArray(res) ? res : (res?.results || []);
      const affinity = getAffinityProfile ? getAffinityProfile() : {};
      const rlContext = {
        mood: preferences?.mood || 'Chill',
        currentLanguage: detectLanguage(referenceTrack) || affinity.currentLanguage,
        frequentTrackIds: (affinity.frequentTracks || []).map(t => t.id),
        recentArtists: (affinity.topArtists || []).map(a => a.name)
      };
      const ranked = generateSmartQueueSuggestions(referenceTrack, candidates, rlContext);
      setQueue(prev => {
        const existingIds = new Set(prev.map(t => t.id));
        const existingTitles = new Set(prev.map(t => (t.title || '').toLowerCase().replace(/\[.*?\]|\(.*?\)/g, '').replace(/[^a-z0-9]/g, '').slice(0, 14)));
        const newTracks = ranked.filter(t => {
          if (!t || !t.id || existingIds.has(t.id)) return false;
          const norm = (t.title || '').toLowerCase().replace(/\[.*?\]|\(.*?\)/g, '').replace(/[^a-z0-9]/g, '').slice(0, 14);
          if (existingTitles.has(norm)) return false;
          existingTitles.add(norm);
          return true;
        }).slice(0, 15);

        if (newTracks.length > 0) {
          return [...prev, ...newTracks];
        }
        return prev;
      });
    } catch (e) {
      console.warn('[Queue Replenish] Error:', e);
    } finally {
      isReplenishingRef.current = false;
    }
  }

  async function generateMLQueueForTrack(track, existingQueue = null) {
    if (!track || !track.id) return;
    setIsLoadingSuggestions(true);
    try {
      const trackLang = detectLanguage(track);
      const affinity = getAffinityProfile ? getAffinityProfile() : {};
      const res = await getRelatedTracks(track.id);
      const candidates = Array.isArray(res) ? res : (res?.results || []);

      const rlContext = {
        mood: preferences?.mood || 'Chill',
        currentLanguage: trackLang || affinity.currentLanguage,
        frequentTrackIds: (affinity.frequentTracks || []).map(t => t.id),
        recentArtists: (affinity.topArtists || []).map(a => a.name)
      };

      const ranked = generateSmartQueueSuggestions(track, candidates, rlContext);
      setMlSuggestions(ranked);

      // Auto-fill upcoming queue with 20-25 top ML suggestions when user selects a standalone track
      if (!existingQueue || existingQueue.length <= 1) {
        const cleanList = [track, ...ranked.slice(0, 25)];
        setQueue(cleanList);
        setQueueIndex(0);
      }
    } catch (e) {
      console.warn('[Player] ML Queue generation error:', e);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }

  async function generateAIQueue(track = currentTrackRef.current) {
    if (!track || !track.id) return;
    setIsLoadingSuggestions(true);
    showToast('✨ Crafting personalized AI queue...', 'info');
    try {
      const trackLang = detectLanguage(track);
      const affinity = getAffinityProfile ? getAffinityProfile() : {};
      const res = await getRelatedTracks(track.id);
      const candidates = Array.isArray(res) ? res : (res?.results || []);

      const rlContext = {
        mood: preferences?.mood || 'Chill',
        currentLanguage: trackLang || affinity.currentLanguage,
        frequentTrackIds: (affinity.frequentTracks || []).map(t => t.id),
        recentArtists: (affinity.topArtists || []).map(a => a.name)
      };

      const ranked = generateSmartQueueSuggestions(track, candidates, rlContext);
      setMlSuggestions(ranked);

      if (ranked.length > 0) {
        setQueue(prev => {
          const curIdx = queueIndexRef.current >= 0 ? queueIndexRef.current : 0;
          const currentPlayed = prev.slice(0, curIdx + 1);
          const existingIds = new Set(currentPlayed.map(t => t.id));
          const existingTitles = new Set(currentPlayed.map(t => (t.title || '').toLowerCase().replace(/\[.*?\]|\(.*?\)/g, '').replace(/[^a-z0-9]/g, '').slice(0, 14)));

          const upcoming = ranked.filter(t => {
            if (!t || !t.id || existingIds.has(t.id)) return false;
            const norm = (t.title || '').toLowerCase().replace(/\[.*?\]|\(.*?\)/g, '').replace(/[^a-z0-9]/g, '').slice(0, 14);
            if (existingTitles.has(norm)) return false;
            existingTitles.add(norm);
            return true;
          });

          return [...currentPlayed, ...upcoming];
        });
        showToast(`✨ Generated ${ranked.length} songs for your AI queue`, 'success');
      } else {
        showToast('Looking for more recommendations...', 'info');
      }
    } catch (e) {
      console.warn('[Player] Generate AI Queue error:', e);
      showToast('Could not refresh AI queue right now', 'error');
    } finally {
      setIsLoadingSuggestions(false);
    }
  }

  function addSuggestionsToQueue(suggestions = mlSuggestions) {
    if (!Array.isArray(suggestions) || suggestions.length === 0) return;
    setQueue(prev => {
      const existingIds = new Set(prev.map(t => t.id));
      const toAdd = suggestions.filter(t => !existingIds.has(t.id));
      return [...prev, ...toAdd];
    });
    showToast(`Added ${suggestions.length} AI suggestions to queue`, 'success');
  }

  async function fetchLyrics(track) {
    setIsLoadingLyrics(true);
    setLyrics(null);
    try {
      const data = await getLyrics(track.title, track.artist);
      setLyrics(data);
    } catch {
      setLyrics(null);
    } finally {
      setIsLoadingLyrics(false);
    }
  }

  function syncAudioToVideo(targetSeconds) {
    const safeSec = Math.max(0, isFinite(targetSeconds) ? targetSeconds : 0);
    currentTimeRef.current = safeSec;
    setCurrentTime(safeSec);
    pendingSeekRef.current = safeSec;

    // Broadcast seek event for video player, fallback direct player, and other listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('harmoniq:seek', { detail: safeSec }));
    }

    const audio = audioRef.current;
    if (audio) {
      try {
        if (audio.readyState >= 1) {
          audio.currentTime = safeSec;
        } else {
          pendingSeekRef.current = safeSec;
        }
      } catch (e) {
        pendingSeekRef.current = safeSec;
      }
    }
    if (currentTrackRef.current) {
      updateBackgroundPlayback(
        currentTrackRef.current.title,
        currentTrackRef.current.displayArtist || currentTrackRef.current.artist || 'Harmoniq',
        isPlaying,
        safeSec,
        durationRef.current || 180,
        currentTrackRef.current.thumbnail || ''
      );
    }
  }

  function togglePlay() {
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }

    if (isVideoMode) {
      const nextPlay = !isPlaying;
      setIsPlaying(nextPlay);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('harmoniq:video-toggle', { detail: nextPlay }));
      }
      return;
    }

    if (isPlaying) {
      pauseTrack();
    } else {
      resumeTrack();
    }
  }

  function pauseTrack() {
    if (isNativePlatform()) {
      pauseNativeStream().catch(() => {});
    }
    const audio = audioRef.current;
    if (audio) {
      if (!isNaN(audio.currentTime) && isFinite(audio.currentTime) && audio.currentTime > 0) {
        currentTimeRef.current = audio.currentTime;
        setCurrentTime(audio.currentTime);
      }
      audio.pause();
    }
    setIsPlaying(false);

    if (currentTrackRef.current) {
      updateBackgroundPlayback(
        currentTrackRef.current.title,
        currentTrackRef.current.displayArtist || currentTrackRef.current.artist || 'Harmoniq',
        false,
        Math.floor(currentTimeRef.current || currentTime || 0),
        Math.floor(durationRef.current || duration || 180),
        currentTrackRef.current.thumbnail || ''
      );
    }
  }

  function resumeTrack(targetSeconds = null) {
    if (isNativePlatform()) {
      resumeNativeStream().catch(() => {});
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }

    const audio = audioRef.current;
    const resumeTime = (typeof targetSeconds === 'number' && isFinite(targetSeconds) && targetSeconds >= 0)
      ? targetSeconds
      : (currentTimeRef.current || currentTime || 0);

    if (resumeTime > 0) {
      currentTimeRef.current = resumeTime;
      setCurrentTime(resumeTime);
      pendingSeekRef.current = resumeTime;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('harmoniq:seek', { detail: resumeTime }));
      }
    }

    if (currentTrackRef.current) {
      updateBackgroundPlayback(
        currentTrackRef.current.title,
        currentTrackRef.current.displayArtist || currentTrackRef.current.artist || 'Harmoniq',
        true,
        resumeTime,
        durationRef.current || 180,
        currentTrackRef.current.thumbnail || ''
      );
    }

    if (useDirectPlayer) {
      setIsPlaying(true);
      return;
    }

    if (!audio) {
      if (currentTrackRef.current) {
        playTrack(currentTrackRef.current, null, null, false, resumeTime);
      }
      return;
    }

    if ((!audio.src || audio.error) && currentTrackRef.current) {
      playTrack(currentTrackRef.current, null, null, false, resumeTime);
      return;
    }

    try {
      if (resumeTime > 0) {
        try {
          if (audio.readyState >= 1) {
            audio.currentTime = resumeTime;
          } else {
            pendingSeekRef.current = resumeTime;
          }
        } catch (e) {
          pendingSeekRef.current = resumeTime;
        }
      }

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        return playPromise
          .then(() => {
            setIsPlaying(true);
            if (resumeTime > 0) {
              try {
                if (Math.abs(audio.currentTime - resumeTime) > 2) {
                  audio.currentTime = resumeTime;
                }
              } catch (e) {}
            }
          })
          .catch((err) => {
            if (err.name === 'AbortError') return;
            console.warn('[Audio] Resume play error:', err.message);
            if (currentTrackRef.current && (!audio.src || audio.error)) {
              playTrack(currentTrackRef.current, null, null, false, resumeTime);
            }
          });
      }
    } catch (err) {
      console.warn('[Audio] Resume synchronous error:', err);
      if (currentTrackRef.current) {
        playTrack(currentTrackRef.current, null, null, false, resumeTime);
      }
    }
  }

  function seekTo(timeInSeconds) {
    const safeTime = isFinite(timeInSeconds) ? Math.max(0, timeInSeconds) : 0;
    currentTimeRef.current = safeTime;
    setCurrentTime(safeTime);

    if (isNativePlatform()) {
      seekNativeStream(safeTime).catch(() => {});
    }

    // Broadcast seek event for video player and other listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('harmoniq:seek', { detail: safeTime }));
    }

    const audio = audioRef.current;
    if (audio) {
      try {
        if (audio.readyState >= 1) {
          audio.currentTime = safeTime;
        } else {
          pendingSeekRef.current = safeTime;
        }
      } catch (e) {
        pendingSeekRef.current = safeTime;
      }
      updatePositionState();
    }

    if (currentTrackRef.current) {
      updateBackgroundPlayback(
        currentTrackRef.current.title,
        currentTrackRef.current.displayArtist || currentTrackRef.current.artist || 'Harmoniq',
        isPlaying,
        safeTime,
        durationRef.current || 180,
        currentTrackRef.current.thumbnail || ''
      );
    }
  }

  async function handleTrackEnded() {
    if (isEndingRef.current) return;
    isEndingRef.current = true;
    setTimeout(() => { isEndingRef.current = false; }, 1800);

    const curRepeat = repeatModeRef.current;
    const curTrack = currentTrackRef.current;
    const curQueue = queueRef.current;
    const curIdx = queueIndexRef.current;
    const isShuff = isShuffleRef.current;
    const isAuto = autoplayRef.current;
    const suggestions = mlSuggestionsRef.current;

    // Repeat one track indefinitely
    if (curRepeat === 'one' && curTrack) {
      playTrack(curTrack, curQueue, curIdx, true);
      return;
    }

    // Shuffle mode
    if (isShuff && curQueue.length > 1) {
      let randomIdx = Math.floor(Math.random() * curQueue.length);
      if (randomIdx === curIdx) {
        randomIdx = (curIdx + 1) % curQueue.length;
      }
      playTrack(curQueue[randomIdx], curQueue, randomIdx, true);
      return;
    }

    // Advance to next song in the active queue
    if (curQueue.length > 0 && curIdx < curQueue.length - 1) {
      const nextIdx = curIdx + 1;
      playTrack(curQueue[nextIdx], curQueue, nextIdx, true);

      // Dynamically replenish upcoming queue with new ML songs if remaining songs < 8
      if (curQueue.length - nextIdx < 8 && curTrack) {
        replenishQueueUnderneath(curQueue[nextIdx]);
      }
      return;
    }

    // Repeat all mode: loop back to beginning
    if (curRepeat === 'all' && curQueue.length > 0) {
      playTrack(curQueue[0], curQueue, 0, true);
      return;
    }

    // Infinite Radio / Autoplay when end of queue is reached
    if (isAuto) {
      if (suggestions && suggestions.length > 0) {
        const nextSong = suggestions.find(r => !curQueue.some(q => q.id === r.id)) || suggestions[0];
        const updatedQueue = [...curQueue, nextSong];
        playTrack(nextSong, updatedQueue, updatedQueue.length - 1, true);
        replenishQueueUnderneath(nextSong);
        return;
      } else if (curTrack) {
        try {
          const res = await getRelatedTracks(curTrack.id);
          const related = Array.isArray(res) ? res : (res?.results || []);
          if (related && related.length > 0) {
            const nextSong = related.find(r => !curQueue.some(q => q.id === r.id)) || related[0];
            const updatedQueue = [...curQueue, nextSong];
            playTrack(nextSong, updatedQueue, updatedQueue.length - 1, true);
            replenishQueueUnderneath(nextSong);
            return;
          }
        } catch (e) {
          console.error('Autoplay radio error:', e);
        }
      }

      // Robust fallback: if suggestions and related API both fail, pick from favorites, history or downloads
      const fallbackPool = [
        ...favorites,
        ...historyRef.current,
        ...downloadedTracks
      ].filter(t => t && t.id && t.id !== curTrack?.id);

      if (fallbackPool.length > 0) {
        const nextSong = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
        const updatedQueue = [...curQueue, nextSong];
        playTrack(nextSong, updatedQueue, updatedQueue.length - 1, true);
        replenishQueueUnderneath(nextSong);
        return;
      }
    }

    setIsPlaying(false);
  }
  handleTrackEndedRef.current = handleTrackEnded;

  function playNext() {
    const curQueue = queueRef.current;
    const curIdx = queueIndexRef.current;
    const isShuff = isShuffleRef.current;
    const curRepeat = repeatModeRef.current;
    const isAuto = autoplayRef.current;
    const curTrack = currentTrackRef.current;

    if (curQueue.length === 0) {
      if (curTrack && isAuto) handleTrackEnded();
      return;
    }
    if (isShuff && curQueue.length > 1) {
      let randomIdx = Math.floor(Math.random() * curQueue.length);
      if (randomIdx === curIdx) randomIdx = (curIdx + 1) % curQueue.length;
      playTrack(curQueue[randomIdx], curQueue, randomIdx, true);
      return;
    }

    if (curIdx < curQueue.length - 1) {
      const nextIdx = curIdx + 1;
      playTrack(curQueue[nextIdx], curQueue, nextIdx, true);
      if (curQueue.length - nextIdx < 8 && curTrack) {
        replenishQueueUnderneath(curQueue[nextIdx]);
      }
    } else if (curRepeat === 'all') {
      playTrack(curQueue[0], curQueue, 0, true);
    } else {
      handleTrackEnded();
    }
  }

  function playPrevious() {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 4) {
      audio.currentTime = 0;
      return;
    }

    const curQueue = queueRef.current;
    const curIdx = queueIndexRef.current;
    if (curQueue.length > 0 && curIdx > 0) {
      const prevIdx = curIdx - 1;
      playTrack(curQueue[prevIdx], curQueue, prevIdx);
    } else if (audio) {
      audio.currentTime = 0;
    }
  }

  // Offline Downloads Management
  async function downloadTrack(track) {
    if (!track) return;
    setDownloadingTrackId(track.id);
    showToast(`Downloading "${track.title.slice(0, 20)}..."`, 'download');
    try {
      await downloadTrackOffline(track);
      await loadOfflineDownloads();
      recordRLReward(track, 'DOWNLOAD', { mood: preferences?.mood });
      showToast(`Saved for offline play! ⚡`, 'success');
    } catch (e) {
      console.error('Download track failed:', e);
      showToast('Download failed. Please retry.', 'error');
    } finally {
      setDownloadingTrackId(null);
    }
  }

  async function downloadAll(trackList) {
    if (!trackList || trackList.length === 0) return;
    showToast(`Downloading ${trackList.length} tracks...`, 'download');
    let count = 0;
    for (const t of trackList) {
      try {
        await downloadTrackOffline(t);
        count++;
      } catch (e) {}
    }
    await loadOfflineDownloads();
    showToast(`Downloaded ${count} songs for offline listening!`, 'success');
  }

  async function deleteDownloadedTrack(trackId) {
    await deleteOfflineTrack(trackId);
    await loadOfflineDownloads();
    showToast('Removed from offline downloads', 'info');
  }

  async function clearDownloads() {
    await clearAllOfflineTracks();
    await loadOfflineDownloads();
    showToast('Offline cache cleared', 'info');
  }

  function isDownloaded(trackId) {
    return downloadedTracks.some(t => t.id === trackId);
  }

  function addToQueue(track) {
    setQueue(prev => [...prev, track]);
    showToast(`Added to queue`, 'success');
  }

  function playNextInQueue(track) {
    setQueue(prev => {
      const nextQueue = [...prev];
      nextQueue.splice(queueIndex + 1, 0, track);
      return nextQueue;
    });
    showToast(`Playing next`, 'success');
  }

  function removeFromQueue(index) {
    setQueue(prev => prev.filter((_, i) => i !== index));
    if (index < queueIndex) {
      setQueueIndex(i => i - 1);
    }
  }

  function clearQueue() {
    setQueue(currentTrack ? [currentTrack] : []);
    setQueueIndex(0);
    showToast('Queue cleared', 'info');
  }

  function toggleFavorite(track) {
    if (!track) return;
    setFavorites(prev => {
      const exists = prev.some(t => t.id === track.id);
      if (exists) {
        showToast('Removed from Liked Songs', 'info');
        recordRLReward(track, 'UNFAVORITE', { mood: preferences?.mood });
        return prev.filter(t => t.id !== track.id);
      } else {
        showToast('Saved to Liked Songs ❤️', 'success');
        recordRLReward(track, 'FAVORITE', { mood: preferences?.mood });
        return [track, ...prev];
      }
    });
  }

  function isFavorite(trackId) {
    return favorites.some(t => t.id === trackId);
  }

  // Playlist management
  function createPlaylist(name, initialTrack = null) {
    if (!name || !name.trim()) return null;
    const cleanName = name.trim();
    const newPl = {
      id: Date.now().toString(),
      name: cleanName,
      createdAt: new Date().toISOString(),
      tracks: initialTrack ? [initialTrack] : []
    };
    setPlaylists(prev => [newPl, ...prev]);
    showToast(
      initialTrack
        ? `Created "${cleanName}" & added song! ✓`
        : `Created playlist "${cleanName}" ✓`,
      'success'
    );
    return newPl;
  }

  function addTrackToPlaylist(playlistId, track) {
    let plName = '';
    recordRLReward(track, 'ADD_TO_PLAYLIST', { mood: preferences?.mood });
    setPlaylists(prev => prev.map(pl => {
      if (pl.id === playlistId) {
        plName = pl.name;
        if (pl.tracks.some(t => t.id === track.id)) return pl;
        return { ...pl, tracks: [...pl.tracks, track] };
      }
      return pl;
    }));
    showToast(`Added to "${plName}" ✓`, 'success');
  }

  function removeTrackFromPlaylist(playlistId, trackId) {
    let plName = '';
    setPlaylists(prev => prev.map(pl => {
      if (pl.id === playlistId) {
        plName = pl.name;
        return { ...pl, tracks: pl.tracks.filter(t => t.id !== trackId) };
      }
      return pl;
    }));
    showToast(`Removed from "${plName}"`, 'info');
  }

  function isTrackInPlaylist(playlistId, trackId) {
    const pl = playlists.find(p => p.id === playlistId);
    return pl ? pl.tracks.some(t => t.id === trackId) : false;
  }

  function toggleTrackInPlaylist(playlistId, track) {
    const inPl = isTrackInPlaylist(playlistId, track.id);
    if (inPl) {
      removeTrackFromPlaylist(playlistId, track.id);
    } else {
      addTrackToPlaylist(playlistId, track);
    }
  }

  function deletePlaylist(playlistId) {
    setPlaylists(prev => prev.filter(pl => pl.id !== playlistId));
  }

  function toggleRepeatMode() {
    setRepeatMode(curr => {
      if (curr === 'off') return 'all';
      if (curr === 'all') return 'one';
      return 'off';
    });
  }

  function startSleepTimer(minutes) {
    if (minutes === 0) {
      setSleepTimerTime(null);
    } else {
      setSleepTimerTime(minutes * 60);
    }
    setShowSleepTimer(false);
  }

  function updatePreferences(newPrefs) {
    setPreferences(prev => {
      const updated = { ...prev, ...newPrefs };
      localStorage.setItem('musicit_preferences', JSON.stringify(updated));
      return updated;
    });
  }

  return (
    <PlayerContext.Provider
      value={{
        audioRef,
        currentTrack,
        isPlaying,
        currentTime,
        currentTimeRef,
        duration,
        buffered,
        isLoading,
        playbackError,
        queue,
        queueIndex,
        mlSuggestions,
        isLoadingSuggestions,
        generateMLQueueForTrack,
        generateAIQueue,
        addSuggestionsToQueue,
        repeatMode,
        isShuffle,
        autoplay,
        isVideoMode,
        lyrics,
        isLoadingLyrics,
        isNowPlayingExpanded,
        showQueueSheet,
        showSleepTimer,
        showPreferencesModal,
        showSettingsModal,
        sleepTimerTime,
        audioQuality,
        equalizerPreset,
        normalizeVolume,
        ambientGlow,
        preferences,
        favorites,
        history,
        playlists,
        downloadedTracks,
        downloadingTrackId,
        offlineSizeMB,
        toast,
        playbackSpeed,
        volume,
        isMuted,
        dominantColor,
        selectedLanguage,
        setSelectedLanguage,
        getAffinityProfile,
        getRLInsights,
        resetRLModel,
        // actions
        playTrack,
        togglePlay,
        pauseTrack,
        resumeTrack,
        syncAudioToVideo,
        seekTo,
        playNext,
        playPrevious,
        addToQueue,
        playNextInQueue,
        removeFromQueue,
        clearQueue,
        toggleFavorite,
        isFavorite,
        createPlaylist,
        addTrackToPlaylist,
        removeTrackFromPlaylist,
        deletePlaylist,
        isTrackInPlaylist,
        toggleTrackInPlaylist,
        toggleRepeatMode,
        setIsShuffle,
        setAutoplay,
        setIsVideoMode,
        setIsNowPlayingExpanded,
        setShowQueueSheet,
        setShowSleepTimer,
        setShowPreferencesModal,
        setShowSettingsModal,
        setAudioQuality,
        setEqualizerPreset,
        setNormalizeVolume,
        setAmbientGlow,
        startSleepTimer,
        updatePreferences,
        downloadTrack,
        downloadAll,
        deleteDownloadedTrack,
        clearDownloads,
        isDownloaded,
        showToast,
        setPlaybackSpeed,
        setVolume,
        toggleMute,
        setDominantColor,
        checkBackgroundStatus,
        requestNotificationPermission,
        requestBatteryOptimization,
        openAppSettings,
        useDirectPlayer,
        setUseDirectPlayer,
        handleTrackEnded,
        setIsPlaying,
        setCurrentTime,
        setDuration,
        setIsLoading,
        installPrompt,
        isInstalled,
        triggerInstall
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
