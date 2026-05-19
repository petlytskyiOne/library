// public/sw.js
// Мінімальний service worker для PWA
// Без нього Android не дає "Встановити додаток"

const CACHE = 'reader-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Пропускаємо всі запити без кешування (можна розширити пізніше)
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
