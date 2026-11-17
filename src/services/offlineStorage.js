import { get, set, del, keys } from 'idb-keyval';
import { getAudioStreamUrl } from './api';

const INDEX_KEY = 'musicit_offline_index';

// Get list of all downloaded track metadata
export async function getOfflineTracks() {
  try {
    const list = await get(INDEX_KEY);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.error('Failed to get offline tracks:', e);
    return [];
  }
}

// Check if a track is downloaded
export async function isTrackDownloaded(trackId) {
  try {
    const tracks = await getOfflineTracks();
    return tracks.some(t => t.id === trackId);
  } catch {
    return false;
  }
}

// Download a track for offline playback
export async function downloadTrackOffline(track, onProgress = null) {
  if (!track || !track.id) throw new Error('Invalid track');

  try {
    // 1. Fetch the audio stream
    const audioUrl = getAudioStreamUrl(track.id);
    const response = await fetch(audioUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch audio stream: ${response.status}`);
    }

    const blob = await response.blob();

    // 2. Store audio blob under dedicated key
    const blobKey = `musicit_blob_${track.id}`;
    await set(blobKey, blob);

    // 3. Update index list
    const tracks = await getOfflineTracks();
    const existingIdx = tracks.findIndex(t => t.id === track.id);
    const meta = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      durationStr: track.durationStr,
      thumbnail: track.thumbnail,
      size: blob.size,
      downloadedAt: Date.now()
    };

    if (existingIdx >= 0) {
      tracks[existingIdx] = meta;
    } else {
      tracks.unshift(meta);
    }

    await set(INDEX_KEY, tracks);
    return meta;
  } catch (err) {
    console.error(`Failed to download track ${track.id}:`, err);
    throw err;
  }
}

// Get the offline playback URL for a track
export async function getOfflineTrackBlobUrl(trackId) {
  try {
    const blobKey = `musicit_blob_${trackId}`;
    const blob = await get(blobKey);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error('Failed to get offline blob URL:', err);
    return null;
  }
}

// Delete an offline track
export async function deleteOfflineTrack(trackId) {
  try {
    const blobKey = `musicit_blob_${trackId}`;
    await del(blobKey);

    const tracks = await getOfflineTracks();
    const filtered = tracks.filter(t => t.id !== trackId);
    await set(INDEX_KEY, filtered);
    return true;
  } catch (err) {
    console.error('Failed to delete offline track:', err);
    return false;
  }
}

// Clear all offline storage
export async function clearAllOfflineTracks() {
  try {
    const tracks = await getOfflineTracks();
    for (const t of tracks) {
      await del(`musicit_blob_${t.id}`);
    }
    await del(INDEX_KEY);
    return true;
  } catch (err) {
    console.error('Failed to clear offline tracks:', err);
    return false;
  }
}

// Calculate total downloaded size in MB
export async function getTotalOfflineSize() {
  try {
    const tracks = await getOfflineTracks();
    const totalBytes = tracks.reduce((sum, t) => sum + (t.size || 0), 0);
    return (totalBytes / (1024 * 1024)).toFixed(1); // MB
  } catch {
    return '0.0';
  }
}
