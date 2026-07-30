/* フレイルDX 問診レポートシステム — Service Worker
   目的：一度ネット経由で開けば、以後は圏外・Wi-Fiなしの健診会場でも起動できるようにする。
   方式：ネット優先（online のときは常に最新版）／失敗したらキャッシュから配信（offline）。
   更新：HTMLを差し替えたら下の CACHE の数字を1つ上げると確実に切り替わります。 */

const CACHE = 'frail-dx-v4';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    // cache:'no-cache' でブラウザのHTTPキャッシュを必ずサーバに問い合わせる。
    // これを付けないと、GitHub Pages のキャッシュ有効期間（約10分）のあいだ
    // 更新した内容が端末に届かない。
    fetch(req.url, { cache: 'no-cache' })
      .then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true })
          .then((hit) => hit || caches.match('./index.html'))
      )
  );
});
