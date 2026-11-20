// Client API service for Harmoniq - Bulletproof Hybrid Auto-Failover Engine (PC & 24/7 Cloud)
import { Capacitor } from '@capacitor/core';

export const CLOUD_FALLBACK_SERVER = 'https://harmoniq-server-jqpm.onrender.com';
export const PC_WIFI_SERVER = 'http://10.128.89.220:3000';     // Wi-Fi LAN (Active)
export const PC_USB_SERVER = 'http://10.210.177.65:3000';      // USB Tethering (High Speed)
export const PC_HOTSPOT_SERVER = 'http://192.168.137.1:3000';  // Windows Mobile Hotspot
export const PC_LAN_SERVER = PC_WIFI_SERVER;

export const KNOWN_LAN_SERVERS = [
  PC_WIFI_SERVER,
  'http://10.128.89.220:3000',
  PC_USB_SERVER,
  PC_HOTSPOT_SERVER,
  'http://192.168.43.1:3000',  // Android Hotspot Gateway
  'http://192.168.42.1:3000',  // Android USB Gateway
  'http://10.0.2.2:3000'       // Android Emulator
];

export const SERVER_MODES = {
  AUTO: 'auto',
  CLOUD: 'cloud',
  USB: 'usb',
  WIFI: 'wifi',
  CUSTOM: 'custom'
};

// Cache active server in memory & localStorage for instant zero-delay access
let cachedServer = null;
if (typeof localStorage !== 'undefined') {
  try {
    cachedServer = localStorage.getItem('harmoniq_last_working_server') || null;
  } catch (e) {}
}
let lastPingTime = 0;
let isResolving = false;

function isLocalhost() {
  if (typeof window === 'undefined') return true;
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

// Store explicit server mode selection
export function setServerSelection(mode, customUrl = null) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('harmoniq_server_mode', mode);

  if (mode === SERVER_MODES.CLOUD) {
    localStorage.setItem('harmoniq_server_url', CLOUD_FALLBACK_SERVER);
    cachedServer = CLOUD_FALLBACK_SERVER;
  } else if (mode === SERVER_MODES.USB) {
    localStorage.setItem('harmoniq_server_url', PC_USB_SERVER);
    cachedServer = PC_USB_SERVER;
  } else if (mode === SERVER_MODES.WIFI) {
    localStorage.setItem('harmoniq_server_url', PC_WIFI_SERVER);
    cachedServer = PC_WIFI_SERVER;
  } else if (mode === SERVER_MODES.CUSTOM && customUrl && customUrl.trim()) {
    const clean = customUrl.trim().replace(/\/$/, '');
    localStorage.setItem('harmoniq_server_url', clean);
    cachedServer = clean;
  } else {
    // Auto mode: clear fixed URL override so auto-switch operates
    localStorage.removeItem('harmoniq_server_url');
    cachedServer = null;
  }
  lastPingTime = 0;
}

export function getServerSelection() {
  if (typeof localStorage === 'undefined') {
    return { mode: SERVER_MODES.AUTO, url: CLOUD_FALLBACK_SERVER };
  }
  const mode = localStorage.getItem('harmoniq_server_mode') || SERVER_MODES.AUTO;
  const url = localStorage.getItem('harmoniq_server_url') || '';
  return { mode, url };
}

// Ping a specific server endpoint (PC or Cloud) with responsive timeout
export async function pingServer(url, timeoutMs = 2500) {
  if (!url || typeof url !== 'string') return null;
  const cleanUrl = url.trim().replace(/\/$/, '');
  const isCloud = cleanUrl.includes('onrender.com') || cleanUrl.startsWith('https://');
  const pingEndpoint = isCloud ? `${cleanUrl}/` : `${cleanUrl}/api/ping`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const start = Date.now();
    const res = await fetch(pingEndpoint, { signal: controller.signal, mode: 'cors' });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json().catch(() => null);
      return {
        url: cleanUrl,
        latency: Date.now() - start,
        isCloud,
        isPc: !isCloud,
        server: isCloud ? '24/7 Cloud (Render)' : (data?.server || 'Harmoniq PC Server')
      };
    }
  } catch (e) {
    // If /api/ping failed on a PC LAN endpoint, try root '/' endpoint as fallback
    if (!isCloud) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 1200);
        const start = Date.now();
        const res = await fetch(`${cleanUrl}/`, { signal: controller.signal, mode: 'cors' });
        clearTimeout(timer);
        if (res.ok) {
          return {
            url: cleanUrl,
            latency: Date.now() - start,
            isCloud: false,
            isPc: true,
            server: 'Harmoniq PC Server'
          };
        }
      } catch (err) {}
    }
  }
  return null;
}

