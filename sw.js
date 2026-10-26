/* Service worker för Plugg åk 9.
   - Sidor, ikoner och teckensnitt förcachas vid installation (cache-first).
   - Videor cachas först när de spelas (eller när man trycker "Spara videorna"),
     och svaras med byte-intervall (206), eftersom Safari kräver det för video.
   - bygg.mjs fyller i VERSION, FORCACHE och VIDEOR. Ändra här, inte i plugg9/sw.js. */
const VERSION = "002eceb060";
const FORCACHE = ["./","design.css","filmer.js","flode/","flode/index.html","fonter/Assistant-400-latin-ext.woff2","fonter/Assistant-400-latin.woff2","fonter/Assistant-600-latin-ext.woff2","fonter/Assistant-600-latin.woff2","fonter/Assistant-700-latin-ext.woff2","fonter/Assistant-700-latin.woff2","fonter/AtkinsonHyperlegible-400-latin-ext.woff2","fonter/AtkinsonHyperlegible-400-latin.woff2","fonter/AtkinsonHyperlegible-400i-latin-ext.woff2","fonter/AtkinsonHyperlegible-400i-latin.woff2","fonter/AtkinsonHyperlegible-700-latin-ext.woff2","fonter/AtkinsonHyperlegible-700-latin.woff2","fonter/FrankRuhlLibre-700-latin-ext.woff2","fonter/FrankRuhlLibre-700-latin.woff2","fonter/FrankRuhlLibre-900-latin-ext.woff2","fonter/FrankRuhlLibre-900-latin.woff2","fonter/IBMPlexMono-500-latin-ext.woff2","fonter/IBMPlexMono-500-latin.woff2","fonter/IBMPlexMono-600-latin-ext.woff2","fonter/IBMPlexMono-600-latin.woff2","fonter/Lexend-500-latin-ext.woff2","fonter/Lexend-500-latin.woff2","fonter/Lexend-600-latin-ext.woff2","fonter/Lexend-600-latin.woff2","fonter/Lexend-700-latin-ext.woff2","fonter/Lexend-700-latin.woff2","fonter/Lexend-800-latin-ext.woff2","fonter/Lexend-800-latin.woff2","fonter/fonter.css","ikon-180.png","ikon-192.png","ikon-512-maskable.png","ikon-512.png","index.html","manifest.webmanifest","muntligt/index.html","pixel/ark.png","pixel/skin.js","pluggdag/index.html","rost/alla.json","rost/atomresan.json","rost/biologiresan.json","rost/demokratiuppdraget.json","rost/flode.json","rost/fysiklabbet.json","rost/judendomsresan.json","rost/konsumentkollen.json","rost/muntligt.json","rost/pengakollen.json","rost/pluggdag.json","rost/rost.js","rost/scroll.json","rost/start.json","rost/sverigeresan.json","scroll/fragor.json","scroll/index.html","scroll/videor.json","spel/atomresan-pixel.html","spel/atomresan.html","spel/biologiresan-pixel.html","spel/biologiresan.html","spel/demokratiuppdraget.html","spel/fysiklabbet.html","spel/judendomsresan-pixel.html","spel/judendomsresan.html","spel/konsumentkollen.html","spel/pengakollen-pixel.html","spel/pengakollen.html","spel/sverigeresan-pixel.html","spel/sverigeresan.html"];
const VIDEOR = ["videor/kemi-forklara-1.mp4?v=7d46457a","videor/kemi-forklara-2.mp4?v=21e52ac4","videor/kemi-forklara-3.mp4?v=02d82b6c","videor/kemi-forklara-4.mp4?v=63d51caf","videor/kemi-forklara-5.mp4?v=71fb9153","videor/kemi-forklara-6.mp4?v=a2bc1bf0","videor/kemi-forklara-7.mp4?v=7c7a38af","videor/kemi-forklara-8.mp4?v=600c8293","videor/kemi-atomen.mp4?v=f83ef44d","videor/kemi-periodiska.mp4?v=8b621523","videor/kemi-familjer.mp4?v=5474ce63","videor/kemi-natriumklorid.mp4?v=bd9de765","videor/atom-bana-1.mp4?v=05125e8d","videor/atom-bana-2.mp4?v=fe0c92a7","videor/atom-bana-3.mp4?v=b9ece235","videor/atom-bana-4.mp4?v=fb6a0ab8","videor/atom-bana-5.mp4?v=8d8bf668","videor/atom-bana-6.mp4?v=9ec4fd8e","videor/atom-bana-7.mp4?v=d357da1e","videor/atom-bana-8.mp4?v=f80041b3","videor/atom-bana-9.mp4?v=4e651ef1","videor/fysik-materia.mp4?v=88566b00","videor/fysik-densitet.mp4?v=e6ddbae6","videor/fysik-massa-tyngd.mp4?v=e302da04","videor/fysik-krafter.mp4?v=e7e61a35","videor/fysik-nettokraft.mp4?v=3669e436","videor/fysik-havstang.mp4?v=45f07241","videor/fysik-ljus.mp4?v=f36aba03","videor/fysik-linser.mp4?v=ad8eb006","videor/fysik-ogat.mp4?v=64a6492d","videor/inkomst-budget.mp4?v=2bcd9f7e","videor/sparande.mp4?v=88b9c330","videor/lan-kredit.mp4?v=5a5ea353","videor/faktura-kronofogden.mp4?v=36752a77","videor/forsakringar.mp4?v=38637d57","videor/peng-bana-1.mp4?v=6274f490","videor/peng-bana-2.mp4?v=194a12eb","videor/peng-bana-3.mp4?v=d8ea1461","videor/peng-bana-4.mp4?v=af4a0eff","videor/peng-bana-5.mp4?v=8ebe56cb","videor/peng-bana-6.mp4?v=16c9c105","videor/peng-bana-8.mp4?v=1684cfc9","videor/tallriksmodellen.mp4?v=7e1eadf0","videor/bio-bana-1.mp4?v=f9e9f566","videor/bio-bana-2.mp4?v=706c7e1a","videor/bio-bana-3.mp4?v=60026648","videor/bio-bana-4.mp4?v=df5f4bdd","videor/bio-bana-5.mp4?v=1af1db75","videor/bio-bana-6.mp4?v=6b4b12dd","videor/bio-bana-7.mp4?v=24f16ee0","videor/bio-bana-8.mp4?v=94d3909f","videor/bio-bana-9.mp4?v=77669883","videor/bio-bana-10.mp4?v=21fb3edd","videor/genetik.mp4?v=f4656dc8","videor/demokrati-valdeltagande.mp4?v=8d1449cb","videor/regering-lag.mp4?v=a485b44e","videor/sver-bana-1.mp4?v=1d36fd7a","videor/sver-bana-2.mp4?v=4917a97a","videor/sver-bana-3.mp4?v=fbf91df2","videor/sver-bana-4.mp4?v=fd4c9188","videor/sver-bana-5.mp4?v=b6a06724","videor/sver-bana-6.mp4?v=1e2d9fbe","videor/sver-bana-7.mp4?v=3305147f","videor/sver-bana-8.mp4?v=92a2380c","videor/sver-bana-9.mp4?v=fc8d3af3","videor/jude-bana-1.mp4?v=2bae122c","videor/jude-bana-2.mp4?v=c3634969","videor/jude-bana-3.mp4?v=f5fe7d00","videor/jude-bana-4.mp4?v=0f04e41c","videor/jude-bana-5.mp4?v=8c053bd0","videor/jude-bana-6.mp4?v=1d1be575","videor/microbit-bilen.mp4?v=55300cbf","videor/koordinatsystem.mp4?v=2018d2df","videor/fysik-rum-4.mp4?v=e16f6937","videor/fysik-rum-5.mp4?v=7f34d522","videor/fysik-rum-10.mp4?v=ff792460"];

