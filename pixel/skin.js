/* Pixelgrafik för plattformsspelen. Byter BARA hur banan ritas:
   frågor, regler, fysik och banornas uppbyggnad är orörda. Varje sak betyder samma sak som förut:
   rulle = något att samla, dörr med ? = svara rätt för att komma förbi, figur med ! = uppdrag,
   taggar = aj, flaggan = mål. Grafik: Kenney "Pixel Platformer" (CC0) + egna sprites.
   v2: djup (himmel med toning, sol/måne, moln, dis, skuggor) och respons (damm, gnistor,
   dörrar som glider upp, kort skak vid skada). "Minska rörelse" i iPaden stänger av skak och moln.
   Kräver window.PIXEL_KARTA (sprite → [x,y,b,h]) och ../pixel/ark.png. */
(function () {
  'use strict';
  var K = window.PIXEL_KARTA;
  if (!K || typeof ritaBana !== 'function') return;
  var ark = new Image(), klar = false;
  ark.onload = function () { klar = true; forbered(); };
  ark.src = (document.currentScript ? document.currentScript.src.replace(/skin\.js.*$/, '') : '../pixel/') + 'ark.png';
  var lugnRorelse = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var orig = { ritaBana: ritaBana, himmel: himmel };

  // tema → [marktyp, bakgrundsremsor, natt]
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
    prov: ['gras', ['remsa-gron', 'remsa-gron2'], true],
    // Judendomsresan
    egypten: ['sand', ['remsa-oken'], false], oken: ['sand', ['remsa-oken'], false], sinai: ['sand', ['remsa-oken'], true],
    jerusalem: ['sand', ['remsa-oken'], false], synagoga: ['gras', ['remsa-gron2', 'remsa-gron'], true], hogtid: ['gras', ['remsa-gron', 'remsa-gron2'], true],
    // Pengakollen
    affar: ['gras', ['remsa-gron', 'remsa-gron2'], false], bank: ['sand', ['remsa-oken'], false], lan: ['gras', ['remsa-gron2', 'remsa-gron'], true],
    kok: ['gras', ['remsa-gron', 'remsa-gron2'], false],
    // Atomresan
    karna: ['sno', ['remsa-sno2', 'remsa-sno'], true], labb: ['gras', ['remsa-gron2', 'remsa-gron'], false],
    tabell: ['sno', ['remsa-sno', 'remsa-sno2'], false], salt: ['sand', ['remsa-oken'], false], neon: ['gras', ['remsa-gron2', 'remsa-gron'], true]
  };
  // bara sådant som tydligt är bakgrund (inga svampar eller kaktusar: de ser ut som saker man kan ta eller skada sig på)
  var DEKOR = { gras: ['gran', 'busk1', 'busk2', 'gran', 'busk2'], sand: ['busk1', 'busk2', 'busk1'], sno: ['gran', 'gran', 'busk1'] };
  var GRASFARG = { gras: '#2F8F4E', sand: '#B9814A', sno: '#A9C7D8' };

  var himmelFarg = {}, nattRemsor = {};
  function forbered() {
    var c = document.createElement('canvas'), g = c.getContext('2d');
    c.width = ark.width; c.height = ark.height; g.drawImage(ark, 0, 0);
    Object.keys(K).forEach(function (n) {
      if (n.indexOf('remsa-') !== 0) return;
      var r = K[n], d = g.getImageData(r[0] + 2, r[1] + 2, 1, 1).data;
      himmelFarg[n] = [d[0], d[1], d[2]];
      var nc = document.createElement('canvas'); nc.width = r[2]; nc.height = r[3];
      var ng = nc.getContext('2d'); ng.drawImage(ark, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]);
      ng.globalCompositeOperation = 'source-atop'; ng.fillStyle = 'rgba(12,20,52,.62)'; ng.fillRect(0, 0, r[2], r[3]);
      nattRemsor[n] = nc;
    });
  }
  function rgb(c, f, a) { f = f || 1; return 'rgba(' + Math.round(c[0] * f) + ',' + Math.round(c[1] * f) + ',' + Math.round(c[2] * f) + ',' + (a == null ? 1 : a) + ')'; }

  function spr(n, x, y, s, spegel) {
    var r = K[n]; if (!r) return;
    s = s || 1;
    if (spegel) { ctx.save(); ctx.translate(Math.round(x + r[2] * s), Math.round(y)); ctx.scale(-1, 1); ctx.drawImage(ark, r[0], r[1], r[2], r[3], 0, 0, r[2] * s, r[3] * s); ctx.restore(); }
    else ctx.drawImage(ark, r[0], r[1], r[2], r[3], Math.round(x), Math.round(y), r[2] * s, r[3] * s);
  }
  function stil() { return STIL[spel && spel.v && spel.v.tema] || STIL.smaland; }
  function skugga(x, y, b) { ctx.fillStyle = 'rgba(10,8,24,.28)'; ctx.fillRect(Math.round(x - b / 2), Math.round(y - 1), Math.round(b), 2); ctx.fillRect(Math.round(x - b / 2 + 2), Math.round(y + 1), Math.round(b - 4), 1); }

  // ---- effekter (egna partiklar, stegas med spelets tick) ----
  var fx = [], sistTick = -1, forraSpel = null, forra = {}, skak = 0, blixt = 0, flugor = [];
  function burst(x, y, n, farg, fart, upp) {
    for (var i = 0; i < n; i++) {
      var v = Math.random() * Math.PI * 2, f = (0.4 + Math.random()) * (fart || 1.5);
      fx.push({ x: x, y: y, vx: Math.cos(v) * f, vy: Math.sin(v) * f - (upp || 0), liv: 26 + (Math.random() * 14 | 0), max: 40, farg: farg, s: Math.random() < .3 ? 3 : 2, g: .06 });
    }
  }
  function damm(x, y, n, riktning) {
    for (var i = 0; i < n; i++) fx.push({ x: x + (Math.random() * 8 - 4), y: y - 1, vx: (Math.random() - .5) * 1.2 - (riktning || 0) * .6, vy: -Math.random() * .7, liv: 16 + (Math.random() * 10 | 0), max: 26, farg: 'rgba(235,228,214,.85)', s: 2, g: -.005 });
  }
  function stegaFx(steg) {
    for (var k = 0; k < steg; k++) for (var i = fx.length - 1; i >= 0; i--) {
      var q = fx[i]; q.x += q.vx; q.y += q.vy; q.vy += q.g; q.vx *= .97; if (--q.liv <= 0) fx.splice(i, 1);
    }
  }
  function upptack() {
    var p = spel.p, b = spel.bana;
    if (spel !== forraSpel) { forraSpel = spel; fx = []; forra = { paMark: true, hj: spel.hjartan }; flugor = []; }
    var paMark = p.paMark !== false, fx0 = p.x + p.w / 2, fy0 = p.y + p.h;
    if (paMark && !forra.paMark) damm(fx0, fy0, 7, 0);                                         // landning
    if (paMark && Math.abs(p.vx || 0) > 2.4 && tick % 9 === 0) damm(fx0 - (p.riktning || 1) * 5, fy0, 2, p.riktning || 1);   // springer
    forra.paMark = paMark;
    if (spel.hjartan < forra.hj) { skak = lugnRorelse ? 0 : 12; blixt = 14; }                // skada
    forra.hj = spel.hjartan;
    b.rullor.forEach(function (rl) { if (rl.tagen && !rl._fx) { rl._fx = 1; burst(rl.x, rl.y, 12, '#FFD36B', 1.6, .6); burst(rl.x, rl.y, 5, '#FFFFFF', 1.1, .4); } });
    b.portar.forEach(function (po) { if (po.oppen && po._t == null) { po._t = tick; burst(po.x, po.y - 60, 16, '#8BE07A', 1.8, .5); } });
    b.npcar.forEach(function (n) { if (n.klar && !n._fx) { n._fx = 1; burst(n.x, n.y - 30, 14, '#9FD0FF', 1.6, .5); } });
  }

  // ---- himmel och bakgrund ----
  var moln = [];
  for (var m = 0; m < 7; m++) moln.push({ x: m * 97 + (m * 37) % 50, y: 18 + (m * 23) % 70, s: 1 + (m % 3), fart: .04 + (m % 3) * .025 });
  function ritaMoln(x, y, s, natt) {
    var u = 4 * s;
    ctx.fillStyle = natt ? 'rgba(170,180,215,.18)' : 'rgba(255,255,255,.92)';
    ctx.fillRect(x, y + u, u * 6, u * 2); ctx.fillRect(x + u, y, u * 3, u); ctx.fillRect(x + u * 3, y - u * .5 | 0, u * 2, u * 1.5 | 0);
    ctx.fillStyle = natt ? 'rgba(120,130,170,.14)' : 'rgba(205,222,240,.95)';
    ctx.fillRect(x, y + u * 3 - 2, u * 6, 2);
  }
  window.himmel = function (tema) {
    if (!klar || lage !== 'bana') return orig.himmel(tema);
    var st = STIL[tema] || STIL.smaland;
    if (st[2]) {                                               // natt: spelets egen himmel med stjärnor + en måne
      orig.himmel(tema);
      ctx.fillStyle = 'rgba(255,248,220,.12)'; ctx.beginPath(); ctx.arc(W - 70, 46, 30, 0, 7); ctx.fill();
      ctx.fillStyle = '#F4EED2'; ctx.fillRect(W - 82, 36, 22, 22); ctx.fillStyle = '#DCD3AE'; ctx.fillRect(W - 76, 42, 5, 5); ctx.fillRect(W - 68, 50, 4, 4);
      return;
    }
    var c = himmelFarg[st[1][0]] || [155, 227, 196];
    // uppåt mot himmelsblått (öken: varmt), nedåt mot remsans egen horisontfärg så att de möts utan kant
    var topp = st[0] === 'sand' ? [226, 150, 96] : st[0] === 'sno' ? [118, 176, 226] : [88, 164, 232];
    var g = ctx.createLinearGradient(0, 0, 0, GR * TILE - 120 + OFF);
    g.addColorStop(0, rgb(topp)); g.addColorStop(.55, rgb([(topp[0] + c[0]) / 2, (topp[1] + c[1]) / 2, (topp[2] + c[2]) / 2])); g.addColorStop(1, rgb(c));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, VH);
    // sol med sken
    var sx = W - 78, sy = 52, sg = ctx.createRadialGradient(sx, sy, 6, sx, sy, 70);
    sg.addColorStop(0, 'rgba(255,250,215,.75)'); sg.addColorStop(1, 'rgba(255,250,215,0)');
    ctx.fillStyle = sg; ctx.fillRect(sx - 70, sy - 70, 140, 140);
    ctx.fillStyle = '#FFF6CF'; ctx.fillRect(sx - 12, sy - 12, 24, 24); ctx.fillRect(sx - 15, sy - 8, 30, 16); ctx.fillRect(sx - 8, sy - 15, 16, 30);
  };
  function ritaPixelBakgrund(cam) {
    var st = stil(), remsor = st[1], natt = st[2], y0 = GR * TILE - 120, bredd = 48;
    // moln (driver av sig själva + lite parallax)
    moln.forEach(function (o) {
      var x = ((o.x - cam * .06 - (lugnRorelse ? 0 : tick * o.fart)) % (W + 140) + W + 140) % (W + 140) - 100;
      ritaMoln(Math.round(x), o.y, o.s, natt);
    });
    var p = Math.floor(-cam * 0.18) % (bredd * remsor.length);
    for (var x = p - bredd * remsor.length, i = 0; x < W + bredd; x += bredd, i++) {
      var n = remsor[((i % remsor.length) + remsor.length) % remsor.length], r = K[n];
      if (natt && nattRemsor[n]) ctx.drawImage(nattRemsor[n], 0, 0, r[2], r[3], x, y0, r[2] * 2, r[3] * 2);
      else ctx.drawImage(ark, r[0], r[1], r[2], r[3], x, y0, r[2] * 2, r[3] * 2);
    }
    // dis framför det avlägsna: ger djup
    var c = himmelFarg[remsor[0]] || [155, 227, 196], dg = ctx.createLinearGradient(0, y0, 0, GR * TILE);
    dg.addColorStop(0, natt ? 'rgba(14,23,48,0)' : rgb(c, 1.05, 0)); dg.addColorStop(1, natt ? 'rgba(14,23,48,.35)' : rgb(c, 1.05, .45));
    ctx.fillStyle = dg; ctx.fillRect(0, y0, W, GR * TILE - y0);
    // närmare lager: träd och buskar som står på marken
    var dekor = DEKOR[st[0]], steg = 70, p2 = -cam * 0.5, forsta = Math.floor((cam * 0.5) / steg) - 1;
    ctx.globalAlpha = natt ? .45 : .75;
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
    if (topp) {
      spr(typ + (fastRuta(c, r + 1) ? '-' : '-platta-') + sida, x, y);
      // små grässtrån/stenar på kanten (ingen betydelse i spelet)
      var h = (c * 31 + r * 17) % 11;
      if (h < 3) { ctx.fillStyle = GRASFARG[typ]; ctx.fillRect(x + 4 + h * 5, y - 2, 1, 2); ctx.fillRect(x + 6 + h * 5, y - 3, 1, 3); ctx.fillRect(x + 8 + h * 5, y - 2, 1, 2); }
    } else spr(sida === 'v' || sida === 'ensam' ? 'jord-v' : sida === 'h' ? 'jord-h' : ((c * 7 + r * 3) % 3 ? 'jord-m' : 'jord-m2'), x, y);
  }

  // ---- föremål ----
  window.ritaRulle = function (x, y) {
    var b = Math.round(Math.sin(tick / 14 + x) * 2);
    if (tick % 50 < 6 && !lugnRorelse) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(Math.round(x + 7), Math.round(y - 15 + b), 2, 2); }   // glimt
    spr('rulle', x - 11, y - 13 + b, 2);
  };
  window.ritaPort = function (p) {
    var x = Math.round(p.x), y = p.y;
    skugga(x, y, 40);
    if (p.oppen) {
      var t = p._t == null ? 99 : (tick - p._t), lyft = Math.min(72, t * 5);
      ctx.fillStyle = 'rgba(16,22,40,.6)'; ctx.fillRect(x - 18, y - 72, 36, 72);                    // öppningen
      ctx.save(); ctx.beginPath(); ctx.rect(x - 18, y - 72, 36, 72); ctx.clip();
      spr('dorr-o', x - 18, y - 72 - lyft, 2); spr('dorr-u', x - 18, y - 36 - lyft, 2); ctx.restore();   // dörren glider upp
      ctx.fillStyle = '#5B3A24'; ctx.fillRect(x - 21, y - 76, 4, 76); ctx.fillRect(x + 17, y - 76, 4, 76); ctx.fillRect(x - 21, y - 78, 42, 4);   // karm
      var sk = Math.min(1, t / 10), s = 2 * (sk < 1 ? sk * 1.25 : 1);
      if (s > 0.2) spr('bock', x - 11 * s / 2, y - 100 - Math.round(Math.sin(tick / 20) * 2), s);
      return;
    }
    p.glod = (p.glod + .05) % (Math.PI * 2);
    var gl = .55 + .45 * Math.sin(p.glod), sg = ctx.createRadialGradient(x, y - 92, 2, x, y - 92, 26);
    sg.addColorStop(0, 'rgba(242,168,59,' + (.55 * gl) + ')'); sg.addColorStop(1, 'rgba(242,168,59,0)');
    ctx.fillStyle = sg; ctx.fillRect(x - 26, y - 118, 52, 52);
    spr('dorr-o', x - 18, y - 72, 2); spr('dorr-u', x - 18, y - 36, 2);
    spr('fraga', x - 11, y - 103 + Math.round(Math.sin(tick / 18) * 2), 2);
  };
  window.ritaMal = function (x, y) {
    skugga(x + 8, y, 22);
    spr('stang', x - 4, y - 36, 2);
    spr(Math.floor(tick / 16) % 2 ? 'flagga2' : 'flagga1', x - 4, y - 72, 2);
    if (!lugnRorelse && tick % 40 === 0) burst(x + 14, y - 60, 3, '#FFE08A', .7, .3);
  };
  window.ritaNpcFigur = function (n) {
    var x = n.x, y = n.y, b = Math.floor(tick / 30) % 2;
    skugga(x, y, 18);
    spr(Math.floor(tick / 40) % 2 ? 'npc2' : 'npc1', x - 12, y - 24 - b, 1, true);
    spr('bubbla', x - 11, y - 52 + Math.round(Math.sin(tick / 20) * 2), 2);
  };
  window.ritaSpelare = function (p) {
    var x = p.x + p.w / 2, y = p.y + p.h, v = p.riktning || 1;
    var fart = Math.abs(p.vx || 0), paMark = p.paMark !== false;
    var steg = Math.floor(tick / 6) % 2, bild = !paMark ? 'spelare2' : fart > .3 ? (steg ? 'spelare2' : 'spelare1') : 'spelare1';
    var gung = paMark && fart > .3 ? steg : 0;
    // skugga på marken under spelaren (krymper när man är högt upp)
    var c = Math.floor(x / TILE), golv = -1;
    for (var r = Math.max(0, Math.floor(y / TILE)); r < ROWS; r++) if (fastRuta(c, r)) { golv = r * TILE; break; }
    if (golv > 0) { var h = Math.max(0, golv - y), bb = Math.max(4, 16 - h / 8); skugga(x, golv, bb); }
    var sq = clamp(p.squash || 0, -1, 1);
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(1 + sq * .15, 1 - sq * .2);
    spr(bild, -12, -24 - gung, 1, v < 0);
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
    var b = spel.bana, cam = Math.round(spel.cam), natt = stil()[2];
    upptack();
    var steg = sistTick < 0 ? 1 : Math.max(0, Math.min(4, tick - sistTick)); sistTick = tick;
    stegaFx(steg);
    if (skak > 0) skak -= steg; if (blixt > 0) blixt -= steg;
    himmel(spel.v.tema);
    ctx.save(); ctx.translate(0, OFF);
    if (skak > 0) ctx.translate(Math.round((Math.random() - .5) * 4), Math.round((Math.random() - .5) * 3));
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
      ctx.fillRect(Math.round(q.x - s / 2), Math.round(q.y - s / 2), s, s);
      ctx.globalAlpha = 1;
    });
    if (!(spel.p.blink > 0 && Math.floor(tick / 4) % 2)) ritaSpelare(spel.p);
    // egna effekter ovanpå
    fx.forEach(function (q) { ctx.globalAlpha = Math.min(1, q.liv / 12); ctx.fillStyle = q.farg; ctx.fillRect(Math.round(q.x), Math.round(q.y), q.s, q.s); });
    ctx.globalAlpha = 1;
    // eldflugor på natten
    if (natt && !lugnRorelse) {
      if (!flugor.length) for (var f = 0; f < 9; f++) flugor.push({ x: Math.random() * 600, y: 40 + Math.random() * 150, v: Math.random() * 6 });
      flugor.forEach(function (o) {
        var fxp = ((o.x - cam * .7 + Math.sin(tick / 60 + o.v) * 14) % (W + 40) + W + 40) % (W + 40) + cam - 20;
        ctx.globalAlpha = .45 + .45 * Math.sin(tick / 20 + o.v); ctx.fillStyle = '#FFEFA0';
        ctx.fillRect(Math.round(fxp), Math.round(o.y + Math.sin(tick / 45 + o.v) * 8), 2, 2);
      });
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // ljus: mjuk vinjett i kanterna, röd blink vid skada
    var vg = ctx.createRadialGradient(W / 2, VH * .45, VH * .35, W / 2, VH * .45, VH * .95);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, natt ? 'rgba(2,4,14,.45)' : 'rgba(20,24,40,.22)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, VH);
    if (blixt > 0) { ctx.fillStyle = 'rgba(224,60,80,' + (blixt / 14 * .28) + ')'; ctx.fillRect(0, 0, W, VH); }
    tips.style.opacity = spel.cam < 40 ? String(clamp((40 - spel.cam) / 25, 0, 1)) : '0';
  };

  // kartan och menyerna ritas som förut (skarp vektorgrafik)
  var origKarta = window.ritaKarta;
  if (typeof origKarta === 'function') window.ritaKarta = function () { duk.style.imageRendering = 'auto'; tips.style.opacity = '0'; return origKarta.apply(this, arguments); };
})();
