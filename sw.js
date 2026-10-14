/* Service worker för Plugg åk 9.
   - Sidor, ikoner och teckensnitt förcachas vid installation (cache-first).
   - Videor cachas först när de spelas (eller när man trycker "Spara videorna"),
     och svaras med byte-intervall (206), eftersom Safari kräver det för video.
   - bygg.mjs fyller i VERSION, FORCACHE och VIDEOR. Ändra här, inte i plugg9/sw.js. */
const VERSION = "2d0b8a1728";
const FORCACHE = ["./","flode/","flode/index.html","fonter/Assistant-400-latin-ext.woff2","fonter/Assistant-400-latin.woff2","fonter/Assistant-600-latin-ext.woff2","fonter/Assistant-600-latin.woff2","fonter/Assistant-700-latin-ext.woff2","fonter/Assistant-700-latin.woff2","fonter/AtkinsonHyperlegible-400-latin-ext.woff2","fonter/AtkinsonHyperlegible-400-latin.woff2","fonter/AtkinsonHyperlegible-400i-latin-ext.woff2","fonter/AtkinsonHyperlegible-400i-latin.woff2","fonter/AtkinsonHyperlegible-700-latin-ext.woff2","fonter/AtkinsonHyperlegible-700-latin.woff2","fonter/FrankRuhlLibre-700-latin-ext.woff2","fonter/FrankRuhlLibre-700-latin.woff2","fonter/FrankRuhlLibre-900-latin-ext.woff2","fonter/FrankRuhlLibre-900-latin.woff2","fonter/IBMPlexMono-500-latin-ext.woff2","fonter/IBMPlexMono-500-latin.woff2","fonter/IBMPlexMono-600-latin-ext.woff2","fonter/IBMPlexMono-600-latin.woff2","fonter/Lexend-500-latin-ext.woff2","fonter/Lexend-500-latin.woff2","fonter/Lexend-600-latin-ext.woff2","fonter/Lexend-600-latin.woff2","fonter/Lexend-700-latin-ext.woff2","fonter/Lexend-700-latin.woff2","fonter/Lexend-800-latin-ext.woff2","fonter/Lexend-800-latin.woff2","fonter/fonter.css","ikon-180.png","ikon-192.png","ikon-512-maskable.png","ikon-512.png","index.html","manifest.webmanifest","spel/biologiresan.html","spel/demokratiuppdraget.html","spel/fysiklabbet.html","spel/judendomsresan.html","spel/pengakollen.html","spel/sverigeresan.html"];
const VIDEOR = ["videor/fysik-materia.mp4?v=55a21e08","videor/fysik-densitet.mp4?v=c1111b8f","videor/fysik-massa-tyngd.mp4?v=a47c5897","videor/fysik-krafter.mp4?v=c50758ff","videor/fysik-nettokraft.mp4?v=dfae363d","videor/fysik-havstang.mp4?v=5a8ce79d","videor/fysik-ljus.mp4?v=acc59c74","videor/inkomst-budget.mp4?v=bd292820","videor/sparande.mp4?v=aa1a36ef","videor/lan-kredit.mp4?v=42967a5a","videor/faktura-kronofogden.mp4?v=7490b9c3","videor/forsakringar.mp4?v=7702b771","videor/demokrati-valdeltagande.mp4?v=c0505277","videor/regering-lag.mp4?v=141f18ba","videor/tallriksmodellen.mp4?v=87366736","videor/genetik.mp4?v=679e7259","videor/microbit-bilen.mp4?v=a744ec21","videor/koordinatsystem.mp4?v=4277eaf4"];

const SIDOR = 'plugg9-v1-sidor-' + VERSION;
const VIDEOCACHE = 'plugg9-v1-videor';
const FONTCACHE = 'plugg9-v1-fonter';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SIDOR).then(c => c.addAll(FORCACHE.map(u => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const namn of await caches.keys()) {
      if (namn.startsWith('plugg9-') && ![SIDOR, VIDEOCACHE, FONTCACHE].includes(namn)) await caches.delete(namn);
    }
    // videor som inte längre finns i flödet (eller har bytt version) tas bort
    const vc = await caches.open(VIDEOCACHE);
    const giltiga = new Set(VIDEOR.map(u => new URL(u, self.registration.scope).href));
    for (const req of await vc.keys()) if (!giltiga.has(req.url)) await vc.delete(req);
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => {
  if (e.data === 'hoppa') self.skipWaiting();
  if (e.data && e.data.typ === 'spara-videor') {
    e.waitUntil((async () => {
      let klara = 0;
      for (const u of VIDEOR) {
        try { await sparaVideo(new URL(u, self.registration.scope).href); klara++; } catch (x) {}
        if (e.source) e.source.postMessage({ typ: 'videor-sparade', klara, av: VIDEOR.length });
      }
    })());
  }
});

const pagar = new Map();
function sparaVideo(url) {
  if (pagar.has(url)) return pagar.get(url);
  const p = (async () => {
    const vc = await caches.open(VIDEOCACHE);
    if (await vc.match(url)) return;
    const svar = await fetch(url, { cache: 'no-store' });
    if (svar.status === 200) await vc.put(url, svar);
  })().finally(() => pagar.delete(url));
  pagar.set(url, p);
  return p;
}

async function intervall(req, svar) {
  const blob = await svar.blob();
  const storlek = blob.size;
  const typ = svar.headers.get('Content-Type') || 'video/mp4';
  const range = req.headers.get('range');
  const m = range && /bytes=(\d*)-(\d*)/.exec(range);
  if (!m) return new Response(blob, { status: 200, headers: { 'Content-Type': typ, 'Content-Length': String(storlek), 'Accept-Ranges': 'bytes' } });
  let start, slut;
  if (m[1] === '') { start = Math.max(0, storlek - Number(m[2])); slut = storlek - 1; }
  else { start = Number(m[1]); slut = m[2] === '' ? storlek - 1 : Math.min(Number(m[2]), storlek - 1); }
  if (start >= storlek || start > slut) return new Response('', { status: 416, headers: { 'Content-Range': 'bytes */' + storlek } });
  return new Response(blob.slice(start, slut + 1), { status: 206, headers: {
    'Content-Type': typ, 'Content-Length': String(slut - start + 1),
    'Content-Range': 'bytes ' + start + '-' + slut + '/' + storlek, 'Accept-Ranges': 'bytes' } });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // teckensnitt från Google Fonts (om de inte är inbäddade): cache-first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTCACHE).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const svar = await fetch(req);
      if (svar.ok) c.put(req, svar.clone());
      return svar;
    }));
    return;
  }
  if (url.origin !== location.origin) return;

  // videor: byte-intervall ur cachen, annars nätet (och spara hela filen i bakgrunden)
  if (/\.mp4$/i.test(url.pathname)) {
    const nyckel = url.origin + url.pathname + url.search;
    const hit = caches.open(VIDEOCACHE).then(c => c.match(nyckel));
    e.waitUntil(hit.then(h => h ? null : sparaVideo(nyckel)).catch(() => {}));
    e.respondWith(hit.then(h => h ? intervall(req, h) : fetch(req)));
    return;
  }

  // sidor och resten: cache-first, nätet som reserv
  e.respondWith((async () => {
    const c = await caches.open(SIDOR);
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try { return await fetch(req); }
    catch (x) {
      if (req.mode === 'navigate') return (await c.match('./index.html')) || Response.error();
      return Response.error();
    }
  })());
});
