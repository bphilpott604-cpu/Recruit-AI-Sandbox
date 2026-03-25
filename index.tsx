
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import SlideshowManager from './components/SlideshowManager';
import SlideshowDisplay from './components/SlideshowDisplay';

type Route =
  | { page: 'home' }
  | { page: 'slideshow-manager' }
  | { page: 'display'; gymId: string };

function parseHash(): Route {
  const hash = window.location.hash;

  if (hash.startsWith('#/slideshow-manager')) {
    return { page: 'slideshow-manager' };
  }

  const displayMatch = hash.match(/^#\/display\/(.+)$/);
  if (displayMatch) {
    return { page: 'display', gymId: displayMatch[1] };
  }

  return { page: 'home' };
}

const Router: React.FC = () => {
  const [route, setRoute] = useState<Route>(parseHash);

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  switch (route.page) {
    case 'slideshow-manager':
      return <SlideshowManager />;
    case 'display':
      return <SlideshowDisplay gymId={route.gymId} />;
    case 'home':
    default:
      return <App />;
  }
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
