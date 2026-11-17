import { registerPlugin, Capacitor } from '@capacitor/core';

let BackgroundAudioNative = null;
try {
  if (Capacitor.isNativePlatform()) {
    BackgroundAudioNative = registerPlugin('BackgroundAudio');
  }
} catch (e) {
  console.warn('[BackgroundAudio] Native plugin registration error:', e);
}

export function isNativePlatform() {
  return Boolean(Capacitor.isNativePlatform() && BackgroundAudioNative);
}

export async function playNativeStream({ url, title, artist, currentTime = 0, duration = 180, thumbnail = '' }) {
  if (!BackgroundAudioNative) return false;
  try {
    await BackgroundAudioNative.playStream({
      streamUrl: url,
      title: title || 'Harmoniq Music',
      artist: artist || 'Playing in background',
      currentTime: Math.floor(currentTime || 0),
      duration: Math.floor(duration || 180),
      thumbnail: thumbnail || ''
    });
    return true;
  } catch (err) {
    console.error('[BackgroundAudio] playStream error:', err);
    return false;
  }
}

export async function pauseNativeStream() {
  if (!BackgroundAudioNative) return;
  try {
    await BackgroundAudioNative.pause();
  } catch (err) {
    console.warn('[BackgroundAudio] pause error:', err);
  }
}

export async function resumeNativeStream() {
  if (!BackgroundAudioNative) return;
  try {
    await BackgroundAudioNative.resume();
  } catch (err) {
    console.warn('[BackgroundAudio] resume error:', err);
  }
}

export async function seekNativeStream(positionSec) {
  if (!BackgroundAudioNative) return;
  try {
    await BackgroundAudioNative.seek({ position: Math.floor(positionSec) });
  } catch (err) {
    console.warn('[BackgroundAudio] seek error:', err);
  }
}

export async function setNativeVolume(volume) {
  if (!BackgroundAudioNative) return;
  try {
    await BackgroundAudioNative.setVolume({ volume: Number(volume) });
  } catch (err) {
    console.warn('[BackgroundAudio] setVolume error:', err);
  }
}

export function addPlaybackTickListener(callback) {
  if (!BackgroundAudioNative) return null;
  try {
    return BackgroundAudioNative.addListener('playbackTick', (data) => {
      if (callback && data) {
        callback(data.position, data.duration, data.isPlaying);
      }
    });
  } catch (err) {
    return null;
  }
}

export function addPlaybackEndedListener(callback) {
  if (!BackgroundAudioNative) return null;
  try {
    return BackgroundAudioNative.addListener('playbackEnded', () => {
      if (callback) callback();
    });
  } catch (err) {
    return null;
  }
}

export function addPlaybackErrorListener(callback) {
  if (!BackgroundAudioNative) return null;
  try {
    return BackgroundAudioNative.addListener('playbackError', (data) => {
      if (callback) callback(data);
    });
  } catch (err) {
    return null;
  }
}

export async function startBackgroundAudio(title, artist, isPlaying = true, currentTime = 0, duration = 0, thumbnail = '') {
  if (!BackgroundAudioNative) return;
  try {
    await BackgroundAudioNative.start({
      title: title || 'Harmoniq Music',
      artist: artist || 'Playing in background',
      isPlaying: Boolean(isPlaying),
      currentTime: Math.floor(currentTime || 0),
      duration: Math.floor(duration || 0),
      thumbnail: thumbnail || ''
    });
  } catch (err) {
    console.warn('[BackgroundAudio] start error:', err);
  }
}

export async function updateBackgroundPlayback(title, artist, isPlaying, currentTime, duration, thumbnail = '') {
  if (!BackgroundAudioNative) return;
  try {
    await BackgroundAudioNative.updatePlayback({
      title: title || 'Harmoniq Music',
      artist: artist || 'Playing in background',
      isPlaying: Boolean(isPlaying),
      currentTime: Math.floor(currentTime || 0),
      duration: Math.floor(duration || 0),
      thumbnail: thumbnail || ''
    });
  } catch (err) {}
}

export async function stopBackgroundAudio() {
  if (!BackgroundAudioNative) return;
  try {
    await BackgroundAudioNative.stop();
  } catch (err) {
    console.warn('[BackgroundAudio] stop error:', err);
  }
}

export function addMediaActionListener(callback) {
  if (!BackgroundAudioNative) return null;
  try {
    return BackgroundAudioNative.addListener('mediaAction', (data) => {
      if (callback && data && data.action) {
        callback(data.action, data.position);
      }
    });
  } catch (err) {
    console.warn('[BackgroundAudio] addMediaActionListener error:', err);
    return null;
  }
}

export async function checkBackgroundStatus() {
  if (!BackgroundAudioNative) {
    return { isNative: false, notificationsGranted: true, ignoringBattery: true };
  }
  try {
    const status = await BackgroundAudioNative.checkStatus();
    return { isNative: true, ...status };
  } catch (err) {
    return { isNative: true, notificationsGranted: false, ignoringBattery: false };
  }
}

export async function requestNotificationPermission() {
  if (!BackgroundAudioNative) return;
  try {
    await BackgroundAudioNative.requestNotificationPermission();
  } catch (err) {
    console.warn('[BackgroundAudio] requestNotificationPermission error:', err);
  }
}

export async function requestBatteryOptimization() {
  if (!BackgroundAudioNative) return;
  try {
    await BackgroundAudioNative.requestBatteryOptimization();
  } catch (err) {
    console.warn('[BackgroundAudio] requestBatteryOptimization error:', err);
  }
}

export async function openAppSettings() {
  if (!BackgroundAudioNative) return;
  try {
    await BackgroundAudioNative.openAppSettings();
  } catch (err) {
    console.warn('[BackgroundAudio] openAppSettings error:', err);
  }
}
