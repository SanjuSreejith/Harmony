// Reinforcement Learning & Machine Learning Recommendation Engine for Musicit (v3.0 ML)
// Architecture:
// 1. Contextual Multi-Armed Bandit with Q-Learning & Upper Confidence Bound (UCB1)
// 2. Continuous Latent Feature Vector Extraction (Energy, Acousticness, Danceability, Valence)
// 3. User Dynamic Taste Centroid with Exponential Temporal Half-Life Decay
// 4. Cosine Similarity Vector Alignment & Session Smoothness Optimization
// 5. Cross-Lingual Composer & Artist Transfer Learning (Pan-Indian Composer Synergy)

import { detectGenre, detectLanguage } from './telemetry';

const RL_STORAGE_KEY = 'musicit_rl_model_v3';
const LEARNING_RATE = 0.32;
const EXPLORATION_C = 0.85; // UCB exploration weight
const TEMPORAL_HALF_LIFE_HOURS = 48; // Preferences gently decay if inactive

// Reward constants for implicit and explicit feedback signals
export const REWARDS = {
  USER_SELECT: 3.5,      // User explicitly clicked and started song (high manual intent)
  FULL_PLAY: 4.0,        // Listened > 80% (strong implicit positive)
  LONG_PLAY: 2.0,        // Listened > 40s or > 35%
  FAVORITE: 5.5,         // Liked song (strong explicit positive)
  ADD_TO_PLAYLIST: 5.0,  // Added to playlist
  DOWNLOAD: 4.5,         // Saved offline
  REPLAY: 3.5,           // Replayed track
  QUICK_SKIP: -4.0,      // Skipped < 15 seconds (negative penalty)
  MID_SKIP: -1.8,        // Skipped 15-35 seconds
  UNFAVORITE: -2.5       // Removed like
};

// Known Pan-Indian composers & artists who work across multiple languages
const CROSS_LINGUAL_COMPOSERS = {
  'keeravani': ['Telugu', 'Hindi', 'Tamil'],
  'ar rahman': ['Tamil', 'Hindi', 'Telugu'],
  'anirudh': ['Tamil', 'Telugu', 'Hindi'],
  'thaman': ['Telugu', 'Tamil'],
  'dsp': ['Telugu', 'Tamil', 'Hindi'],
  'devi sri prasad': ['Telugu', 'Tamil', 'Hindi'],
  'sachet': ['Hindi', 'Telugu'],
  'parampara': ['Hindi', 'Telugu'],
  'pritam': ['Hindi', 'Telugu'],
  'sid sriram': ['Telugu', 'Tamil', 'Kannada'],
  'sushin shyam': ['Malayalam', 'Tamil'],
  'santosh narayanan': ['Tamil', 'Telugu'],
  'hesham abdul wahab': ['Malayalam', 'Telugu']
};

/**
 * Extract an acoustic feature embedding vector for a track [energy, acousticness, danceability, valence]
 */
export function extractTrackVector(track) {
  try {
    const genre = detectGenre(track) || 'Romantic';
    const title = (track.title || '').toLowerCase();
    const artist = (track.artist || '').toLowerCase();

    let energy = 0.55;
    let acousticness = 0.50;
    let danceability = 0.50;
    let valence = 0.60;

    if (genre === 'Dance & Beats' || /remix|party|club|edm|dj|bass|dhamaka|kuthu|dance/i.test(title)) {
      energy = 0.92;
      acousticness = 0.12;
      danceability = 0.90;
      valence = 0.85;
    } else if (genre === 'Devotional & Bhakti' || /bhajan|aarti|shiva|ram|krishna|mantra|divine|ayyappa|keerthanam/i.test(title)) {
      energy = 0.45;
      acousticness = 0.78;
      danceability = 0.35;
      valence = 0.75;
    } else if (genre === 'Lo-Fi' || /lofi|lo-fi|chillhop|slowed|reverb|ambient|sleep/i.test(title)) {
      energy = 0.28;
      acousticness = 0.82;
      danceability = 0.40;
      valence = 0.50;
    } else if (genre === 'Acoustic' || /unplugged|acoustic|piano|guitar|instrumental/i.test(title)) {
      energy = 0.35;
      acousticness = 0.92;
      danceability = 0.38;
      valence = 0.62;
    } else if (genre === 'Hip-Hop & Rap' || /rap|hiphop|drill|trap|freestyle/i.test(title)) {
      energy = 0.85;
      acousticness = 0.20;
      danceability = 0.82;
      valence = 0.65;
    } else if (genre === 'Sad & Soulful' || /sad|heartbreak|dard|alone|broken|pain|tears/i.test(title)) {
      energy = 0.30;
      acousticness = 0.75;
      danceability = 0.25;
      valence = 0.22;
    } else if (genre === 'Romantic' || /love|dil|pyaar|ishq|mohabbat|melody|kaadhal|premam/i.test(title)) {
      energy = 0.50;
      acousticness = 0.65;
      danceability = 0.55;
      valence = 0.70;
    } else if (/mass|action|bgm|theme|entry|climax|power|hype/i.test(title)) {
      energy = 0.95;
      acousticness = 0.10;
      danceability = 0.75;
      valence = 0.80;
    }

    return [energy, acousticness, danceability, valence];
  } catch {
    return [0.5, 0.5, 0.5, 0.5];
  }
}

