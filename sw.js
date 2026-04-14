const CACHE_NAME = 'heartopia-app-v1';
const ASSETS = [
    './',
    './index.html',
    './css/main.css',
    './js/store.js',
    './js/pdfLoader.js',
    './js/ui.js',
    './js/app.js',
    './gemini-svg.svg'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});
