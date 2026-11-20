import React, { useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';

/**
 * BackgroundDirectPlayer
 * Fallback player used when the app's direct audio stream is unavailable.
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
    useDirectPlayer,
    isUserPausedRef
  } = usePlayer();

  const iframeRef = useRef(null);
  const playerReadyRef = useRef(false);
  const ytPlayerStateRef = useRef(-1); // -1 = unstarted, 1 = playing, 2 = paused, 3 = buffering, 0 = ended
  const isAdActiveRef = useRef(false);
  const confirmedVideoIdRef = useRef(null);
  const startSecRef = useRef(0);
  const currentTimeRef = useRef(0);

  const isOfflineTrack = Boolean(isDownloaded && currentTrack && isDownloaded(currentTrack.id));

  // Should this player be active?
  // Only when useDirectPlayer is true, not offline, track exists, and NOT in Video Mode!
  const shouldBeActive = Boolean(useDirectPlayer && currentTrack && !isOfflineTrack && !isVideoMode);

  useEffect(() => {
    // ALWAYS reset start position to 0 when a new song is loaded so it never starts at 4:00
    startSecRef.current = 0;
    ytPlayerStateRef.current = -1;
    isAdActiveRef.current = false;
    confirmedVideoIdRef.current = null;
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

        // If YouTube explicitly reports the video ID, check if it matches our track
        if (reportedVideoId) {
          if (reportedVideoId === currentTrack?.id) {
            confirmedVideoIdRef.current = reportedVideoId;
          } else {
            // Video ID mismatch: an advertisement video is playing!
            isAdActiveRef.current = true;
          }
        }

        // Commercial ad detection criteria:
        // 1. YouTube explicitly indicates an ad via adState === 1, isAdPlaying === true, adVideoId, or adTime
        // 2. data.event is 'onAdStart' or 'onAdStateChange'
        // 3. YouTube is playing a video whose video_id doesn't match our track ID
        // 4. YouTube reports a video duration that is very short (< 45s) while our track is expected to be > 55s
        const isAdStarted = Boolean(
          data.event === 'onAdStart' ||
          data.event === 'onAdStateChange' ||
          data.info?.adState === 1 ||
          data.info?.isAdPlaying === true ||
          Boolean(data.info?.adVideoId) ||
          Boolean(data.info?.adTime) ||
          (reportedVideoId && reportedVideoId !== currentTrack?.id) ||
          (reportedDur > 0 && reportedDur < 45 && trackExpectedDur > 55)
        );

        // Ad ending criteria:
        const isAdEnded = Boolean(
          data.event === 'onAdEnd' ||
          data.info?.adState === 0 ||
          data.info?.isAdPlaying === false ||
          (reportedVideoId && reportedVideoId === currentTrack?.id && reportedDur >= Math.min(trackExpectedDur - 10, 50))
        );

        if (isAdStarted) {
          isAdActiveRef.current = true;
        } else if (isAdEnded && (confirmedVideoIdRef.current === currentTrack?.id || !reportedVideoId)) {
          isAdActiveRef.current = false;
        }

        // Active Ad Neutralizer:
        // When an ad is playing, strictly eliminate sound, speed up to 2x rate, seek to the end,
        // send skip commands, and hold the UI locked in loading/buffering state so the scrubber does not advance.
        if (isAdActiveRef.current) {
          sendCommand('mute');
          sendCommand('setVolume', [0]);
          sendCommand('setPlaybackRate', [2]);
          sendCommand('seekTo', [reportedDur > 0 ? reportedDur : 9999, true]);
          sendCommand('skipAd');
          setIsLoading(true);
          return; // Strictly abort any processing of time updates or unmuting!
        }

        // State changes: -1 = unstarted, 0 = ended, 1 = playing, 2 = paused, 3 = buffering, 5 = cued
        if (data.event === 'onStateChange') {
          ytPlayerStateRef.current = data.info;
          if (data.info === 1) {
            // If ad is actively playing, keep muted and locked!
            if (isAdActiveRef.current) {
              sendCommand('mute');
              sendCommand('setVolume', [0]);
              sendCommand('setPlaybackRate', [2]);
              sendCommand('seekTo', [9999, true]);
              sendCommand('skipAd');
              setIsLoading(true);
              return;
            }
            // Only unmute if verified not an ad
            const isConfirmedTrack = confirmedVideoIdRef.current === currentTrack?.id || confirmedVideoIdRef.current === null;
            if (!isMuted && isConfirmedTrack && !isAdActiveRef.current) {
              sendCommand('unMute');
              sendCommand('setVolume', [Math.round((volume || 1.0) * 100)]);
              sendCommand('setPlaybackRate', [1]);
            }
            setIsPlaying(true);
            setIsLoading(false);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('harmoniq:direct-player-playing', { detail: currentTimeRef.current }));
            }
          } else if (data.info === 2) {
            // Guard against unsolicited pauses caused by browser tab switching or background throttle
            if (isUserPausedRef && !isUserPausedRef.current && isPlaying) {
              console.log('[BackgroundDirectPlayer] Background tab unsolicited pause ignored. Keeping playback alive!');
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
              console.log('[BackgroundDirectPlayer] Ad ended, returning to normal playback');
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
          // If YouTube reports playerState in infoDelivery
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

          // Real song confirmed playback check:
          const isRealSongPlaying = ytPlayerStateRef.current === 1 && !isAdActiveRef.current && (
            confirmedVideoIdRef.current === currentTrack?.id ||
            (typeof data.info.currentTime === 'number' && data.info.currentTime > 0.5) ||
            reportedDur >= Math.min(trackExpectedDur - 10, 45)
          );

          if (!isMuted && isRealSongPlaying) {
            sendCommand('unMute');
            sendCommand('setVolume', [Math.round((volume || 1.0) * 100)]);
            sendCommand('setPlaybackRate', [1]);
          }

          if (typeof data.info.currentTime === 'number' && isFinite(data.info.currentTime) && data.info.currentTime >= 0) {
            // ONLY accept time updates and un-buffer when YouTube confirms it is actually playing the real song (state 1)!
            // If buffering (3), paused (2), unstarted (-1), or ad active, DO NOT advance or un-buffer the slider!
            const isActuallyPlaying = ytPlayerStateRef.current === 1;
            const isDurValid = reportedDur >= Math.min(trackExpectedDur - 10, 45) || reportedDur === 0;

            if (isActuallyPlaying && isDurValid && !isAdActiveRef.current && (confirmedVideoIdRef.current === currentTrack?.id || !reportedVideoId)) {
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
          const target = startSecRef.current || 0;
          if (target > 0) {
            sendCommand('seekTo', [target, true]);
          }
          // Start MUTED so pre-roll ads produce ZERO sound!
          sendCommand('mute');
          sendCommand('setVolume', [0]);
          if (isPlaying && shouldBeActive) sendCommand('playVideo');
        }
      } catch (e) {}
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [shouldBeActive, handleTrackEnded, isPlaying, isMuted, volume, currentTrack?.duration, currentTrack?.id, isUserPausedRef]);

  // Recover the embedded player when returning to the page. Do not issue commands
  // while it is hidden or closing; browsers may throttle or discard those messages.
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && shouldBeActive && isPlaying && (!isUserPausedRef || !isUserPausedRef.current)) {
        if (isAdActiveRef.current) {
          sendCommand('mute');
          sendCommand('setVolume', [0]);
        } else if (!isMuted) {
          // Re-unmute when returning to tab in case Chrome auto-muted the iframe
          sendCommand('unMute');
          sendCommand('setVolume', [Math.round((volume || 1.0) * 100)]);
        }
        sendCommand('playVideo');
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [shouldBeActive, isPlaying, isUserPausedRef, isMuted, volume]);

  if (!shouldBeActive || !currentTrack) return null;

  const startSec = startSecRef.current || 0;
  // YouTube embed policy: origin=localhost or capacitor:// triggers error 150/101.
  // When running on native mobile (Capacitor/localhost), use the production web origin for authorized embed handshake.
  const isLocalOrCapacitor = typeof window !== 'undefined' && (!window.location.origin || window.location.origin.includes('localhost') || window.location.origin.includes('capacitor:'));
  const originBase = isLocalOrCapacitor ? 'https://sanjusreejith.github.io' : window.location.origin;
  const originParam = `&origin=${encodeURIComponent(originBase)}`;
  const widgetReferrer = `&widget_referrer=${encodeURIComponent(originBase)}`;
  // Privacy-enhanced embed domain with pre-muted autoplay for instant ad suppression
  const embedUrl = `https://www.youtube-nocookie.com/embed/${currentTrack.id}?enablejsapi=1&autoplay=1&mute=1&playsinline=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&fs=0&disablekb=1&start=${startSec}${originParam}${widgetReferrer}`;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        width: '1px',
        height: '1px',
        opacity: 0.01,
        pointerEvents: 'none',
        zIndex: -1,
        overflow: 'hidden'
      }}
      aria-hidden="true"
    >
      <iframe
        ref={iframeRef}
        key={currentTrack.id}
        src={embedUrl}
        title="Harmoniq Audio Engine"
        allow="autoplay; encrypted-media; picture-in-picture; clipboard-write"
        importance="high"
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  );
}
