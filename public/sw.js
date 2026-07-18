const CACHE = "gf-v2";
const ASSETS = ["/", "/login", "/manifest.json"];

// Install — cache core assets
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
  updateBadge();
});

// Fetch — network first, fallback to cache
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && e.request.url.startsWith(self.location.origin)) {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// Periodic badge update
function updateBadge() {
  fetch("/api/approvals/pending/count")
    .then((r) => r.json())
    .then((d) => {
      const count = d.count || 0;
      if ("setAppBadge" in navigator) {
        navigator.setAppBadge(count || undefined).catch(() => {});
      }
    })
    .catch(() => {});
}

// Update badge every 5 minutes
setInterval(updateBadge, 5 * 60 * 1000);

// Also update when a message is received from the main app
self.addEventListener("message", (e) => {
  if (e.data === "update-badge") updateBadge();
});
