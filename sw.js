const CACHE_NAME = 'iqc-netlify-v28';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // 強制立即生效，不需等待所有分頁關閉
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return Promise.all(
          urlsToCache.map(url => {
            return cache.add(url).catch(reason => {
              console.warn(`[SW] Caching failed for ${url}:`, reason);
            });
          })
        );
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] 刪除舊快取:', cacheName);
            return caches.delete(cacheName); // 刪除不符最新版本的舊快取
          }
        })
      );
    }).then(() => self.clients.claim()) // 立即接管目前的網頁
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // 絕對不要攔截 Google Apps Script API 或是 Drive 圖片等跨網域動態請求
  const url = event.request.url;
  if (url.includes('script.google.com') || 
      url.includes('script.googleusercontent.com') || 
      url.includes('googleusercontent.com') ||
      url.includes('drive.google.com')) {
    return; // 直接跳出，交給瀏覽器原生網絡請求處理
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;
      return fetch(event.request).then(function(response) {
        if(!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        var responseToCache = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseToCache);
        });
        return response;
      });
    })
  );
});
