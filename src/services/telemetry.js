// Listening Telemetry and Affinity Profile Engine for Musicit
// Tracks play frequency, genres, languages, artists, listening order, and repeat habits

const STORAGE_KEY = 'musicit_telemetry_v1';

// Native South Asian Script Unicode ranges (100% Definitive)
const SCRIPT_RANGES = [
  { lang: 'Malayalam', regex: /[\u0D00-\u0D7F]/ },
  { lang: 'Telugu', regex: /[\u0C00-\u0C7F]/ },
  { lang: 'Tamil', regex: /[\u0B80-\u0BFF]/ },
  { lang: 'Kannada', regex: /[\u0C80-\u0CFF]/ },
  { lang: 'Hindi', regex: /[\u0900-\u097F]/ },
  { lang: 'Punjabi', regex: /[\u0A00-\u0A7F]/ },
  { lang: 'Bengali', regex: /[\u0980-\u09FF]/ },
  { lang: 'Gujarati', regex: /[\u0A80-\u0AFF]/ },
  { lang: 'Odia', regex: /[\u0B00-\u0B7F]/ },
  { lang: 'Urdu', regex: /[\u0600-\u06FF]/ },
  { lang: 'K-Pop', regex: /[\uAC00-\uD7AF\u1100-\u11FF]/ },
  { lang: 'Japanese', regex: /[\u3040-\u30FF]/ }
];

