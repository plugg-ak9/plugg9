/* "Titta först": en kort film om banans område innan man spelar den.
   Läggs in av bygget i spel som har filmer (window.BANFILMER = {banans id: {src, rubrik}}).
   Rör inte spelets regler: knappen läggs bara till i banans första ruta, och filmen visas ovanpå. */
(function () {
  'use strict';
  var F = window.BANFILMER;
  if (!F || typeof startaBana !== 'function') return;

  var stil = document.createElement('style');
  stil.textContent =
    '.tf-knapp{display:inline-flex;align-items:center;gap:8px}' +
    '#tf-lada{position:fixed;inset:0;z-index:50;background:#05080FEE;display:grid;place-items:center;padding:16px}' +
    '#tf-lada[hidden]{display:none}' +
    '#tf-lada .tf-inre{display:grid;gap:12px;justify-items:center;max-width:min(560px,100%)}' +
    '#tf-lada video{max-width:100%;max-height:calc(100vh - 150px);border-radius:14px;background:#000}' +
    '#tf-lada p{margin:0;color:#F6EDDA;font:700 17px/1.3 Assistant,system-ui,sans-serif;text-align:center}' +
    '#tf-lada .tf-rad{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}';
  document.head.appendChild(stil);

  var lada = document.createElement('div');
  lada.id = 'tf-lada'; lada.hidden = true;
  lada.innerHTML = '<div class="tf-inre"><p id="tf-rubrik"></p><video id="tf-video" controls playsinline preload="metadata"></video>' +
    '<div class="tf-rad"><button type="button" class="knapp primar" id="tf-spela">Spela banan →</button></div></div>';
  document.body.appendChild(lada);
  var video = lada.querySelector('video');

  function oppna(film) {
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
    document.getElementById('tf-rubrik').textContent = film.rubrik + ' – titta först, sen spelar du';
    video.src = film.src; lada.hidden = false;
    var p = video.play(); if (p && p.catch) p.catch(function () {});
  }
  function stang() { video.pause(); lada.hidden = true; }
  document.getElementById('tf-spela').onclick = stang;
  video.addEventListener('ended', function () { document.getElementById('tf-spela').focus(); });

  // efter att banan startat: knappen i första rutan (bredvid "Vidare"/"Sätt igång")
  var orig = startaBana;
  window.startaBana = function (id) {
    var r = orig.apply(this, arguments);
    var film = F[id] || F[String(id)];
    if (film) setTimeout(function () {
      var vidare = document.getElementById('vidare');
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'knapp tf-knapp'; b.textContent = '▶ Titta först (1 min)';
      b.onclick = function () { oppna(film); };
      if (vidare && vidare.parentNode) vidare.parentNode.insertBefore(b, vidare);
      else {                                 // ingen inledningsruta: visa knappen en stund överst
        b.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:40';
        document.body.appendChild(b); setTimeout(function () { b.remove(); }, 9000);
      }
    }, 50);
    return r;
  };
})();
