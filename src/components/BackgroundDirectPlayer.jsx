import React, { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { usePlayer } from '../context/PlayerContext';

/**
 * BackgroundDirectPlayer
 * Zero-server direct audio engine that streams YouTube audio with zero latency.
 * Eliminates ads completely, synchronizes playback timeline, and keeps audio playing
 * seamlessly on both PC web and Android APK.
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
    useDirectPlayer,
    isUserPausedRef
  } = usePlayer();

  const iframeRef = useRef(null);
  const playerReadyRef = useRef(false);
  const ytPlayerStateRef = useRef(-1); // -1 = unstarted, 1 = playing, 2 = paused, 3 = buffering, 0 = ended
  const isAdActiveRef = useRef(false);
  const timerRef = useRef(null);
  const startSecRef = useRef(0);
  const currentTimeRef = useRef(0);

  const isOfflineTrack = Boolean(isDownloaded && currentTrack && isDownloaded(currentTrack.id));

  // Should this player be active?
  // Only when useDirectPlayer is true, not offline, track exists, and NOT in Video Mode!
  const shouldBeActive = Boolean(useDirectPlayer && currentTrack && !isOfflineTrack && !isVideoMode);

  useEffect(() => {
    // Reset state for new track
    startSecRef.current = 0;
    ytPlayerStateRef.current = -1;
    isAdActiveRef.current = false;
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

  // Smooth live timeline ticker while active (polls time & duration from iframe)
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (shouldBeActive && isPlaying) {
      timerRef.current = setInterval(() => {
        sendCommand('getCurrentTime');
        sendCommand('getDuration');
        // When tab is hidden in background, actively ensure playback state is retained
        if (typeof document !== 'undefined' && document.hidden && (!isUserPausedRef || !isUserPausedRef.current)) {
          if (isAdActiveRef.current) {
            sendCommand('mute');
            sendCommand('setVolume', [0]);
          } else if (!isMuted) {
            sendCommand('unMute');
            sendCommand('setVolume', [Math.round((volume || 1.0) * 100)]);
          }
          sendCommand('playVideo');
        }
      }, 250);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [shouldBeActive, isPlaying, isUserPausedRef, isMuted, volume]);

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
    if (isMuted || isAdActiveRef.current) {
      sendCommand('mute');
      sendCommand('setVolume', [0]);
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

        const trackExpectedDur = (typeof currentTrack?.duration === 'number' && currentTrack.duration > 0) ? currentTrack.duration : 180;
        const reportedDur = typeof data.info?.duration === 'number' ? data.info.duration : 0;
        const reportedVideoId = data.info?.videoData?.video_id;

        // Commercial ad detection criteria:
        // 1. YouTube explicitly indicates an ad via adState === 1, isAdPlaying === true, or adVideoId
        // 2. data.event is 'onAdStart'
        // 3. YouTube reports a video duration that is very short (< 42s) while our track is expected to be > 55s
        // 4. Video ID explicitly reported and does not match our track
        const isAdStarted = Boolean(
          data.event === 'onAdStart' ||
          data.info?.adState === 1 ||
          data.info?.isAdPlaying === true ||
          Boolean(data.info?.adVideoId) ||
          (reportedVideoId && currentTrack?.id && reportedVideoId !== currentTrack.id) ||
          (reportedDur > 0 && reportedDur < 42 && trackExpectedDur > 55)
        );

        // Ad ending criteria:
        const isAdEnded = Boolean(
          data.event === 'onAdEnd' ||
          data.info?.adState === 0 ||
          data.info?.isAdPlaying === false ||
          (reportedDur >= Math.min(trackExpectedDur - 10, 50))
        );

        if (isAdStarted) {
          isAdActiveRef.current = true;
        } else if (isAdEnded) {
          isAdActiveRef.current = false;
        }

        // Active Ad Neutralizer:
        // When an ad is playing, strictly eliminate sound, speed up to 16x rate, seek to the end,
        // send skip commands, and hold the UI locked in loading/buffering state so the scrubber does not advance.
        if (isAdActiveRef.current) {
          sendCommand('mute');
          sendCommand('setVolume', [0]);
          sendCommand('setPlaybackRate', [16]);
          sendCommand('seekTo', [reportedDur > 0 ? reportedDur : 9999, true]);
          sendCommand('skipAd');
          setIsLoading(true);
          return;
        }

        // State changes: -1 = unstarted, 0 = ended, 1 = playing, 2 = paused, 3 = buffering, 5 = cued
        if (data.event === 'onStateChange') {
          ytPlayerStateRef.current = data.info;
          if (data.info === 1) {
            // Real song is playing! Unmute and restore normal speed
            if (!isAdActiveRef.current) {
              sendCommand('setPlaybackRate', [1]);
              if (!isMuted) {
                sendCommand('unMute');
                sendCommand('setVolume', [Math.round((volume || 1.0) * 100)]);
              }
              setIsPlaying(true);
              setIsLoading(false);
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('harmoniq:direct-player-playing', { detail: currentTimeRef.current }));
              }
            }
          } else if (data.info === 2) {
            // Guard against unsolicited pauses caused by browser tab switching or background throttle
            if (isUserPausedRef && !isUserPausedRef.current && isPlaying) {
              sendCommand('playVideo');
              return;
            }
            setIsPlaying(false);
          } else if (data.info === 3 || data.info === -1) {
            setIsLoading(true);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('harmoniq:direct-player-buffering'));
            }
          } else if (data.info === 0) {
            // If an ad just ended, do NOT treat as track ended! Instead transition back to playing the song!
            if (isAdActiveRef.current) {
              isAdActiveRef.current = false;
              sendCommand('setPlaybackRate', [1]);
              if (!isMuted) {
                sendCommand('unMute');
                sendCommand('setVolume', [Math.round((volume || 1.0) * 100)]);
              }
              sendCommand('playVideo');
              return;
            }

            // Guard: Prevent premature skips if song just started
            const currentDur = (typeof currentTrack?.duration === 'number' && currentTrack.duration > 0) ? currentTrack.duration : 180;
            if (currentTimeRef.current < Math.min(currentDur - 5, 20) && currentDur > 30) {
              console.warn('[BackgroundDirectPlayer] Ignored premature track-ended event');
              return;
            }
            console.log('[BackgroundDirectPlayer] Track ended normally, auto-advancing to next song');
            if (typeof handleTrackEnded === 'function') {
              handleTrackEnded();
            }
          }
        } else if (data.event === 'infoDelivery' && data.info) {
          if (typeof data.info.playerState === 'number') {
            ytPlayerStateRef.current = data.info.playerState;
            if (data.info.playerState === 3 || data.info.playerState === -1) {
              setIsLoading(true);
            } else if (data.info.playerState === 1 && !isAdActiveRef.current) {
              setIsLoading(false);
            }
          }

          // If an ad was active and has now ended, restore normal 1x playback speed
          if (data.info.playbackRate && data.info.playbackRate !== 1 && !isAdActiveRef.current) {
            sendCommand('setPlaybackRate', [1]);
          }

          if (!isMuted && !isAdActiveRef.current && ytPlayerStateRef.current === 1) {
            sendCommand('unMute');
            sendCommand('setVolume', [Math.round((volume || 1.0) * 100)]);
          }

          if (typeof data.info.currentTime === 'number' && isFinite(data.info.currentTime) && data.info.currentTime >= 0) {
            const isActuallyPlaying = ytPlayerStateRef.current === 1;
            const isDurValid = reportedDur >= Math.min(trackExpectedDur - 10, 45) || reportedDur === 0;

            if (isActuallyPlaying && isDurValid && !isAdActiveRef.current) {
              currentTimeRef.current = data.info.currentTime;
              setCurrentTime(data.info.currentTime);
              setIsLoading(false);
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('harmoniq:direct-player-playing', { detail: data.info.currentTime }));
              }
            } else if (data.info.currentTime === 0 && !isPlaying) {
              currentTimeRef.current = 0;
              setCurrentTime(0);
            }
          }
          if (typeof data.info.duration === 'number' && data.info.duration > 45 && isFinite(data.info.duration)) {
            setDuration(data.info.duration);
          }
        } else if (data.event === 'initialDelivery') {
          playerReadyRef.current = true;
          if (!isMuted && !isAdActiveRef.current) {
            sendCommand('unMute');
            sendCommand('setVolume', [Math.round((volume || 1.0) * 100)]);
          }
          const target = startSecRef.current || 0;
          if (target > 0) {
            sendCommand('seekTo', [target, true]);
          }
          if (isPlaying && shouldBeActive) sendCommand('playVideo');
        }
      } catch (e) {}
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [shouldBeActive, handleTrackEnded, isPlaying, isMuted, volume, currentTrack?.duration, currentTrack?.id, isUserPausedRef]);

  // Keep background audio active when tab is minimized, switched, or screen is locked
  useEffect(() => {
    function handleVisibilityChange() {
      if (shouldBeActive && isPlaying && (!isUserPausedRef || !isUserPausedRef.current)) {
        if (isAdActiveRef.current) {
          sendCommand('mute');
          sendCommand('setVolume', [0]);
        } else if (!isMuted) {
          sendCommand('unMute');
          sendCommand('setVolume', [Math.round((volume || 1.0) * 100)]);
        }
        sendCommand('playVideo');
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    window.addEventListener('pagehide', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      window.removeEventListener('pagehide', handleVisibilityChange);
    };
  }, [shouldBeActive, isPlaying, isUserPausedRef, isMuted, volume]);

  if (!shouldBeActive || !currentTrack) return null;

  const startSec = startSecRef.current || 0;
  // YouTube origin parameter handling:
  // On native mobile (Capacitor), do NOT pass an artificial origin so YouTube postMessages
  // are broadcasted to wildcard '*' and delivered directly to the WebView window!
  // In standard web browsers, pass window.location.origin for strict security handshake.
  const isCapacitorNative = typeof window !== 'undefined' && (
    Capacitor.isNativePlatform() ||
    window.location.protocol === 'capacitor:' ||
    window.location.origin.includes('capacitor:') ||
    (window.location.hostname === 'localhost' && !window.location.port)
  );
  const originParam = typeof window !== 'undefined' && window.location.origin && !isCapacitorNative
    ? `&origin=${encodeURIComponent(window.location.origin)}`
    : '';

  // Enhanced privacy-enhanced embed domain with unmuted autoplay for immediate audio output
  const embedUrl = `https://www.youtube-nocookie.com/embed/${currentTrack.id}?enablejsapi=1&autoplay=1&playsinline=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&fs=0&disablekb=1&start=${startSec}${originParam}`;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity: 0.005,
        pointerEvents: 'none',
        zIndex: -9999,
        visibility: 'visible',
        overflow: 'hidden'
      }}
      aria-hidden="true"
    >
      <iframe
        ref={iframeRef}
        key={currentTrack.id}
        src={embedUrl}
        title="Harmoniq Audio Engine"
        allow="autoplay *; encrypted-media *; picture-in-picture *; clipboard-write *"
        importance="high"
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  );
}
