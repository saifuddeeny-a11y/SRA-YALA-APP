/* Service worker — เก็บหน้าแอปไว้ในเครื่อง เปิดเร็ว และมีหน้าแจ้งเมื่อออฟไลน์
 * ข้อมูลสมาชิก/ยอดเงิน ไม่ถูกเก็บในเครื่อง (โหลดจาก Google ทุกครั้ง) */
var CACHE = 'sra-app-v1.0.0';
var SHELL = ['./', './index.html', './config.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-192.png', './icons/maskable-512.png',
  './icons/apple-touch-icon.png', './icons/icon-32.png', './icons/icon-96.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // ไม่ยุ่งกับ Google / ข้อมูลระบบ
  if (url.pathname.indexOf('/demo/') !== -1) return;          // ไฟล์ทดลองโหลดตรง
  // หน้าแอปและ config: ดึงใหม่จากเน็ตก่อน (ได้เวอร์ชันล่าสุด) ถ้าออฟไลน์ใช้ของในเครื่อง
  if (req.mode === 'navigate' || /config\.js$|manifest\.webmanifest$/.test(url.pathname)) {
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req.mode === 'navigate' ? './index.html' : req, copy); });
      return res;
    }).catch(function () {
      return caches.match(req.mode === 'navigate' ? './index.html' : req, { ignoreSearch: true });
    }));
    return;
  }
  // ไอคอน: ใช้ของในเครื่องก่อน
  e.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req); }));
});
