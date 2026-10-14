/* Pixelgrafik för plattformsspelen (prov i Biologiresan). Byter BARA hur banan ritas:
   frågor, regler, fysik och banornas uppbyggnad är orörda. Varje sak betyder samma sak som förut:
   rulle = något att samla, dörr med ? = svara rätt för att komma förbi, figur med ! = uppdrag,
   taggar = aj, flaggan = mål. Grafik: Kenney "Pixel Platformer" (CC0) + egna sprites.
   Kräver window.PIXEL_KARTA (sprite → [x,y,b,h]) och ../pixel/ark.png. */
(function () {
  'use strict';
  var K = window.PIXEL_KARTA;
  if (!K || typeof ritaBana !== 'function') return;
  var ark = new Image(), klar = false;
  ark.onload = function () { klar = true; forbered(); };
  ark.src = (document.currentScript ? document.currentScript.src.replace(/skin\.js.*$/, '') : '../pixel/') + 'ark.png';

  var orig = { ritaBana: ritaBana, himmel: himmel };

  // tema → marktyp, bakgrundsremsor, natt
  var STIL = {
    smaland: ['gras', ['remsa-gron', 'remsa-gron2'], false],
    gotland: ['sand', ['remsa-oken'], false],
    fjall: ['sno', ['remsa-sno', 'remsa-sno2'], true],
    domstol: ['gras', ['remsa-gron2', 'remsa-gron'], true],
    medier: ['sno', ['remsa-sno2', 'remsa-sno'], true],
    ideologi: ['sand', ['remsa-oken'], false],
    riksdag: ['gras', ['remsa-gron', 'remsa-gron2'], true],
    arbete: ['sand', ['remsa-oken'], false],
    global: ['sno', ['remsa-sno', 'remsa-sno2'], true],
    prov: ['gras', ['remsa-gron', 'remsa-gron2'], true]
  };
  // bara sådant som tydligt är bakgrund (inga svampar eller kaktusar: de ser ut som saker man kan ta eller skada sig på)
  var DEKOR = { gras: ['gran', 'busk1', 'busk2', 'gran', 'busk2'], sand: ['busk1', 'busk2', 'busk1'], sno: ['gran', 'gran', 'busk1'] };

  var himmelFarg = {}, nattRemsor = {};
  function forbered() {
    // himlens färg = översta pixeln i varje remsa; nattversioner = remsan mörkad
    var c = document.createElement('canvas'), g = c.getContext('2d');
    c.width = ark.width; c.height = ark.height; g.drawImage(ark, 0, 0);
    Object.keys(K).forEach(function (n) {
      if (n.indexOf('remsa-') !== 0) return;
      var r = K[n], d = g.getImageData(r[0] + 2, r[1] + 2, 1, 1).data;
      himmelFarg[n] = 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')';
      var nc = document.createElement('canvas'); nc.width = r[2]; nc.height = r[3];
      var ng = nc.getContext('2d'); ng.drawImage(ark, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]);
      ng.globalCompositeOperation = 'source-atop'; ng.fillStyle = 'rgba(12,20,52,.62)'; ng.fillRect(0, 0, r[2], r[3]);
      nattRemsor[n] = nc;
    });
  }

  // rita sprite n med vänstra överkanten i (x,y), skala s, ev. spegelvänd
  function spr(n, x, y, s, spegel) {
    var r = K[n]; if (!r) return;
    s = s || 1;
    if (spegel) { ctx.save(); ctx.translate(Math.round(x + r[2] * s), Math.round(y)); ctx.scale(-1, 1); ctx.drawImage(ark, r[0], r[1], r[2], r[3], 0, 0, r[2] * s, r[3] * s); ctx.restore(); }
    else ctx.drawImage(ark, r[0], r[1], r[2], r[3], Math.round(x), Math.round(y), r[2] * s, r[3] * s);
  }
  function stil() { return STIL[spel && spel.v && spel.v.tema] || STIL.smaland; }

  // ---- himmel och bakgrund ----
  window.himmel = function (tema) {
    if (!klar || lage !== 'bana') return orig.himmel(tema);
    var st = STIL[tema] || STIL.smaland;
    if (st[2]) return orig.himmel(tema);                       // natt: spelets egen himmel med stjärnor
    ctx.fillStyle = himmelFarg[st[1][0]] || '#9be3c4'; ctx.fillRect(0, 0, W, VH);
  };
  function ritaPixelBakgrund(cam) {
    var st = stil(), remsor = st[1], natt = st[2], y0 = GR * TILE - 120, bredd = 48;
    var p = Math.floor(-cam * 0.2) % (bredd * remsor.length);
    for (var x = p - bredd * remsor.length, i = 0; x < W + bredd; x += bredd, i++) {
      var n = remsor[((i % remsor.length) + remsor.length) % remsor.length], r = K[n];
      if (natt && nattRemsor[n]) ctx.drawImage(nattRemsor[n], 0, 0, r[2], r[3], x, y0, r[2] * 2, r[3] * 2);
      else ctx.drawImage(ark, r[0], r[1], r[2], r[3], x, y0, r[2] * 2, r[3] * 2);
    }
    // närmare lager: träd och buskar som står på marken, rör sig hälften så fort som kameran
    var dekor = DEKOR[st[0]], steg = 70, p2 = -cam * 0.5;
    var forsta = Math.floor((cam * 0.5) / steg) - 1;
    ctx.globalAlpha = natt ? .4 : .6;                          // blekare än spelets saker
    for (var k = forsta; k < forsta + Math.ceil(W / steg) + 3; k++) {
      var namn = dekor[((k % dekor.length) + dekor.length) % dekor.length];
      var dx = k * steg + p2 + (Math.abs(Math.sin(k * 12.9898)) * 30 | 0);
      spr(namn, dx, GR * TILE - 27, 1.5);
    }
    ctx.globalAlpha = 1;
  }

  // ---- markrutor ----
  function markRuta(c, r, x, y) {
    var typ = stil()[0], topp = !fastRuta(c, r - 1), V = fastRuta(c - 1, r), H = fastRuta(c + 1, r);
    var sida = !V && !H ? 'ensam' : !V ? 'v' : !H ? 'h' : 'm';
    if (topp) spr(typ + (fastRuta(c, r + 1) ? '-' : '-platta-') + sida, x, y);
    else spr(sida === 'v' || sida === 'ensam' ? 'jord-v' : sida === 'h' ? 'jord-h' : ((c * 7 + r * 3) % 3 ? 'jord-m' : 'jord-m2'), x, y);
  }

  // ---- föremål ----
  window.ritaRulle = function (x, y) {
    var b = Math.round(Math.sin(tick / 14 + x) * 2);
    spr('rulle', x - 11, y - 13 + b, 2);
  };
  window.ritaPort = function (p) {
    var x = p.x, y = p.y;
    if (p.oppen) {
      ctx.fillStyle = 'rgba(16,22,40,.55)'; ctx.fillRect(Math.round(x - 18), y - 72, 36, 72);   // öppen dörröppning
      ctx.save(); ctx.translate(Math.round(x - 18), y - 72); ctx.scale(.3, 1);
      spr('dorr-o', 0, 0, 2); spr('dorr-u', 0, 36, 2); ctx.restore();                               // dörren uppslagen
      spr('bock', x - 11, y - 100, 2);
      return;
    }
    p.glod = (p.glod + .05) % (Math.PI * 2);
    var gl = .55 + .45 * Math.sin(p.glod);
    ctx.globalAlpha = .28 * gl; ctx.fillStyle = '#F2A83B'; ctx.beginPath(); ctx.arc(x, y - 92, 20, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    spr('dorr-o', x - 18, y - 72, 2); spr('dorr-u', x - 18, y - 36, 2);
    spr('fraga', x - 11, y - 103 + Math.round(Math.sin(tick / 18) * 2), 2);
  };
  window.ritaMal = function (x, y) {
    spr('stang', x - 4, y - 36, 2);
    spr(Math.floor(tick / 16) % 2 ? 'flagga2' : 'flagga1', x - 4, y - 72, 2);
  };
  window.ritaNpcFigur = function (n) {
    var x = n.x, y = n.y;
    spr(Math.floor(tick / 40) % 2 ? 'npc2' : 'npc1', x - 12, y - 24, 1, true);
    spr('bubbla', x - 11, y - 52 + Math.round(Math.sin(tick / 20) * 2), 2);
  };
  window.ritaSpelare = function (p) {
    var x = p.x + p.w / 2, y = p.y + p.h, v = p.riktning || 1;
    var fart = Math.abs(p.vx || 0), paMark = p.paMark !== false;
    var bild = !paMark ? 'spelare2' : fart > .3 ? (Math.floor(tick / 7) % 2 ? 'spelare2' : 'spelare1') : 'spelare1';
    var sq = clamp(p.squash || 0, -1, 1);
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(1 + sq * .15, 1 - sq * .2);
    spr(bild, -12, -24, 1, v < 0);
    ctx.restore();
  };

  // tips om knapparna som skarp HTML i stället för suddig text i duken
  var tips = document.createElement('div');
  tips.style.cssText = 'position:absolute;left:50%;top:10px;transform:translateX(-50%);max-width:92%;padding:8px 14px;border-radius:10px;' +
    'background:rgba(10,16,34,.82);color:#F6EDDA;font:600 15px/1.3 Assistant,system-ui,sans-serif;text-align:center;pointer-events:none;opacity:0;transition:opacity .3s';
  tips.textContent = (window.matchMedia && !matchMedia('(hover:hover) and (pointer:fine)').matches)
    ? '◀ ▶ springer · HOPP hoppar · dörrarna med ? öppnas när du svarar rätt'
    : 'Pilarna springer · mellanslag hoppar · dörrarna med ? öppnas när du svarar rätt';
  var lada = document.getElementById('duk-lada'); if (lada) lada.appendChild(tips);

  // ---- hela banan ----
  window.ritaBana = function () {
    if (!klar) return orig.ritaBana();
    duk.style.imageRendering = 'pixelated';
    ctx.imageSmoothingEnabled = false;
    var b = spel.bana, cam = Math.round(spel.cam);
    himmel(spel.v.tema);
    ctx.save(); ctx.translate(0, OFF);
    ritaPixelBakgrund(cam);
    // under marklinjen är det mörkt, så att gropar syns som hål man kan ramla ner i
    var g = ctx.createLinearGradient(0, GR * TILE, 0, ROWS * TILE + 40);
    g.addColorStop(0, '#2A2240'); g.addColorStop(1, '#0B0814');
    ctx.fillStyle = g; ctx.fillRect(0, GR * TILE, W, ROWS * TILE + 200);
    ctx.translate(-cam, 0);
    var c0 = Math.max(0, Math.floor(cam / TILE) - 1), c1 = Math.min(b.cols, Math.ceil((cam + W) / TILE) + 1);
    for (var c = c0; c < c1; c++) for (var r = 0; r < ROWS; r++) {
      var ch = b.g[r][c]; if (ch === '.') continue;
      if (ch === '#') markRuta(c, r, c * TILE, r * TILE);
      else if (ch === '^') spr('taggar', c * TILE, r * TILE);
    }
    b.rorliga.forEach(function (m) {
      var bitar = Math.max(2, Math.round(m.w / TILE));
      for (var i = 0; i < bitar; i++) spr(i === 0 ? 'bro-v' : i === bitar - 1 ? 'bro-h' : 'bro-m', m.x + i * (m.w / bitar), m.y - 8);
    });
    b.rullor.forEach(function (rl) { if (!rl.tagen) ritaRulle(rl.x, rl.y, '#F2A83B'); });
    if (b.hav && typeof ritaHav === 'function') ritaHav(b.hav);
    b.npcar.forEach(function (n) { if (!n.klar) ritaNpcFigur(n); });
    b.portar.forEach(ritaPort);
    ritaMal(b.malX + 34, GR * TILE);
    spel.partiklar.forEach(function (q) {
      ctx.globalAlpha = (q.liv / (q.f ? 20 : 26)) * (q.f ? .5 : 1);
      ctx.fillStyle = q.f || '#F2A83B'; var s = Math.max(2, Math.round((q.r || 2) * 1.5));
      ctx.fillRect(Math.round(q.x - s / 2), Math.round(q.y - s / 2), s, s);                       // fyrkantiga pixelpartiklar
      ctx.globalAlpha = 1;
    });
    if (!(spel.p.blink > 0 && Math.floor(tick / 4) % 2)) ritaSpelare(spel.p);
    ctx.restore();
    tips.style.opacity = spel.cam < 40 ? String(clamp((40 - spel.cam) / 25, 0, 1)) : '0';
  };

  // kartan och menyerna ritas som förut (skarp vektorgrafik)
  var origKarta = window.ritaKarta;
  if (typeof origKarta === 'function') window.ritaKarta = function () { duk.style.imageRendering = 'auto'; tips.style.opacity = '0'; return origKarta.apply(this, arguments); };
})();
