const CACHE_NAME = 'miri-memory-cache-v1';

// Essential UI assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

// Install Event: Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Network-first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Only cache GET requests (ignore POST/PUT/DELETE for data integrity)
  if (event.request.method !== 'GET') return;

  // Ignore browser extensions and chrome-specific requests
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Clone the response and save it to cache dynamically
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      })
      .catch(async () => {
        // If network fails (offline), serve from cache
        console.warn(`[Offline] Serving from cache: ${event.request.url}`);
        const cachedResponse = await caches.match(event.request);
        return cachedResponse || new Response('Offline Content Not Available', { status: 503 });
      })
  );
});