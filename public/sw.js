// Service Worker - キャッシュ戦略付き
const CACHE_VERSION = '__BUILD_TIME__'; // ビルド時に置換される
const CACHE_NAME = `smart-receipt-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// 外部リソース（キャッシュ優先）のホスト
const CACHE_FIRST_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com'
];

// インストール時の処理
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // オフラインページのみ事前キャッシュ
      return cache.addAll([OFFLINE_URL]);
    })
  );
  self.skipWaiting();
});

// アクティベート時の処理
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // 古いキャッシュを削除
          if (cacheName.startsWith('smart-receipt-') && cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
  
  // アクティベート後、全クライアントにメッセージを送信
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'SW_ACTIVATED', version: CACHE_VERSION });
    });
  });
});

// フェッチイベントの処理
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // 外部リソース（Cache First）
  if (CACHE_FIRST_HOSTS.some(host => url.hostname.includes(host))) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          // 成功したレスポンスをキャッシュに保存
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        });
      })
    );
    return;
  }
  
  // 内部リソース（Cache First）
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          // 成功したレスポンスをキャッシュに保存
          if (response.status === 200 && !url.pathname.includes('/api/')) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        }).catch(() => {
          // オフライン時はオフラインページを表示
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
          return new Response('Offline', { status: 503 });
        });
      })
    );
    return;
  }
});