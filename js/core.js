/* JFam core: pure logic, no DOM. Works in the browser (window.JF) and in Node (module.exports).
   All data is one append-only log of events {id, ts, by, k, d}. State is rebuilt from it.
   k = 'rec'   upsert of a record: d = {t, id, ...fields, del}. Latest ts wins per t+id.
   k = 'done'  a quest was done: d = {q, m, day, c, title, emoji, ok}
   k = 'rev'   a parent reviewed a done or a buy: d = {e, ok, why}
   k = 'bonus' coins given or taken: d = {m, c, why}
   k = 'buy'   a kid bought a reward: d = {r, m, c, title, emoji}
   k = 'give'  a parent handed over a bought reward: d = {e}
   k = 'cash'  a parent paid out coins as real money: d = {m, c, rp} */
(function (root) {
  'use strict';
  var JF = {};

  /* ---------- dates (device local time) ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  JF.dayOf = function (d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  JF.parseDay = function (s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
  JF.addDays = function (s, n) { var d = JF.parseDay(s); d.setDate(d.getDate() + n); return JF.dayOf(d); };
  JF.isoDow = function (s) { var w = JF.parseDay(s).getDay(); return w === 0 ? 7 : w; }; // 1 Mon .. 7 Sun
  JF.daysBetween = function (a, b) { return Math.round((JF.parseDay(b) - JF.parseDay(a)) / 864e5); };
  JF.uid = function (p) { return (p || '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };

  /* ---------- log ---------- */
  JF.parseRow = function (r) {
    var d = r.d;
    if (typeof d === 'string') { try { d = JSON.parse(d || '{}'); } catch (e) { d = null; } }
    if (!r.id || !d || typeof d !== 'object') return null;
    return { id: String(r.id), ts: Number(r.ts) || 0, by: String(r.by || ''), k: String(r.k || ''), d: d };
  };
  JF.toRow = function (e) { return { id: e.id, ts: String(e.ts), by: e.by || '', k: e.k, d: JSON.stringify(e.d) }; };
  JF.sortLog = function (log) { return log.slice().sort(function (a, b) { return a.ts - b.ts || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); }); };
  // Union by id. Events never change once written, so either copy is the same.
  JF.merge = function (a, b) {
    var seen = {}, out = [];
    a.concat(b).forEach(function (e) { if (e && !seen[e.id]) { seen[e.id] = 1; out.push(e); } });
    return JF.sortLog(out);
  };

  /* ---------- levels, badges ---------- */
  JF.TITLES = ['Sprout', 'Helper', 'Apprentice', 'Home Scout', 'Ranger', 'Knight', 'Captain', 'Champion', 'Legend', 'Home Hero', 'Grand Hero', 'Mythic', 'Star Keeper', 'Sky Guardian', 'Family Legend'];
  JF.xpFor = function (lvl) { return 25 * (lvl - 1) * lvl; }; // L2 50, L3 150, L4 300, L5 500, L10 2250
  JF.level = function (xp) {
    var l = 1; while (JF.xpFor(l + 1) <= xp) l++;
    var a = JF.xpFor(l), b = JF.xpFor(l + 1);
    return { lvl: l, title: JF.TITLES[Math.min(l, JF.TITLES.length) - 1], from: a, to: b, pct: Math.max(0, Math.min(1, (xp - a) / (b - a))) };
  };
  JF.STREAK_BONUS = { 3: 5, 7: 15, 14: 30, 30: 60, 60: 100, 100: 200 };
  JF.BADGES = [
    { id: 'first', e: '🌱', t: 'First quest', h: 'Finish your first quest' },
    { id: 'q10', e: '🪴', t: '10 quests', h: 'Finish 10 quests' },
    { id: 'q50', e: '🌳', t: '50 quests', h: 'Finish 50 quests' },
    { id: 'q100', e: '🏰', t: '100 quests', h: 'Finish 100 quests' },
    { id: 's3', e: '🔥', t: '3-day streak', h: 'Do a quest 3 days in a row' },
    { id: 's7', e: '☄️', t: '7-day streak', h: 'Do a quest 7 days in a row' },
    { id: 's14', e: '🌋', t: '14-day streak', h: 'Two weeks without a break' },
    { id: 's30', e: '🌞', t: '30-day streak', h: 'A whole month in a row' },
    { id: 'early', e: '🐓', t: 'Early bird', h: 'Finish a quest before 7 am' },
    { id: 'bounty', e: '🎯', t: 'Bounty hunter', h: 'Grab a bounty quest first' },
    { id: 'shop', e: '🛍️', t: 'First treat', h: 'Buy something in the shop' },
    { id: 'saver', e: '🐷', t: 'Saver', h: 'Reach a savings goal' },
    { id: 'l5', e: '🛡️', t: 'Level 5', h: 'Reach level 5' },
    { id: 'l10', e: '👑', t: 'Level 10', h: 'Reach level 10' }
  ];

  /* ---------- quests ---------- */
  JF.repLabel = function (rep) {
    if (!rep || rep === 'daily') return 'Every day';
    if (rep === 'once') return 'One time';
    var m = /^week:(.*)$/.exec(rep); if (!m) return rep;
    var ds = m[1].split(',').map(Number).sort();
    if (ds.join() === '1,2,3,4,5') return 'School days';
    if (ds.join() === '6,7') return 'Weekends';
    var n = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return ds.map(function (x) { return n[x]; }).join(', ');
  };
  JF.repOn = function (rep, day) {
    if (!rep || rep === 'daily' || rep === 'once') return true;
    var m = /^week:(.*)$/.exec(rep); if (!m) return false;
    return m[1].split(',').map(Number).indexOf(JF.isoDow(day)) >= 0;
  };
  JF.assigned = function (q, m) {
    var w = q.who || 'all';
    if (w === 'any') return m.role === 'kid';
    if (w === 'all') return m.role === 'kid';
    return String(w).split(',').indexOf(m.id) >= 0;
  };

  /* ---------- build state ---------- */
  JF.build = function (log, today) {
    today = today || JF.dayOf();
    var S = { recs: {}, dones: [], buys: [], bonuses: [], cash: [], revs: {}, gives: {}, today: today };
    ['member', 'quest', 'reward', 'ev', 'item', 'fgoal', 'goal', 'pray', 'set'].forEach(function (t) { S.recs[t] = {}; });
    var recTs = {};
    JF.sortLog(log).forEach(function (e) {
      var d = e.d;
      if (e.k === 'rec') {
        if (!d.t || !d.id) return;
        if (!S.recs[d.t]) S.recs[d.t] = {};
        var key = d.t + '|' + d.id;
        if (recTs[key] !== undefined && recTs[key] > e.ts) return;
        recTs[key] = e.ts;
        var o = {}; for (var k in d) o[k] = d[k]; o._ts = e.ts; o._by = e.by;
        S.recs[d.t][d.id] = o;
      } else if (e.k === 'done') S.dones.push(e);
      else if (e.k === 'rev') S.revs[d.e] = e; // latest review wins (log is sorted)
      else if (e.k === 'bonus') S.bonuses.push(e);
      else if (e.k === 'buy') S.buys.push(e);
      else if (e.k === 'give') S.gives[d.e] = e;
      else if (e.k === 'cash') S.cash.push(e);
    });
    function live(t) { var o = S.recs[t], a = []; for (var id in o) if (!o[id].del) a.push(o[id]); return a; }
    S.members = live('member').sort(function (a, b) { return (a.role === b.role ? 0 : a.role === 'parent' ? -1 : 1) || (a.ord || 0) - (b.ord || 0) || String(a.bday || '').localeCompare(String(b.bday || '')); });
    S.kids = S.members.filter(function (m) { return m.role === 'kid'; });
    S.parents = S.members.filter(function (m) { return m.role === 'parent'; });
    S.quests = live('quest');
    S.rewards = live('reward').sort(function (a, b) { return (a.c || 0) - (b.c || 0); });
    S.events = live('ev');
    S.items = live('item');
    S.fgoals = live('fgoal');
    S.goals = live('goal');
    S.prayers = live('pray').sort(function (a, b) { return b._ts - a._ts; });
    S.set = S.recs.set.main || {};
    S.coinRp = Number(S.set.coinRp) || 100;
    S.byId = {}; S.members.forEach(function (m) { S.byId[m.id] = m; });
    for (var mid in S.recs.member) if (!S.byId[mid]) S.byId[mid] = S.recs.member[mid];

    // status of each done: wait / ok / no
    S.dones.forEach(function (e) {
      var r = S.revs[e.id];
      e.st = r ? (r.d.ok ? 'ok' : 'no') : (e.d.ok ? 'ok' : 'wait');
      e.why = r && r.d.why || '';
    });
    S.buys.forEach(function (e) {
      var r = S.revs[e.id];
      e.st = r && !r.d.ok ? 'refunded' : S.gives[e.id] ? 'given' : 'waiting';
    });
    S.pending = S.dones.filter(function (e) { return e.st === 'wait'; });
    S.toGive = S.buys.filter(function (e) { return e.st === 'waiting'; });

    // per kid stats
    S.stats = {};
    S.members.forEach(function (m) { S.stats[m.id] = JF.stats(S, m.id); });
    return S;
  };

  JF.stats = function (S, mid) {
    var ok = S.dones.filter(function (e) { return e.d.m === mid && e.st === 'ok'; });
    var earned = 0; ok.forEach(function (e) { earned += Number(e.d.c) || 0; });
    var bonus = 0, plusBonus = 0;
    S.bonuses.forEach(function (e) { if (e.d.m === mid) { var c = Number(e.d.c) || 0; bonus += c; if (c > 0) plusBonus += c; } });
    var spent = 0; S.buys.forEach(function (e) { if (e.d.m === mid && e.st !== 'refunded') spent += Number(e.d.c) || 0; });
    var paid = 0, paidRp = 0; S.cash.forEach(function (e) { if (e.d.m === mid) { paid += Number(e.d.c) || 0; paidRp += Number(e.d.rp) || 0; } });
    // streaks from days with at least one approved quest
    var days = {}; ok.forEach(function (e) { days[e.d.day] = 1; });
    var list = Object.keys(days).sort();
    var streakBonus = 0, best = 0, run = 0, prev = null, hits = [];
    list.forEach(function (d) {
      run = prev && JF.daysBetween(prev, d) === 1 ? run + 1 : 1;
      if (JF.STREAK_BONUS[run]) { streakBonus += JF.STREAK_BONUS[run]; hits.push({ day: d, n: run, c: JF.STREAK_BONUS[run] }); }
      if (run > best) best = run;
      prev = d;
    });
    var cur = 0;
    var t = S.today, y = JF.addDays(t, -1);
    var start = days[t] ? t : days[y] ? y : null;
    if (start) { var d0 = start; while (days[d0]) { cur++; d0 = JF.addDays(d0, -1); } }
    var xp = earned + plusBonus + streakBonus;
    var coins = earned + bonus + streakBonus - spent - paid;
    var lv = JF.level(xp);
    var early = ok.some(function (e) { var h = new Date(e.ts).getHours(); return h >= 3 && h < 7; });
    var bounty = ok.some(function (e) { var q = S.recs.quest[e.d.q]; return q && q.who === 'any'; });
    var goal = S.goals.filter(function (g) { return g.m === mid; })[0] || null;
    var rp = coins * S.coinRp;
    var badges = {
      first: ok.length >= 1, q10: ok.length >= 10, q50: ok.length >= 50, q100: ok.length >= 100,
      s3: best >= 3, s7: best >= 7, s14: best >= 14, s30: best >= 30, early: early, bounty: bounty,
      shop: S.buys.some(function (e) { return e.d.m === mid && e.st !== 'refunded'; }),
      saver: !!(goal && Number(goal.rp) > 0 && rp >= Number(goal.rp)) || S.goals.some(function (g) { return g.m === mid && g.reached; }),
      l5: lv.lvl >= 5, l10: lv.lvl >= 10
    };
    return {
      done: ok.length, earned: earned, xp: xp, coins: coins, rp: rp, spent: spent, paid: paid, paidRp: paidRp,
      streak: cur, doneToday: !!days[t], best: best, streakBonus: streakBonus, hits: hits, lv: lv, badges: badges, goal: goal,
      nextBonus: (function () { for (var k in JF.STREAK_BONUS) if (+k > cur) return { at: +k, c: JF.STREAK_BONUS[k] }; return null; })()
    };
  };

  // Quests for one member on one day, with status.
  JF.questsFor = function (S, m, day) {
    day = day || S.today;
    var out = [];
    S.quests.forEach(function (q) {
      if (q.on === 0 || q.on === '0' || q.on === false) return;
      if (!JF.assigned(q, m)) return;
      if (!JF.repOn(q.rep, day)) return;
      if (q.from && day < q.from) return;
      var mine, taken = null;
      if (q.rep === 'once') {
        mine = S.dones.filter(function (e) { return e.d.q === q.id && (q.who === 'any' || e.d.m === m.id) && e.st !== 'no'; });
        if (q.who === 'any' && mine.length && mine[0].d.m !== m.id) taken = mine[0];
        var okd = mine.filter(function (e) { return e.st === 'ok'; });
        if (okd.length && okd[okd.length - 1].d.day !== day) return; // finished on an earlier day
      } else {
        mine = S.dones.filter(function (e) { return e.d.q === q.id && e.d.day === day && (q.who === 'any' || e.d.m === m.id) && e.st !== 'no'; });
        if (q.who === 'any' && mine.length && mine[0].d.m !== m.id) taken = mine[0];
      }
      var rej = S.dones.filter(function (e) { return e.d.q === q.id && e.d.m === m.id && e.st === 'no' && (q.rep === 'once' || e.d.day === day); });
      var last = mine.length ? mine[mine.length - 1] : null;
      out.push({ q: q, st: taken ? 'taken' : last ? last.st : 'todo', ev: last, taken: taken, rej: rej.length ? rej[rej.length - 1] : null });
    });
    var order = { morning: 0, day: 1, evening: 2 };
    out.sort(function (a, b) { return (order[a.q.part] || 1) - (order[b.q.part] || 1) || (a.q.ord || 0) - (b.q.ord || 0) || String(a.q.title).localeCompare(String(b.q.title)); });
    return out;
  };

  // Family co-op goal progress: coins earned by all kids from approved quests since the goal started.
  JF.fgoalProgress = function (S, g) {
    var n = 0;
    S.dones.forEach(function (e) { if (e.st === 'ok' && (!g.from || e.d.day >= g.from)) n += Number(e.d.c) || 0; });
    return { n: n, pct: Math.min(1, n / Math.max(1, Number(g.target) || 1)) };
  };

  /* ---------- agenda ---------- */
  JF.occursOn = function (ev, day) {
    var rep = ev.rep || 'none';
    if (ev.until && day > ev.until) return false;
    if (ev.skip && String(ev.skip).split(',').indexOf(day) >= 0) return false;
    if (rep === 'none') return ev.day === day || (ev.end && ev.day <= day && day <= ev.end);
    if (ev.day && day < ev.day) return false;
    if (rep === 'daily') return true;
    if (rep === 'yearly') return String(ev.day).slice(5) === day.slice(5);
    if (rep === 'monthly') return String(ev.day).slice(8) === day.slice(8);
    var m = /^weekly:(.*)$/.exec(rep);
    if (m) return m[1].split(',').map(Number).indexOf(JF.isoDow(day)) >= 0;
    return false;
  };
  JF.agenda = function (S, from, n) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var day = JF.addDays(from, i), items = [];
      S.events.forEach(function (ev) { if (JF.occursOn(ev, day)) items.push({ ev: ev, day: day }); });
      S.members.forEach(function (m) {
        if (m.bday && String(m.bday).slice(5) === day.slice(5)) {
          var age = +day.slice(0, 4) - +String(m.bday).slice(0, 4);
          items.push({ bday: m, day: day, age: age });
        }
      });
      items.sort(function (a, b) { return (a.bday ? '' : (a.ev.time || '99')).localeCompare(b.bday ? '' : (b.ev.time || '99')); });
      out.push({ day: day, items: items });
    }
    return out;
  };
  JF.nextBirthdays = function (S, from) {
    return S.members.filter(function (m) { return m.bday; }).map(function (m) {
      var y = +from.slice(0, 4), d = y + String(m.bday).slice(4);
      if (d < from) d = (y + 1) + String(m.bday).slice(4);
      return { m: m, day: d, inDays: JF.daysBetween(from, d), age: +d.slice(0, 4) - +String(m.bday).slice(0, 4) };
    }).sort(function (a, b) { return a.inDays - b.inDays; });
  };

  /* ---------- money ---------- */
  JF.rp = function (n) {
    n = Math.round(Number(n) || 0);
    var s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (n < 0 ? '-' : '') + 'Rp ' + s;
  };

  /* ---------- pin ---------- */
  JF.pinOk = function (pin) { return /^\d{4}$/.test(String(pin)); };

  if (typeof module !== 'undefined' && module.exports) module.exports = JF; else root.JF = JF;
})(this);