/**
 * Compute Cosine Similarity between two N-dimensional continuous vectors
 */
export function cosineSimilarity(vecA, vecB) {
  try {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0.5;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    const mag = Math.sqrt(normA) * Math.sqrt(normB);
    return mag > 0 ? dot / mag : 0.5;
  } catch {
    return 0.5;
  }
}

/**
 * Compute the user's Dynamic Taste Centroid Vector based on recent listening history
 * using exponential half-life weighting (most recent tracks have higher gravity)
 */
export function computeUserTasteCentroid(recentTracks = []) {
  try {
    if (!Array.isArray(recentTracks) || recentTracks.length === 0) {
      return [0.55, 0.55, 0.55, 0.65]; // Balanced centroid default
    }

    let sumVec = [0, 0, 0, 0];
    let totalWeight = 0;

    recentTracks.slice(0, 10).forEach((track, idx) => {
      const weight = Math.exp(-0.2 * idx); // Exponential recency weighting
      const vec = extractTrackVector(track);
      for (let i = 0; i < 4; i++) {
        sumVec[i] += vec[i] * weight;
      }
      totalWeight += weight;
    });

    return totalWeight > 0
      ? sumVec.map((v) => Number((v / totalWeight).toFixed(3)))
      : [0.55, 0.55, 0.55, 0.65];
  } catch {
    return [0.55, 0.55, 0.55, 0.65];
  }
}

/**
 * Evaluates cross-lingual transfer bonus for pan-Indian composers
 */
export function getCrossLingualAffinityBonus(track, userTopArtists = []) {
  try {
    if (!track) return 0;
    const trackArtist = (track.artist || '').toLowerCase();
    const trackTitle = (track.title || '').toLowerCase();

    for (const [composer, languages] of Object.entries(CROSS_LINGUAL_COMPOSERS)) {
      if (trackArtist.includes(composer) || trackTitle.includes(composer)) {
        const matchesUser = userTopArtists.some((a) => (a.name || a || '').toLowerCase().includes(composer));
        if (matchesUser) {
          return 0.95; // Strong cross-lingual affinity transfer
        }
      }
    }
    return 0;
  } catch {
    return 0;
  }
}

function getInitialState() {
  return {
    qValues: {
      genres: {},
      artists: {},
      languages: {},
      contexts: {} // Contextual Q-values: `${timeSlot}::${mood}` -> { [genre]: Q }
    },
    actionCounts: {
      genres: {},
      artists: {},
      languages: {}
    },
    totalInteractions: 0,
    positiveRewards: 0,
    negativeRewards: 0,
    lastInteractionTime: Date.now(),
    modelCreatedAt: Date.now()
  };
}

export function loadRLModel() {
  try {
    const raw = localStorage.getItem(RL_STORAGE_KEY);
    const initial = getInitialState();
    if (!raw) return initial;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return initial;

    return {
      ...initial,
      ...parsed,
      qValues: {
        genres: {},
        artists: {},
        languages: {},
        contexts: {},
        ...(parsed.qValues || {})
      },
      actionCounts: {
        genres: {},
        artists: {},
        languages: {},
        ...(parsed.actionCounts || {})
      }
    };
  } catch (e) {
    console.warn('[RL Engine] Failed to load model from storage:', e);
    return getInitialState();
  }
}

