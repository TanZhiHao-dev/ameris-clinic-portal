// Minimal service worker — its only job is to make the site qualify as an
// installable PWA (Chrome/Android require a registered SW with a fetch handler
// before it fires `beforeinstallprompt`). It caches nothing and rewrites
// nothing, so it can never serve stale content or interfere with API/auth.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
// Pass-through: the presence of this handler is what matters; letting it fall
// through means the browser handles every request over the network as usual.
self.addEventListener('fetch', () => {})
