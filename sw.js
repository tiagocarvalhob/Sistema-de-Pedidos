// Service worker do app Subarashi Gestão.
// Guarda as telas do app para abrirem rápido; dados (/api) sempre vêm do servidor, nunca do cache.
const VERSAO = "subarashi-app-v1";
const TELAS = ["/cozinha", "/painel", "/mesas", "/app.js", "/app.css", "/manifest.webmanifest",
  "/icons/icon-192.png", "/icons/icon-512.png", "/img/logo.svg"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(TELAS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  // Rede primeiro (sempre a versão mais nova); sem internet, usa a cópia guardada
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok && TELAS.includes(url.pathname)) { const copia = r.clone(); caches.open(VERSAO).then(c => c.put(url.pathname, copia)); }
      return r;
    }).catch(() => caches.match(url.pathname).then(r => r || new Response(
      "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><body style='font-family:system-ui;padding:40px;text-align:center;color:#131d15'><h2>Sem conexão</h2><p>O app precisa de internet para receber os pedidos. Confira o Wi-Fi e tente de novo.</p>",
      { headers: { "Content-Type": "text/html; charset=utf-8" } })))
  );
});
