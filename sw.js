// Service Worker for Metin2 Fishing Hotspot Tracker
const CACHE_NAME = 'metin2-hotspot-v1';
const HOTSPOT_INTERVAL = 80 * 60 * 1000; // 1 hour 20 minutes in milliseconds
const BASE_TIME_HOUR = 21;
const BASE_TIME_MINUTE = 18;

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll([
          '/',
          '/index.html',
          '/vite.svg'
        ]);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Calculate next hotspot time
function calculateNextHotspot() {
  const now = new Date();
  
  // Create a reference point for today at 21:18
  const todayBase = new Date(now);
  todayBase.setHours(BASE_TIME_HOUR, BASE_TIME_MINUTE, 0, 0);
  
  // Find the most recent base time (21:18) that has passed
  let lastBaseTime;
  if (now >= todayBase) {
    lastBaseTime = todayBase;
  } else {
    // If we haven't reached 21:18 today, use yesterday's 21:18
    const yesterdayBase = new Date(todayBase);
    yesterdayBase.setDate(yesterdayBase.getDate() - 1);
    lastBaseTime = yesterdayBase;
  }
  
  // Calculate how many 80-minute intervals have passed since the last base time
  const timeSinceLastBase = now.getTime() - lastBaseTime.getTime();
  const intervalsPassed = Math.floor(timeSinceLastBase / HOTSPOT_INTERVAL);
  
  // Calculate the next hotspot time
  const nextTime = new Date(lastBaseTime.getTime() + ((intervalsPassed + 1) * HOTSPOT_INTERVAL));
  
  return nextTime;
}

// Send notification
function sendHotspotNotification() {
  const title = '🎣 Metin2 Fishing Hotspot Active!';
  const options = {
    body: 'A fishing hotspot is now active! Go fishing now!',
    icon: '/vite.svg',
    badge: '/vite.svg',
    tag: 'fishing-hotspot',
    requireInteraction: true,
    silent: false,
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  return self.registration.showNotification(title, options);
}

// Check for hotspot and send notification
function checkHotspotAndNotify() {
  const now = new Date();
  const nextHotspot = calculateNextHotspot();
  const timeDiff = nextHotspot.getTime() - now.getTime();
  
  // Check if we're within 1 second of the hotspot time
  if (timeDiff <= 1000 && timeDiff > -60000) {
    console.log('🎣 HOTSPOT DETECTED! Sending notification...');
    sendHotspotNotification();
    
    // Notify all clients
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'HOTSPOT_ACTIVE',
          timestamp: now.getTime()
        });
      });
    });
  }
}

// Background sync for periodic checks
self.addEventListener('sync', (event) => {
  if (event.tag === 'hotspot-check') {
    console.log('Background sync: Checking for hotspot...');
    event.waitUntil(checkHotspotAndNotify());
  }
});

// Periodic background checks
let backgroundInterval;

function startBackgroundChecks() {
  // Clear any existing interval
  if (backgroundInterval) {
    clearInterval(backgroundInterval);
  }
  
  // Check every 30 seconds
  backgroundInterval = setInterval(() => {
    checkHotspotAndNotify();
  }, 30000);
  
  console.log('Background hotspot checks started');
}

// Handle messages from the main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'START_BACKGROUND_CHECKS') {
    startBackgroundChecks();
  } else if (event.data && event.data.type === 'STOP_BACKGROUND_CHECKS') {
    if (backgroundInterval) {
      clearInterval(backgroundInterval);
      backgroundInterval = null;
    }
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'open') {
    // Open the app
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        if (clients.length > 0) {
          return clients[0].focus();
        } else {
          return self.clients.openWindow('/');
        }
      })
    );
  }
});

// Handle push notifications (if you want to add push notifications later)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const title = data.title || '🎣 Metin2 Fishing Hotspot Active!';
    const options = {
      body: data.body || 'A fishing hotspot is now active!',
      icon: '/vite.svg',
      badge: '/vite.svg',
      tag: 'fishing-hotspot',
      requireInteraction: true,
      silent: false
    };
    
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

// Start background checks when service worker is activated
self.addEventListener('activate', (event) => {
  event.waitUntil(startBackgroundChecks());
});

console.log('Service Worker loaded and ready for Metin2 Fishing Hotspot Tracker'); 