const SIDOR = 'plugg9-v1-sidor-' + VERSION;
const VIDEOCACHE = 'plugg9-v1-videor';
const FONTCACHE = 'plugg9-v1-fonter';
const ROSTCACHE = 'plugg9-v1-rost';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SIDOR).then(c => c.addAll(FORCACHE.map(u => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const namn of await caches.keys()) {
      if (namn.startsWith('plugg9-') && ![SIDOR, VIDEOCACHE, FONTCACHE, ROSTCACHE].includes(namn)) await caches.delete(namn);
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
  if (e.data && e.data.typ === 'spara-rost') {
    e.waitUntil((async () => {
      const lista = await (await fetch(new URL('rost/alla.json', self.registration.scope).href, { cache: 'no-store' })).json();
      const c = await caches.open(ROSTCACHE);
      let klara = 0;
      for (let i = 0; i < lista.length; i += 8) {
        await Promise.all(lista.slice(i, i + 8).map(async u => {
          const url = new URL(u, self.registration.scope).href;
          try { if (!(await c.match(url))) { const s = await fetch(url); if (s.ok) await c.put(url, s); } klara++; } catch (x) {}
        }));
        if (e.source) e.source.postMessage({ typ: 'rost-sparad', klara, av: lista.length });
      }
    })());
  }
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

  // meningslistor för uppläsningen: nätet först (nya klipp syns direkt), cachen när det inte finns nät
  if (/\/rost\/[a-z-]+\.json$/.test(url.pathname)) {
    e.respondWith(caches.open(SIDOR).then(async c => {
      try { const s = await fetch(req, { cache: 'no-store' }); if (s.ok) c.put(req, s.clone()); return s; }
      catch (x) { return (await c.match(req, { ignoreSearch: true })) || Response.error(); }
    }));
    return;
  }

  // uppläsningsklipp: cache-first, sparas när de spelas första gången
  if (url.pathname.includes('/rost/klipp/')) {
    e.respondWith(caches.open(ROSTCACHE).then(async c => {
      const hit = await c.match(req, { ignoreSearch: true });
      if (hit) return hit;
      const svar = await fetch(req);
      if (svar.status === 200) c.put(req, svar.clone());
      return svar;
    }));
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
