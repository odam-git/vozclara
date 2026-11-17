// Service worker de Voz Clara: primero la red, y si no hay conexión, la copia guardada.
// Sube VERSION cuando cambie la lista de archivos.
const VERSION = "vozclara-v17";
const ARCHIVOS = [
  "./", "./index.html", "./manifest.json", "./icon.svg", "./apple-touch-icon.png", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png",
  "./js/datos.js", "./js/estado.js", "./js/voz.js", "./js/analisis.js", "./js/flujo.js", "./js/progreso.js", "./js/adaptativo.js", "./js/vistas.js", "./js/modulos.js", "./js/juridico.js", "./js/diagnostico.js", "./js/reporte.js", "./js/inicio.js",
  "./data/trabalenguas.json", "./data/lecturas.json", "./data/temas.json", "./data/consejos.json", "./data/entonacion.json", "./data/audiencias.json", "./data/argumentos.json"
];
self.addEventListener("install", e => {
  // Si algún archivo falla, se instala con los que sí estén (no se bloquea la app).
  e.waitUntil(caches.open(VERSION).then(c => Promise.allSettled(ARCHIVOS.map(u => c.add(u)))));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  // El reconocedor propio (vendor/, unos 40 MB) no cambia: se guarda una vez y después se sirve del dispositivo.
  if (new URL(req.url).pathname.includes("/vendor/")) {
    e.respondWith(caches.open(VERSION).then(c => c.match(req.url).then(hit => hit || fetch(req.url, { credentials: "same-origin" }).then(r => { if (r.ok && r.type === "basic") c.put(req.url, r.clone()); return r; }))));
    return;
  }
  e.respondWith(
    // "no-cache": siempre se pregunta al servidor si hay versión nueva (evita esperar 10 minutos tras publicar).
    fetch(req.url, { cache: "no-cache", credentials: "same-origin" }).then(r => {
      if (r.ok && r.type === "basic") { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); }
      return r;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === "navigate" ? caches.match("./index.html") : Response.error())))
  );
});