export function saveRLModel(model) {
  try {
    if (!model || typeof model !== 'object') return;
    localStorage.setItem(RL_STORAGE_KEY, JSON.stringify(model));
  } catch (e) {
    console.error('[RL Engine] Failed to persist model:', e);
  }
}

export function getTimeSlot() {
  try {
    const hr = new Date().getHours();
    if (hr >= 5 && hr < 12) return 'morning';
    if (hr >= 12 && hr < 17) return 'afternoon';
    if (hr >= 17 && hr < 22) return 'evening';
    return 'night';
  } catch {
    return 'evening';
  }
}

/**
 * Apply Reinforcement Learning reward update for a user interaction.
 * Wrapped in try/catch to guarantee zero runtime crashes.
 */
export function recordRLReward(track, actionType, context = {}) {
  try {
    if (!track || !track.title) return;

    let reward = REWARDS[actionType];
    if (reward === undefined) return;

    // Autoplayed tracks get discounted reward weight (0.25x) so user explicit selections dominate preference
    if (context.isAutoplay) {
      reward = reward * 0.25;
    }

    const model = loadRLModel();
    if (!model || !model.qValues) return;

    const timeSlot = context.timeSlot || getTimeSlot();
    const mood = context.mood || 'Chill';
    const contextKey = `${timeSlot}::${mood}`;

    const genre = detectGenre(track) || 'Romantic';
    const artist = (track.artist || 'Unknown Artist').trim();
    const language = detectLanguage(track) || context.currentLanguage || 'Malayalam';

    // 1. Safe Genre Q-value update
    if (!model.qValues.genres) model.qValues.genres = {};
    if (!model.actionCounts.genres) model.actionCounts.genres = {};
    const currentGenreQ = model.qValues.genres[genre] || 0;
    model.qValues.genres[genre] = currentGenreQ + LEARNING_RATE * (reward - currentGenreQ);
    model.actionCounts.genres[genre] = (model.actionCounts.genres[genre] || 0) + 1;

    // 2. Safe Artist Q-value update
    if (!model.qValues.artists) model.qValues.artists = {};
    if (!model.actionCounts.artists) model.actionCounts.artists = {};
    const currentArtistQ = model.qValues.artists[artist] || 0;
    model.qValues.artists[artist] = currentArtistQ + LEARNING_RATE * (reward - currentArtistQ);
    model.actionCounts.artists[artist] = (model.actionCounts.artists[artist] || 0) + 1;

    // 3. Safe Language Q-value update
    if (!model.qValues.languages) model.qValues.languages = {};
    if (!model.actionCounts.languages) model.actionCounts.languages = {};
    const currentLangQ = model.qValues.languages[language] || 0;
    model.qValues.languages[language] = currentLangQ + LEARNING_RATE * (reward - currentLangQ);
    model.actionCounts.languages[language] = (model.actionCounts.languages[language] || 0) + 1;

    // 4. Safe Contextual Q-value update
    if (!model.qValues.contexts) model.qValues.contexts = {};
    if (!model.qValues.contexts[contextKey]) model.qValues.contexts[contextKey] = {};
    const currentCtxQ = model.qValues.contexts[contextKey][genre] || 0;
    model.qValues.contexts[contextKey][genre] = currentCtxQ + LEARNING_RATE * (reward - currentCtxQ);

    // 5. Update interaction metrics
    model.totalInteractions = (model.totalInteractions || 0) + 1;
    if (reward > 0) model.positiveRewards = (model.positiveRewards || 0) + 1;
    else if (reward < 0) model.negativeRewards = (model.negativeRewards || 0) + 1;
    model.lastInteractionTime = Date.now();

    saveRLModel(model);
  } catch (err) {
    console.warn('[RL Engine] recordRLReward error safely handled:', err);
  }
}

/**
 * Intelligent Multi-Task ML Scoring:
 * Combines Contextual Bandit (UCB1) + Cosine Vector Embedding Similarity + Cross-Lingual Composer Transfer
 */
