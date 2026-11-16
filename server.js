process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const { Readable } = require('stream');
const qrcode = require('qrcode-terminal');
const ytSearch = require('yt-search');
const { Innertube, ClientType } = require('youtubei.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize YouTube Innertube client with VISIONOS client type (unthrottled, unblocked DASH streams)
let ytClient = null;
let ytInitPromise = null;

async function getInnertube() {
  if (ytClient) return ytClient;
  if (ytInitPromise) return ytInitPromise;

  ytInitPromise = (async () => {
    try {
      console.log('[Musicit] Initializing YouTube client engine (VISIONOS)...');
      ytClient = await Innertube.create({ client_type: ClientType.VISIONOS });
      console.log('[Musicit] YouTube client initialized successfully!');
      return ytClient;
    } catch (err) {
      console.error('[Musicit] Failed to init Innertube:', err.message);
      ytInitPromise = null;
      throw err;
    }
  })();

  return ytInitPromise;
}

// In-memory stream info cache (pre-warming & instant playback)
const streamInfoCache = new Map(); // videoId -> { info, audioFormat, totalLength, mimeType, timestamp }

async function getCachedStreamInfo(videoId, quality = 'best') {
  const cacheKey = `${videoId}_${quality}`;
  const now = Date.now();

  if (streamInfoCache.has(cacheKey)) {
    const entry = streamInfoCache.get(cacheKey);
    // Cache valid for 3 hours
    if (now - entry.timestamp < 1000 * 60 * 60 * 3) {
      return entry;
    }
  }

  const yt = await getInnertube();
  const info = await yt.getBasicInfo(videoId);
  const selectedQuality = quality === 'saver' ? 'bestefficiency' : 'best';
  const audioFormat = info.chooseFormat({ type: 'audio', quality: selectedQuality });

  if (!audioFormat) {
    throw new Error('No audio format found');
  }

  const totalLength = audioFormat.content_length ? parseInt(audioFormat.content_length, 10) : null;
  const mimeType = audioFormat.mime_type ? audioFormat.mime_type.split(';')[0] : 'audio/mp4';

  const entry = {
    info,
    audioFormat,
    totalLength,
    mimeType,
    selectedQuality,
    timestamp: now
  };

  streamInfoCache.set(cacheKey, entry);

  // Keep cache small
  if (streamInfoCache.size > 200) {
    const oldestKey = streamInfoCache.keys().next().value;
    streamInfoCache.delete(oldestKey);
  }

  return entry;
}

const KNOWN_ACTORS = new Set([
  'mohanlal', 'mammootty', 'prabhas', 'allu arjun', 'mahesh babu', 'ram charan',
  'pawan kalyan', 'chiranjeevi', 'balakrishna', 'nagarjuna', 'venkatesh', 'nani',
  'vijay', 'thalapathy vijay', 'ajith', 'rajinikanth', 'kamal haasan', 'dhanush',
  'suriya', 'karthi', 'sivakarthikeyan', 'suresh gopi', 'jayaram', 'dileep',
  'prithviraj', 'nivin pauly', 'dulquer', 'dulquer salmaan', 'tovino', 'tovino thomas',
  'fahadh', 'fahadh faasil', 'jayasurya', 'kunchacko boban', 'shobana', 'manju warrier',
  'nazriya', 'mamitha baiju', 'anaswara rajan', 'deepika', 'rashmika', 'samantha',
  'sai pallavi', 'keerthy suresh', 'trisha', 'nayanthara', 'ranbir kapoor', 'alia bhatt',
  'shah rukh khan', 'salman khan', 'aamir khan', 'jr ntr', 'ntr', 'janhvi kapoor',
  'saif ali khan', 'innocent', 'thilakan', 'sreevidhya', 'vijay deverakonda'
]);

const KNOWN_COMPOSERS = new Set([
  'sharreth', 'anirudh', 'ar rahman', 'a r rahman', 'pritam', 'sushin shyam', 'jakes bejoy',
  'shaan rahman', 'gopi sundar', 'deepak dev', 'bijibal', 'raveendran', 'johnson master',
  'vidyasagar', 'm jayachandran', 'thaman', 'devi sri prasad', 'dsp', 'keeravani',
  'm m keeravani', 'mickey j meyer', 'yuvan', 'harris jayaraj', 'ilayaraja', 'santhosh narayanan',
  'sachet-parampara', 'sachet tandon', 'mithoon', 'vishal-shekhar', 'amit trivedi', 'ravibasrur'
]);

const KNOWN_SINGERS = new Set([
  'kj yesudas', 'k j yesudas', 'yesudas', 'ks chithra', 'k s chithra', 'chithra',
  'mg sreekumar', 'm g sreekumar', 'sujatha', 'p jayachandran', 'unni menon',
  'vijay yesudas', 'vineeth sreenivasan', 'sid sriram', 'arijit singh', 'arijit',
  'shreya ghoshal', 'atif aslam', 'jubin nautiyal', 'shilpa rao', 'anurag kulkarni',
  'ram miriyala', 'mangli', 'spb', 'balasubrahmanyam', 'pradeep kumar', 'anirudh',
  'b praak', 'diljit', 'karan aujla', 'badshah', 'armaan malik', 'suresh peters'
]);

// Extract rich singers, actors, music director, movie, and lyricist from video description & title
function extractRichTrackMetadata({ title = '', description = '', author = '' }) {
  const meta = {
    singers: [],
    actors: [],
    musicDirector: null,
    movie: null,
    lyricist: null
  };

  const cleanText = (str) => (str || '').replace(/\[.*?\]|\(.*?\)/g, '').trim();
  const desc = description || '';

  // 1. Line-by-line key: value regex parsing
  const lines = desc.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const sMatch = line.match(/^(?:singers?|playback\s*singers?|vocals?|voice|sung\s*by)\s*[:\-]\s*(.+)/i);
    if (sMatch && meta.singers.length === 0) {
      meta.singers = sMatch[1].split(/,|&|feat\.?|ft\.?/i).map(s => cleanText(s)).filter(Boolean);
    }
    const mMatch = line.match(/^(?:music(?:\s*director)?|composed\s*by|composer|musical)\s*[:\-]\s*(.+)/i);
    if (mMatch && !meta.musicDirector) {
      meta.musicDirector = cleanText(mMatch[1]);
    }
    const movMatch = line.match(/^(?:movie|film|album|from\s*(?:the)?\s*movie)\s*[:\-]\s*(.+)/i);
    if (movMatch && !meta.movie) {
      meta.movie = cleanText(movMatch[1]);
    }
    const cMatch = line.match(/^(?:starring|cast|actors?|featuring|lead\s*cast)\s*[:\-]\s*(.+)/i);
    if (cMatch && meta.actors.length === 0) {
      meta.actors = cMatch[1].split(/,|&|and/i).map(s => cleanText(s)).filter(Boolean);
    }
    const lMatch = line.match(/^(?:lyrics|lyricist|penned\s*by)\s*[:\-]\s*(.+)/i);
    if (lMatch && !meta.lyricist) {
      meta.lyricist = cleanText(lMatch[1]);
    }
  }

  // 2. Prose / Natural language sentences in description
  if (meta.singers.length === 0) {
    const proseSinger = desc.match(/sung\s+by\s+([A-Z][a-zA-Z\s\.,&]+?)(?:\.|\n|,|\sand\s|composed|penned|features|starring|written|$)/i);
    if (proseSinger) {
      meta.singers = proseSinger[1].split(/,|&|and/i).map(s => cleanText(s)).filter(Boolean);
    }
  }
  if (!meta.musicDirector) {
    const proseMusic = desc.match(/composed\s+by\s+([A-Z][a-zA-Z\s\.,&]+?)(?:\.|\n|,|\sand\s|penned|sung|features|starring|written|$)/i);
    if (proseMusic) {
      meta.musicDirector = cleanText(proseMusic[1]);
    }
  }
  if (!meta.lyricist) {
    const proseLyrics = desc.match(/penned\s+by\s+([A-Z][a-zA-Z\s\.,&]+?)(?:\.|\n|,|\sand\s|composed|sung|features|starring|written|$)/i);
    if (proseLyrics) {
      meta.lyricist = cleanText(proseLyrics[1]);
    }
  }
  if (meta.actors.length === 0) {
    const proseCast = desc.match(/(?:features|starring|cast\s+of)\s+(?:the\s+lead\s+cast\s+of\s+)?(?:[\"“][^\"”]+[\"”]\s*,?\s*)?([A-Z][a-zA-Z\s\.,&]+?)(?:\.|\n|composed|sung|penned|$)/i);
    if (proseCast) {
      meta.actors = proseCast[1].split(/,|&|and/i).map(s => cleanText(s)).filter(Boolean);
    }
  }

  // 3. Scan title segments for known entities
  const segments = (title || '').split(/[|\-–—:•/]/).map(s => s.trim()).filter(Boolean);
  for (const seg of segments) {
    const norm = seg.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    if (KNOWN_ACTORS.has(norm) && !meta.actors.some(a => a.toLowerCase() === norm)) {
      meta.actors.push(seg);
    }
    if (KNOWN_COMPOSERS.has(norm) && !meta.musicDirector) {
      meta.musicDirector = seg;
    }
    if (KNOWN_SINGERS.has(norm) && !meta.singers.some(s => s.toLowerCase() === norm)) {
      meta.singers.push(seg);
    }
  }

  meta.singers = [...new Set(meta.singers.map(s => s.trim()))].filter(Boolean);
  meta.actors = [...new Set(meta.actors.map(a => a.trim()))].filter(Boolean);

  const LABEL_NAMES = /\b(music\s*zone|musiczonesongs|matinee|t-series|tseries|sony\s*music|saregama|speed\s*records|speed\s*audio|lahari|aditya\s*music|think\s*music|muzik247|satyam|saina|manorama|tips|zeemusic|yrf|records|entertainment|studios|channel|vevo)\b/i;
  const primaryArtist = meta.singers[0] || meta.musicDirector || (!LABEL_NAMES.test(author) ? author : 'Artist');
  const displayParts = [
    meta.singers.slice(0, 2).join(', '),
    meta.musicDirector,
    meta.actors.slice(0, 2).join(', ')
  ].filter(Boolean);

  const displaySubtitle = displayParts.join(' • ') || author || 'Musicit';

  return {
    ...meta,
    primaryArtist,
    displaySubtitle
  };
}

// 1. Search API with filter support & rich metadata extraction
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  const filter = req.query.filter || 'all'; // 'all' | 'songs' | 'artists'
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    let searchQuery = query;
    if (filter === 'songs') searchQuery += ' song audio';
    if (filter === 'artists') searchQuery += ' official channel artist';

    const results = await ytSearch(searchQuery);
    const videos = (results.videos || []).slice(0, 30).map(v => {
      const meta = extractRichTrackMetadata({
        title: v.title,
        description: v.description,
        author: v.author?.name
      });
      return {
        id: v.videoId,
        title: v.title,
        artist: meta.primaryArtist || v.author?.name || 'Unknown Artist',
        displayArtist: meta.displaySubtitle,
        singers: meta.singers,
        actors: meta.actors,
        musicDirector: meta.musicDirector,
        movie: meta.movie,
        duration: v.seconds,
        durationStr: v.timestamp,
        thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
        views: v.views,
        ago: v.ago
      };
    });

    res.json({ results: videos });
  } catch (err) {
    console.error('[Search Error]', err.message);
    res.status(500).json({ error: 'Failed to search YouTube: ' + err.message });
  }
});