// Rich High-Precision Multi-Category Dictionaries for Indian & Global Languages
const LANGUAGE_SCORES = {
  Malayalam: {
    // Unique Malayalam pronouns, words, channels & prefixes (+10 each)
    high: [
      'ente', 'ninte', 'oru', 'avante', 'avale', 'njan', 'namukku', 'pennalle', 'penne', 'kanne',
      'chettan', 'chechi', 'malayalam', 'mollywood', 'matinee now musix', 'matinee now', 'matinee',
      'muzik247', 'satyam audios', 'satyam music', 'satyam', 'millennium audios', 'millennium',
      'saina music', 'saina video', 'saina', 'manorama music', 'manorama', 'east coast audio',
      'east coast', 'bhavana studios', 'goodwill entertainments', 'speed audio malayalam',
      'speed audio', 'silly monks malayalam', '123musix', 'central talkies', 'music zone',
      'musiczonesongs', 'musiczone', 'cinema paattu', 'old malayalam songs', 'malayalam songs',
      'lahari music malayalam', 'lahari malayalam', 'aditya music malayalam', 'aditya malayalam',
      'laly biju'
    ],
    // Distinctive Malayalam words, movies & phrases (+6 each)
    medium: [
      'sreeragamo', 'sreeraagamo', 'pavithram', 'thedunnu', 'sharreth', 'onnanam', 'harimuraleeravam',
      'shanthamee', 'chandrakalabham', 'kannadippoyikayil', 'allimalarkavu', 'enthamme', 'karutha',
      'kallayi', 'thumbi vaa', 'surumayezhuthiya', 'ente sooryaputhrikku', 'raakkilithan',
      'neelathamara', 'thaamarakkannan', 'pinneyum', 'ethrayo', 'ennum ninne', 'oru nokku',
      'varshangalkku', 'turbo', 'thalavan', 'guruvayoor ambalanadayil', 'thenkasi', 'thenkasipattanam',
      'pattanam', 'painkili', 'ente thenkaasi', 'oru simhamalayum', 'koncham thenkasi',
      'kalyanam', 'sneham', 'pattu', 'paattu', 'gaanangal', 'kavitha',
      'chithram', 'naadan', 'katturumbinte', 'aaradhike', 'darshana', 'manikyakkallu', 'cherathukal',
      'aaromaley', 'kallimullu', 'vathikkalu', 'khalbile', 'malare', 'premam', 'aavesham', 'illuminati',
      'jaada', 'manjummel', 'kudumbasree', 'poove', 'swapnam', 'mazha', 'kaattu', 'kattum', 'kiliye',
      'kannadi', 'aanandham', 'jeevitham', 'premalu', 'pulimurugan', 'lucifer', 'rdx', 'thallumaala',
      'kannur squad', 'bheeshma', 'kurup', 'kumbalangi', 'hridayam', 'varathan', 'uyare', 'ustad hotel',
      'drishyam', 'minnal murali', 'kireedam', 'spadikam', 'devasuram', 'kilukkam', 'bramayugam',
      'kishkindha', 'bougainvillea', 'arm', 'katha', 'kadha', 'kavitha'
    ],
    // Malayalam artists, singers, composers & actors (+5 each)
    artists: [
      'yesudas', 'kj yesudas', 'k j yesudas', 'mg sreekumar', 'm g sreekumar', 'sreekumar', 'sujatha',
      'p jayachandran', 'jayachandran', 'unni menon', 'madhu balakrishnan', 'vijay yesudas',
      'vineeth sreenivasan', 'sushin shyam', 'sushin', 'jakes bejoy', 'shaan rahman', 'gopi sundar',
      'deepak dev', 'bijibal', 'alphons joseph', 'rahul raj', 'mohanlal', 'mammootty', 'prithviraj',
      'nivin pauly', 'dulquer', 'tovino', 'fahadh', 'faasil', 'soubin', 'dileep', 'jayasurya',
      'kunchacko boban', 'manju warrier', 'nazriya', 'mamitha baiju', 'anaswara', 'raveendran',
      'johnson master', 'vidyasagar', 'm jayachandran', 'sharreth'
    ]
  },
  Telugu: {
    high: [
      'telugu', 'tollywood', 'aditya telugu', 'lahari telugu', 'geetha arts',
      'mythri movie makers', 'saregama telugu', 'mango music', 'tips telugu', 'madhura audio',
      'shreyas media'
    ],
    medium: [
      'adipurush', 'prabhas', 'allu arjun', 'mahesh babu', 'ntr', 'jr ntr', 'ram charan',
      'pawan kalyan', 'chiranjeevi', 'balakrishna', 'nagarjuna', 'venkatesh', 'nani',
      'vijay deverakonda', 'chuttamalle', 'devara', 'guntur kaaram', 'kalki', 'salaar',
      'pushpa', 'pushpa 2', 'hanuman', 'samajavaragamana', 'butta bomma', 'srivalli', 'oo antava',
      'inkem inkem', 'saranga dariya', 'bullettu bandi', 'priyathama', 'manasa', 'nuvvostanante',
      'magadheera', 'eega', 'baahubali', 'rrr', 'ala vaikunthapurramuloo', 'geetha govindam',
      'fidaa', 'uppena', 'baby'
    ],
    artists: [
      'thaman', 'thaman s', 'devi sri prasad', 'dsp', 'anurag kulkarni', 'ram miriyala',
      'geetha madhuri', 'mangli', 'keeravani', 'm m keeravani', 'spb', 'balasubrahmanyam',
      'mickey j meyer'
    ]
  },
  Tamil: {
    high: [
      'tamil', 'kollywood', 'think music', 'sony music south', 'saregama tamil', 'sun tv',
      'red giant', 'lyca productions'
    ],
    medium: [
      'anirudh', 'ar rahman', 'yuvan', 'yuvan shankar raja', 'harris jayaraj', 'ilayaraja',
      'dhanush', 'santhosh narayanan', 'leo', 'jailer', 'goat', 'vikram', 'ponniyin selvan',
      'kaithi', 'master', 'varisu', 'beast', 'vaathi', 'kavala', 'hukum', 'naa ready',
      'arabic kuthu', 'thalli pogathey', 'rowdy baby', 'kannazhaga', 'munbe vaa', 'oru murai',
      'kadhal', 'anbe', 'unnakul', 'marakkuma'
    ],
    artists: [
      'pradeep kumar', 'sean roldan', 'gv prakash', 'g v prakash', 'sivakarthikeyan',
      'rajinikanth', 'kamal haasan', 'thalapathy vijay', 'ajith', 'suriya', 'karthi'
    ]
  },
  Kannada: {
    high: [
      'kannada', 'sandalwood', 'anand audio', 'd beats', 'jhankar music', 'aashirwad audio'
    ],
    medium: [
      'kgf', 'kantara', 'charlie 777', 'vikrant rona', 'puneeth rajkumar', 'appu', 'darshan',
      'sudeep', 'kichcha sudeep', 'yash', 'rishab shetty', 'rakshit shetty', 'shivarajkumar',
      'singara siriye', 'salaam rocky bhai'
    ],
    artists: [
      'sanjith hegde', 'charan raj', 'arjun janya', 'ravi basrur', 'vijay prakash', 'vasuki vaibhav'
    ]
  },
  Punjabi: {
    high: [
      'punjabi', 'bhangra', 'speed records', 'white hill music', 'geet mp3', 'apna punjab'
    ],
    medium: [
      'sidhu moosewala', 'sidhu', 'moosewala', 'karan aujla', 'diljit dosanjh', 'diljit',
      'ap dhillon', 'shubh', 'guru randhawa', 'amrit maan', 'b praak', 'jaani', 'cheques',
      'winning speech', 'brown munde', 'lover'
    ],
    artists: [
      'sidhu', 'moosewala', 'karan aujla', 'diljit', 'ap dhillon', 'shubh', 'b praak'
    ]
  },
  Hindi: {
    high: [
      'hindi', 'bollywood', 't-series', 'tseries', 'zeemusic', 'sonymusicindia', 'yash raj films', 'yrf'
    ],
    medium: [
      'arijit singh', 'arijit', 'shreya ghoshal', 'atif aslam', 'jubin nautiyal', 'badshah',
      'pritam', 'sachet-parampara', 'apna bana le', 'kesariya', 'tum hi ho', 'channa mereya',
      'o maahi', 'animal', 'jawan', 'pathaan', 'stree 2', 'satranga', 'chaleya'
    ],
    artists: [
      'arijit', 'shreya ghoshal', 'pritam', 'sachet tandon', 'darshan raval', 'alka yagnik',
      'kumar sanu', 'udit narayan'
    ]
  }
};

