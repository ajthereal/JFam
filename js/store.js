/* JFam store: the event log on this device, the connection to the Sheet and the sync.
   The Sheet is the HQ Data sheet, reached through the same Apps Script web app as HQ and Worship.
   Everything lives in one tab, "jflog". Rows are never edited or removed, only added. */
(function () {
  'use strict';
  var JF = window.JF, TAB = 'jflog';
  var K = { log: 'jf-log', pend: 'jf-pend', conn: 'jf-conn', me: 'jf-me', unlock: 'jf-unlock', demo: 'jf-demo', seen: 'jf-seen' };
  var ST = window.ST = { log: [], pend: {}, conn: null, me: '', demo: false, sync: { state: 'idle', msg: '', at: 0 }, subs: [], seen: {} };

  function get(k, def) { try { var v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } }
  function put(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch (e) { ST.sync.storeErr = 'This device is out of storage space, so new changes may not be kept. Sync to the Sheet keeps them safe.'; return false; }
  }
  ST.get = get; ST.put = put;

  ST.load = function () {
    ST.conn = get(K.conn, null);
    ST.demo = !ST.conn && !!get(K.demo, false);
    var rows = get(ST.demo ? K.demo + '-log' : K.log, []) || [];
    ST.log = rows.map(JF.parseRow).filter(Boolean);
    ST.pend = get(K.pend, {}) || {};
    ST.me = get(K.me, '') || '';
    ST.seen = get(K.seen, {}) || {};
  };
  function saveLog() { put(ST.demo ? K.demo + '-log' : K.log, ST.log.map(JF.toRow)); if (!ST.demo) put(K.pend, ST.pend); }
  ST.saveSeen = function () { put(K.seen, ST.seen); };

  ST.on = function (fn) { ST.subs.push(fn); };
  function emit() { ST.subs.forEach(function (f) { try { f(); } catch (e) { console.error(e); } }); }
  ST.emit = emit;

  /* ---------- writing ---------- */
  ST.add = function (k, d) {
    var e = { id: JF.uid('e'), ts: Date.now(), by: ST.me || '', k: k, d: d };
    ST.log.push(e);
    if (!ST.demo) ST.pend[e.id] = 1;
    saveLog(); emit(); soon();
    return e;
  };
  ST.rec = function (t, o) { var d = { t: t }; for (var k in o) if (k[0] !== '_') d[k] = o[k]; return ST.add('rec', d); };

  /* ---------- who is using this device ---------- */
  ST.setMe = function (id) { ST.me = id || ''; put(K.me, ST.me); emit(); };
  ST.unlocked = function (id) { var u = get(K.unlock, {}) || {}; return u[id] && Date.now() - u[id] < 12 * 36e5; };
  ST.unlock = function (id) { var u = get(K.unlock, {}) || {}; u[id] = Date.now(); put(K.unlock, u); };
  ST.lock = function () { put(K.unlock, {}); };
  ST.hashPin = function (mid, pin) {
    var txt = 'jfam|' + mid + '|' + pin;
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)).then(function (b) {
        return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
      });
    }
    // Fallback for very old browsers: a simple non-cryptographic hash. Better than storing the PIN as is.
    var h = 5381; for (var i = 0; i < txt.length; i++) h = ((h << 5) + h + txt.charCodeAt(i)) | 0;
    return Promise.resolve('x' + (h >>> 0).toString(16));
  };

  /* ---------- connection ---------- */
  ST.connLink = function () {
    if (!ST.conn) return '';
    return location.origin + location.pathname + '#connect=' + encodeURIComponent(btoa(JSON.stringify({ url: ST.conn.url, token: ST.conn.token })));
  };
  ST.readHash = function () {
    var m = /[#&]connect=([^&]+)/.exec(location.hash || '');
    if (!m) return '';
    try {
      var j = JSON.parse(atob(decodeURIComponent(m[1])));
      if (j && /^https:\/\//.test(j.url || '') && j.token) { ST.setConn(j.url, j.token, true); return 'ok'; }
      return 'That connect link is incomplete. Paste the address and code from HQ instead.';
    } catch (e) { return 'That connect link is damaged. Paste the address and code from HQ instead.'; }
  };
  ST.setConn = function (url, token, quiet) {
    url = String(url || '').trim(); token = String(token || '').trim();
    ST.conn = { url: url, token: token };
    put(K.conn, ST.conn);
    if (ST.demo) { ST.demo = false; ST.log = (get(K.log, []) || []).map(JF.parseRow).filter(Boolean); ST.pend = get(K.pend, {}) || {}; ST.me = ''; put(K.me, ''); }
    if (!quiet) emit();
  };
  ST.disconnect = function () {
    try { localStorage.removeItem(K.conn); } catch (e) {}
    ST.conn = null; ST.sync = { state: 'idle', msg: '', at: 0 }; emit();
  };
  ST.startDemo = function (rows) {
    ST.demo = true; put(K.demo, true);
    ST.log = rows.map(JF.parseRow).filter(Boolean); saveLog(); ST.me = ''; put(K.me, ''); emit();
  };
  ST.endDemo = function () {
    try { localStorage.removeItem(K.demo); localStorage.removeItem(K.demo + '-log'); } catch (e) {}
    ST.demo = false; ST.log = []; ST.me = ''; put(K.me, ''); emit();
  };

  /* ---------- sync ---------- */
  function call(opts) {
    var ctl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, 25000);
    var p = opts.post
      ? fetch(ST.conn.url, { method: 'POST', body: JSON.stringify(opts.post), redirect: 'follow', signal: ctl && ctl.signal })
      : fetch(ST.conn.url + (ST.conn.url.indexOf('?') < 0 ? '?' : '&') + 'token=' + encodeURIComponent(ST.conn.token) + '&name=' + TAB + '&_=' + Date.now(), { redirect: 'follow', signal: ctl && ctl.signal });
    return p.then(function (r) {
      clearTimeout(t);
      if (!r.ok) throw { kind: 'http', status: r.status };
      return r.text();
    }, function (err) { clearTimeout(t); throw { kind: err && err.name === 'AbortError' ? 'slow' : 'net' }; })
      .then(function (txt) {
        var j; try { j = JSON.parse(txt); } catch (e) { throw { kind: 'notjson' }; }
        if (j && j.error) throw { kind: j.error, message: j.message };
        return j;
      });
  }
  function why(err) {
    var k = err && err.kind;
    if (k === 'token') return 'The secret code does not match your Sheet. Open Family > Settings and check it.';
    if (k === 'slow') return 'Your Sheet took too long to answer. Changes are saved on this device and will sync next time.';
    if (k === 'net') return navigator.onLine === false ? 'You are offline. Changes are saved on this device and will sync when you are back online.' : 'Could not reach your Sheet. Check the address in Family > Settings. Changes are saved on this device.';
    if (k === 'notjson') return 'The address answered, but not like the HQ Apps Script does. Check the address in Family > Settings.';
    if (k === 'http') return 'Your Sheet answered with error ' + err.status + '. Changes are saved on this device and will sync later.';
    if (k === 'empty-refused') return 'Your Sheet refused to save an empty list, so nothing was lost there.';
    if (k === 'bad-request') return 'Your Sheet did not understand the save. Nothing was lost on this device.';
    return 'Sync failed' + (err && err.message ? ': ' + err.message : '') + '. Changes are saved on this device.';
  }
  var busy = false, again = false, timer = null;
  function soon() { if (!ST.conn) return; clearTimeout(timer); timer = setTimeout(ST.syncNow, 1200); }
  ST.pendingCount = function () { return Object.keys(ST.pend).length; };
  ST.syncNow = function (verify) {
    if (!ST.conn || ST.demo) return Promise.resolve();
    if (busy) { again = true; return Promise.resolve(); }
    busy = true; ST.sync.state = 'busy'; emit();
    var wrote = false;
    return call({}).then(function (j) {
      var server = (j.rows || []).map(JF.parseRow).filter(Boolean);
      var have = {}; server.forEach(function (e) { have[e.id] = 1; });
      Object.keys(ST.pend).forEach(function (id) { if (have[id]) delete ST.pend[id]; });
      var missing = ST.log.filter(function (e) { return !have[e.id]; });
      ST.log = JF.merge(ST.log, server);
      saveLog();
      if (!missing.length) return;
      wrote = true;
      return call({ post: { token: ST.conn.token, name: TAB, rows: ST.log.map(JF.toRow) } });
    }).then(function () {
      busy = false;
      ST.sync = { state: 'ok', msg: '', at: Date.now() };
      emit();
      // After a write, read once more to confirm our rows are there (another device may have saved at the same moment).
      if (wrote && !verify) return ST.syncNow(true);
      if (again) { again = false; return ST.syncNow(); }
    }, function (err) {
      busy = false;
      ST.sync = { state: 'err', msg: why(err), at: ST.sync.at || 0, kind: err && err.kind };
      emit();
    });
  };
  // Keep in step: when the app comes back to the front, when back online, and every minute while open.
  document.addEventListener('visibilitychange', function () { if (!document.hidden) ST.syncNow(); });
  window.addEventListener('online', function () { ST.syncNow(); });
  setInterval(function () { if (!document.hidden) ST.syncNow(); }, 60000);
})();