// Detail API: Extracts actors, singers, music director, movie from video description & Innertube metadata
app.get('/api/track-details/:videoId', async (req, res) => {
  const { videoId } = req.params;
  try {
    const yt = await getInnertube();
    const basic = await yt.getBasicInfo(videoId);
    const title = basic.basic_info?.title || '';
    const description = basic.basic_info?.short_description || '';
    const author = basic.basic_info?.author || '';
    const keywords = basic.basic_info?.keywords || [];

    const meta = extractRichTrackMetadata({
      title,
      description: description + '\n' + keywords.join(', '),
      author
    });

    const lang = detectServerTrackLanguage({ title, artist: meta.primaryArtist || author }) || 'Malayalam';

    res.json({
      id: videoId,
      title,
      language: lang,
      singers: meta.singers,
      actors: meta.actors,
      musicDirector: meta.musicDirector,
      movie: meta.movie,
      lyricist: meta.lyricist,
      primaryArtist: meta.primaryArtist,
      displaySubtitle: meta.displaySubtitle,
      keywords: keywords.slice(0, 10)
    });
  } catch (err) {
    console.error('[Track Details Error]', err.message);
    res.status(500).json({ error: 'Failed to fetch track details' });
  }
});

// 2. Audio Stream API (VISIONOS + Range Chunking + In-Memory Caching)
app.get('/api/stream/:videoId', async (req, res) => {
  const { videoId } = req.params;
  const quality = req.query.quality || 'best';
  if (!videoId) return res.status(400).send('Missing videoId');

  try {
    const yt = await getInnertube();
    const { totalLength, mimeType, selectedQuality } = await getCachedStreamInfo(videoId, quality);

    const rangeHeader = req.headers.range;

    if (rangeHeader && totalLength) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      let end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;

      if (isNaN(start) || start >= totalLength) {
        res.setHeader('Content-Range', `bytes */${totalLength}`);
        return res.status(416).send('Requested range not satisfiable');
      }

      if (end >= totalLength) end = totalLength - 1;

      // Clamp chunks to 1MB to prevent YouTube chunk rejection
      const MAX_CHUNK = 1024 * 1024; // 1MB
      if (!parts[1] || (end - start + 1) > MAX_CHUNK) {
        end = Math.min(totalLength - 1, start + MAX_CHUNK - 1);
      }

      const contentLength = end - start + 1;

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${totalLength}`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', contentLength);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Access-Control-Allow-Origin', '*');

      const stream = await yt.download(videoId, {
        type: 'audio',
        quality: selectedQuality,
        range: { start, end }
      });

      Readable.fromWeb(stream).pipe(res);
    } else {
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Access-Control-Allow-Origin', '*');
      if (totalLength) {
        res.setHeader('Content-Length', totalLength);
      }

      const stream = await yt.download(videoId, { type: 'audio', quality: selectedQuality });
      Readable.fromWeb(stream).pipe(res);
    }
  } catch (err) {
    console.error(`[Stream Error ${videoId}]`, err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Streaming failed: ' + err.message });
    }
  }
});

// Pre-warm stream endpoint for zero-latency gapless transitions
app.get('/api/prewarm/:videoId', async (req, res) => {
  const { videoId } = req.params;
  try {
    await getCachedStreamInfo(videoId, req.query.quality || 'best');
    res.json({ ready: true, videoId });
  } catch (e) {
    res.json({ ready: false });
  }
});

// Native South Asian Script Unicode ranges for server-side detection
const SERVER_SCRIPT_RANGES = [
  { lang: 'Malayalam', regex: /[\u0D00-\u0D7F]/ },
  { lang: 'Telugu', regex: /[\u0C00-\u0C7F]/ },
  { lang: 'Tamil', regex: /[\u0B80-\u0BFF]/ },
  { lang: 'Kannada', regex: /[\u0C80-\u0CFF]/ },
  { lang: 'Hindi', regex: /[\u0900-\u097F]/ },
  { lang: 'Punjabi', regex: /[\u0A00-\u0A7F]/ },
  { lang: 'Bengali', regex: /[\u0980-\u09FF]/ },
  { lang: 'Gujarati', regex: /[\u0A80-\u0AFF]/ },
  { lang: 'Odia', regex: /[\u0B00-\u0B7F]/ }
];

// Clean track title of noisy video attributes
function cleanRawTitle(title) {
  if (!title) return '';
  return title
    .replace(/\[.*?\]|\(.*?\)/g, ' ')
    .replace(/#\S+/g, (m) => ' ' + m.replace(/^#/, '') + ' ') // Retain the word inside the hashtag for keyword comparison
    .replace(/\b(official\s*(music\s*)?video|video\s*song|full\s*video|lyrical\s*video|lyrics|lyric\s*video|audio\s*song|audio|full\s*song|hd|4k|1080p|720p|remix|lofi|slowed|reverb|status|whatsapp\s*status|shorts|reels|cover|tribute|unplugged|mashup|jukebox|promo|teaser|trailer|song|songs|video)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract canonical title words (Latin + Native South Asian Script)
function getSongTitleTokens(title) {
  const clean = cleanRawTitle(title);
  const segments = clean.split(/[|\-–—:•/]/).map(s => s.trim()).filter(Boolean);
  const titlePart = (segments.slice(0, 2).join(' ')).toLowerCase();

  const words = [];
  const nativeWords = [];

  for (const w of titlePart.split(/\s+/)) {
    if (/[a-z]{3,}/i.test(w)) {
      words.push(w.toLowerCase().replace(/[^a-z0-9]/g, ''));
    } else if (/[\u0900-\u0D7F]{2,}/.test(w)) {
      nativeWords.push(w);
    }
  }
  return { words, nativeWords };
}

const NOISE_PEOPLE = new Set([
  'mohanlal', 'mammootty', 'prithviraj', 'dulquer', 'tovino', 'fahadh', 'dileep',
  'jayasurya', 'nivin', 'yesudas', 'sreekumar', 'sujatha', 'chithra', 'prabhas',
  'alluarjun', 'arjun', 'maheshbabu', 'mahesh', 'ramcharan', 'pawankalyan',
  'chiranjeevi', 'ntr', 'vijay', 'ajith', 'rajinikanth', 'kamal', 'haasan',
  'dhanush', 'suriya', 'arijit', 'shreya', 'ghoshal', 'pritam', 'anirudh', 'rahman'
]);

function getDistinctiveSongTokens(title) {
  const clean = cleanRawTitle(title).toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  return clean.split(/\s+/).filter(w => w.length >= 6 && !NOISE_PEOPLE.has(w));
}

// Check whether two video titles represent the same underlying song
function areSameSong(title1, title2) {
  if (!title1 || !title2) return false;
  const raw1 = title1.toLowerCase().trim();
  const raw2 = title2.toLowerCase().trim();
  if (raw1 === raw2) return true;

  // Cross check if any unique song name token (>= 6 chars) appears in the other title
  const dt1 = getDistinctiveSongTokens(title1);
  const dt2 = getDistinctiveSongTokens(title2);
  if (dt1.some(t => raw2.includes(t)) || dt2.some(t => raw1.includes(t))) {
    return true;
  }

  const t1 = getSongTitleTokens(title1);
  const t2 = getSongTitleTokens(title2);

  // Native script match (e.g. Malayalam, Telugu, Tamil, Devanagari script overlap)
  if (t1.nativeWords.length > 0 && t2.nativeWords.length > 0) {
    const commonNative = t1.nativeWords.filter(w => t2.nativeWords.includes(w));
    if (commonNative.length >= 2 || (commonNative.length === 1 && commonNative[0].length >= 4)) {
      return true;
    }
  }

  // Phonetic simplification (normalizes double vowels and aspirated consonants)
  const simplify = s => s.replace(/aa/g, 'a').replace(/ee/g, 'i').replace(/oo/g, 'u').replace(/th/g, 't').replace(/dh/g, 'd');
  const s1 = t1.words.map(simplify);
  const s2 = t2.words.map(simplify);

  if (s1.length > 0 && s2.length > 0) {
    const exactMatches = s1.filter(w => s2.includes(w));
    if (exactMatches.length >= 2) return true;
    if (exactMatches.length === 1 && exactMatches[0].length >= 6) return true;
    if (s1.length === 1 && s2.length === 1 && s1[0] === s2[0]) return true;
  }

  return false;
}

// Filter out shorts, status clips, junk uploads, and deduplicate identical songs
function filterAndDeduplicate(videos, { excludeTitle = null, minDuration = 70, maxDuration = 900 } = {}) {
  const result = [];
  // Regex to catch shorts, status, reels, whatsapp status even if at the start or with hash
  const junkPattern = /(?:^|\s)(#\w+|shorts|status|reels|whatsapp\s*status|status\s*video|slowed\s*(\+|\&)?\s*reverb|karaoke|tutorial|reaction|mashup\s*non\s*stop)\b/i;

  for (const v of (videos || [])) {
    if (!v || !v.title) continue;
    
    // Duration filter: songs should be between 70s and 15 mins (reject 15s/30s shorts and 2hr jukeboxes)
    if (v.seconds && (v.seconds < minDuration || v.seconds > maxDuration)) continue;

    const rawTitle = v.title.trim();
    // Reject titles that start with hashtag, have 2+ hashtags (classic shorts), or match junk terms
    const hashtagCount = (rawTitle.match(/#/g) || []).length;
    if (hashtagCount >= 2 || rawTitle.startsWith('#')) continue;
    if (junkPattern.test(rawTitle)) continue;

    // Discard if cleaned title is empty or trivial
    const cleaned = cleanRawTitle(rawTitle);
    if (!cleaned || cleaned.length < 4) continue;

    // Exclude currently played track or reference song
    if (excludeTitle && areSameSong(rawTitle, excludeTitle)) continue;

    // Deduplicate against already accepted tracks in this carousel
    const isDup = result.some(prev => areSameSong(prev.title, rawTitle));
    if (!isDup) {
      result.push(v);
    }
  }
  return result;
}

function detectServerTrackLanguage(track) {
  if (!track) return null;
  const raw = `${track.title || ''} ${track.artist || ''}`;
  const text = raw.toLowerCase();

  // 1. Unicode Range check (100% accurate for native scripts)
  for (const { lang, regex } of SERVER_SCRIPT_RANGES) {
    if (regex.test(raw)) return lang;
  }

  // 2. Explicit Malayalam keywords, channels, and distinct cinema vocabulary (High Priority)
  if (/\b(malayalam|mollywood|matinee now musix|matinee now|matinee|muzik247|satyam audios|satyam music|satyam|music zone|musiczonesongs|musiczone|saina music|saina video|saina|manorama music|manorama|east coast|bhavana studios|goodwill entertainments|speed audio malayalam|123musix|central talkies)\b/i.test(text)) {
    return 'Malayalam';
  }

  // Malayalam grammatical inflections (-unnu, -aanu, -ennu)
  if (/\b\w+(unnu|aanu|ennu)\b/i.test(text)) {
    return 'Malayalam';
  }

  // Malayalam cinema classics, words, and evergreen titles
  if (/\b(sreeragamo|sreeraagamo|pavithram|thedunnu|sharreth|onnanam|harimuraleeravam|shanthamee|chandrakalabham|kannadippoyikayil|allimalarkavu|enthamme|karutha|kallayi|thumbi vaa|surumayezhuthiya|ente sooryaputhrikku|raakkilithan|neelathamara|thaamarakkannan|pinneyum|ethrayo|ennum ninne|oru nokku|varshangalkku|turbo|thalavan|guruvayoor|ente|ninte|oru|thenkasi|thenkasipattanam|painkili|pattanam|sneham|pattu|paattu|gaanangal|chithram|malare|premam|aavesham|illuminati|manjummel|pulimurugan|lucifer|rdx|thallumaala|kumbalangi|hridayam|drishyam|minnal murali|bramayugam|kishkindha|arm|bougainvillea|katha|kadha|kavitha|poove|swapnam|mazha|kaattu|kattum|kiliye|kannadi|aanandham|jeevitham|premalu|laly biju)\b/i.test(text)) {
    return 'Malayalam';
  }

  // Malayalam singers and artists
  if (/\b(yesudas|kj yesudas|k j yesudas|mg sreekumar|m g sreekumar|sreekumar|sujatha|p jayachandran|jayachandran|unni menon|madhu balakrishnan|vijay yesudas|vineeth sreenivasan|sushin shyam|sushin|jakes bejoy|shaan rahman|gopi sundar|deepak dev|bijibal|mohanlal|mammootty|prithviraj|nivin|dulquer|tovino|fahadh|dileep|jayasurya|raveendran|johnson master|vidyasagar)\b/i.test(text)) {
    return 'Malayalam';
  }

  // 3. Explicit keywords for other Indian languages
  if (/\b(telugu|tollywood|aditya telugu|lahari telugu|saregama telugu|mango music|madhura audio|shreyas media|geetha arts|mythri movie makers)\b/i.test(text)) return 'Telugu';
  if (/\b(tamil|kollywood|think music|sony music south|saregama tamil|sun tv)\b/i.test(text)) return 'Tamil';
  if (/\b(kannada|sandalwood|anand audio|jhankar music)\b/i.test(text)) return 'Kannada';
  if (/\b(punjabi|bhangra|speed records|white hill music|geet mp3)\b/i.test(text)) return 'Punjabi';
  if (/\b(hindi|bollywood|t-series|tseries|zeemusic|sonymusicindia|yrf)\b/i.test(text)) return 'Hindi';

  // 4. Distinct Telugu words & artists
  if (/\b(adipurush|prabhas|allu arjun|mahesh babu|ntr|jr ntr|ram charan|pawan kalyan|chiranjeevi|chuttamalle|devara|guntur kaaram|kalki|salaar|pushpa|hanuman|samajavaragamana|butta bomma|srivalli|oo antava|inkem inkem|thaman|dsp|devi sri prasad|keeravani)\b/i.test(text)) {
    return 'Telugu';
  }

  // 5. Distinct Tamil words & artists
  if (/\b(anirudh|ar rahman|yuvan|harris jayaraj|ilayaraja|dhanush|santhosh narayanan|leo|jailer|goat|vikram|ponniyin selvan|kaithi|master|varisu|beast|vaathi|kavala|hukum|naa ready|arabic kuthu|thalli pogathey|rowdy baby)\b/i.test(text)) {
    return 'Tamil';
  }

  // 6. Distinct Hindi words & artists
  if (/\b(arijit|arijit singh|shreya ghoshal|atif aslam|jubin nautiyal|badshah|pritam|sachet-parampara|sachet tandon|apna bana le|kesariya|tum hi ho|channa mereya|o maahi|animal|jawan|pathaan)\b/i.test(text)) {
    return 'Hindi';
  }

  return null;
}

// 3. Advanced Multi-Language Recommendation Engine with Deduplication & Dynamic Blending
app.post('/api/recommendations', async (req, res) => {
  const {
    languages = ['Malayalam', 'Telugu', 'Hindi'],
    engagedLanguages = [], // e.g. ['Malayalam', 'Telugu', 'Hindi'] from user listening history
    preferredGenres = [],
    preferredArtists = [],
    activeLanguage = null, // currently selected language filter pill
    currentLanguage = null, // language detected from current or last played track
    latestTrack = null,    // most recent track listened to
    topArtists = [],
    topGenres = [],
    frequentTracks = [],
    favorites = [],
    mood = 'Chill',
    recentHistory = [],
    timeOfDay = 'evening'
  } = req.body;

  try {
    // 1. Effective Primary Language:
    // Ground truth: latest track detected language takes absolute priority if present,
    // followed by explicit filter pill, currentLanguage, and listening history.
    const detectedFromLatest = latestTrack ? detectServerTrackLanguage(latestTrack) : null;
    const effectiveLang = detectedFromLatest
      || ((activeLanguage && activeLanguage !== 'all') ? activeLanguage : null)
      || currentLanguage
      || (engagedLanguages && engagedLanguages.length > 0 ? engagedLanguages[0] : null)
      || (languages && languages.length > 0 ? languages[0] : 'Malayalam');

    // 2. Secondary & Tertiary Languages for rich Spotify-style multi-lingual feed
    const allKnownLangs = [...new Set([...(engagedLanguages || []), ...(languages || []), 'Malayalam', 'Telugu', 'Hindi', 'Tamil'])];
    const otherLangs = allKnownLangs.filter(l => l.toLowerCase() !== effectiveLang.toLowerCase());
    const secondaryLang = otherLangs.length > 0 ? otherLangs[0] : (effectiveLang === 'Malayalam' ? 'Telugu' : 'Malayalam');
    const tertiaryLang = otherLangs.length > 1 ? otherLangs[1] : (effectiveLang === 'Hindi' ? 'Tamil' : 'Hindi');

    // 3. Effective Genre: Prioritize style of latest track, then top telemetry genre, then preferences
    let genreToUse = 'Melody Love Songs';
    if (latestTrack?.genre) {
      genreToUse = latestTrack.genre;
    } else if (topGenres && topGenres.length > 0) {
      genreToUse = topGenres[0].name;
    } else if (preferredGenres && preferredGenres.length > 0) {
      genreToUse = preferredGenres[0].replace(/[^\w\s&]/gi, '').trim();
    }

    // 4. Effective Primary Artist: From latest track (if human artist) or top affinity
    const LABEL_NAMES = /\b(music\s*zone|musiczonesongs|matinee|t-series|tseries|sony\s*music|saregama|speed\s*records|speed\s*audio|lahari|aditya\s*music|think\s*music|muzik247|satyam|saina|manorama|tips|zeemusic|yrf|records|entertainment|studios|channel|vevo)\b/i;
    let defaultArtist = effectiveLang === 'Malayalam' ? 'KJ Yesudas' : (effectiveLang === 'Telugu' ? 'Sid Sriram' : (effectiveLang === 'Tamil' ? 'Anirudh' : 'Arijit Singh'));

    let primaryArtist = defaultArtist;
    if (latestTrack?.artist && latestTrack.artist !== 'Unknown Artist' && !LABEL_NAMES.test(latestTrack.artist)) {
      primaryArtist = latestTrack.artist.replace(/\(.*?\)|\[.*?\]/g, '').replace(/vevo|records|official/gi, '').trim();
    } else if (topArtists && topArtists.length > 0) {
      primaryArtist = topArtists[0].name;
    } else if (preferredArtists && preferredArtists.length > 0) {
      primaryArtist = preferredArtists[0];
    } else if (recentHistory && recentHistory.length > 0 && !LABEL_NAMES.test(recentHistory[0].artist || '')) {
      primaryArtist = recentHistory[0].artist || primaryArtist;
    }

    // 5. Clean title of latest played track for contextual similarity
    const cleanLatestTitle = latestTrack?.title
      ? cleanRawTitle(latestTrack.title).slice(0, 36)
      : null;

    // Build Parallel YouTube queries for all diverse sections
    const queryTasks = [];
    const sectionMeta = [];

    // Determine the exact language of the latest track (for Section 0)
    const latestTrackLang = latestTrack
      ? (detectServerTrackLanguage(latestTrack) || latestTrack.language || effectiveLang)
      : effectiveLang;

    const latestSinger = latestTrack?.singers?.[0] || null;
    const latestActor = latestTrack?.actors?.[0] || null;

    // --- Section 0: Because You Listened to [Latest Track] ---
    if (cleanLatestTitle) {
      queryTasks.push(
        Promise.all([
          ytSearch(`${latestSinger || primaryArtist} ${latestTrackLang} melody video songs`).catch(() => ({ videos: [] })),
          latestActor
            ? ytSearch(`${latestActor} ${latestTrackLang} hit songs`).catch(() => ({ videos: [] }))
            : ytSearch(`${latestTrackLang} evergreen hit melody songs video`).catch(() => ({ videos: [] })),
          ytSearch(`${genreToUse} ${latestTrackLang} superhit songs`).catch(() => ({ videos: [] }))
        ]).then(([r1, r2, r3]) => [...(r1.videos || []), ...(r2.videos || []), ...(r3.videos || [])])
      );
      sectionMeta.push({
        title: `Similar to ${cleanLatestTitle}`,
        subtitle: `Melodies & styles in ${latestTrackLang}`,
        excludeTitle: latestTrack.title
      });
    } else {
      queryTasks.push(
        ytSearch(`${primaryArtist} ${effectiveLang} songs hits`).catch(() => ytSearch(`${effectiveLang} superhit songs`))
          .then(r => r.videos || [])
      );
      sectionMeta.push({
        title: `More from ${primaryArtist}`,
        subtitle: `Top hits in ${effectiveLang}`,
        excludeTitle: null
      });
    }

    // --- Section 1: Primary Language Chartbusters (e.g. Top Malayalam Melodies) ---
    queryTasks.push(
      ytSearch(`${effectiveLang} official video songs 2025 2026`).catch(() => ytSearch(`${effectiveLang} hit songs 2026`))
        .then(r => r.videos || [])
    );
    sectionMeta.push({
      title: `Top ${effectiveLang} Melodies`,
      subtitle: `Trending ${effectiveLang} chartbusters`,
      excludeTitle: null
    });

    // --- Section 2: Secondary Language Station (e.g. Top Telugu Hits) ---
    queryTasks.push(
      ytSearch(`${secondaryLang} official video songs 2025 2026`).catch(() => ytSearch(`${secondaryLang} top hits`))
        .then(r => r.videos || [])
    );
    sectionMeta.push({
      title: `Top ${secondaryLang} Hits`,
      subtitle: `Best of ${secondaryLang} music`,
      excludeTitle: null
    });

    // --- Section 3: Artist Radio ---
    queryTasks.push(
      ytSearch(`${primaryArtist} ${effectiveLang} hit songs playlist`).catch(() => ytSearch(`${primaryArtist} best songs`))
        .then(r => r.videos || [])
    );
    sectionMeta.push({
      title: `Artist Radio: ${primaryArtist}`,
      subtitle: `Handpicked hits from ${primaryArtist}`,
      excludeTitle: null
    });

    // --- Section 4: Genre / Vibe Station in Primary Language ---
    queryTasks.push(
      ytSearch(`${effectiveLang} ${genreToUse} official songs`).catch(() => ytSearch(`${effectiveLang} hits playlist`))
        .then(r => r.videos || [])
    );
    sectionMeta.push({
      title: `${effectiveLang} ${genreToUse}`,
      subtitle: `${genreToUse} vibes`,
      excludeTitle: null
    });

    // --- Section 5: Discover / Tertiary Language Station (e.g. Hindi / Bollywood Viral) ---
    queryTasks.push(
      ytSearch(`${tertiaryLang} top viral trending songs 2026`).catch(() => ytSearch(`${tertiaryLang} top hits`))
        .then(r => r.videos || [])
    );
    sectionMeta.push({
      title: `${tertiaryLang} Viral Hits`,
      subtitle: `Trending in ${tertiaryLang}`,
      excludeTitle: null
    });

    // --- Section 6: Mood & Vibes Station ---
    queryTasks.push(
      ytSearch(`${mood} ${effectiveLang} songs`).catch(() => ytSearch(`${effectiveLang} mood songs`))
        .then(r => r.videos || [])
    );
    sectionMeta.push({
      title: `${mood} Vibes (${effectiveLang})`,
      subtitle: `${mood} mood tuned for you`,
      excludeTitle: null
    });

    // Await all parallel searches
    const rawResults = await Promise.all(queryTasks);

    function mapAndClean(rawVideos, meta) {
      const cleanList = filterAndDeduplicate(rawVideos, {
        excludeTitle: meta.excludeTitle,
        minDuration: 70,
        maxDuration: 900
      });

      return cleanList.slice(0, 16).map(v => {
        const itemMeta = extractRichTrackMetadata({
          title: v.title,
          description: v.description,
          author: v.author?.name
        });
        return {
          id: v.videoId,
          title: v.title,
          artist: itemMeta.primaryArtist || v.author?.name || 'Unknown Artist',
          displayArtist: itemMeta.displaySubtitle,
          singers: itemMeta.singers,
          actors: itemMeta.actors,
          musicDirector: itemMeta.musicDirector,
          movie: itemMeta.movie,
          duration: v.seconds,
          durationStr: v.timestamp,
          thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
          views: v.views
        };
      });
    }

    res.json({
      heavyRotation: filterAndDeduplicate(frequentTracks, { minDuration: 40, maxDuration: 1800 }).slice(0, 12),
      lastPlayedMix: { title: sectionMeta[0].title, subtitle: sectionMeta[0].subtitle, tracks: mapAndClean(rawResults[0], sectionMeta[0]) },
      languageMix: { title: sectionMeta[1].title, subtitle: sectionMeta[1].subtitle, tracks: mapAndClean(rawResults[1], sectionMeta[1]) },
      secondaryMix: { title: sectionMeta[2].title, subtitle: sectionMeta[2].subtitle, tracks: mapAndClean(rawResults[2], sectionMeta[2]) },
      artistMix: { title: sectionMeta[3].title, subtitle: sectionMeta[3].subtitle, tracks: mapAndClean(rawResults[3], sectionMeta[3]) },
      genreMix: { title: sectionMeta[4].title, subtitle: sectionMeta[4].subtitle, tracks: mapAndClean(rawResults[4], sectionMeta[4]) },
      discoverMix: { title: sectionMeta[5].title, subtitle: sectionMeta[5].subtitle, tracks: mapAndClean(rawResults[5], sectionMeta[5]) },
      moodMix: { title: sectionMeta[6].title, subtitle: sectionMeta[6].subtitle, tracks: mapAndClean(rawResults[6], sectionMeta[6]) },
      activeLanguage: effectiveLang,
      secondaryLanguage: secondaryLang
    });
  } catch (err) {
    console.error('[Recommendation Error]', err.message);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// 4. Autoplay / Related Songs API (for ML Play Queue & Infinite Radio)
app.get('/api/related/:videoId', async (req, res) => {
  const { videoId } = req.params;
  try {
    const yt = await getInnertube();
    const basic = await yt.getBasicInfo(videoId);
    const title = basic.basic_info?.title || '';
    const author = basic.basic_info?.author || '';
    const description = basic.basic_info?.short_description || '';
    const keywords = basic.basic_info?.keywords || [];

    const cleanTitle = cleanRawTitle(title);
    const trackMeta = extractRichTrackMetadata({
      title,
      description: description + '\n' + keywords.join(', '),
      author
    });

    const trackLang = detectServerTrackLanguage({ title, artist: trackMeta.primaryArtist || author }) || 'Malayalam';

    // Distinguish human artists from distribution channels
    const LABEL_NAMES = /\b(music\s*zone|musiczonesongs|matinee|t-series|tseries|sony\s*music|saregama|speed\s*records|speed\s*audio|lahari|aditya\s*music|think\s*music|muzik247|satyam|saina|manorama|tips|zeemusic|yrf|records|entertainment|studios|channel|vevo)\b/i;
    const isChannel = LABEL_NAMES.test(author);

    const searches = [
      ytSearch(`${cleanTitle} ${trackLang} melody video songs`).catch(() => ({ videos: [] })),
      ytSearch(`${trackLang} evergreen melody hit songs video`).catch(() => ({ videos: [] }))
    ];

    // Priority 1: Real detected singer (e.g. KJ Yesudas, Sid Sriram, Arijit Singh)
    if (trackMeta.singers.length > 0) {
      searches.push(ytSearch(`${trackMeta.singers[0]} ${trackLang} melody hit songs`).catch(() => ({ videos: [] })));
    } else if (!isChannel && author && author !== 'Unknown Artist') {
      searches.push(ytSearch(`${author} ${trackLang} songs hits`).catch(() => ({ videos: [] })));
    } else {
      const topArtist = trackLang === 'Malayalam' ? 'KJ Yesudas' : (trackLang === 'Telugu' ? 'Sid Sriram' : 'Arijit Singh');
      searches.push(ytSearch(`${topArtist} ${trackLang} melody video song`).catch(() => ({ videos: [] })));
    }

    // Priority 2: Real detected actor (e.g. Mohanlal, Allu Arjun, Vijay)
    if (trackMeta.actors.length > 0) {
      searches.push(ytSearch(`${trackMeta.actors[0]} ${trackLang} evergreen hit songs`).catch(() => ({ videos: [] })));
    }

    // Priority 3: Real detected music director (e.g. Sharreth, Anirudh, Pritam)
    if (trackMeta.musicDirector) {
      searches.push(ytSearch(`${trackMeta.musicDirector} ${trackLang} songs hits`).catch(() => ({ videos: [] })));
    }

    const searchResults = await Promise.all(searches);
    const rawCandidates = searchResults.flatMap(r => r.videos || []);

    const cleanCandidates = filterAndDeduplicate(rawCandidates, {
      excludeTitle: title,
      minDuration: 70,
      maxDuration: 900
    });

    // If specific queries returned fewer than 10 tracks, top up with evergreen chartbusters in that language
    if (cleanCandidates.length < 10) {
      const topUpSearch = await ytSearch(`${trackLang} superhit melody songs video`).catch(() => ({ videos: [] }));
      const topUpClean = filterAndDeduplicate(topUpSearch.videos || [], {
        excludeTitle: title,
        minDuration: 70,
        maxDuration: 900
      });
      for (const v of topUpClean) {
        if (!cleanCandidates.some(c => c.videoId === v.videoId)) {
          cleanCandidates.push(v);
        }
      }
    }

    const related = cleanCandidates
      .filter(v => v.videoId !== videoId)
      .slice(0, 25)
      .map(v => {
        const itemMeta = extractRichTrackMetadata({
          title: v.title,
          description: v.description,
          author: v.author?.name
        });
        return {
          id: v.videoId,
          title: v.title,
          artist: itemMeta.primaryArtist || v.author?.name || author || 'Unknown Artist',
          displayArtist: itemMeta.displaySubtitle,
          singers: itemMeta.singers,
          actors: itemMeta.actors,
          musicDirector: itemMeta.musicDirector,
          movie: itemMeta.movie,
          duration: v.seconds,
          durationStr: v.timestamp,
          thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
          views: v.views
        };
      });

    res.json({
      results: related,
      language: trackLang,
      metadata: trackMeta
    });
  } catch (err) {
    console.error('[Related Error]', err.message);
    res.json({ results: [], language: 'Malayalam' });
  }
});

// 5. Trending Songs by Language / Genre
app.get('/api/trending', async (req, res) => {
  const genre = req.query.genre || 'trending';
  const language = req.query.lang || '';

  let query = 'Top trending popular music songs 2026';
  if (language && language !== 'all') {
    query = `${language} top hit songs 2026`;
  } else if (genre !== 'trending') {
    query = `${genre} popular songs hits`;
  }

  try {
    const results = await ytSearch(query);
    const videos = (results.videos || []).slice(0, 25).map(v => ({
      id: v.videoId,
      title: v.title,
      artist: v.author?.name || 'Unknown Artist',
      duration: v.seconds,
      durationStr: v.timestamp,
      thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
      views: v.views
    }));

    res.json({ results: videos });
  } catch (err) {
    console.error('[Trending Error]', err.message);
    res.status(500).json({ error: 'Failed to fetch trending tracks' });
  }
});

// 6. Lyrics API
app.get('/api/lyrics', async (req, res) => {
  const { title, artist } = req.query;
  if (!title) return res.status(400).json({ error: 'Title required' });

  const cleanTitle = title
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/official\s*(music\s*)?video/gi, '')
    .replace(/audio|lyrics|visualizer/gi, '')
    .replace(/ft\..*|feat\..*/gi, '')
    .trim();

  const cleanArtist = (artist || '')
    .replace(/vevo|records|official/gi, '')
    .replace(/- Topic/gi, '')
    .trim();

  try {
    const searchUrl = `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`;
    const lrclibRes = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Musicit-Mobile/1.0 (https://github.com)' }
    });

    if (lrclibRes.ok) {
      const items = await lrclibRes.json();
      if (Array.isArray(items) && items.length > 0) {
        const best = items.find(i => i.syncedLyrics) || items[0];
        return res.json({
          syncedLyrics: best.syncedLyrics || null,
          plainLyrics: best.plainLyrics || null,
          trackName: best.trackName,
          artistName: best.artistName
        });
      }
    }

    res.json({ syncedLyrics: null, plainLyrics: null });
  } catch (err) {
    console.error('[Lyrics Error]', err.message);
    res.json({ syncedLyrics: null, plainLyrics: null });
  }
});

// Serve frontend in production (if built)
const distPath = path.join(__dirname, 'dist');
const fs = require('fs');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Root status endpoint for cloud hosting checks & health monitors
app.get('/', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.json({
    status: 'online',
    app: 'Harmoniq Audio Streaming Engine',
    version: '2.0',
    time: new Date().toISOString()
  });
});

app.use((req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(404).json({ error: 'Endpoint not found', path: req.path });
});

// Helper to get local IP
function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const server = app.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  const localUrl = `http://localhost:${PORT}`;
  const networkUrl = `http://${localIp}:${PORT}`;

  console.log('\n=============================================================');
  console.log('  🎵 MUSICIT - AD-FREE YOUTUBE MUSIC PLAYER (MOBILE & WEB)');
  console.log('=============================================================');
  console.log(`  Local PC URL:      ${localUrl}`);
  console.log(`  Mobile Device URL: ${networkUrl}`);
  console.log('=============================================================');
  console.log('  Scan this QR code with your phone to open on mobile:');
  console.log('-------------------------------------------------------------');
  try {
    qrcode.generate(networkUrl, { small: true });
  } catch (e) {}
  console.log('=============================================================\n');

  getInnertube().catch(e => console.error('Pre-warm warning:', e.message));
});

module.exports = app;
