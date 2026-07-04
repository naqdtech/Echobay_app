/**
 * Service Worker — Cache-first for static assets, network-first for API.
 */

const CACHE_NAME = "sales-qr-pwa-v3";
const STATIC_ASSETS = [
    "/",
    "/index.html",
    "/offline.html",
    "/manifest.json",
];

// ── Install ──
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// ── Activate ──
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// ── Message Listener ──
self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});

// ── Fetch ──
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Network-first for API calls
    if (url.pathname.startsWith("/api/")) {
        event.respondWith(
            fetch(request).catch(() => {
                return new Response(
                    JSON.stringify({ error: "Offline — please check your connection" }),
                    {
                        status: 503,
                        headers: { "Content-Type": "application/json" },
                    }
                );
            })
        );
        return;
    }

    // Network-first for Navigation (HTML generation from Vite)
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    return response;
                })
                .catch(() => {
                    // Fallback to cached index.html or offline.html
                    return caches.match(request).then((cached) => {
                        return cached || caches.match("/offline.html");
                    });
                })
        );
        return;
    }

    // Cache-first for other static assets (JS, CSS, static Images)
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request)
                .then((response) => {
                    if (request.method === "GET" && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => {
                    return new Response("Offline", { status: 503 });
                });
        })
    );
});