// Test connection to the PC server or Cloud server (used in Settings and verification)
export async function testServerConnection(targetUrl = null) {
  // If targetUrl provided explicitly
  if (targetUrl && typeof targetUrl === 'string' && targetUrl.trim()) {
    const clean = targetUrl.trim().replace(/\/$/, '');
    const isCloudTarget = clean.includes('onrender.com') || clean.startsWith('https://');
    const result = await pingServer(clean, isCloudTarget ? 4500 : 2500);
    if (result) {
      cachedServer = clean;
      lastPingTime = Date.now();
      return {
        isConnected: true,
        url: clean,
        latency: result.latency,
        isCloud: result.isCloud,
        isPc: result.isPc,
        label: result.server
      };
    }
    return {
      isConnected: false,
      url: clean,
      latency: null,
      isCloud: isCloudTarget,
      isPc: !isCloudTarget,
      label: isCloudTarget ? '24/7 Cloud (Render)' : 'PC Server'
    };
  }

  // Active / Auto resolution test
  const srv = await resolveServer(true);
  const isCloud = srv.includes('onrender.com') || srv.startsWith('https://');
  const ping = await pingServer(srv, isCloud ? 4500 : 2500);
  if (ping) {
    return {
      isConnected: true,
      url: srv,
      latency: ping.latency,
      isCloud: ping.isCloud,
      isPc: ping.isPc,
      label: ping.server
    };
  }
  return {
    isConnected: false,
    url: srv || CLOUD_FALLBACK_SERVER,
    latency: null,
    isCloud,
    isPc: !isCloud,
    label: isCloud ? '24/7 Cloud (Render)' : 'PC Server'
  };
}

export async function resolveServer(force = false) {
  const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

  // If in web browser on localhost / port 3000, always use the local PC server directly with 0ms delay
  if (typeof window !== 'undefined' && !isNative && (isLocalhost() || window.location.port === '3000')) {
    cachedServer = '';
    return '';
  }

  // If in web browser on HTTPS (like GitHub Pages https://sanjusreejith.github.io/Harmony/),
  // browsers strictly block http:// LAN requests as Mixed Content. Use 24/7 Cloud server directly.
  if (typeof window !== 'undefined' && !isNative && window.location.protocol === 'https:') {
    cachedServer = CLOUD_FALLBACK_SERVER;
    return CLOUD_FALLBACK_SERVER;
  }

  const selection = getServerSelection();
  const now = Date.now();

  // 1. Explicit Cloud mode selected by user (plays anywhere)
  if (selection.mode === SERVER_MODES.CLOUD) {
    cachedServer = CLOUD_FALLBACK_SERVER;
    return CLOUD_FALLBACK_SERVER;
  }

  // 2. Explicit USB mode selected by user
  if (selection.mode === SERVER_MODES.USB) {
    if (!force && cachedServer === PC_USB_SERVER && (now - lastPingTime < 30000)) {
      return PC_USB_SERVER;
    }
    const ping = await pingServer(PC_USB_SERVER, 2000);
    if (ping) {
      cachedServer = PC_USB_SERVER;
      lastPingTime = now;
      return PC_USB_SERVER;
    }
    // Failover to Cloud so playback never fails
    return CLOUD_FALLBACK_SERVER;
  }

  // 3. Explicit Wi-Fi mode selected by user
  if (selection.mode === SERVER_MODES.WIFI) {
    if (!force && cachedServer === PC_WIFI_SERVER && (now - lastPingTime < 30000)) {
      return PC_WIFI_SERVER;
    }
    const ping = await pingServer(PC_WIFI_SERVER, 2000);
    if (ping) {
      cachedServer = PC_WIFI_SERVER;
      lastPingTime = now;
      return PC_WIFI_SERVER;
    }
    return CLOUD_FALLBACK_SERVER;
  }

  // 4. Custom URL set by user
  if (selection.mode === SERVER_MODES.CUSTOM && selection.url) {
    if (!force && cachedServer === selection.url && (now - lastPingTime < 30000)) {
      return selection.url;
    }
    const ping = await pingServer(selection.url, 2500);
    if (ping) {
      cachedServer = selection.url;
      lastPingTime = now;
      return selection.url;
    }
    return CLOUD_FALLBACK_SERVER;
  }

  // 5. AUTO Mode (Default):
  // Checks cached server if valid (5 mins for Cloud fallback, 3 mins for PC)
  const cacheTtl = cachedServer === CLOUD_FALLBACK_SERVER ? 300000 : 180000;
  if (!force && cachedServer && (now - lastPingTime < cacheTtl)) {
    return cachedServer;
  }

  if (isResolving) return cachedServer || (isNative ? PC_WIFI_SERVER : CLOUD_FALLBACK_SERVER);
  isResolving = true;

  // Probe PC endpoints in parallel with responsive 1200ms timeout
  try {
    const lanEndpoints = [PC_WIFI_SERVER, 'http://10.128.89.220:3000', PC_USB_SERVER, PC_HOTSPOT_SERVER];
    const pingPromises = lanEndpoints.map(srv => pingServer(srv, 1200));
    const results = await Promise.all(pingPromises);
    const valid = results.filter(Boolean);
    if (valid.length > 0) {
      valid.sort((a, b) => a.latency - b.latency);
      const winningLocal = valid[0].url;
      cachedServer = winningLocal;
      lastPingTime = now;
      try { localStorage.setItem('harmoniq_last_working_server', winningLocal); } catch (e) {}
      isResolving = false;
      return winningLocal;
    }
  } catch (e) {}

  // If PC is offline or unpingable, seamless 24/7 Cloud failover!
  cachedServer = CLOUD_FALLBACK_SERVER;
  lastPingTime = now;
  try { localStorage.setItem('harmoniq_last_working_server', CLOUD_FALLBACK_SERVER); } catch (e) {}
  isResolving = false;
  return CLOUD_FALLBACK_SERVER;
}

