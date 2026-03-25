import React, { useState, useEffect, useCallback } from 'react';
import { Slide, Slideshow } from '../types';
import * as svc from '../services/slideshowService';

interface SlideshowDisplayProps {
  gymId: string;
}

const POLL_INTERVAL_MS = 30_000; // check for updates every 30 seconds

const SlideshowDisplay: React.FC<SlideshowDisplayProps> = ({ gymId }) => {
  const [slideshow, setSlideshow] = useState<Slideshow | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Load slideshow data
  const loadSlideshow = useCallback(() => {
    const ss = svc.getSlideshowForGym(gymId);
    if (!ss) {
      setError('No slideshow assigned to this location.');
      setSlideshow(null);
      return;
    }
    if (ss.slides.length === 0) {
      setError('Slideshow has no slides yet.');
      setSlideshow(null);
      return;
    }
    // If slideshow was updated, reset to beginning
    if (ss.updatedAt !== lastUpdated) {
      setCurrentIndex(0);
      setLastUpdated(ss.updatedAt);
    }
    setSlideshow(ss);
    setError(null);
  }, [gymId, lastUpdated]);

  // Initial load + polling for changes
  useEffect(() => {
    loadSlideshow();
    const interval = setInterval(loadSlideshow, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadSlideshow]);

  // Auto-advance slides
  useEffect(() => {
    if (!slideshow || slideshow.slides.length === 0) return;

    const currentSlide = slideshow.slides[currentIndex];
    if (!currentSlide) {
      setCurrentIndex(0);
      return;
    }

    const duration = (currentSlide.durationSeconds || 8) * 1000;

    // Fade in
    setFade(true);

    const timer = setTimeout(() => {
      // Fade out before transitioning
      setFade(false);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % slideshow.slides.length);
      }, 500); // fade-out duration
    }, duration - 500);

    return () => clearTimeout(timer);
  }, [currentIndex, slideshow]);

  // Fullscreen on click
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

  return (
    <div
      className="fixed inset-0 bg-black cursor-none select-none"
      onClick={requestFullscreen}
    >
      {/* Slide image - fullscreen */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${fade ? 'opacity-100' : 'opacity-0'}`}
      >
        <img
          src={currentSlide.imageUrl}
          alt={currentSlide.title}
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>

      {/* Optional overlay with slide info */}
      {(currentSlide.title || currentSlide.description) && (
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-8 pt-20 transition-opacity duration-500 ${fade ? 'opacity-100' : 'opacity-0'}`}
        >
          {currentSlide.title && (
            <h2 className="text-white text-3xl font-bold mb-1">{currentSlide.title}</h2>
          )}
          {currentSlide.description && (
            <p className="text-white/80 text-lg">{currentSlide.description}</p>
          )}
        </div>
      )}

      {/* Progress dots */}
      {slideshow.slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {slideshow.slides.map((_, i) => (
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
