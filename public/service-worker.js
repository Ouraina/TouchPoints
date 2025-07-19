// TouchPoints Service Worker
// Provides offline functionality and intelligent caching for family visit coordination

const CACHE_NAME = 'touchpoints-v1.0.0';
const STATIC_CACHE_NAME = 'touchpoints-static-v1.0.0';
const API_CACHE_NAME = 'touchpoints-api-v1.0.0';

// Critical assets that must be cached for offline functionality
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  // Vite build assets will be added dynamically
];

// API endpoints to cache for offline access
const API_ROUTES_TO_CACHE = [
  // Supabase REST API patterns
  new RegExp('/rest/v1/care_circles'),
  new RegExp('/rest/v1/visits'),
  new RegExp('/rest/v1/circle_members'),
  new RegExp('/rest/v1/users'),
  new RegExp('/rest/v1/visit_patterns'),
  new RegExp('/rest/v1/pattern_suggestions'),
];

// Network timeout for determining if we're offline
const NETWORK_TIMEOUT = 5000;

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing TouchPoints service worker');
  
  event.waitUntil(
    (async () => {
      try {
        // Cache static assets
        const staticCache = await caches.open(STATIC_CACHE_NAME);
        await staticCache.addAll(STATIC_ASSETS);
        
        console.log('[SW] Static assets cached successfully');
        
        // Skip waiting to activate immediately
        self.skipWaiting();
      } catch (error) {
        console.error('[SW] Failed to cache static assets:', error);
      }
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating TouchPoints service worker');
  
  event.waitUntil(
    (async () => {
      try {
        // Get all cache names
        const cacheNames = await caches.keys();
        
        // Delete old caches
        const deletePromises = cacheNames
          .filter(cacheName => 
            cacheName.startsWith('touchpoints-') && 
            ![CACHE_NAME, STATIC_CACHE_NAME, API_CACHE_NAME].includes(cacheName)
          )
          .map(cacheName => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          });
        
        await Promise.all(deletePromises);
        
        // Take control of all clients
        await clients.claim();
        
        console.log('[SW] Service worker activated and ready');
      } catch (error) {
        console.error('[SW] Error during activation:', error);
      }
    })()
  );
});

// Fetch event - intelligent request handling
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests for caching
  if (request.method !== 'GET') {
    // For non-GET requests, try network first, queue if offline
    event.respondWith(handleMutationRequest(request));
    return;
  }
  
  // Handle different types of requests
  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(request));
  } else {
    event.respondWith(handleNavigationRequest(request));
  }
});

// Handle static assets (JS, CSS, images) - cache first strategy
async function handleStaticAsset(request) {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Return cached version immediately
      return cachedResponse;
    }
    
    // Fetch from network and cache
    const networkResponse = await fetchWithTimeout(request, NETWORK_TIMEOUT);
    
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Static asset fetch failed:', error);
    
    // Try to return cached version as fallback
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return error response if nothing available
    return new Response('Resource not available offline', { 
      status: 503, 
      statusText: 'Service Unavailable' 
    });
  }
}

// Handle API requests - network first with intelligent fallback
async function handleAPIRequest(request) {
  try {
    // Try network first for fresh data
    const networkResponse = await fetchWithTimeout(request, NETWORK_TIMEOUT);
    
    if (networkResponse.ok) {
      // Cache successful responses for offline access
      const cache = await caches.open(API_CACHE_NAME);
      await cache.put(request, networkResponse.clone());
      
      return networkResponse;
    }
    
    throw new Error(`Network response not ok: ${networkResponse.status}`);
  } catch (error) {
    console.log('[SW] API request failed, trying cache:', error.message);
    
    // Network failed, try cache
    const cache = await caches.open(API_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Add headers to indicate this is cached data
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-From-Cache', 'true');
      headers.set('X-Cache-Date', new Date().toISOString());
      
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: headers
      });
    }
    
    // No cached data available
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'This data is not available offline. Please check your connection and try again.',
        offline: true
      }),
      { 
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 
          'Content-Type': 'application/json',
          'X-Offline-Error': 'true'
        }
      }
    );
  }
}

