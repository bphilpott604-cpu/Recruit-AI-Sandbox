
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import SlideshowManager from './components/SlideshowManager';
import SlideshowDisplay from './components/SlideshowDisplay';
import LoginScreen from './components/LoginScreen';
import { checkAuth } from './services/api';

type Route =
  | { page: 'home' }
  | { page: 'slideshow-manager' }
  | { page: 'display'; token: string };

function parseHash(): Route {
  const hash = window.location.hash;

  if (hash.startsWith('#/slideshow-manager')) {
    return { page: 'slideshow-manager' };
  }

  const displayMatch = hash.match(/^#\/display\/(.+)$/);
  if (displayMatch) {
    return { page: 'display', token: displayMatch[1] };
  }

  return { page: 'home' };
}

const Router: React.FC = () => {
  const [route, setRoute] = useState<Route>(parseHash);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Listen for auth expiry events from the API layer
  useEffect(() => {
    const onExpired = () => setAuthenticated(false);
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  // Check auth on mount for protected pages
  useEffect(() => {
    if (route.page === 'slideshow-manager') {
      checkAuth().then(setAuthenticated).catch(() => setAuthenticated(false));
    }
  }, [route.page]);

  // TV Display — public, no auth needed
  if (route.page === 'display') {
    return <SlideshowDisplay token={route.token} />;
  }

  // Slideshow Manager — requires auth
  if (route.page === 'slideshow-manager') {
    if (authenticated === null) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-slate-400">Loading...</div>
        </div>
      );
    }
    if (!authenticated) {
      return <LoginScreen onLogin={() => setAuthenticated(true)} />;
    }
    return <SlideshowManager onLogout={() => setAuthenticated(false)} />;
  }

  // Home — original app
  return <App />;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