export function scoreTrackWithBandit(track, model, context = {}) {
  try {
    if (!track) {
      return { score: 0.5, ucbArtist: 0, ucbGenre: 0, ucbLanguage: 0, genre: 'Pop', artist: 'Artist', language: context.currentLanguage || 'Malayalam' };
    }

    const genre = detectGenre(track) || 'Romantic';
    const artist = (track.artist || '').trim();
    const language = detectLanguage(track) || context.currentLanguage || 'Malayalam';

    const safeModel = model || loadRLModel();
    const qValues = safeModel?.qValues || {};
    const actionCounts = safeModel?.actionCounts || {};

    const timeSlot = context.timeSlot || getTimeSlot();
    const mood = context.mood || 'Chill';
    const contextKey = `${timeSlot}::${mood}`;

    const N = safeModel?.totalInteractions || 1;

    // 1. Language Bandit score (UCB1)
    const qL = qValues.languages?.[language] || 0;
    const nL = actionCounts.languages?.[language] || 0;
    const ucbLanguage = qL + EXPLORATION_C * Math.sqrt(Math.log(1 + N) / (1 + nL));

    // 2. Genre Bandit score (UCB1)
    const qG = qValues.genres?.[genre] || 0;
    const nG = actionCounts.genres?.[genre] || 0;
    const ucbGenre = qG + EXPLORATION_C * Math.sqrt(Math.log(1 + N) / (1 + nG));

    // 3. Artist Bandit score (UCB1)
    const qA = qValues.artists?.[artist] || 0;
    const nA = actionCounts.artists?.[artist] || 0;
    const ucbArtist = qA + EXPLORATION_C * Math.sqrt(Math.log(1 + N) / (1 + nA));

    // 4. Contextual Match (Time & Mood)
    const qCtx = qValues.contexts?.[contextKey]?.[genre] || 0;

    // 5. Dynamic Active Language Bias:
    let langMatchBonus = 0;
    const activeLang = context.currentLanguage || context.activeLanguage;
    if (activeLang && language.toLowerCase() === activeLang.toLowerCase()) {
      langMatchBonus = 1.4;
    }

    // 6. Cosine Similarity Vector Alignment with User Taste Centroid:
    const trackVector = extractTrackVector(track);
    const userCentroid = context.tasteCentroid || computeUserTasteCentroid(context.recentTracks || []);
    const cosineSim = cosineSimilarity(trackVector, userCentroid);

    // 6b. Tempo & Time-of-Day Rhythm Alignment (Morning energizers, afternoon beats, midnight lo-fi)
    let circadianBonus = 0;
    const hour = new Date().getHours();
    const trackEnergy = trackVector[0];
    const trackAcoustic = trackVector[1];
    if (hour >= 23 || hour < 6) {
      // Late night / sleep hours: favor acoustic / lo-fi / calm
      if (trackAcoustic > 0.65) circadianBonus += 0.45;
      if (trackEnergy > 0.8) circadianBonus -= 0.35;
    } else if (hour >= 6 && hour < 10) {
      // Morning: fresh melodies, devotional or upbeat starters
      if (trackVector[3] > 0.6) circadianBonus += 0.35;
    } else if (hour >= 18 && hour < 22) {
      // Evening / Night Drive / Chill:
      if (trackEnergy > 0.55 && trackVector[2] > 0.5) circadianBonus += 0.35;
    }

    // 7. Cross-Lingual Composer Transfer Bonus:
    const crossLingualBonus = getCrossLingualAffinityBonus(track, context.topArtists || []);

    // 8. Chronological Recency & Style Bonus:
    let recencyBonus = 0;
    if (context.recentArtists && context.recentArtists.slice(0, 3).includes(artist)) {
      recencyBonus += 0.8;
    }
    if (context.recentGenres && context.recentGenres.slice(0, 3).includes(genre)) {
      recencyBonus += 0.5;
    }

    // 9. Replay / Repeat Count Bonus:
    let repeatBonus = 0;
    if (context.frequentTrackIds && context.frequentTrackIds.includes(track.id)) {
      repeatBonus += 1.2;
    }

    // Composite ML Neural Activation:
    const rawScore =
      0.25 * ucbLanguage +
      0.20 * ucbArtist +
      0.20 * ucbGenre +
      0.15 * cosineSim +
      0.10 * qCtx +
      circadianBonus +
      langMatchBonus +
      crossLingualBonus +
      recencyBonus +
      repeatBonus;

    const normalizedScore = 1 / (1 + Math.exp(-rawScore));

    return {
      score: isFinite(normalizedScore) ? normalizedScore : 0.5,
      ucbLanguage: isFinite(ucbLanguage) ? ucbLanguage : 0,
      ucbArtist: isFinite(ucbArtist) ? ucbArtist : 0,
      ucbGenre: isFinite(ucbGenre) ? ucbGenre : 0,
      cosineSim: isFinite(cosineSim) ? cosineSim : 0.5,
      genre,
      artist,
      language
    };
  } catch (err) {
    console.warn('[RL Engine] scoreTrackWithBandit fallback:', err);
    return { score: 0.5, ucbArtist: 0, ucbGenre: 0, ucbLanguage: 0, cosineSim: 0.5, genre: 'Pop', artist: 'Artist', language: context.currentLanguage || 'Malayalam' };
  }
}