const GENRE_KEYWORDS = {
  'Devotional & Bhakti': ['bhajan', 'aarti', 'mantra', 'krishna', 'shiva', 'hanuman', 'devotional', 'bhakti', 'sufi', 'qawwali', 'waheguru', 'ram siya ram', 'ram', 'ayodhya', 'divine'],
  Romantic: ['love', 'romantic', 'dil', 'pyaar', 'ishq', 'mohabbat', 'romance', 'prema', 'anbe', 'kadhal', 'valapu', 'sanam', 'humdum', 'sneham'],
  'Lo-Fi': ['lofi', 'lo-fi', 'chillhop', 'slowed', 'reverb', 'aesthetic', 'ambient', 'study beat'],
  'Dance & Beats': ['party', 'club', 'remix', 'dj', 'dance', 'dhamaka', 'edm', 'bhangra', 'bass boost', 'kuthu', 'teenmaar'],
  'Hip-Hop & Rap': ['rap', 'hip hop', 'hiphop', 'trap', 'freestyle', 'cypher', 'drill', 'beat'],
  Acoustic: ['acoustic', 'unplugged', 'guitar', 'piano', 'live session', 'raw'],
  'Sad & Soulful': ['sad', 'dard', 'alone', 'broken', 'heartbreak', 'judaai', 'cry', 'emotional', 'marana']
};

