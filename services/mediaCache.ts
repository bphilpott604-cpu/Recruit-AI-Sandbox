// Local media store for the TV display.
//
// Browsers cache images well, but stream videos in ranged chunks that often
// bypass the HTTP cache — so a looping video can re-download from the server
// on every rotation, which burns through hosting bandwidth. This module
// downloads each media file once, stores it in the browser's Cache API
// (persistent, survives page reloads), and hands back a local blob: URL that
// plays with zero network traffic.

const CACHE_NAME = 'slideshow-media-v1';

// path -> blob object URL for files already materialized this page-load
const objectUrls = new Map<string, string>();

/**
 * Return a local URL for a media file, downloading and storing it on first use.
 * Falls back to the network path if local storage isn't available.
 */
export async function getLocalMediaUrl(path: string): Promise<string> {
  const existing = objectUrls.get(path);
  if (existing) return existing;

  try {
    if (!('caches' in window)) return path;
    const cache = await caches.open(CACHE_NAME);
    let res = await cache.match(path);
    if (!res) {
      const fetched = await fetch(path);
      if (!fetched.ok) return path;
      await cache.put(path, fetched.clone());
      res = fetched;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    objectUrls.set(path, url);
    return url;
  } catch {
    return path;
  }
}

/**
 * Delete stored files that are no longer part of the slideshow,
 * so old content doesn't accumulate on the device.
 */
export async function pruneMediaCache(keepPaths: string[]): Promise<void> {
  try {
    if (!('caches' in window)) return;
    const cache = await caches.open(CACHE_NAME);
    const keep = new Set(keepPaths.map(p => new URL(p, window.location.origin).href));
    for (const req of await cache.keys()) {
      if (!keep.has(req.url)) await cache.delete(req);
    }
  } catch {
    // best-effort cleanup only
  }
}
