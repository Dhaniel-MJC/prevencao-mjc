const CACHE = "prevencao-mjc-v1";
const ESSENCIAIS = ["/", "/index.html", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ESSENCIAIS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((chaves) => Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Estratégia: tenta a rede primeiro (para pegar versões novas do app);
// se estiver offline, cai no cache. Nunca intercepta o envio ao Google
// Sheets (esse precisa da rede de verdade para funcionar).
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((resp) => {
        const copia = resp.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copia));
        return resp;
      })
      .catch(() => caches.match(event.request))
  );
});