function getTelemetryState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyTelemetry();
    const parsed = JSON.parse(raw);
    const state = { ...createEmptyTelemetry(), ...parsed };

    // Auto-repair stale language tags across recent history (e.g. Malayalam songs previously tagged as Telugu)
    if (state.recentListeningHistory && state.recentListeningHistory.length > 0) {
      let repaired = false;
      for (const song of state.recentListeningHistory) {
        const verified = detectLanguage(song);
        if (verified && song.language !== verified) {
          song.language = verified;
          repaired = true;
        }
      }
      const topSong = state.recentListeningHistory[0];
      if (topSong && topSong.language) {
        if (state.activeSessionLanguage !== topSong.language) {
          state.activeSessionLanguage = topSong.language;
          state.lastListenedLanguage = topSong.language;
          repaired = true;
        }
      }
      if (repaired) {
        const newLangFreq = {};
        for (const s of state.recentListeningHistory) {
          if (s.language) {
            newLangFreq[s.language] = (newLangFreq[s.language] || 0) + 1;
          }
        }
        state.languageFrequency = newLangFreq;
        saveTelemetryState(state);
      }
    }
    return state;
  } catch {
    return createEmptyTelemetry();
  }
}

function saveTelemetryState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save telemetry:', e);
  }
}

function createEmptyTelemetry() {
  return {
    activeSessionLanguage: null,
    lastListenedLanguage: null,
    artistFrequency: {},
    genreFrequency: {},
    languageFrequency: {},
    trackPlayCounts: {},
    recentListeningHistory: [], // Chronological order of songs listened
    totalListeningSeconds: 0,
    recordedSongSessions: {}
  };
}

