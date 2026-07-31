import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as api from '../services/api';
import { getLocalMediaUrl, pruneMediaCache } from '../services/mediaCache';

interface SlideshowDisplayProps {
  token: string;
}

const POLL_INTERVAL_MS = 30_000;
const AUTO_REFRESH_MS = 4 * 60 * 60 * 1000; // Reload page every 4 hours as a safety reset
const VIDEO_START_TIMEOUT_MS = 20_000; // Skip a video that hasn't started playing within 20s

const SlideshowDisplay: React.FC<SlideshowDisplayProps> = ({ token }) => {
  const [slideshow, setSlideshow] = useState<any | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [localUrls, setLocalUrls] = useState<Record<string, string>>({});
  const videoStartedRef = useRef(false);

  useEffect(() => {
    const refreshTimer = setTimeout(() => window.location.reload(), AUTO_REFRESH_MS);
    return () => clearTimeout(refreshTimer);
  }, []);

  // Keep the TV awake. Some smart TVs (notably LG webOS) show a clock
  // screensaver when the browser displays only static images — they treat
  // anything without active video playback as "idle", regardless of the
  // TV's sleep-timer settings. An invisible, continuously playing video
  // convinces the TV that playback is always in progress. A screen wake
  // lock is also requested where the browser supports it.
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        wakeLock = await (navigator as any).wakeLock?.request('screen');
      } catch { /* not supported or not allowed — keepalive video covers it */ }
    };
    requestWakeLock();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const ctx = canvas.getContext('2d');
    const keepalive = document.createElement('video');
    keepalive.muted = true;
    keepalive.setAttribute('playsinline', '');
    keepalive.style.cssText = 'position:fixed;left:-10px;top:-10px;width:2px;height:2px;opacity:0;pointer-events:none';
    let frameTimer: ReturnType<typeof setInterval> | null = null;
    try {
      const stream = (canvas as any).captureStream?.(5);
      if (stream && ctx) {
        (keepalive as any).srcObject = stream;
        document.body.appendChild(keepalive);
        keepalive.play().catch(() => {});
        // Redraw every second so the stream keeps producing frames
        let tick = 0;
        frameTimer = setInterval(() => {
          ctx.fillStyle = tick++ % 2 ? '#000000' : '#010101';
          ctx.fillRect(0, 0, 2, 2);
        }, 1000);
      }
    } catch { /* keepalive is best-effort */ }

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      try { wakeLock?.release?.(); } catch { /* already released */ }
      if (frameTimer) clearInterval(frameTimer);
      keepalive.remove();
    };
  }, []);

  // Download each media file once into local storage; play everything from
  // local copies afterwards (saves hosting bandwidth, especially for videos)
  useEffect(() => {
    if (!slideshow?.slides?.length) return;
    let cancelled = false;
    (async () => {
      const paths = slideshow.slides.map((s: any) => `/${s.image_path}`);
      await pruneMediaCache(paths);
      for (const path of paths) {
        const url = await getLocalMediaUrl(path);
        if (cancelled) return;
        if (url !== path) {
          setLocalUrls(prev => (prev[path] === url ? prev : { ...prev, [path]: url }));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [slideshow?.updated_at]);

  const loadSlideshow = useCallback(async () => {
    const ss = await api.getDisplaySlideshow(token);
    // undefined = network error; keep showing current slideshow and try again next poll
    if (ss === undefined) return;
    if (ss === null) {
      setError('No slideshow assigned to this display.');
      setSlideshow(null);
      return;
    }
    if (!ss.slides || ss.slides.length === 0) {
      setError('Slideshow has no slides yet.');
      setSlideshow(null);
      return;
    }
    if (ss.updated_at !== lastUpdated) {
      setCurrentIndex(0);
      setLastUpdated(ss.updated_at);
    }
    setSlideshow(ss);
    setError(null);
  }, [token, lastUpdated]);

  useEffect(() => {
    loadSlideshow();
    const interval = setInterval(loadSlideshow, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadSlideshow]);

  useEffect(() => {
    if (!slideshow || slideshow.slides.length === 0) return;

    const currentSlide = slideshow.slides[currentIndex];
    if (!currentSlide) {
      setCurrentIndex(0);
      return;
    }

    setFade(true);

    // Videos advance when they finish playing (handled by onEnded), with two
    // backstops so a broken video can't leave the screen black:
    // - if playback hasn't actually started within 20s (unsupported format,
    //   download failure, autoplay blocked), skip to the next slide
    // - absolute cap of 10 minutes in case onEnded never fires
    if (currentSlide.media_type === 'video') {
      videoStartedRef.current = false;
      const startWatchdog = setTimeout(() => {
        if (!videoStartedRef.current) advanceSlide();
      }, VIDEO_START_TIMEOUT_MS);
      const safetyTimer = setTimeout(() => advanceSlide(), 10 * 60 * 1000);
      return () => {
        clearTimeout(startWatchdog);
        clearTimeout(safetyTimer);
      };
    }

    // Images advance after their duration
    const duration = (currentSlide.duration_seconds || 8) * 1000;
    const timer = setTimeout(() => advanceSlide(), duration);
    return () => clearTimeout(timer);
  }, [currentIndex, slideshow]);

  const videoRef = useRef<HTMLVideoElement>(null);

  const advanceSlide = () => {
    setFade(false);
    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % slideshow!.slides.length);
    }, 500);
  };

  const handleVideoError = () => {
    // Video failed to load — skip to next slide instead of getting stuck
    advanceSlide();
  };

  const requestFullscreen = () => {
    document.documentElement.requestFullscreen?.();
  };

  const currentSlide = slideshow?.slides?.[currentIndex] ?? null;

  // Prefer the locally stored copy; fall back to streaming from the server
  // only if the file hasn't finished downloading yet (first boot).
  // The choice is frozen per slide appearance so a download finishing
  // mid-play doesn't swap the source and restart the video.
  const directUrl = currentSlide ? `/${currentSlide.image_path}` : '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mediaUrl = React.useMemo(
    () => (directUrl && localUrls[directUrl]) || directUrl,
    [currentIndex, slideshow]
  );

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center text-white/70">
          <svg className="w-16 h-16 mx-auto mb-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-xl font-light">{error}</p>
          <p className="text-sm text-white/40 mt-2">This display will automatically update when content is available.</p>
        </div>
      </div>
    );
  }

  if (!slideshow) return null;
  if (!currentSlide) return null;

  const isVideoSlide = currentSlide.media_type === 'video';

  return (
    <div
      className="fixed inset-0 bg-black cursor-none select-none"
      onClick={requestFullscreen}
    >
      <div className={`absolute inset-0 transition-opacity duration-500 ${fade ? 'opacity-100' : 'opacity-0'}`}>
        {isVideoSlide ? (
          <video
            ref={videoRef}
            key={currentSlide.id}
            src={mediaUrl}
            className="w-full h-full object-contain"
            autoPlay
            muted
            playsInline
            onEnded={advanceSlide}
            onError={handleVideoError}
            onPlaying={() => { videoStartedRef.current = true; }}
            onTimeUpdate={() => { videoStartedRef.current = true; }}
          />
        ) : (
          <img
            src={mediaUrl}
            alt={currentSlide.title}
            className="w-full h-full object-contain"
            draggable={false}
          />
        )}
      </div>

      {slideshow.slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {slideshow.slides.map((_: any, i: number) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${i === currentIndex ? 'bg-white w-6' : 'bg-white/30'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SlideshowDisplay;