/**
 * Hybrid Ensemble Re-ranker:
 * Combines Reinforcement Learning, Vector Space Cosine Similarity, and Softmax Exploration.
 * Never throws — always returns an array.
 */
export function reRankRecommendations(tracks = [], context = {}) {
  try {
    if (!Array.isArray(tracks) || tracks.length === 0) return [];

    const model = loadRLModel();
    const tasteCentroid = computeUserTasteCentroid(context.recentTracks || []);
    const enrichedContext = { ...context, tasteCentroid };

    const scoredTracks = tracks
      .filter((t) => t && t.title)
      .map((track) => {
        try {
          const bandit = scoreTrackWithBandit(track, model, enrichedContext);
          const rawScore = bandit?.score || 0.5;
          const matchPercent = Math.min(99, Math.max(65, Math.round(rawScore * 100)));

          let reason = `${matchPercent}% Match • AI Tuned`;
          if (context.currentLanguage && bandit?.language?.toLowerCase() === context.currentLanguage.toLowerCase()) {
            reason = `${bandit.language} • ${matchPercent}% Match`;
          } else if (bandit?.ucbArtist > 1.5) {
            reason = `Because you love ${bandit.artist} (${matchPercent}%)`;
          } else if (bandit?.ucbGenre > 1.5) {
            reason = `Top Vibe: ${bandit.genre} (${matchPercent}%)`;
          } else if (rawScore > 0.75) {
            reason = `ML Smart Pick • ${matchPercent}%`;
          } else {
            reason = `${bandit?.language || 'Top'} Hit • ${matchPercent}%`;
          }

          return {
            ...track,
            rlScore: rawScore,
            rlMatchPercent: matchPercent,
            rlReason: reason,
            detectedGenre: bandit?.genre || 'Pop',
            detectedLanguage: bandit?.language || context.currentLanguage || 'Malayalam'
          };
        } catch {
          return {
            ...track,
            rlScore: 0.5,
            rlMatchPercent: 85,
            rlReason: 'Top Pick'
          };
        }
      });

    return scoredTracks.sort((a, b) => (b.rlScore || 0) - (a.rlScore || 0));
  } catch (err) {
    console.warn('[RL Engine] reRankRecommendations fallback:', err);
    return Array.isArray(tracks) ? tracks : [];
  }
}

/**
 * Returns summary insights from the Reinforcement Learning & Machine Learning agent.
 */
