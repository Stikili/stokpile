const CACHE_NAME = 'stokpile-v2';
const API_CACHE_NAME = 'stokpile-api-v2';

// How long to keep cached API responses (5 minutes)
const API_CACHE_TTL_MS = 5 * 60 * 1000;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install — cache static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — remove old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== API_CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
//   - API calls (supabase.co)  → network-first, no cache
//   - Static assets (/assets/) → cache-first
//   - Navigation requests      → network-first, fall back to cached /index.html
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin except supabase
  if (request.method !== 'GET') return;

  // API calls — GET endpoints: stale-while-revalidate for offline support
  // Mutating requests (POST/PUT/DELETE) are skipped above (method !== 'GET')
  if (url.hostname.includes('supabase.co')) {
    // Only cache safe read endpoints (groups, contributions, payouts, meetings, profile)
    const isCacheable = /\/(groups|contributions|payouts|meetings|profile|votes|notes|chat|members|selected-group)/.test(url.pathname);

    if (isCacheable) {
      event.respondWith(
        (async () => {
          const cache = await caches.open(API_CACHE_NAME);
          const cachedResponse = await cache.match(request);

          // Start a network fetch regardless
          const fetchPromise = fetch(request).then(async (networkResponse) => {
            if (networkResponse.ok) {
              // Add timestamp header for TTL check
              const headers = new Headers(networkResponse.headers);
              headers.set('sw-cached-at', Date.now().toString());
              const responseToCache = new Response(await networkResponse.clone().arrayBuffer(), {
                status: networkResponse.status,
                statusText: networkResponse.statusText,
                headers,
              });
              cache.put(request, responseToCache);
            }
            return networkResponse;
          }).catch(() => null);

          // Return cache immediately if available and not stale, else wait for network
          if (cachedResponse) {
            const cachedAt = cachedResponse.headers.get('sw-cached-at');
            const age = cachedAt ? Date.now() - parseInt(cachedAt) : Infinity;
            if (age < API_CACHE_TTL_MS) {
              // Fresh enough — return cache and update in background
              fetchPromise; // fire and forget
              return cachedResponse;
            }
          }

          // No fresh cache — wait for network, fall back to stale cache if offline
          const networkResult = await fetchPromise;
          if (networkResult) return networkResult;
          if (cachedResponse) return cachedResponse; // Serve stale when offline
          return new Response(JSON.stringify({ error: 'Offline – no cached data available' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        })()
      );
      return;
    }

    // Non-cacheable API calls — network only
    event.respondWith(fetch(request).catch(() =>
      new Response(JSON.stringify({ error: 'You are offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    ));
    return;
  }

  // Static assets — cache-first
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        })
      )
    );
    return;
  }

  // Navigation — network-first, fall back to index.html for SPA routing
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/index.html').then((cached) => cached || fetch('/index.html'))
      )
    );
    return;
  }

  // Everything else — network-first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = { title: 'Stokpile', body: 'You have a new notification', icon: '/icon-192x192.png' };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icon-192x192.png',
      badge: '/icon-192x192.png',
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const existing = clients.find((c) => c.url === url && 'focus' in c);
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
