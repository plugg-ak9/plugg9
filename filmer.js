/* "Titta först": korta filmer om banans (eller rummets) område innan man spelar.
   Läggs in av bygget i spel som har filmer: window.BANFILMER = { id: {src, rubrik} | [{src, rubrik}, ...] }.
   Plattformsspelen: knappen läggs i banans första ruta (efter startaBana).
   Fysiklabbet: knappen läggs i rummets rubrikdel (efter visaRum).
   Rör inte spelets regler eller sparning; filmen visas ovanpå och stängs med "Spela". */
(function () {
  'use strict';
  var F = window.BANFILMER;
  if (!F) return;
  var plattform = typeof window.startaBana === 'function', labb = typeof window.visaRum === 'function';
  if (!plattform && !labb) return;

  var stil = document.createElement('style');
  stil.textContent =
    '.tf-knapp{display:inline-flex;align-items:center;gap:8px}' +
    '.tf-labbknapp{font:700 1rem/1.2 inherit;background:#F2C14E;color:#2A1C00;border:0;border-radius:12px;padding:10px 16px;margin-top:10px;cursor:pointer;box-shadow:0 3px 0 #B88A1A}' +
    '.tf-labbknapp:active{transform:translateY(2px);box-shadow:0 1px 0 #B88A1A}' +
    '#tf-lada{position:fixed;inset:0;z-index:2147483000;background:#05080FEE;display:grid;place-items:center;padding:16px}' +
    '#tf-lada[hidden]{display:none}' +
    '#tf-lada .tf-inre{display:grid;gap:12px;justify-items:center;max-width:min(560px,100%)}' +
    '#tf-lada video{max-width:100%;max-height:calc(100vh - 160px);border-radius:14px;background:#000}' +
    '#tf-lada p{margin:0;color:#F6EDDA;font:700 17px/1.3 system-ui,sans-serif;text-align:center}' +
    '#tf-lada .tf-rad{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}' +
    '#tf-lada button{font:700 16px system-ui,sans-serif;border-radius:12px;padding:11px 18px;cursor:pointer;border:2px solid #7EA6FF;background:transparent;color:#DCE6FF}' +
    '#tf-lada button.tf-spela{background:#5B87F0;border-color:#5B87F0;color:#08122b}';
  document.head.appendChild(stil);

  var lada = document.createElement('div');
  lada.id = 'tf-lada'; lada.hidden = true;
  lada.innerHTML = '<div class="tf-inre"><p id="tf-rubrik"></p><video id="tf-video" controls playsinline preload="metadata"></video>' +
    '<div class="tf-rad"><button type="button" id="tf-nasta" hidden>Nästa film →</button><button type="button" class="tf-spela" id="tf-spela"></button></div></div>';
  document.body.appendChild(lada);
  var video = lada.querySelector('video'), rubrik = lada.querySelector('#tf-rubrik'), nasta = lada.querySelector('#tf-nasta');
  lada.querySelector('#tf-spela').textContent = plattform ? 'Spela banan →' : 'Till rummet →';

  var lista = [], pos = 0;
  function lista_(film) { return Array.isArray(film) ? film : [film]; }
  function visaFilm() {
    var f = lista[pos];
    rubrik.textContent = (lista.length > 1 ? (pos + 1) + ' av ' + lista.length + ': ' : '') + f.rubrik + ' – titta först, sen spelar du';
    video.src = f.src; nasta.hidden = pos >= lista.length - 1;
    var p = video.play(); if (p && p.catch) p.catch(function () {});
  }
  function oppna(film) {
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
    lista = lista_(film); pos = 0; lada.hidden = false; visaFilm();
  }
  function stang() { video.pause(); lada.hidden = true; }
  lada.querySelector('#tf-spela').onclick = stang;
  nasta.onclick = function () { if (pos < lista.length - 1) { pos++; visaFilm(); } };
  video.addEventListener('ended', function () { if (pos < lista.length - 1) { pos++; visaFilm(); } else lada.querySelector('#tf-spela').focus(); });
  function text(film) { var n = lista_(film).length; return n > 1 ? '▶ Titta först (' + n + ' korta filmer)' : '▶ Titta först (1 min)'; }

  if (plattform) {
    // efter att banan startat: knappen i första rutan (bredvid "Vidare"/"Sätt igång")
    var orig = window.startaBana;
    window.startaBana = function (id) {
      var r = orig.apply(this, arguments);
      var film = F[id] || F[String(id)];
      if (film) setTimeout(function () {
        var vidare = document.getElementById('vidare');
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'knapp tf-knapp'; b.textContent = text(film);
        b.onclick = function () { oppna(film); };
        if (vidare && vidare.parentNode) vidare.parentNode.insertBefore(b, vidare);
        else {                                 // ingen inledningsruta: visa knappen en stund överst
          b.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:40';
          document.body.appendChild(b); setTimeout(function () { b.remove(); }, 9000);
        }
      }, 50);
      return r;
    };
  } else {
    // Fysiklabbet: knappen under rummets namn
    var origRum = window.visaRum;
    window.visaRum = function (id) {
      var r = origRum.apply(this, arguments);
      try {
        var film = F[id] || F[String(id)], t = document.querySelector('.rumhuvud .t');
        if (film && t && !t.querySelector('.tf-labbknapp')) {
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'tf-labbknapp'; b.textContent = text(film);
          b.onclick = function () { oppna(film); };
          t.appendChild(b);
        }
      } catch (e) {}
      return r;
    };
  }
})();
