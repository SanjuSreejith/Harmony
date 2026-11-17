import React, { useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';

/**
 * BackgroundDirectPlayer
 * Seamless zero-server fallback player that streams YouTube audio with zero latency.
 * Only activates when streamUrl fails or server is off.
 * Strictly pauses when user enters Video Mode to prevent dual-audio conflict.
 */
export default function BackgroundDirectPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    volume,
    isMuted,
    handleTrackEnded,
    setCurrentTime,
    setDuration,
    setIsLoading,
    setIsPlaying,
    isDownloaded,
    isVideoMode,
    useDirectPlayer
  } = usePlayer();

  const iframeRef = useRef(null);
  const playerReadyRef = useRef(false);
  const timerRef = useRef(null);
  const startSecRef = useRef(0);

  const isOfflineTrack = Boolean(isDownloaded && currentTrack && isDownloaded(currentTrack.id));

  // Should this player be active?
  // Only when useDirectPlayer is true, not offline, track exists, and NOT in Video Mode!
  const shouldBeActive = Boolean(useDirectPlayer && currentTrack && !isOfflineTrack && !isVideoMode);

  useEffect(() => {
    if (typeof currentTime === 'number' && isFinite(currentTime) && currentTime > 0) {
      startSecRef.current = Math.floor(currentTime);
    }
  }, [currentTrack?.id]);

  function sendCommand(func, args = []) {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func,
            args
          }),
          '*'
        );
      } catch (e) {}
    }
  }

  // Smooth live timeline ticker while active
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (shouldBeActive && isPlaying) {
      timerRef.current = setInterval(() => {
        sendCommand('getCurrentTime');
        sendCommand('getDuration');
      }, 500);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [shouldBeActive, isPlaying]);

  // Handle Play / Pause commands
  useEffect(() => {
    if (!shouldBeActive) {
      sendCommand('pauseVideo');
      return;
    }
    if (isPlaying) {
      sendCommand('playVideo');
    } else {
      sendCommand('pauseVideo');
    }
  }, [isPlaying, shouldBeActive, currentTrack?.id]);

  // Listen to interactive timeline seek requests
  useEffect(() => {
    function onSeekEvent(e) {
      if (!shouldBeActive) return;
      const sec = e.detail;
      if (typeof sec === 'number' && isFinite(sec)) {
        sendCommand('seekTo', [sec, true]);
      }
    }
    window.addEventListener('harmoniq:seek', onSeekEvent);
    return () => window.removeEventListener('harmoniq:seek', onSeekEvent);
  }, [shouldBeActive]);

  // Handle Volume & Mute commands
  useEffect(() => {
    if (!shouldBeActive) return;
    if (isMuted) {
      sendCommand('mute');
    } else {
      sendCommand('unMute');
      sendCommand('setVolume', [Math.round((volume || 1.0) * 100)]);
    }
  }, [volume, isMuted, shouldBeActive]);

  // Listen to messages from YouTube player
  useEffect(() => {
    function handleMessage(event) {
      try {
        let data = event.data;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (err) {
            return;
          }
        }
        if (!data || typeof data !== 'object') return;

        // State changes: 0 = ended, 1 = playing, 2 = paused, 3 = buffering
        if (data.event === 'onStateChange') {
          if (data.info === 1) {
            setIsPlaying(true);
            setIsLoading(false);
          } else if (data.info === 2) {
            setIsPlaying(false);
          } else if (data.info === 3) {
            setIsLoading(true);
          } else if (data.info === 0) {
            console.log('[BackgroundDirectPlayer] Track ended, auto-advancing to next song');
            if (typeof handleTrackEnded === 'function') {
              handleTrackEnded();
            }
          }
        } else if (data.event === 'infoDelivery' && data.info) {
          if (typeof data.info.currentTime === 'number' && isFinite(data.info.currentTime)) {
            setCurrentTime(data.info.currentTime);
          }
          if (typeof data.info.duration === 'number' && data.info.duration > 0 && isFinite(data.info.duration)) {
            setDuration(data.info.duration);
          }
        } else if (data.event === 'initialDelivery') {
          playerReadyRef.current = true;
          setIsLoading(false);
          sendCommand('unMute');
          sendCommand('setVolume', [Math.round((volume || 1.0) * 100)]);
          const target = startSecRef.current || (typeof currentTime === 'number' && isFinite(currentTime) && currentTime > 0 ? Math.floor(currentTime) : 0);
          if (target > 0) {
            sendCommand('seekTo', [target, true]);
          }
          if (isPlaying && shouldBeActive) sendCommand('playVideo');
        }
      } catch (e) {}
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [shouldBeActive, handleTrackEnded, isPlaying]);

  if (!shouldBeActive || !currentTrack) return null;

  const startSec = startSecRef.current || (typeof currentTime === 'number' && isFinite(currentTime) && currentTime > 0 ? Math.floor(currentTime) : 0);
  const originParam = typeof window !== 'undefined' && window.location.origin ? `&origin=${encodeURIComponent(window.location.origin)}` : '';
  const embedUrl = `https://www.youtube.com/embed/${currentTrack.id}?enablejsapi=1&autoplay=1&playsinline=1&controls=0&modestbranding=1&rel=0&start=${startSec}${originParam}`;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: -180,
        right: -180,
        width: 200,
        height: 200,
        opacity: 0.01,
        pointerEvents: 'none',
        zIndex: -10,
        overflow: 'hidden'
      }}
      aria-hidden="true"
    >
      <iframe
        ref={iframeRef}
        key={currentTrack.id}
        src={embedUrl}
        title="Harmoniq Audio Engine"
        allow="autoplay; encrypted-media; clipboard-write; picture-in-picture"
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  );
}