// Automatically detect language based on native script, rich keywords, and weighted token scoring
export function detectLanguage(track) {
  if (!track) return 'Malayalam';

  // 0. Use pre-extracted verified language if present on the track object
  if (track.language && typeof track.language === 'string' && track.language.length > 2 && track.language.toLowerCase() !== 'all') {
    return track.language;
  }

  const rawText = `${track.title || ''} ${track.artist || ''} ${track.displayArtist || ''}`;
  const text = rawText.toLowerCase();

  // 1. Definite Native Script Unicode Range Detection (Highest Priority)
  for (const { lang, regex } of SCRIPT_RANGES) {
    if (regex.test(rawText)) {
      return lang;
    }
  }

  // 2. Direct explicit language tags in brackets or keywords
  const explicitMatches = [
    { lang: 'Malayalam', regex: /\b(malayalam|mollywood)\b/i },
    { lang: 'Telugu', regex: /\b(telugu|tollywood)\b/i },
    { lang: 'Tamil', regex: /\b(tamil|kollywood)\b/i },
    { lang: 'Kannada', regex: /\b(kannada|sandalwood)\b/i },
    { lang: 'Punjabi', regex: /\b(punjabi|bhangra)\b/i },
    { lang: 'Hindi', regex: /\b(hindi|bollywood)\b/i },
    { lang: 'Bhojpuri', regex: /\b(bhojpuri)\b/i },
    { lang: 'Haryanvi', regex: /\b(haryanvi)\b/i },
    { lang: 'Bengali', regex: /\b(bengali|bangla)\b/i },
    { lang: 'Marathi', regex: /\b(marathi)\b/i },
    { lang: 'Gujarati', regex: /\b(gujarati|garba)\b/i },
    { lang: 'English', regex: /\b(english|pop|hollywood)\b/i }
  ];

  for (const { lang, regex } of explicitMatches) {
    if (regex.test(text)) return lang;
  }

  // 3. Unique Malayalam grammatical inflections (-unnu, -aanu, -ennu)
  if (/\b\w+(unnu|aanu|ennu)\b/i.test(text)) {
    return 'Malayalam';
  }

  // 4. Distinct Malayalam cinema classics, words, and channels (Instant High-Confidence Match)
  if (/\b(sreeragamo|sreeraagamo|pavithram|thedunnu|sharreth|onnanam|harimuraleeravam|shanthamee|chandrakalabham|kannadippoyikayil|allimalarkavu|enthamme|karutha|kallayi|thumbi vaa|surumayezhuthiya|ente sooryaputhrikku|raakkilithan|neelathamara|thaamarakkannan|pinneyum|ethrayo|ennum ninne|oru nokku|varshangalkku|turbo|thalavan|guruvayoor ambalanadayil|thenkasi|thenkasipattanam|pattanam|painkili|ente thenkaasi|oru simhamalayum|koncham thenkasi|kalyanam|sneham|pattu|paattu|gaanangal|kavitha|chithram|naadan|katturumbinte|aaradhike|darshana|manikyakkallu|cherathukal|aaromaley|kallimullu|vathikkalu|khalbile|malare|premam|aavesham|illuminati|jaada|manjummel|kudumbasree|poove|swapnam|mazha|kaattu|kattum|kiliye|kannadi|aanandham|jeevitham|premalu|pulimurugan|lucifer|rdx|thallumaala|kannur squad|bheeshma|kurup|kumbalangi|hridayam|varathan|uyare|ustad hotel|drishyam|minnal murali|kireedam|spadikam|devasuram|kilukkam|bramayugam|kishkindha|bougainvillea|arm|yesudas|kj yesudas|k j yesudas|mg sreekumar|m g sreekumar|sreekumar|sujatha|p jayachandran|jayachandran|unni menon|madhu balakrishnan|vijay yesudas|vineeth sreenivasan|sushin shyam|sushin|jakes bejoy|shaan rahman|gopi sundar|deepak dev|bijibal|mohanlal|mammootty|prithviraj|nivin pauly|dulquer|tovino|fahadh|soubin|dileep|jayasurya|kunchacko boban|manju warrier|nazriya|mamitha baiju|anaswara|raveendran|johnson master|vidyasagar|m jayachandran|matinee now musix|matinee now|matinee|muzik247|satyam audios|satyam music|satyam|music zone|musiczonesongs|musiczone|saina music|saina|manorama music|manorama|east coast|bhavana studios|goodwill entertainments|speed audio malayalam|123musix|central talkies|laly biju)\b/i.test(text)) {
    return 'Malayalam';
  }

  // 5. Multi-Token Scoring Across Detailed Dictionaries
  let bestLang = null;
  let highestScore = 0;

  for (const [lang, categories] of Object.entries(LANGUAGE_SCORES)) {
    let score = 0;
    // High confidence tokens (+10 each)
    for (const token of categories.high) {
      if (text.includes(token)) score += 10;
    }
    // Medium tokens (+6 each)
    for (const token of categories.medium) {
      if (token.length <= 4) {
        // Short tokens require word boundary matching to avoid accidental substrings
        const rx = new RegExp(`\\b${token}\\b`, 'i');
        if (rx.test(text)) score += 6;
      } else if (text.includes(token)) {
        score += 6;
      }
    }
    // Artist & Composer tokens (+5 each)
    for (const token of categories.artists) {
      if (token.length <= 4) {
        const rx = new RegExp(`\\b${token}\\b`, 'i');
        if (rx.test(text)) score += 5;
      } else if (text.includes(token)) {
        score += 5;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestLang = lang;
    }
  }

  if (bestLang && highestScore >= 5) {
    return bestLang;
  }

  // 6. Check active telemetry session before preferences fallback
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw);
      if (state.activeSessionLanguage) return state.activeSessionLanguage;
      if (state.lastListenedLanguage) return state.lastListenedLanguage;
    }
  } catch (e) {}

  // 7. Fallback to user preferences or Malayalam default
  try {
    const prefs = JSON.parse(localStorage.getItem('musicit_preferences') || '{}');
    if (prefs.languages && prefs.languages.length > 0) {
      return prefs.languages[0];
    }
  } catch (e) {}

  return 'Malayalam';
}