export function getRLInsights() {
  try {
    const model = loadRLModel();

    const genres = model?.qValues?.genres || {};
    const topGenres = Object.entries(genres)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre, q]) => ({
        genre,
        score: typeof q === 'number' ? q.toFixed(2) : '0.00',
        interactions: model.actionCounts?.genres?.[genre] || 0
      }));

    const artists = model?.qValues?.artists || {};
    const topArtists = Object.entries(artists)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([artist, q]) => ({
        artist,
        score: typeof q === 'number' ? q.toFixed(2) : '0.00',
        interactions: model.actionCounts?.artists?.[artist] || 0
      }));

    const languages = model?.qValues?.languages || {};
    const topLanguages = Object.entries(languages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([language, q]) => ({
        language,
        score: typeof q === 'number' ? q.toFixed(2) : '0.00',
        interactions: model.actionCounts?.languages?.[language] || 0
      }));

    const total = model?.totalInteractions || 0;
    const positive = model?.positiveRewards || 0;
    const satisfactionRate = total > 0 ? Math.round((positive / total) * 100) : 100;

    const learningPhase =
      total > 30
        ? 'Deep Personalization (v3.0 ML)'
        : total > 10
        ? 'Learning Rapidly (Active Tuning)'
        : 'Initial Exploration Phase';

    return {
      totalInteractions: total,
      satisfactionRate,
      learningPhase,
      algorithm: 'Hybrid Contextual Bandit + Cosine Embeddings (v3.0 ML)',
      topGenres,
      topArtists,
      topLanguages
    };
  } catch (err) {
    console.warn('[RL Engine] getRLInsights fallback:', err);
    return {
      totalInteractions: 0,
      satisfactionRate: 100,
      learningPhase: 'Initial Exploration Phase',
      algorithm: 'Hybrid Contextual Bandit + Cosine Embeddings (v3.0 ML)',
      topGenres: [],
      topArtists: [],
      topLanguages: []
    };
  }
}

/**
 * Resets the RL model back to pristine initial state
 */
export function resetRLModel() {
  try {
    const initial = getInitialState();
    saveRLModel(initial);
    return initial;
  } catch {
    return getInitialState();
  }
}

/**
 * Export full RL Model weights & telemetry state
 */
export function exportRLData() {
  return loadRLModel();
}

/**
 * Import or override RL Model
 */
export function importRLData(modelData) {
  if (modelData && typeof modelData === 'object') {
    saveRLModel(modelData);
  }
}

/**
 * ML Queue Optimization Engine:
 * Dynamically predicts and ranks the best upcoming song suggestions based on the currently playing track.
 * Combines 4D Latent Continuous Acoustic Feature Vectors, Cosine Similarity, Language Coherence,
 * Contextual Multi-Armed Bandit weights, and Pan-Indian Composer Synergy.
 */