// Handle navigation requests - serve app shell
async function handleNavigationRequest(request) {
  try {
    // Try network first for navigation
    const networkResponse = await fetchWithTimeout(request, NETWORK_TIMEOUT);
    
    if (networkResponse.ok) {
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('[SW] Navigation request failed, serving app shell');
    
    // Serve cached app shell
    const cache = await caches.open(STATIC_CACHE_NAME);
    const appShell = await cache.match('/') || await cache.match('/index.html');
    
    if (appShell) {
      return appShell;
    }
    
    // Fallback for when even app shell isn't cached
    return new Response(
      createOfflinePage(),
      { 
        headers: { 'Content-Type': 'text/html' } 
      }
    );
  }
}

// Handle mutations (POST, PUT, DELETE) - queue for background sync
async function handleMutationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetchWithTimeout(request, NETWORK_TIMEOUT);
    
    if (networkResponse.ok) {
      return networkResponse;
    }
    
    throw new Error('Network request failed');
  } catch (error) {
    console.log('[SW] Mutation request failed, queuing for background sync');
    
    // Queue the request for background sync
    await queueMutation(request);
    
    // Return optimistic response
    return new Response(
      JSON.stringify({ 
        success: true,
        queued: true,
        message: 'Your changes have been saved locally and will sync when connection is restored.',
        offline: true
      }),
      { 
        status: 202, // Accepted
        headers: { 
          'Content-Type': 'application/json',
          'X-Queued-For-Sync': 'true'
        }
      }
    );
  }
}

// Helper functions
function isStaticAsset(url) {
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2)$/);
}

function isAPIRequest(url) {
  // Check if it's a Supabase API request
  return url.pathname.includes('/rest/v1/') || 
         API_ROUTES_TO_CACHE.some(pattern => pattern.test(url.pathname));
}

async function fetchWithTimeout(request, timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(request, { 
      signal: controller.signal 
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function queueMutation(request) {
  try {
    // Store mutation in IndexedDB for background sync
    const requestData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: await request.text(),
      timestamp: Date.now()
    };
    
    // Open IndexedDB and store the request
    const db = await openMutationQueue();
    const transaction = db.transaction(['mutations'], 'readwrite');
    const store = transaction.objectStore('mutations');
    await store.add(requestData);
    
    console.log('[SW] Mutation queued for background sync');
  } catch (error) {
    console.error('[SW] Failed to queue mutation:', error);
  }
}

function openMutationQueue() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('touchpoints-offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('mutations')) {
        const store = db.createObjectStore('mutations', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        store.createIndex('timestamp', 'timestamp');
      }
    };
  });
}

function createOfflinePage() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>TouchPoints - Offline</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          font-family: system-ui, sans-serif; 
          text-align: center; 
          padding: 2rem; 
          background: #f8fafc;
          color: #374151;
        }
        .offline-container {
          max-width: 400px;
          margin: 2rem auto;
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .icon { font-size: 3rem; margin-bottom: 1rem; }
        h1 { color: #3b82f6; margin-bottom: 1rem; }
        button { 
          background: #3b82f6; 
          color: white; 
          border: none; 
          padding: 0.75rem 1.5rem; 
          border-radius: 6px; 
          cursor: pointer;
          margin-top: 1rem;
        }
      </style>
    </head>
    <body>
      <div class="offline-container">
        <div class="icon">📱</div>
        <h1>TouchPoints</h1>
        <p>You're currently offline, but don't worry - your family coordination continues.</p>
        <p>Any changes you make will be saved and synced when your connection returns.</p>
        <button onclick="window.location.reload()">Try Again</button>
      </div>
    </body>
    </html>
  `;
}

// Message handling for communication with the app
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  const deletePromises = cacheNames
    .filter(name => name.startsWith('touchpoints-'))
    .map(name => caches.delete(name));
  
  await Promise.all(deletePromises);
  console.log('[SW] All caches cleared');
}

console.log('[SW] TouchPoints service worker loaded');