// Background auto-resolve on startup
if (typeof window !== 'undefined') {
  resolveServer().catch(() => {});
}

export async function getApiBase() {
  const base = await resolveServer();
  return base ? `${base}/api` : '/api';
}

export function getServerUrl() {
  const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();
  if (typeof window !== 'undefined' && !isNative && (isLocalhost() || window.location.port === '3000')) {
    return '';
  }
  if (typeof window !== 'undefined' && !isNative && window.location.protocol === 'https:') {
    return CLOUD_FALLBACK_SERVER;
  }
  const selection = getServerSelection();
  if (selection.mode === SERVER_MODES.CLOUD) return CLOUD_FALLBACK_SERVER;
  if (selection.mode === SERVER_MODES.USB) return PC_USB_SERVER;
  if (selection.mode === SERVER_MODES.WIFI) return PC_WIFI_SERVER;
  if (selection.mode === SERVER_MODES.CUSTOM && selection.url) return selection.url;
  return (cachedServer !== null && cachedServer !== undefined) ? cachedServer : (isNative ? PC_WIFI_SERVER : CLOUD_FALLBACK_SERVER);
}

export function setServerUrl(url) {
  if (!url || !url.trim()) {
    setServerSelection(SERVER_MODES.AUTO);
  } else {
    setServerSelection(SERVER_MODES.CUSTOM, url);
  }
}

export function getFallbackStreamUrl(videoId, quality = 'best') {
  const current = getServerUrl();
  const fallback = current.includes(CLOUD_FALLBACK_SERVER) ? PC_WIFI_SERVER : CLOUD_FALLBACK_SERVER;
  cachedServer = fallback;
  return `${fallback}/api/stream/${videoId}?quality=${quality}`;
}

// High-speed persistent client cache for instant UI rendering (sub-10ms)
function getLocalCache(key, maxAgeMs = 1000 * 60 * 60 * 2) {
  try {
    const raw = localStorage.getItem('hq_cache_' + key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > maxAgeMs) {
      localStorage.removeItem('hq_cache_' + key);
      return null;
    }
    return data;
  } catch (e) {
    return null;
  }
}

