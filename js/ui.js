/* JFam UI helpers: escaping, sheets, toasts, sound, confetti, chips. */
(function () {
  'use strict';
  var U = window.U = {};
  U.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  U.$ = function (s, el) { return (el || document).querySelector(s); };
  U.$$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  function drop(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }
  U.drop = drop;

  /* toast */
  var tt;
  U.toast = function (msg, err) {
    drop(U.$('.toast'));
    var t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); clearTimeout(tt); tt = setTimeout(function () { drop(t); }, err ? 6000 : 2600);
  };

  /* bottom sheet */
  U.sheet = function (title, body, opts) {
    opts = opts || {};
    U.closeSheet();
    var v = document.createElement('div'); v.className = 'veil';
    v.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-label="' + U.esc(title) + '"><div class="grab"></div><div class="hd"><h2>' + U.esc(title) + '</h2><button class="iconbtn" data-close aria-label="Close">✕</button></div><div class="bd">' + body + '</div></div>';
    v.addEventListener('click', function (e) {
      if (e.target === v || e.target.closest('[data-close]')) { U.closeSheet(); return; }
      var c = e.target.closest('[data-chip]');
      if (c) {
        var g = c.closest('[data-group]'), multi = g && g.hasAttribute('data-multi');
        if (multi) c.classList.toggle('on');
        else { U.$$('[data-chip]', g).forEach(function (x) { x.classList.toggle('on', x === c); }); }
        if (opts.onChip) opts.onChip(g ? g.getAttribute('data-group') : '', c.getAttribute('data-chip'), v);
      }
    });
    document.body.appendChild(v);
    var first = U.$('input[autofocus]', v); if (first) setTimeout(function () { first.focus(); }, 250);
    return v;
  };
  U.closeSheet = function () { U.$$('.veil').forEach(drop); };
  U.chips = function (group, list, sel, multi) {
    sel = [].concat(sel == null ? [] : sel).map(String);
    return '<div class="chips" data-group="' + group + '"' + (multi ? ' data-multi' : '') + '>' + list.map(function (o) {
      return '<button type="button" class="chip' + (sel.indexOf(String(o[0])) >= 0 ? ' on' : '') + '" data-chip="' + U.esc(o[0]) + '">' + o[1] + '</button>';
    }).join('') + '</div>';
  };
  U.readChips = function (root, group) { return U.$$('[data-group="' + group + '"] [data-chip].on', root).map(function (b) { return b.getAttribute('data-chip'); }); };
  U.emojis = function (group, list, sel) {
    if (sel && list.indexOf(sel) < 0) list = [sel].concat(list);
    return '<div class="emo" data-group="' + group + '">' + list.map(function (e) { return '<button type="button" data-chip="' + e + '" class="' + (e === sel ? 'on' : '') + '" aria-label="' + e + '">' + e + '</button>'; }).join('') + '</div>';
  };
  U.val = function (root, name) { var el = U.$('[name="' + name + '"]', root); return el ? String(el.value || '').trim() : ''; };

  /* sound: a tiny coin chime made with Web Audio, no files */
  var ac;
  U.soundOn = function () { try { return localStorage.getItem('jf-sound') !== '0'; } catch (e) { return true; } };
  U.chime = function (kind) {
    if (!U.soundOn()) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      var notes = kind === 'big' ? [784, 988, 1175, 1568] : kind === 'soft' ? [660] : [988, 1319];
      notes.forEach(function (f, i) {
        var o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + i * 0.09;
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.4);
      });
    } catch (e) {}
  };

  /* confetti */
  U.confetti = function (n) {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var c = document.createElement('canvas'); c.className = 'confetti'; document.body.appendChild(c);
    var dpr = window.devicePixelRatio || 1, W = innerWidth, H = innerHeight; c.width = W * dpr; c.height = H * dpr;
    var x = c.getContext('2d'); x.scale(dpr, dpr);
    var cols = ['#FF6B3D', '#F2B01E', '#23A26D', '#3E6FE0', '#E2577A', '#9A5BE0'], P = [];
    for (var i = 0; i < (n || 140); i++) P.push({ x: W / 2 + (Math.random() - .5) * 80, y: H * .45, vx: (Math.random() - .5) * 14, vy: -Math.random() * 15 - 5, r: Math.random() * 6 + 4, a: Math.random() * 6, va: (Math.random() - .5) * .3, c: cols[i % cols.length] });
    var t0 = performance.now();
    (function f(t) {
      var k = (t - t0) / 1000; x.clearRect(0, 0, W, H);
      P.forEach(function (p) { p.vy += .45; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.va; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.globalAlpha = Math.max(0, 1 - k / 2.2); x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); x.restore(); });
      if (k < 2.2) requestAnimationFrame(f); else drop(c);
    })(t0);
  };

  /* celebration card */
  U.celebrate = function (emoji, title, text, done) {
    var d = document.createElement('div'); d.className = 'cele';
    d.innerHTML = '<div class="box" role="alertdialog" aria-label="' + U.esc(title) + '"><div class="em">' + emoji + '</div><h2>' + U.esc(title) + '</h2><p class="mute" style="font-weight:650;margin:0 0 18px">' + U.esc(text) + '</p><button class="btn wide">Yay!</button></div>';
    d.addEventListener('click', function (e) { if (e.target === d || e.target.closest('button')) { drop(d); if (done) done(); } });
    document.body.appendChild(d); U.confetti(); U.chime('big');
  };

  U.standalone = function () { return !!(navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches)); };
})();
