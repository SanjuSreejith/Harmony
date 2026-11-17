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
    useDirectPlayer,
    isUserPausedRef
  } = usePlayer();

  const iframeRef = useRef(null);
  const playerReadyRef = useRef(false);
  const ytPlayerStateRef = useRef(-1); // -1 = unstarted, 1 = playing, 2 = paused, 3 = buffering, 0 = ended
  const timerRef = useRef(null);
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
        // When tab is hidden in background, actively ensure playback state is retained
        if (document.hidden && (!isUserPausedRef || !isUserPausedRef.current)) {
          sendCommand('playVideo');
        }
      }, 250);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [shouldBeActive, isPlaying, isUserPausedRef]);

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

        // State changes: -1 = unstarted, 0 = ended, 1 = playing, 2 = paused, 3 = buffering, 5 = cued
        if (data.event === 'onStateChange') {
          ytPlayerStateRef.current = data.info;
          if (data.info === 1) {
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
            } else if (data.info.playerState === 1) {
              setIsLoading(false);
            }
          }

          // If YouTube reports ad state actively playing
          if (data.info.adState === 1 || data.info.isAdPlaying) {
            sendCommand('mute');
            sendCommand('seekTo', [9999, true]);
            setIsLoading(true);
            return;
          }

          if (!isMuted) {
            sendCommand('unMute');
            sendCommand('setVolume', [Math.round((volume || 1.0) * 100)]);
          }

          if (typeof data.info.currentTime === 'number' && isFinite(data.info.currentTime) && data.info.currentTime >= 0) {
            // ONLY accept time updates and un-buffer when YouTube confirms it is actually playing (state 1)!
            // If buffering (3), paused (2), or unstarted (-1), DO NOT advance or un-buffer the slider!
            const isActuallyPlaying = ytPlayerStateRef.current === 1;

            if (isActuallyPlaying) {
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
          if (typeof data.info.duration === 'number' && data.info.duration > 15 && isFinite(data.info.duration)) {
            setDuration(data.info.duration);
          }
        } else if (data.event === 'initialDelivery') {
          playerReadyRef.current = true;
          sendCommand('unMute');
          sendCommand('setVolume', [Math.round((volume || 1.0) * 100)]);
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
  }, [shouldBeActive, handleTrackEnded, isPlaying, isMuted, volume, currentTrack?.duration, isUserPausedRef]);

  // Keep background audio active when tab is minimized, switched, or screen is locked
  useEffect(() => {
    function handleVisibilityChange() {
      if (shouldBeActive && isPlaying && (!isUserPausedRef || !isUserPausedRef.current)) {
        // Prevent browser from throttling or pausing audio upon minimize or tab switch
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
  }, [shouldBeActive, isPlaying, isUserPausedRef]);

  if (!shouldBeActive || !currentTrack) return null;

  const startSec = startSecRef.current || 0;
  const originParam = typeof window !== 'undefined' && window.location.origin ? `&origin=${encodeURIComponent(window.location.origin)}` : '';
  // Standard high-reliability YouTube embed with full JavaScript postMessage API support
  const embedUrl = `https://www.youtube.com/embed/${currentTrack.id}?enablejsapi=1&autoplay=1&playsinline=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&fs=0&disablekb=1&start=${startSec}${originParam}`;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        opacity: 0.015,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden'
      }}
      aria-hidden="true"
    >
      <iframe
        ref={iframeRef}
        key={currentTrack.id}
        src={embedUrl}
        title="Harmoniq Audio Engine"
        allow="autoplay; encrypted-media; clipboard-write; picture-in-picture; web-share"
        importance="high"
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  );
}
