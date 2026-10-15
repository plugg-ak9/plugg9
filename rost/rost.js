/* Röstlager för Plugg åk 9: spelar inspelade klipp (Gemini-rösten Leda) i stället för enhetens röst.
   Spelen anropar speechSynthesis.speak() som vanligt. Här fångas varje mening, och ett färdigt klipp spelas
   om det finns (rost/<spel>.json = mening → klipp-id). Saknas klipp läser enhetens röst just den meningen.
   Inställningar i localStorage: plugg9.rostfart (0.7–1.8, standard 1.1), plugg9.rost = 'enhet' stänger av klippen.
   Läggs in av bygget: <script src="../rost/rost.js" data-spel="biologiresan"></script> */
(function () {
  'use strict';
  var ss = window.speechSynthesis;
  if (!ss || !window.Audio) return;
  var skript = document.currentScript;
  var spel = skript && skript.dataset.spel;
  var bas = skript ? skript.src.replace(/rost\.js(\?.*)?$/, '') : '../rost/';
  function las(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  if (las('plugg9.rost', '') === 'enhet' || !spel) return;

  var nativSpeak = ss.speak.bind(ss), nativCancel = ss.cancel.bind(ss);
  var manifest = null, ko = [], aktuell = null, upptagen = false, generation = 0;
  var ljud = new Audio(); ljud.preload = 'auto';
  if ('preservesPitch' in ljud) ljud.preservesPitch = true;

  fetch(bas + spel + '.json').then(function (r) { return r.ok ? r.json() : {}; })
    .then(function (m) { manifest = m; }).catch(function () { manifest = {}; });

  // samma normalisering som rost/meningar.mjs
  function nyckel(t) {
    return String(t).replace(/\s+/g, ' ').trim().replace(/[\s.!?:;,…–-]+$/, '').replace(/^[\s–-]+/, '');
  }
  function fart() { var f = parseFloat(las('plugg9.rostfart', '1.1')); return isFinite(f) ? Math.min(1.8, Math.max(0.7, f)) : 1.1; }
  function klippFor(text) {
    if (!manifest) return null;
    var k = nyckel(text);
    if (manifest[k]) return [manifest[k]];
    // "Rätt svar: Svampen." → två klipp
    if (k.indexOf(': ') > 0) {
      var delar = k.split(/:\s+/).map(nyckel), ids = [];
      for (var i = 0; i < delar.length; i++) { if (!manifest[delar[i]]) return null; ids.push(manifest[delar[i]]); }
      return ids;
    }
    return null;
  }
  function signal(u, typ) { try { u.dispatchEvent(new Event(typ)); } catch (e) {} }

  // iOS: ljud får bara starta efter en tryckning. Lås upp elementet vid första tryckningen.
  var upplast = false;
  function tystnad() {   // 50 ms tyst wav, skapad här så att inget behöver laddas
    var n = 1200, b = new ArrayBuffer(44 + n * 2), v = new DataView(b), s = 'RIFF', i;
    function str(o, t) { for (i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); }
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, 1, true); v.setUint32(24, 24000, true); v.setUint32(28, 48000, true); v.setUint16(32, 2, true);
    v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 2, true);
    return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
  }
  function lasUpp() {
    if (upplast || upptagen) return; upplast = true;
    try { ljud.src = tystnad(); var p = ljud.play(); if (p && p.catch) p.catch(function () { upplast = false; }); } catch (e) { upplast = false; }
  }
  ['pointerdown', 'touchend', 'keydown'].forEach(function (h) { addEventListener(h, lasUpp, { capture: true, passive: true }); });

  function nasta() {
    if (upptagen) return;
    var u = ko.shift();
    if (!u) { aktuell = null; return; }
    upptagen = true; aktuell = u;
    var min = generation;
    var ids = klippFor(u.text);
    var takt = Math.min(2, Math.max(0.5, fart() * ((u.rate || 0.94) / 0.94)));
    var gjort = false;
    function klar(egetSlut) { if (min !== generation || gjort) return; gjort = true; upptagen = false; if (egetSlut) signal(u, 'end'); nasta(); }
    function enhetensRost() {
      if (min !== generation) return;
      var vakt = setTimeout(function () { klar(true); }, 3000 + String(u.text).length * 120);
      var slut = function () { clearTimeout(vakt); u.removeEventListener('end', slut); u.removeEventListener('error', slut); klar(false); };
      // enhetens röst skickar själv 'end' till spelet; vi lyssnar bara för att gå vidare i kön
      u.addEventListener('end', slut); u.addEventListener('error', slut);
      try { u.rate = Math.min(2, (u.rate || 1) * fart()); nativSpeak(u); } catch (e) { slut(); }
    }
    if (!ids) { enhetensRost(); return; }
    signal(u, 'start');
    var i = 0;
    (function spela() {
      if (min !== generation) return;
      if (i >= ids.length) { klar(true); return; }
      ljud.src = bas + 'klipp/' + ids[i++] + '.m4a';
      ljud.playbackRate = takt; ljud.defaultPlaybackRate = takt;
      ljud.onended = spela;
      ljud.onerror = function () { ljud.onerror = null; enhetensRost(); };   // t.ex. offline och inte sparat än
      var p = ljud.play();
      if (p && p.catch) p.catch(function () { ljud.onerror = null; enhetensRost(); });
    })();
  }

  // fartknapp i spelet, bredvid uppläsningsknappen (🔊): trycket växlar fart, sparas för alla spel
  var FARTER = [0.9, 1, 1.1, 1.25, 1.4, 1.6];
  function fartText(f) { return String(f).replace('.', ',') + '×'; }
  function fartKnapp() {
    var lj = document.getElementById('ljudknapp');
    if (!lj || document.getElementById('rostfart')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.id = 'rostfart'; b.className = lj.className;
    b.title = 'Uppläsningens fart'; b.setAttribute('aria-label', 'Uppläsningens fart');
    b.style.cssText = 'font:700 13px/1 system-ui,sans-serif;min-width:44px;padding:0 6px';
    b.textContent = fartText(fart());
    b.onclick = function () {
      var nu = fart(), i = FARTER.findIndex(function (f) { return f > nu + 0.01; });
      var ny = FARTER[i < 0 ? 0 : i];
      try { localStorage.setItem('plugg9.rostfart', String(ny)); } catch (e) {}
      b.textContent = fartText(ny);
      ss.cancel(); var u = new SpeechSynthesisUtterance('Så här snabbt.'); u.lang = 'sv-SE'; u.rate = .94; ss.speak(u);
    };
    lj.parentNode.insertBefore(b, lj);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fartKnapp); else fartKnapp();

  ss.speak = function (u) { ko.push(u); setTimeout(nasta, 0); };
  ss.cancel = function () {
    generation++; ko = []; upptagen = false; aktuell = null;
    try { ljud.onended = null; ljud.onerror = null; ljud.pause(); } catch (e) {}
    nativCancel();
  };
})();
