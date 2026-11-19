/* Service worker Dashboard Omzet.
   - Halaman & ikon disimpan agar aplikasi cepat terbuka dan bisa dipasang.
   - Data omzet TIDAK pernah disimpan (permintaan ke Google Apps Script
     adalah POST dan lintas-domain, jadi selalu langsung ke server).
   - File musik tidak disimpan (besar). Ubah VERSION bila ingin memaksa
     semua perangkat mengambil versi baru. */
const VERSION = 'omzet-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];
const CDN_HOSTS = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;               // login & data (POST) langsung ke server
  const url = new URL(req.url);

  // jangan simpan musik
  if (/\.(mp3|m4a|ogg|wav)$/i.test(url.pathname)) return;

  // halaman: coba jaringan dulu (supaya selalu versi terbaru), cadangan dari cache
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // file milik sendiri & CDN (Chart.js, font): cache dulu, perbarui di belakang
  if (url.origin === location.origin || CDN_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(VERSION).then(c => c.put(req, copy));
          }
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
