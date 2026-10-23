// v4：網路優先，斷網才用快取（這樣線上行為跟沒有 Service Worker 時一樣）
// v4 變更：app.js 拆成多個模組，離線名單改成列出所有新檔案。
// 提醒：名單上只要有一個檔案抓不到，整個離線快取就裝不起來，所以名單必須和實際檔案一致。
// 歷史：v1 用 cache.addAll 一次抓「自己的檔案＋別人網站的檔案」，
// Tailwind 網站擋掉，整批失敗，Service Worker 作廢，離線就打不開。
const CACHE_NAME = 'ielts-pwa-v4';

// 1) 自己網站的檔案：一定要存到。哪一個失敗，錯誤訊息會直接寫出檔名
const LOCAL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './js/main.js',
  './js/firebase.js',
  './js/auth.js',
  './js/cloud.js',
  './js/storage.js',
  './js/speech.js',
  './js/dates.js',
  './js/srs.js',
  './js/constants.js',
  './js/ui/nav.js',
  './js/ui/hub.js',
  './js/ui/review.js',
  './js/ui/analytics.js',
  './js/ui/database.js',
  './js/ui/modals.js'
];

// 2) 別人網站的檔案：盡量存，存不到就跳過，不拖垮整個安裝
const CDN_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js'
];

// 這幾個網站的 GET 請求，成功後會順便存進快取
const CACHEABLE_HOSTS = ['cdn.tailwindcss.com', 'unpkg.com', 'www.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 自己的檔案：一個一個存，失敗就丟出「哪個檔案」
      for (const url of LOCAL_ASSETS) {
        let res;
        try {
          res = await fetch(url, { cache: 'reload' });
        } catch (err) {
          throw new Error('離線快取失敗，抓不到：' + url + '（' + err.message + '）');
        }
        if (!res.ok) throw new Error('離線快取失敗，' + url + ' 回傳 ' + res.status);
        await cache.put(url, res);
      }
      // 別人網站的檔案：存不到就算了
      await Promise.all(
        CDN_ASSETS.map(async (url) => {
          try {
            const res = await fetch(url);              // 先用一般方式（Firebase 的檔案可以）
            if (res.ok) await cache.put(url, res);
          } catch (err) {
            try {
              // Tailwind 不准一般方式，改用 no-cors：讀不到內容，但 <script> 標籤可以用
              const res2 = await fetch(url, { mode: 'no-cors' });
              await cache.put(url, res2);
            } catch (err2) {
              // 還是存不到就算了
            }
          }
        })
      );
    })
  );
  self.skipWaiting();
});

// 啟用時，刪掉舊名字的抽屜
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// 網路優先：有網路就正常上網（順便更新快取），斷網才拿快取
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const cacheable = url.origin === self.location.origin || CACHEABLE_HOSTS.includes(url.hostname);
  if (!cacheable) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true }).then((cached) => {
          if (cached) return cached;
          // 網頁導覽（打開首頁）找不到時，退回首頁
          if (req.mode === 'navigate') return caches.match('./index.html');
          return Response.error();
        })
      )
  );
});