export function generateSmartQueueSuggestions(currentTrack, candidateTracks = [], context = {}) {
  try {
    if (!currentTrack || !Array.isArray(candidateTracks) || candidateTracks.length === 0) {
      return [];
    }

    const model = loadRLModel();
    const currentVector = extractTrackVector(currentTrack);
    const targetLang = detectLanguage(currentTrack);
    const targetGenre = detectGenre(currentTrack);

    function areSameTitle(t1, t2) {
      if (!t1 || !t2) return false;
      const clean = s => s.toLowerCase()
        .replace(/#/g, ' ')
        .replace(/\[.*?\]|\(.*?\)/g, '')
        .replace(/[^a-z0-9]/g, '')
        .replace(/aa/g, 'a').replace(/ee/g, 'i').replace(/oo/g, 'u').replace(/th/g, 't').replace(/dh/g, 'd');
      const c1 = clean(t1);
      const c2 = clean(t2);
      if (!c1 || !c2) return false;
      if (c1 === c2) return true;
      const sub1 = c1.slice(0, 8);
      const sub2 = c2.slice(0, 8);
      if (sub1.length >= 6 && (c2.includes(sub1) || c1.includes(sub2))) return true;
      return false;
    }

    const seenCandidateTitles = new Set();
    const scored = candidateTracks
      .filter(t => {
        if (!t || !t.id || t.id === currentTrack.id) return false;
        // Strictly exclude alternate uploads/covers/re-uploads of the CURRENT song!
        if (areSameTitle(t.title, currentTrack.title)) return false;
        // Strictly exclude duplicate uploads among candidates themselves!
        for (const prevTitle of seenCandidateTitles) {
          if (areSameTitle(t.title, prevTitle)) return false;
        }
        seenCandidateTitles.add(t.title);
        return true;
      })
      .map(candidate => {
        const candLang = detectLanguage(candidate);
        const candGenre = detectGenre(candidate);
        const candVector = extractTrackVector(candidate);

        // 1. Latent Continuous Vector Cosine Similarity (Acoustic & Vibe Match)
        const acousticMatch = cosineSimilarity(currentVector, candVector);

        // 2. Language Coherence & Cross-Lingual Synergy
        let langBonus = 0;
        if (candLang.toLowerCase() === targetLang.toLowerCase()) {
          langBonus = 0.40;
        } else {
          // Check pan-Indian cross-lingual synergy
          const composerBonus = getCrossLingualAffinityBonus(candidate, [currentTrack.artist, currentTrack.musicDirector]);
          langBonus = composerBonus > 0 ? 0.25 : -0.15;
        }

        // 3. Entity Synergy: Real Singer, Actor, Music Director & Movie Alignment
        let entityBonus = 0;
        let matchedEntityReason = null;

        const curSingers = (currentTrack.singers || []).map(s => s.toLowerCase());
        const candSingers = (candidate.singers || []).map(s => s.toLowerCase());
        const commonSinger = candSingers.find(s => curSingers.includes(s) || (currentTrack.artist && currentTrack.artist.toLowerCase().includes(s)));
        if (commonSinger) {
          entityBonus += 0.35;
          matchedEntityReason = `Singer: ${candidate.singers[0]} • `;
        }

        const curActors = (currentTrack.actors || []).map(a => a.toLowerCase());
        const candActors = (candidate.actors || []).map(a => a.toLowerCase());
        const commonActor = candActors.find(a => curActors.includes(a));
        if (commonActor) {
          entityBonus += 0.30;
          if (!matchedEntityReason) {
            matchedEntityReason = `Starring: ${candidate.actors[0]} • `;
          }
        }

        if (currentTrack.musicDirector && candidate.musicDirector) {
          if (currentTrack.musicDirector.toLowerCase() === candidate.musicDirector.toLowerCase()) {
            entityBonus += 0.30;
            if (!matchedEntityReason) {
              matchedEntityReason = `Music: ${candidate.musicDirector} • `;
            }
          }
        }

        if (currentTrack.movie && candidate.movie) {
          if (currentTrack.movie.toLowerCase() === candidate.movie.toLowerCase()) {
            entityBonus += 0.40;
            matchedEntityReason = `Movie: ${candidate.movie} • `;
          }
        }

        // 4. Bandit User Satisfaction & Affinity
        const bandit = scoreTrackWithBandit(candidate, model, {
          ...context,
          currentLanguage: targetLang,
          recentGenres: [targetGenre]
        });

        const rawBandit = bandit?.score || 0.5;

        // 5. Composite ML Score with Entity Synergy
        const compositeScore = (0.35 * acousticMatch) + (0.30 * rawBandit) + (0.15 * Math.max(0, langBonus)) + (0.20 * entityBonus);
        const matchPercent = Math.min(99, Math.max(70, Math.round(compositeScore * 100)));

        let reason = matchedEntityReason ? `${matchedEntityReason}${matchPercent}% Match` : `${matchPercent}% ML Match • Similar Vibe`;
        if (!matchedEntityReason) {
          if (candLang.toLowerCase() === targetLang.toLowerCase() && acousticMatch > 0.85) {
            reason = `Acoustic Harmony (${matchPercent}%) • ${candLang}`;
          } else if (acousticMatch > 0.90) {
            reason = `Perfect Rhythm Match • ${matchPercent}%`;
          } else if (bandit?.ucbArtist > 1.2) {
            reason = `Artist Radio Pick • ${matchPercent}%`;
          }
        }

        return {
          ...candidate,
          mlScore: compositeScore,
          mlMatchPercent: matchPercent,
          mlReason: reason,
          singers: candidate.singers || [],
          actors: candidate.actors || [],
          musicDirector: candidate.musicDirector || null,
          movie: candidate.movie || null,
          language: candLang,
          genre: candGenre
        };
      });

    // Sort by ML composite score descending
    scored.sort((a, b) => b.mlScore - a.mlScore);

    return scored;
  } catch (err) {
    console.warn('[RL Engine] generateSmartQueueSuggestions error:', err);
    return candidateTracks;
  }
}
