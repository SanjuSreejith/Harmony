import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Music, ExternalLink, RefreshCw } from 'lucide-react';

export default function SyncedVideoPlayer({
  track,
  initialTime = 0,
  isPlaying = true,
  onTimeUpdate,
  onEnded,
  onSwitchToAudio,
  onPlayStateChange,
  onDurationChange
}) {
  const iframeRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [startSec] = useState(() => (isFinite(initialTime) ? Math.max(0, Math.floor(initialTime)) : 0));
  const currentTimeRef = useRef(isFinite(initialTime) ? Math.max(0, initialTime) : 0);
  const isPlayingRef = useRef(isPlaying);
  const intervalRef = useRef(null);
  const hasSeekedToStartRef = useRef(false);
  const isAdActiveRef = useRef(false);

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

  // Handle Play / Pause prop updates
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    sendCommand(isPlaying ? 'playVideo' : 'pauseVideo');
  }, [isPlaying]);

  // Listen to external toggle events from the app's bottom controls
  useEffect(() => {
    function handleVideoToggle(e) {
      const nextPlay = e.detail;
      isPlayingRef.current = nextPlay;
      sendCommand(nextPlay ? 'playVideo' : 'pauseVideo');
    }
    window.addEventListener('harmoniq:video-toggle', handleVideoToggle);
    return () => window.removeEventListener('harmoniq:video-toggle', handleVideoToggle);
  }, []);

  // Live real-time timeline ticker (polls YouTube & increments smoothly every 500ms)
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        // Query exact YouTube playback position
        sendCommand('getCurrentTime');
        sendCommand('getDuration');

        // Smooth local increment in case postMessage reply is delayed
        currentTimeRef.current = (isFinite(currentTimeRef.current) ? currentTimeRef.current : 0) + 0.5;
        if (onTimeUpdate) {
          onTimeUpdate(currentTimeRef.current);
        }
      }, 500);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, onTimeUpdate]);

  // Listen to postMessage events from YouTube iframe
  useEffect(() => {
    function handleMessage(event) {
      try {
        if (typeof event.data !== 'string') return;
        const data = JSON.parse(event.data);

        const trackExpectedDur = (typeof track?.duration === 'number' && track.duration > 0) ? track.duration : 180;
        const reportedDur = typeof data.info?.duration === 'number' ? data.info.duration : 0;
        const reportedVideoId = data.info?.videoData?.video_id;

        const isAdStarted = Boolean(
          data.event === 'onAdStart' ||
          data.event === 'onAdStateChange' ||
          data.info?.adState === 1 ||
          data.info?.isAdPlaying === true ||
          Boolean(data.info?.adVideoId) ||
          Boolean(data.info?.adTime) ||
          (reportedVideoId && reportedVideoId !== track?.id) ||
          (reportedDur > 0 && reportedDur < 45 && trackExpectedDur > 55)
        );

        const isAdEnded = Boolean(
          data.event === 'onAdEnd' ||
          data.info?.adState === 0 ||
          data.info?.isAdPlaying === false ||
          (reportedVideoId && reportedVideoId === track?.id && reportedDur >= Math.min(trackExpectedDur - 10, 50))
        );

        if (isAdStarted) {
          isAdActiveRef.current = true;
          sendCommand('mute');
          sendCommand('setPlaybackRate', [2]);
          sendCommand('seekTo', [reportedDur > 0 ? reportedDur : 9999, true]);
          sendCommand('skipAd');
          return;
        } else if (isAdEnded) {
          isAdActiveRef.current = false;
          sendCommand('setPlaybackRate', [1]);
          sendCommand('unMute');
        }

        // State changes: 0 = ENDED, 1 = PLAYING, 2 = PAUSED, 3 = BUFFERING
        if (data.event === 'onStateChange') {
          if (data.info === 1) {
            if (isAdActiveRef.current) {
              sendCommand('mute');
              sendCommand('setPlaybackRate', [2]);
              sendCommand('seekTo', [9999, true]);
              return;
            }
            isPlayingRef.current = true;
            if (onPlayStateChange) onPlayStateChange(true);
          } else if (data.info === 2) {
            isPlayingRef.current = false;
            if (onPlayStateChange) onPlayStateChange(false);
          } else if (data.info === 0) {
            if (isAdActiveRef.current) {
              isAdActiveRef.current = false;
              sendCommand('setPlaybackRate', [1]);
              sendCommand('unMute');
              sendCommand('playVideo');
              return;
            }
            if (onEnded) onEnded();
          }
        } else if (data.event === 'initialDelivery') {
          setIsReady(true);
          if (startSec > 0 && !hasSeekedToStartRef.current) {
            sendCommand('seekTo', [startSec, true]);
            hasSeekedToStartRef.current = true;
          }
          if (isPlaying) {
            sendCommand('playVideo');
          }
        } else if (data.event === 'infoDelivery' && data.info) {
          if (data.info.playbackRate && data.info.playbackRate !== 1 && !isAdActiveRef.current) {
            sendCommand('setPlaybackRate', [1]);
          }
          if (typeof data.info.currentTime === 'number' && isFinite(data.info.currentTime) && !isAdActiveRef.current) {
            // Ignore transient 0 time update on initial boot when seeking to startSec > 2
            if (startSec > 2 && !hasSeekedToStartRef.current && data.info.currentTime < 1) {
              return;
            }
            if (data.info.currentTime >= Math.max(0, startSec - 2)) {
              hasSeekedToStartRef.current = true;
            }
            currentTimeRef.current = data.info.currentTime;
            if (onTimeUpdate) onTimeUpdate(data.info.currentTime);
          }
          if (typeof data.info.duration === 'number' && data.info.duration > 45 && isFinite(data.info.duration)) {
            if (onDurationChange) onDurationChange(data.info.duration);
          }
        }
      } catch (err) {}
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onEnded, onTimeUpdate, onPlayStateChange, onDurationChange, isPlaying, track?.id, track?.duration]);

  // Listen to interactive timeline seek requests from MusicScrubber
  useEffect(() => {
    function handleHarmoniqSeek(e) {
      const targetTime = e.detail;
      if (typeof targetTime === 'number' && isFinite(targetTime)) {
        currentTimeRef.current = targetTime;
        sendCommand('seekTo', [targetTime, true]);
        if (onTimeUpdate) onTimeUpdate(targetTime);
      }
    }
    window.addEventListener('harmoniq:seek', handleHarmoniqSeek);
    return () => window.removeEventListener('harmoniq:seek', handleHarmoniqSeek);
  }, [onTimeUpdate]);

  if (!track || !track.id) {
    return (
      <div className="w-full max-w-[390px] aspect-video mx-auto my-auto rounded-3xl overflow-hidden bg-black shadow-2xl border border-white/15 relative flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <span className="text-xs text-slate-400 mt-2 font-medium">Loading video...</span>
      </div>
    );
  }

  const originParam = typeof window !== 'undefined' && window.location.origin ? `&origin=${encodeURIComponent(window.location.origin)}` : '';
  // Stable privacy-enhanced embed URL that never changes while video is playing
  const embedUrl = `https://www.youtube-nocookie.com/embed/${track.id}?enablejsapi=1&autoplay=1&playsinline=1&controls=1&modestbranding=1&rel=0&iv_load_policy=3&start=${startSec}${originParam}`;

  return (
    <div className="w-full max-w-[390px] aspect-video mx-auto my-auto rounded-3xl overflow-hidden bg-black shadow-2xl border border-white/15 relative flex flex-col items-center justify-center">
      {/* Loading Spinner until iframe mounts */}
      {!isReady && (
        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-2 z-10 pointer-events-none">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <span className="text-xs font-medium">Switching to HD Video...</span>
        </div>
      )}

      {/* Synchronized YouTube Iframe Player */}
      <iframe
        ref={iframeRef}
        src={embedUrl}
        title={track.title || 'YouTube Video'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        onLoad={() => {
          setIsReady(true);
          if (startSec > 0 && !hasSeekedToStartRef.current) {
            sendCommand('seekTo', [startSec, true]);
            hasSeekedToStartRef.current = true;
          }
          if (isPlaying) sendCommand('playVideo');
        }}
        onError={() => setLoadError(true)}
        className="w-full h-full border-0 relative z-20"
      />

      {/* Video Mode Status Overlay Badge */}
      <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[10px] text-emerald-400 shadow-md">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>HD Video</span>
        <button
          onClick={onSwitchToAudio}
          className="ml-1 text-slate-300 hover:text-white underline"
          title="Switch to Audio Stream"
        >
          Audio Mode
        </button>
      </div>

      {loadError && (
        <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-4 text-center z-40 space-y-2">
          <p className="text-xs text-red-400 font-bold">Video Embed Restricted</p>
          <p className="text-[11px] text-slate-300">
            This YouTube video cannot be embedded. Switch back to Audio Stream to listen ad-free.
          </p>
          <button
            onClick={onSwitchToAudio}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 text-black text-xs font-bold flex items-center gap-1.5"
          >
            <Music className="w-3.5 h-3.5" />
            <span>Switch to Audio</span>
          </button>
        </div>
      )}
    </div>
  );
}
