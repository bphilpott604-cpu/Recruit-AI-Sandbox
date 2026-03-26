import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';

interface SlideshowDisplayProps {
  token: string;
}

const POLL_INTERVAL_MS = 30_000;

const SlideshowDisplay: React.FC<SlideshowDisplayProps> = ({ token }) => {
  const [slideshow, setSlideshow] = useState<any | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const loadSlideshow = useCallback(async () => {
    const ss = await api.getDisplaySlideshow(token);
    if (!ss) {
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

    const duration = (currentSlide.duration_seconds || 8) * 1000;
    setFade(true);

    const timer = setTimeout(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % slideshow.slides.length);
      }, 500);
    }, duration - 500);

    return () => clearTimeout(timer);
  }, [currentIndex, slideshow]);

  const requestFullscreen = () => {
    document.documentElement.requestFullscreen?.();
  };

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

  const currentSlide = slideshow.slides[currentIndex];
  if (!currentSlide) return null;

  const imageUrl = `/${currentSlide.image_path}`;

  return (
    <div
      className="fixed inset-0 bg-black cursor-none select-none"
      onClick={requestFullscreen}
    >
      <div className={`absolute inset-0 transition-opacity duration-500 ${fade ? 'opacity-100' : 'opacity-0'}`}>
        <img
          src={imageUrl}
          alt={currentSlide.title}
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>

      {(currentSlide.title || currentSlide.description) && (
        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-8 pt-20 transition-opacity duration-500 ${fade ? 'opacity-100' : 'opacity-0'}`}>
          {currentSlide.title && (
            <h2 className="text-white text-3xl font-bold mb-1">{currentSlide.title}</h2>
          )}
          {currentSlide.description && (
            <p className="text-white/80 text-lg">{currentSlide.description}</p>
          )}
        </div>
      )}

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
