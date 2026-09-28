importScripts("https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js");

const CACHE_NAME = "noova-suite-v8"; // Incremented: nuevo logo + fix de precache roto
const OFFLINE_URL = "/index.html";

// Antes esta lista incluía "/android-chrome-192x192.png" y
// "/android-chrome-512x512.png", archivos que NUNCA existieron en /public.
// cache.addAll() falla entero si UN solo archivo de la lista da 404, así
// que el precache llevaba tiempo rompiéndose en silencio (el install
// event fallaba y no dejaba nada en caché). Se corrige con los nombres
// reales de los íconos.
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/logo.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-192-maskable.png",
  "/icon-512-maskable.png",
  "/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.destination === 'image') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
             return cachedResponse;
          });
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  if (request.method !== "GET" || (!request.url.startsWith(self.location.origin) && !request.destination)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return cachedResponse || fetch(request).then((response) => {
        return response;
      });
    })
  );
});