function setLocalCache(key, data) {
  try {
    localStorage.setItem('hq_cache_' + key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {}
}

export async function getRecommendations(context = {}) {
  const cacheKey = `recs_${context.activeLanguage || 'all'}_${context.mood || 'Chill'}`;
  const local = getLocalCache(cacheKey, 1000 * 60 * 20);

  const fetchPromise = (async () => {
    try {
      const apiBase = await getApiBase();
      const res = await fetch(`${apiBase}/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context)
      });
      if (res.ok) {
        const data = await res.json();
        setLocalCache(cacheKey, data);
        return data;
      }
    } catch (e) {
      console.warn('Network recs fetch failed:', e);
    }
    return local || null;
  })();

  if (local) {
    fetchPromise.catch(() => {});
    return local;
  }

  return await fetchPromise;
}

export async function searchTracks(query) {
  if (!query || !query.trim()) return [];
  const cacheKey = 'search_' + query.trim().toLowerCase();
  const local = getLocalCache(cacheKey, 1000 * 60 * 30);
  if (local) return local;

  try {
    const apiBase = await getApiBase();
    const res = await fetch(`${apiBase}/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    const results = data.results || [];
    setLocalCache(cacheKey, results);
    return results;
  } catch (e) {
    console.error('Search error:', e);
    return [];
  }
}

export async function getTrendingTracks(genre = 'trending', language = '') {
  const cacheKey = `trending_${genre}_${language}`;
  const local = getLocalCache(cacheKey, 1000 * 60 * 60);

  const fetchPromise = (async () => {
    try {
      const apiBase = await getApiBase();
      let url = `${apiBase}/trending?genre=${encodeURIComponent(genre)}`;
      if (language) url += `&lang=${encodeURIComponent(language)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const results = data.results || [];
        setLocalCache(cacheKey, results);
        return results;
      }
    } catch (e) {}
    return local || [];
  })();

  if (local) {
    fetchPromise.catch(() => {});
    return local;
  }

  return await fetchPromise;
}

export async function prewarmTrack(videoId, quality = 'best') {
  if (!videoId) return;
  try {
    const apiBase = await getApiBase();
    fetch(`${apiBase}/prewarm/${videoId}?quality=${quality}`).catch(() => {});
  } catch (e) {}
}

export async function getRelatedTracks(videoId) {
  if (!videoId) return [];
  try {
    const apiBase = await getApiBase();
    const res = await fetch(`${apiBase}/related/${videoId}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch (e) {
    console.error('Related tracks error:', e);
    return [];
  }
}

export async function getLyrics(title, artist) {
  if (!title) return null;
  try {
    const apiBase = await getApiBase();
    const res = await fetch(`${apiBase}/lyrics?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist || '')}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('Lyrics error:', e);
    return null;
  }
}

export async function getTrackDetails(videoId) {
  if (!videoId) return null;
  try {
    const apiBase = await getApiBase();
    const res = await fetch(`${apiBase}/track-details/${videoId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('Track details error:', e);
    return null;
  }
}

export async function getDirectAudioStreamUrl(videoId, quality = 'best') {
  return getPlayableAudioStreamUrl(videoId, quality);
}

export const searchMusic = searchTracks;

export async function getPlayableAudioStreamUrl(videoId, quality = 'best') {
  if (!videoId) return null;

  const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

  // In web browser on localhost when PC server is active, stream relative immediately for 0ms delay
  if (typeof window !== 'undefined' && !isNative && (isLocalhost() || window.location.port === '3000')) {
    return `/api/stream/${videoId}?quality=${quality}`;
  }

  const selection = getServerSelection();

  // If Cloud mode is selected, direct to Cloud stream
  if (selection.mode === SERVER_MODES.CLOUD) {
    return `${CLOUD_FALLBACK_SERVER}/api/stream/${videoId}?quality=${quality}`;
  }

  // Never make playback wait for the LAN server scan. Resolve the best server in
  // the background, while starting against the last known server (or cloud).
  const base = getServerUrl() || CLOUD_FALLBACK_SERVER;

  // Return proxy stream URL (Streamed by Node.js with HTTP 206 Partial Content)
  // Guarantees zero 403 Forbidden IP mismatch errors on PC and Cloud!
  return `${base}/api/stream/${videoId}?quality=${quality}`;
}

export function getAudioStreamUrl(videoId, quality = 'best') {
  const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();
  if (typeof window !== 'undefined' && !isNative && isLocalhost()) {
    return `/api/stream/${videoId}?quality=${quality}`;
  }
  const base = getServerUrl();
  return `${base}/api/stream/${videoId}?quality=${quality}`;
}

export function getVideoStreamUrl(videoId) {
  const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();
  if (typeof window !== 'undefined' && !isNative && isLocalhost()) {
    return `/api/stream/video/${videoId}`;
  }
  const base = getServerUrl();
  return `${base}/api/stream/video/${videoId}`;
}