// Automatically detect genre / vibe
export function detectGenre(track) {
  if (!track) return 'Romantic';
  const text = `${track.title || ''} ${track.artist || ''}`.toLowerCase();

  for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) {
        return genre;
      }
    }
  }

  return 'Romantic';
}

// Record song start or milestone - updates active language in real time
// isAutoplay = false: User clicked/chose the song directly (high priority, full 1.0 weight)
// isAutoplay = true: Automated queue advancement or radio (low priority, 0.2 weight, does not abruptly overwrite active language)
export function recordTrackStart(track, isAutoplay = false) {
  if (!track || !track.id) return;
  const state = getTelemetryState();

  const detectedLang = detectLanguage(track);
  const detectedGenre = detectGenre(track);
  const artist = (track.artist || 'Unknown Artist').trim();

  // If user selected this track manually, update active session language immediately
  if (!isAutoplay) {
    state.activeSessionLanguage = detectedLang;
    state.lastListenedLanguage = detectedLang;
  } else if (!state.activeSessionLanguage) {
    // Only set active session language if not already established
    state.activeSessionLanguage = detectedLang;
    state.lastListenedLanguage = detectedLang;
  }

  const weight = isAutoplay ? 0.2 : 1.0;
  state.languageFrequency[detectedLang] = (state.languageFrequency[detectedLang] || 0) + weight;
  state.genreFrequency[detectedGenre] = (state.genreFrequency[detectedGenre] || 0) + weight;
  state.artistFrequency[artist] = (state.artistFrequency[artist] || 0) + weight;

  // Add to chronological listening history (deduplicated latest at front)
  const trackEntry = {
    id: track.id,
    title: track.title,
    artist: track.artist,
    thumbnail: track.thumbnail,
    durationStr: track.durationStr,
    language: detectedLang,
    genre: detectedGenre,
    isAutoplay: Boolean(isAutoplay),
    playedAt: Date.now()
  };

  state.recentListeningHistory = [
    trackEntry,
    ...(state.recentListeningHistory || []).filter(t => t.id !== track.id)
  ].slice(0, 30);

  saveTelemetryState(state);
}

// Record play progress (called on timeupdate)
// isAutoplay = false: manual pick (1.0x weight)
// isAutoplay = true: autoplay (0.25x weight for preference calculations)
export function recordListeningProgress(track, currentTime, duration, isAutoplay = false) {
  if (!track || !track.id) return;

  const state = getTelemetryState();
  const trackId = track.id;

  // Count as a genuine listen if played > 12 seconds or > 25% of duration
  if (currentTime > 12 || (duration > 0 && currentTime / duration > 0.25)) {
    if (state.recordedSongSessions[trackId] && state.recordedSongSessions[trackId] > Date.now() - 45000) {
      return; // Avoid double count in same 45-second window
    }

    state.recordedSongSessions[trackId] = Date.now();

    const weight = isAutoplay ? 0.25 : 1.0;
    const artist = (track.artist || 'Unknown Artist').trim();
    state.artistFrequency[artist] = (state.artistFrequency[artist] || 0) + weight;

    const detectedLang = detectLanguage(track);
    state.languageFrequency[detectedLang] = (state.languageFrequency[detectedLang] || 0) + weight;

    // Only update activeSessionLanguage on progress if manual pick OR if user stayed through > 65% of autoplayed song
    if (!isAutoplay || (duration > 0 && currentTime / duration > 0.65)) {
      state.activeSessionLanguage = detectedLang;
    }

    const detectedGenre = detectGenre(track);
    state.genreFrequency[detectedGenre] = (state.genreFrequency[detectedGenre] || 0) + weight;

    // Track play count for repeats / replay tracking with clear separation between user picks & autoplay
    const existing = state.trackPlayCounts[trackId] || { track, count: 0, userPicks: 0, autoplayCount: 0 };
    if (isAutoplay) {
      existing.autoplayCount = (existing.autoplayCount || 0) + 1;
      existing.count = (existing.count || 0) + 0.25;
    } else {
      existing.userPicks = (existing.userPicks || 0) + 1;
      existing.count = (existing.count || 0) + 1.0;
    }
    existing.lastPlayed = Date.now();
    existing.track = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      thumbnail: track.thumbnail,
      durationStr: track.durationStr,
      language: detectedLang,
      genre: detectedGenre
    };
    state.trackPlayCounts[trackId] = existing;
    state.totalListeningSeconds += Math.round(currentTime);

    saveTelemetryState(state);
  }
}

