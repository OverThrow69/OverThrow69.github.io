const cacheName = 'morries-reminder-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseForCache = response.clone()
        caches.open(cacheName).then((cache) => cache.put(request, responseForCache))
        return response
      })
      .catch(() => caches.match(request)),
  )
})
