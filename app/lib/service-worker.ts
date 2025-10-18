// Service Worker for caching and offline functionality
const CACHE_NAME = 'sjfulfillment-v1'
const STATIC_CACHE = 'sjfulfillment-static-v1'
const DYNAMIC_CACHE = 'sjfulfillment-dynamic-v1'

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/products',
  '/orders',
  '/manifest.json',
  '/favicon.ico'
]

// API routes to cache
const API_ROUTES = [
  '/api/products',
  '/api/orders',
  '/api/merchants',
  '/api/services'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        console.log('Static assets cached successfully')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('Failed to cache static assets:', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('Service worker activated')
        return self.clients.claim()
      })
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    // API requests - Network First strategy
    event.respondWith(handleApiRequest(request))
  } else if (url.pathname.startsWith('/_next/static/')) {
    // Static assets - Cache First strategy
    event.respondWith(handleStaticRequest(request))
  } else if (url.pathname.startsWith('/images/') || url.pathname.includes('.')) {
    // Images and files - Cache First strategy
    event.respondWith(handleFileRequest(request))
  } else {
    // HTML pages - Network First strategy
    event.respondWith(handlePageRequest(request))
  }
})

// API request handler - Network First
async function handleApiRequest(request: Request): Promise<Response> {
  try {
    // Try network first
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline response for API requests
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'No internet connection' 
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Static asset handler - Cache First
async function handleStaticRequest(request: Request): Promise<Response> {
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    // Return a fallback response for static assets
    return new Response('Asset not available offline', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}

// File handler - Cache First
async function handleFileRequest(request: Request): Promise<Response> {
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    // Return a fallback for images
    if (request.url.includes('.jpg') || request.url.includes('.png') || request.url.includes('.webp')) {
      return new Response(
        '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af">Image not available offline</text></svg>',
        {
          status: 200,
          headers: { 'Content-Type': 'image/svg+xml' }
        }
      )
    }
    
    return new Response('File not available offline', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}

// Page handler - Network First
async function handlePageRequest(request: Request): Promise<Response> {
  try {
    // Try network first
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline page
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Offline - SJFulfillment</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; text-align: center; padding: 50px; }
            .offline { color: #6b7280; }
            .retry { background: #3b82f6; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
          </style>
        </head>
        <body>
          <h1 class="offline">You're offline</h1>
          <p>Please check your internet connection and try again.</p>
          <button class="retry" onclick="window.location.reload()">Retry</button>
        </body>
      </html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    )
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

async function doBackgroundSync() {
  try {
    // Get pending requests from IndexedDB
    const pendingRequests = await getPendingRequests()
    
    for (const request of pendingRequests) {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body
        })
        
        if (response.ok) {
          // Remove from pending requests
          await removePendingRequest(request.id)
        }
      } catch (error) {
        console.error('Background sync failed for request:', request.id, error)
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error)
  }
}

// Push notification handler
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()
    
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey
      },
      actions: [
        {
          action: 'explore',
          title: 'View Details',
          icon: '/icon-192x192.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/icon-192x192.png'
        }
      ]
    }
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/notifications')
    )
  }
})

// Utility functions for IndexedDB
async function getPendingRequests() {
  // This would integrate with IndexedDB to get pending requests
  // For now, return empty array
  return []
}

async function removePendingRequest(id: string) {
  // This would remove the request from IndexedDB
  console.log('Removing pending request:', id)
}

// Cache management
async function cleanOldCaches() {
  const cacheNames = await caches.keys()
  const oldCaches = cacheNames.filter(name => 
    name.startsWith('sjfulfillment-') && 
    name !== STATIC_CACHE && 
    name !== DYNAMIC_CACHE
  )
  
  await Promise.all(
    oldCaches.map(name => caches.delete(name))
  )
}

// Periodic cache cleanup
setInterval(cleanOldCaches, 24 * 60 * 60 * 1000) // Daily

export {}