// Get user's deep affinity profile for recommendations
export function getAffinityProfile() {
  const state = getTelemetryState();

  // Top artists sorted by play count & repeats
  const topArtists = Object.entries(state.artistFrequency || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // Top genres sorted by frequency
  const topGenres = Object.entries(state.genreFrequency || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  // Top languages sorted by frequency
  const topLanguages = Object.entries(state.languageFrequency || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));

  // Frequently replayed tracks ("On Repeat • Most Played")
  // Priority calculation: User picks get 2.0x weight, autoplay gets 0.15x weight
  const frequentTracks = Object.values(state.trackPlayCounts || {})
    .filter(item => item && item.track && ((item.userPicks || 0) >= 1 || (item.count || 0) >= 1))
    .sort((a, b) => {
      const scoreA = ((a.userPicks || 0) * 2.0) + ((a.autoplayCount || 0) * 0.15) + ((a.count || 0) * 0.5);
      const scoreB = ((b.userPicks || 0) * 2.0) + ((b.autoplayCount || 0) * 0.15) + ((b.count || 0) * 0.5);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (b.lastPlayed || 0) - (a.lastPlayed || 0);
    })
    .slice(0, 25)
    .map(item => ({
      ...item.track,
      playCount: Math.max(1, Math.round(item.userPicks || item.count || 1)),
      userPicks: item.userPicks || 0,
      autoplayCount: item.autoplayCount || 0
    }));

  // Chronological recent listening order (prefer latest track that user manually selected)
  const recentHistory = state.recentListeningHistory || [];
  const latestManualTrack = recentHistory.find(t => !t.isAutoplay);
  const latestTrack = latestManualTrack || recentHistory[0] || null;

  // Dynamically re-verify latestTrack language with latest high-precision detector
  let activeLanguage = null;
  if (latestTrack) {
    const freshLang = detectLanguage(latestTrack);
    latestTrack.language = freshLang;
    activeLanguage = freshLang;
    if (state.activeSessionLanguage !== freshLang) {
      state.activeSessionLanguage = freshLang;
      state.lastListenedLanguage = freshLang;
      saveTelemetryState(state);
    }
  } else {
    activeLanguage = state.activeSessionLanguage;
  }

  // Active language: current track/latest listen takes top precedence
  const currentLanguage =
    activeLanguage ||
    (topLanguages.length > 0 ? topLanguages[0].name : 'Malayalam');

  const engagedLanguages = [
    ...new Set([
      currentLanguage,
      ...topLanguages.map(l => l.name)
    ])
  ].filter(Boolean);

  return {
    currentLanguage,
    engagedLanguages,
    latestTrack,
    recentHistory,
    topArtists,
    topGenres,
    topLanguages,
    frequentTracks,
    totalPlays: Object.values(state.trackPlayCounts || {}).reduce((s, i) => s + (i.count || 0), 0)
  };
}

// Reset telemetry data cleanly
export function clearTelemetryState() {
  const empty = createEmptyTelemetry();
  saveTelemetryState(empty);
  return empty;
}

// Export raw telemetry state
export function exportTelemetryData() {
  return getTelemetryState();
}

// Import or update telemetry state
export function importTelemetryData(newState) {
  if (newState && typeof newState === 'object') {
    saveTelemetryState({ ...createEmptyTelemetry(), ...newState });
  }
}
