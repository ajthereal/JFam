/* JFam app: screens and actions. */
(function () {
  'use strict';
  var JF = window.JF, ST = window.ST, U = window.U, esc = U.esc;
  var V = { tab: 'home', list: 'shop', agWho: '', hashNote: '', agDays: 7 };
  var S = null;

  var QUEST_EMO = ['🛏️', '🪥', '⏰', '🎒', '📚', '✏️', '🧸', '🍽️', '🧺', '🧹', '🪴', '🐱', '🚿', '📖', '🙏', '🌙', '🚗', '🗑️', '👟', '🥦', '🎹', '🏃', '💧', '⭐'];
  var REWARD_EMO = ['🎮', '📺', '🍦', '🍕', '🎲', '🦉', '🏊', '🎁', '🧁', '🛝', '🎨', '📚', '🍿', '🧋', '⚽', '🎟️'];
  var EV_EMO = ['📅', '🚐', '🏫', '⛪', '🏊', '🎾', '🦷', '🩺', '🎂', '✈️', '🍽️', '🎹', '⚽', '🛒', '👵', '🎉', '📝', '🌙'];
  var MEMBER_EMO = ['🦁', '🌻', '🐉', '🦄', '🐻', '🐼', '🦊', '🐯', '🐨', '🐸', '🦋', '🐬', '🦖', '🐧', '🌸', '⭐'];
  var COLORS = ['#0F9E8E', '#E2577A', '#3E6FE0', '#9A5BE0', '#F08A24', '#D94A3B', '#2E9E4F', '#C2417F'];
  var DAYN = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var PARTS = { morning: ['🌅', 'Morning'], day: ['☀️', 'During the day'], evening: ['🌙', 'Evening'] };

  function me() { return S && S.byId[ST.me] && !S.byId[ST.me].del ? S.byId[ST.me] : null; }
  function isParent() { var m = me(); return !!(m && m.role === 'parent'); }
  function name(id) { var m = S.byId[id]; return m ? m.name : 'Someone'; }
  function av(m, cls) { if (!m) return ''; return '<span class="av ' + (cls || '') + '" style="--c:' + esc(m.color || '#999') + '" aria-hidden="true">' + esc(m.emoji || '🙂') + '</span>'; }
  function coin(n) { return '<span class="coin num">' + (n > 0 ? '' : '') + esc(n) + '</span>'; }
  function dayLabel(d) {
    if (d === S.today) return 'Today';
    if (d === JF.addDays(S.today, 1)) return 'Tomorrow';
    if (d === JF.addDays(S.today, -1)) return 'Yesterday';
    var x = JF.parseDay(d);
    return DAYN[JF.isoDow(d)] + ' ' + x.getDate() + ' ' + x.toLocaleString('en-GB', { month: 'short' });
  }
  function clock(ts) { var d = new Date(ts); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function when(ts) { var d = JF.dayOf(new Date(ts)); return (d === S.today ? 'today' : dayLabel(d)) + ' at ' + clock(ts); }
  function greet() { var h = new Date().getHours(); return h < 11 ? 'Good morning' : h < 15 ? 'Good afternoon' : h < 19 ? 'Good evening' : 'Good night'; }

  /* ================= shell ================= */
  function render() {
    S = JF.build(ST.log);
    var root = U.$('#app'), tabs = U.$('#tabs');
    if (me() && isParent() && me().pin && !ST.unlocked(me().id)) { ST.me = ''; }
    if (!ST.conn && !ST.demo && !ST.log.length) { tabs.innerHTML = ''; root.innerHTML = welcomeView(); return; }
    if (!S.members.length) { tabs.innerHTML = ''; root.innerHTML = (ST.sync.state === 'busy' || (!ST.sync.at && ST.sync.state !== 'err')) && ST.conn ? loadingView() : setupView(); return; }
    if (!me()) { tabs.innerHTML = ''; root.innerHTML = whoView(); return; }
    var views = { home: isParent() ? parentHome : kidHome, agenda: agendaView, lists: listsView, shop: shopView, family: familyView };
    root.innerHTML = topBar() + banners() + (views[V.tab] || views.home)();
    tabs.innerHTML = tabBar();
    if (!isParent()) setTimeout(checkCelebrations, 350);
  }
  ST.on(render);

  function topBar() {
    var m = me();
    var titles = { home: greet() + ',', agenda: 'Family agenda', lists: 'Lists', shop: isParent() ? 'Rewards' : 'Shop', family: 'Family' };
    var big = V.tab === 'home' ? esc(m.name) : esc(titles[V.tab]);
    var sub = V.tab === 'home' ? titles.home : new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    return '<header class="top"><button class="me-btn" style="background:color-mix(in srgb,' + esc(m.color) + ' 22%, var(--card))" data-a="who" aria-label="Switch person (now ' + esc(m.name) + ')">' + esc(m.emoji) + '</button>' +
      '<div class="hello"><div class="mute">' + sub + '</div><h1>' + big + '</h1></div>' + syncPill() + '</header>';
  }
  function syncPill() {
    var cls = '', txt;
    var n = ST.pendingCount();
    if (ST.demo) { cls = 'demo'; txt = 'Sample family'; }
    else if (!ST.conn) txt = 'This device only';
    else if (ST.sync.state === 'busy') { cls = 'busy'; txt = 'Syncing'; }
    else if (ST.sync.state === 'err') { cls = 'err'; txt = 'Not synced'; }
    else if (n) { cls = 'busy'; txt = n + ' to sync'; }
    else if (ST.sync.at) { cls = 'ok'; txt = 'Synced'; }
    else txt = 'Connecting';
    return '<button class="pill ' + cls + '" data-a="syncinfo" aria-label="Sync status: ' + txt + '"><i class="dot"></i>' + txt + '</button>';
  }
  function banners() {
    var out = '';
    if (V.hashNote) out += '<div class="banner info"><span class="grow">' + esc(V.hashNote) + '</span><button data-a="hidenote">OK</button></div>';
    if (ST.sync.state === 'err' && ST.sync.msg) out += '<div class="banner" role="alert"><span class="grow">' + esc(ST.sync.msg) + '</span><button data-a="syncnow">Try again</button></div>';
    if (ST.sync.storeErr) out += '<div class="banner" role="alert"><span class="grow">' + esc(ST.sync.storeErr) + '</span></div>';
    if (ST.demo) out += '<div class="banner info"><span class="grow">This is a sample family to look around. Nothing here is saved to your Sheet.</span><button data-a="enddemo">Leave</button></div>';
    return out;
  }
  function tabBar() {
    var waiting = isParent() ? S.pending.length + S.toGive.length : 0;
    var T = [['home', '🏠', 'Home', waiting], ['agenda', '📅', 'Agenda'], ['lists', '📝', 'Lists'], ['shop', '🎁', isParent() ? 'Rewards' : 'Shop'], ['family', '💛', 'Family']];
    return '<div class="in">' + T.map(function (t) {
      return '<button class="tab' + (V.tab === t[0] ? ' on' : '') + '" data-a="tab" data-v="' + t[0] + '"' + (V.tab === t[0] ? ' aria-current="page"' : '') + '><span class="ic" aria-hidden="true">' + t[1] + '</span>' + t[2] + (t[3] ? '<span class="badge num" aria-label="' + t[3] + ' waiting">' + t[3] + '</span>' : '') + '</button>';
    }).join('') + '</div>';
  }

  /* ================= first run ================= */
  function welcomeView() {
    return '<div class="welcome"><div class="logo" aria-hidden="true">🏡</div><h1>JFam</h1>' +
      '<p>Chores turn into quests, quests turn into pocket money, and the whole family\'s week sits in one place.</p>' +
      '<div class="card"><h3>Connect to your family Sheet</h3><ol class="steps"><li>Open HQ and tap Sync. It shows your Apps Script address and secret code.</li><li>Copy each one and paste it below.</li><li>Tap Connect. Your family is already waiting in the Sheet.</li></ol>' +
      '<p class="small" style="margin:14px 0 4px">A connect link from Worship or another JFam phone works in the address box too.</p>' +
      '<input type="url" id="cu" placeholder="Apps Script address (https://script.google.com/...)" autocomplete="off" autocapitalize="off" spellcheck="false" style="margin-bottom:8px">' +
      '<input type="text" id="ct" placeholder="Secret code" autocomplete="off" autocapitalize="off" spellcheck="false" style="margin-bottom:12px">' +
      '<button class="btn wide" data-a="connect">Connect</button></div>' +
      '<button class="btn alt wide" data-a="demo">Look around with a sample family</button></div>';
  }
  function loadingView() { return '<div class="welcome"><div class="logo" aria-hidden="true">🏡</div><h2>Opening your family…</h2><p>Reading your Sheet.</p></div>'; }
  function setupView() {
    var rows = [['parent', '🦁'], ['parent', '🌻'], ['kid', '🐉'], ['kid', '🦄']];
    return '<div class="welcome"><div class="logo" aria-hidden="true">👨‍👩‍👦‍👧</div><h1>Who\'s in your family?</h1><p>Type the names the way you call each other at home. You can change everything later.</p>' +
      (ST.sync.state === 'err' ? '<div class="banner" role="alert">' + esc(ST.sync.msg) + '</div>' : '') +
      '<div class="card" id="setup">' + rows.map(function (r, i) {
        return '<div class="row" style="margin-bottom:10px"><span class="av" style="--c:' + COLORS[i] + '">' + r[1] + '</span><input type="text" name="n' + i + '" placeholder="' + (r[0] === 'parent' ? 'Parent' : 'Child') + ' name" autocomplete="off"><select name="r' + i + '" style="width:110px"><option value="parent"' + (r[0] === 'parent' ? ' selected' : '') + '>Parent</option><option value="kid"' + (r[0] === 'kid' ? ' selected' : '') + '>Child</option></select></div>';
      }).join('') + '<button class="btn wide" data-a="setup" style="margin-top:6px">Start with starter quests and rewards</button></div></div>';
  }
  function whoView() {
    return '<div class="welcome" style="max-width:760px"><h1>Who\'s here?</h1><p>Tap your face.</p><div class="who-grid">' + S.members.map(function (m) {
      var st = S.stats[m.id];
      var sub = m.role === 'parent' ? (m.pin ? '🔒 Parent' : 'Parent') : 'Level ' + st.lv.lvl + ' · ' + st.lv.title;
      return '<button class="who-tile" style="--c:' + esc(m.color) + '" data-a="pick" data-v="' + esc(m.id) + '"><div class="face">' + esc(m.emoji) + '</div><b>' + esc(m.name) + '</b><span>' + esc(sub) + '</span></button>';
    }).join('') + '</div>' + (ST.demo ? '<p style="margin-top:22px"><button class="btn alt" data-a="enddemo">Leave the sample family</button></p>' : '') + '</div>';
  }

  /* ================= kid home ================= */
  function hero(m) {
    var st = S.stats[m.id], lv = st.lv;
    return '<section class="hero" style="--c:' + esc(m.color) + '"><div class="who"><div class="ring" style="--p:' + lv.pct.toFixed(3) + '"><div class="face" aria-hidden="true">' + esc(m.emoji) + '</div></div>' +
      '<div class="grow"><div class="lvl">Level ' + lv.lvl + '</div><h2>' + esc(lv.title) + '</h2><div class="xp num">' + (st.xp - lv.from) + ' / ' + (lv.to - lv.from) + ' XP to level ' + (lv.lvl + 1) + '</div></div></div>' +
      '<div class="stats"><div class="stat"><b class="num">🪙 ' + st.coins + '</b><span class="num">' + esc(JF.rp(st.rp)) + '</span></div>' +
      '<div class="stat"><b class="num"><span class="flame' + (st.streak ? ' lit' : '') + '">🔥</span> ' + st.streak + '</b><span>' + (st.streak === 1 ? 'day streak' : 'days streak') + (st.best > st.streak ? ' · best ' + st.best : '') + '</span></div></div></section>';
  }
  function questRow(x, m, forParent) {
    var q = x.q, st = x.st, right = '', sub = [];
    if (q.who === 'any') sub.push('🎯 Bounty: first one wins');
    else sub.push(JF.repLabel(q.rep));
    if (x.rej && x.rej.why && x.rej.why !== 'Undone' && st === 'todo') sub = ['Not yet: ' + x.rej.why];
    if (st === 'todo') right = forParent ? '<button class="btn sm ok go" data-a="markdone" data-q="' + esc(q.id) + '" data-m="' + esc(m.id) + '">Mark done</button>' : '<button class="btn go" data-a="done" data-q="' + esc(q.id) + '">Done!</button>';
    else if (st === 'wait') right = '<span class="tag wait">⏳ Waiting</span>' + (forParent ? '' : '<button class="iconbtn" data-a="undo" data-e="' + esc(x.ev.id) + '" aria-label="Undo" style="margin-left:6px;width:40px;height:40px;font-size:16px">↩︎</button>');
    else if (st === 'ok') right = '<span class="tag ok">✓ +' + esc(x.ev.d.c) + '</span>';
    else if (st === 'taken') { right = '<span class="tag">' + av(S.byId[x.taken.d.m], 'sm') + '</span>'; sub = ['Taken by ' + name(x.taken.d.m)]; }
    return '<div class="quest ' + st + '" id="q-' + esc(q.id) + '"><div class="em" aria-hidden="true">' + esc(q.emoji || '⭐') + '</div><div class="grow"><div class="t">' + esc(q.title) + '</div><div class="s">' + coin(q.c) + ' &nbsp;' + esc(sub.join(' · ')) + '</div></div>' + right + '</div>';
  }
  function questList(m, forParent) {
    var list = JF.questsFor(S, m, S.today);
    if (!list.length) return '<div class="card"><div class="empty"><span class="big">🌤️</span>No quests today. Enjoy your day!</div></div>';
    var out = '', part = '';
    list.forEach(function (x) {
      var p = x.q.part || 'day';
      if (p !== part) { part = p; out += '<div class="part ' + p + '">' + PARTS[p][0] + ' ' + PARTS[p][1] + '</div>'; }
      out += questRow(x, m, forParent);
    });
    return out;
  }
  function kidHome() {
    var m = me(), st = S.stats[m.id], list = JF.questsFor(S, m, S.today);
    var left = list.filter(function (x) { return x.st === 'todo'; }).length;
    var nudge = '';
    if (st.streak && !st.doneToday) nudge = '<div class="banner info"><span class="grow">🔥 Finish one quest today to keep your ' + st.streak + '-day streak going.</span></div>';
    else if (st.nextBonus && st.doneToday && st.nextBonus.at - st.streak <= 2) nudge = '<div class="banner info"><span class="grow">🔥 ' + (st.nextBonus.at - st.streak) + ' more day' + (st.nextBonus.at - st.streak > 1 ? 's' : '') + ' to a ' + st.nextBonus.at + '-day streak bonus of ' + st.nextBonus.c + ' coins.</span></div>';
    var mine = myAgenda(m, 1);
    var leftCol = hero(m) + nudge + '<div class="sec"><h2>Today\'s quests</h2><span class="mute small">' + (left ? left + ' left' : 'All done') + '</span></div>' + questList(m);
    var right = (mine ? '<div class="sec"><h2>Today for you</h2></div>' + mine : '') + goalCard(m) + fgoalCards() + badgeCard(m);
    return '<div class="grid2"><div>' + leftCol + '</div><div>' + right + '</div></div>';
  }
  function myAgenda(m, days) {
    var out = '';
    JF.agenda(S, S.today, days).forEach(function (d) {
      d.items.forEach(function (it) {
        if (it.ev && it.ev.who && String(it.ev.who).split(',').indexOf(m.id) < 0) return;
        out += agItem(it);
      });
    });
    return out;
  }
  function goalCard(m) {
    var st = S.stats[m.id], g = st.goal;
    if (!g) return isParent() ? '' : '<div class="card"><div class="row"><span style="font-size:34px">🐷</span><div class="grow"><h3>Saving for something?</h3><div class="mute small">Set a goal and watch your coins grow toward it.</div></div><button class="btn sm alt" data-a="goal" data-m="' + esc(m.id) + '">Set goal</button></div></div>';
    var pct = Math.min(1, st.rp / Math.max(1, Number(g.rp)));
    return '<div class="card"><div class="row" style="margin-bottom:10px"><span style="font-size:34px">' + esc(g.emoji || '🐷') + '</span><div class="grow"><h3>' + esc(g.title) + '</h3><div class="mute small num">' + esc(JF.rp(st.rp)) + ' of ' + esc(JF.rp(g.rp)) + '</div></div><button class="iconbtn" data-a="goal" data-m="' + esc(m.id) + '" aria-label="Edit goal">✏️</button></div><div class="bar green"><i style="width:' + (pct * 100).toFixed(1) + '%"></i></div>' +
      (pct >= 1 ? '<p class="small" style="margin:10px 0 0;font-weight:750">🎉 You reached it! Ask a parent to cash out.</p>' : '<p class="small mute" style="margin:8px 0 0;font-weight:650">' + Math.ceil((Number(g.rp) - st.rp) / S.coinRp) + ' more coins to go</p>') + '</div>';
  }
  function fgoalCards() {
    return S.fgoals.map(function (g) {
      var p = JF.fgoalProgress(S, g);
      return '<div class="card"><div class="row" style="margin-bottom:10px"><span style="font-size:34px">' + esc(g.emoji || '🎉') + '</span><div class="grow"><div class="mute small" style="font-weight:800">Family team goal</div><h3>' + esc(g.title) + '</h3></div><b class="num">' + p.n + '/' + esc(g.target) + '</b></div><div class="bar"><i style="width:' + (p.pct * 100).toFixed(1) + '%"></i></div>' +
        (p.pct >= 1 ? '<p class="small" style="margin:10px 0 0;font-weight:750">🎉 You did it together! Time to plan it.</p>' : '<p class="small mute" style="margin:8px 0 0;font-weight:650">Every coin any of you earns counts.</p>') + '</div>';
    }).join('');
  }
  function badgeCard(m) {
    var st = S.stats[m.id], got = JF.BADGES.filter(function (b) { return st.badges[b.id]; }).length;
    return '<div class="card"><div class="row" style="margin-bottom:8px"><h3 class="grow">Badges</h3><span class="mute small num">' + got + ' of ' + JF.BADGES.length + '</span></div><div class="badges">' + JF.BADGES.map(function (b) {
      var on = st.badges[b.id];
      return '<button class="bdg ' + (on ? 'on' : 'off') + '" data-a="badge" data-v="' + b.id + '"><div class="b" aria-hidden="true">' + b.e + '</div>' + esc(b.t) + '</button>';
    }).join('') + '</div></div>';
  }

  function checkCelebrations() {
    var m = me(); if (!m || m.role !== 'kid' || U.$('.cele') || U.$('.veil')) return;
    var st = S.stats[m.id], key = m.id + '|';
    var oks = S.dones.filter(function (e) { return e.d.m === m.id && e.st === 'ok' && e.by !== m.id; });
    var revTs = 0; oks.forEach(function (e) { var r = S.revs[e.id]; var t = r ? r.ts : e.ts; if (t > revTs) revTs = t; });
    if (ST.seen[key + 'ok'] == null) { ST.seen[key + 'ok'] = revTs; ST.seen[key + 'lvl'] = st.lv.lvl; ST.seen[key + 'sb'] = st.hits.length; ST.saveSeen(); return; }
    var fresh = oks.filter(function (e) { var r = S.revs[e.id]; return (r ? r.ts : e.ts) > ST.seen[key + 'ok']; });
    var lvlUp = st.lv.lvl > (ST.seen[key + 'lvl'] || 1);
    var sb = st.hits.length > (ST.seen[key + 'sb'] || 0) ? st.hits[st.hits.length - 1] : null;
    ST.seen[key + 'ok'] = Math.max(ST.seen[key + 'ok'], revTs); ST.seen[key + 'lvl'] = Math.max(ST.seen[key + 'lvl'] || 1, st.lv.lvl); ST.seen[key + 'sb'] = st.hits.length; ST.saveSeen();
    var queue = [];
    if (fresh.length) {
      var c = 0; fresh.forEach(function (e) { c += Number(e.d.c) || 0; });
      queue.push(['🪙', '+' + c + ' coins!', fresh.length === 1 ? '"' + fresh[0].d.title + '" was approved.' : fresh.length + ' quests were approved.']);
    }
    if (sb) queue.push(['🔥', sb.n + '-day streak!', 'Streak bonus: +' + sb.c + ' coins.']);
    if (lvlUp) queue.push([m.emoji, 'Level ' + st.lv.lvl + '!', 'You are now a ' + st.lv.title + '.']);
    (function next() { var x = queue.shift(); if (x) U.celebrate(x[0], x[1], x[2], next); })();
  }

  /* ================= parent home ================= */
  function parentHome() {
    var needs = '';
    if (S.pending.length || S.toGive.length) {
      needs = '<div class="sec"><h2>Needs you</h2>' + (S.pending.length > 1 ? '<button class="link" data-a="approveall">Approve all ' + S.pending.length + '</button>' : '') + '</div><div class="card needs-card">' +
        S.pending.map(function (e) {
          return '<div class="need">' + av(S.byId[e.d.m]) + '<div class="grow"><div class="t">' + esc(e.d.emoji || '') + ' ' + esc(e.d.title) + '</div><div class="s">' + esc(name(e.d.m)) + ' · ' + esc(when(e.ts)) + ' · ' + coin(e.d.c) + '</div></div><div class="acts"><button class="btn sm no" data-a="reject" data-e="' + esc(e.id) + '" aria-label="Not yet">Not yet</button><button class="btn sm ok" data-a="approve" data-e="' + esc(e.id) + '">Approve</button></div></div>';
        }).join('') +
        S.toGive.map(function (e) {
          return '<div class="need">' + av(S.byId[e.d.m]) + '<div class="grow"><div class="t">' + esc(e.d.emoji || '🎁') + ' ' + esc(e.d.title) + '</div><div class="s">' + esc(name(e.d.m)) + ' bought this ' + esc(when(e.ts)) + '</div></div><div class="acts"><button class="btn sm no" data-a="refund" data-e="' + esc(e.id) + '">Refund</button><button class="btn sm" data-a="give" data-e="' + esc(e.id) + '">Handed over</button></div></div>';
        }).join('') + '</div>';
    }
    var kids = S.kids.map(function (k) {
      var st = S.stats[k.id], list = JF.questsFor(S, k, S.today), dn = list.filter(function (x) { return x.st === 'ok' || x.st === 'wait'; }).length;
      return '<button class="card kidcard" data-a="kid" data-v="' + esc(k.id) + '">' + av(k, 'lg') + '<div class="grow"><h3>' + esc(k.name) + '</h3><div class="meta">Level ' + st.lv.lvl + ' ' + esc(st.lv.title) + ' · 🔥 ' + st.streak + '</div><div class="meta num">🪙 ' + st.coins + ' · ' + esc(JF.rp(st.rp)) + '</div></div><div style="text-align:right"><b class="num" style="font-size:22px">' + dn + '/' + list.length + '</b><div class="meta">today</div></div></button>';
    }).join('');
    var today = JF.agenda(S, S.today, 1)[0].items.map(agItem).join('');
    var bd = JF.nextBirthdays(S, S.today).filter(function (b) { return b.inDays <= 21; }).map(function (b) {
      return '<div class="banner info"><span class="grow">🎂 ' + esc(b.m.name) + ' turns ' + b.age + (b.inDays === 0 ? ' today!' : b.inDays === 1 ? ' tomorrow.' : ' in ' + b.inDays + ' days.') + '</span></div>';
    }).join('');
    var shopN = S.items.filter(function (i) { return i.list === 'shop' && !i.done; }).length;
    var todoN = S.items.filter(function (i) { return i.list === 'todo' && !i.done; }).length;
    var lists = '<div class="card"><button class="setrow" data-a="golist" data-v="shop"><span class="ic">🛒</span><span class="grow">Shopping list</span><b class="num">' + shopN + '</b><span class="go">›</span></button><button class="setrow" data-a="golist" data-v="todo"><span class="ic">✅</span><span class="grow">Family to-dos</span><b class="num">' + todoN + '</b><span class="go">›</span></button><button class="setrow" data-a="quests"><span class="ic">🗺️</span><span class="grow">Quests and coin values</span><span class="go">›</span></button></div>';
    var left = bd + needs + '<div class="sec"><h2>The kids</h2></div>' + (kids || '<div class="card"><div class="empty">Add a child in Family to start quests.</div></div>');
    var right = '<div class="sec"><h2>Today</h2><button class="link" data-a="addev">Add</button></div>' + (today || '<div class="card"><div class="empty">Nothing on the agenda today.</div></div>') + fgoalCards() + lists;
    if (!needs) left = bd + '<div class="card" style="display:flex;gap:12px;align-items:center"><span style="font-size:30px">✨</span><div class="grow" style="font-weight:700">All caught up. Nothing waiting for you.</div></div>' + left.slice(bd.length);
    return '<div class="grid2"><div>' + left + '</div><div>' + right + '</div></div>';
  }

  function kidSheet(id) {
    var k = S.byId[id], st = S.stats[id];
    var hist = [];
    S.dones.forEach(function (e) { if (e.d.m === id) hist.push({ ts: e.ts, t: (e.d.emoji || '') + ' ' + e.d.title, c: e.st === 'ok' ? '+' + e.d.c : e.st === 'wait' ? 'waiting' : 'not yet' }); });
    S.bonuses.forEach(function (e) { if (e.d.m === id) hist.push({ ts: e.ts, t: (e.d.c > 0 ? '⭐ Bonus' : '➖ Taken back') + (e.d.why ? ': ' + e.d.why : ''), c: (e.d.c > 0 ? '+' : '') + e.d.c }); });
    S.buys.forEach(function (e) { if (e.d.m === id) hist.push({ ts: e.ts, t: (e.d.emoji || '🎁') + ' Bought ' + e.d.title, c: e.st === 'refunded' ? 'refunded' : '-' + e.d.c }); });
    S.cash.forEach(function (e) { if (e.d.m === id) hist.push({ ts: e.ts, t: '💵 Paid out ' + JF.rp(e.d.rp), c: '-' + e.d.c }); });
    st.hits.forEach(function (h) { hist.push({ ts: JF.parseDay(h.day).getTime() + 86399000, t: '🔥 ' + h.n + '-day streak bonus', c: '+' + h.c }); });
    hist.sort(function (a, b) { return b.ts - a.ts; });
    var body = '<div class="row" style="margin-bottom:6px">' + av(k, 'lg') + '<div class="grow"><b style="font-size:19px">Level ' + st.lv.lvl + ' ' + esc(st.lv.title) + '</b><div class="mute small num">🪙 ' + st.coins + ' coins = ' + esc(JF.rp(st.rp)) + ' · 🔥 ' + st.streak + ' days · ' + st.done + ' quests done</div><div class="mute small num">Paid out so far: ' + esc(JF.rp(st.paidRp)) + '</div></div></div>' +
      '<div class="foot" style="margin-top:12px"><button class="btn alt" data-x="bonus">⭐ Bonus</button><button class="btn alt" data-x="pay">💵 Pay out</button></div>' +
      '<div class="sec" style="margin-top:18px"><h2>Today</h2></div>' + questList(k, true) +
      '<div class="sec"><h2>History</h2></div><div class="card">' + (hist.length ? hist.slice(0, 60).map(function (h) { return '<div class="li"><div class="grow"><div class="txt">' + esc(h.t) + '</div><div class="mute small">' + esc(when(h.ts)) + '</div></div><b class="num">' + esc(h.c) + '</b></div>'; }).join('') : '<div class="empty">Nothing yet.</div>') + '</div>';
    var v = U.sheet(k.name, body);
    U.$('[data-x="bonus"]', v).onclick = function () { bonusSheet(id); };
    U.$('[data-x="pay"]', v).onclick = function () { paySheet(id); };
    v.addEventListener('click', function (e) { var b = e.target.closest('[data-a="markdone"]'); if (b) { markDone(b.getAttribute('data-q'), b.getAttribute('data-m'), true); kidSheet(id); } });
  }
  function bonusSheet(id) {
    var v = U.sheet('Bonus for ' + name(id), '<label class="f">Coins</label>' + U.chips('amt', [[5, '+5'], [10, '+10'], [20, '+20'], [50, '+50'], [100, '+100'], [-10, '−10'], [-20, '−20']], 10) +
      '<label class="f">Or type an amount</label><input type="number" name="amt" inputmode="numeric" placeholder="e.g. 25 or -5"><label class="f">What for</label><input type="text" name="why" placeholder="e.g. Helped Mum without being asked"><div class="foot"><button class="btn" data-x="save">Give</button></div>');
    U.$('[data-x="save"]', v).onclick = function () {
      var n = Number(U.val(v, 'amt')) || Number(U.readChips(v, 'amt')[0]) || 0;
      if (!n) { U.toast('Pick an amount first.', true); return; }
      ST.add('bonus', { m: id, c: n, why: U.val(v, 'why') });
      U.closeSheet(); U.toast((n > 0 ? '+' : '') + n + ' coins for ' + name(id)); U.chime();
    };
  }
  function paySheet(id) {
    var st = S.stats[id];
    if (st.coins <= 0) { U.toast(name(id) + ' has no coins to pay out yet.', true); return; }
    var v = U.sheet('Pay out to ' + name(id), '<p class="mute" style="font-weight:650;margin-top:0">Give the money in real life, then record it here. ' + esc(name(id)) + ' has ' + st.coins + ' coins (' + esc(JF.rp(st.rp)) + ').</p><label class="f">Coins to pay out</label><input type="number" name="c" inputmode="numeric" value="' + st.coins + '"><p class="small mute" id="rpv" style="font-weight:700"></p><div class="foot"><button class="btn" data-x="save">Record payout</button></div>');
    var inp = U.$('[name="c"]', v), out = U.$('#rpv', v);
    function upd() { out.textContent = '= ' + JF.rp((Number(inp.value) || 0) * S.coinRp) + ' at ' + JF.rp(S.coinRp) + ' per coin'; }
    inp.oninput = upd; upd();
    U.$('[data-x="save"]', v).onclick = function () {
      var c = Math.floor(Number(inp.value) || 0);
      if (c <= 0) { U.toast('Type how many coins.', true); return; }
      if (c > st.coins) { U.toast(name(id) + ' only has ' + st.coins + ' coins.', true); return; }
      ST.add('cash', { m: id, c: c, rp: c * S.coinRp });
      U.closeSheet(); U.toast('Recorded ' + JF.rp(c * S.coinRp) + ' paid to ' + name(id));
    };
  }

  /* ================= quests actions ================= */
  function markDone(qid, mid, byParent) {
    var q = S.recs.quest[qid], m = S.byId[mid]; if (!q || !m) return;
    var d = { q: qid, m: mid, day: S.today, c: Number(q.c) || 0, title: q.title, emoji: q.emoji || '' };
    if (byParent) d.ok = 1;
    ST.add('done', d);
  }

  /* ================= agenda ================= */
  function agItem(it) {
    if (it.bday) return '<div class="ag bday"><div class="tm">🎂</div><div class="grow"><div class="t">' + esc(it.bday.name) + '\'s birthday</div><div class="small" style="font-weight:700">Turns ' + it.age + '</div></div></div>';
    var ev = it.ev, who = String(ev.who || '').split(',').filter(Boolean).map(function (id) { return S.byId[id]; }).filter(Boolean);
    return '<button class="ag" data-a="editev" data-v="' + esc(ev.id) + '" data-d="' + esc(it.day) + '"><div class="tm">' + (ev.time ? esc(ev.time) + (ev.end ? '<small>' + esc(ev.end) + '</small>' : '') : '<small>All day</small>') + '</div><div class="em" aria-hidden="true">' + esc(ev.emoji || '📅') + '</div><div class="grow"><div class="t">' + esc(ev.title) + '</div>' +
      (ev.place || ev.note ? '<div class="mute small" style="font-weight:600">' + esc([ev.place, ev.note].filter(Boolean).join(' · ')) + '</div>' : '') +
      (who.length ? '<div class="dots">' + who.map(function (m) { return '<i style="--c:' + esc(m.color) + '" title="' + esc(m.name) + '"></i>'; }).join('') + '<span class="mute small" style="font-weight:700;margin-left:2px">' + esc(who.length === S.members.length ? 'Everyone' : who.map(function (m) { return m.name; }).join(', ')) + '</span></div>' : '') + '</div></button>';
  }
  function agendaView() {
    var filt = '<div class="chips" style="margin-bottom:6px">' + [['', '👨‍👩‍👧‍👦 Everyone']].concat(S.members.map(function (m) { return [m.id, esc(m.emoji) + ' ' + esc(m.name)]; })).map(function (o) {
      return '<button class="chip' + (V.agWho === o[0] ? ' on' : '') + '" data-a="agwho" data-v="' + esc(o[0]) + '">' + o[1] + '</button>';
    }).join('') + '</div>';
    function mine(it) { return !V.agWho || it.bday || !it.ev.who || String(it.ev.who).split(',').indexOf(V.agWho) >= 0; }
    // Things that happen every day are shown once at the top, not on every single day.
    var daily = S.events.filter(function (ev) { return ev.rep === 'daily' && JF.occursOn(ev, S.today) && mine({ ev: ev }); })
      .sort(function (a, b) { return String(a.time || '99').localeCompare(String(b.time || '99')); });
    var out = daily.length ? '<div class="dayhead"><b>Every day</b></div>' + daily.map(function (ev) { return agItem({ ev: ev, day: S.today }); }).join('') : '';
    var days = JF.agenda(S, S.today, V.agDays);
    days.forEach(function (d, i) {
      var items = d.items.filter(function (it) { return mine(it) && !(it.ev && it.ev.rep === 'daily'); });
      if (!items.length && i > 1) return;
      out += '<div class="dayhead' + (i === 0 ? ' today' : '') + '"><b>' + esc(dayLabel(d.day)) + '</b>' + (i < 2 ? '<span class="mute small">' + esc(JF.parseDay(d.day).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })) + '</span>' : '') + '</div>' +
        (items.length ? items.map(agItem).join('') : '<div class="mute small" style="padding:4px 6px 8px;font-weight:650">Nothing planned.</div>');
    });
    return '<div style="margin-bottom:10px">' + filt + '</div><button class="btn wide" data-a="addev" style="margin-bottom:6px">＋ Add to the agenda</button>' + out +
      (V.agDays < 42 ? '<button class="btn alt wide" data-a="agmore" style="margin-top:14px">Show ' + (V.agDays === 7 ? 'the next 3 weeks' : 'the next 6 weeks') + '</button>' : '') +
      '<p class="mute small" style="text-align:center;margin-top:16px;font-weight:650">Birthdays come from each person\'s profile in Family.</p>';
  }
  function evSheet(ev, day) {
    var isNew = !ev; ev = ev || { day: day || S.today, who: ST.me, emoji: '📅', rep: 'none' };
    var rep = ev.rep || 'none', wk = /^weekly:(.*)$/.exec(rep), repKey = wk ? 'weekly' : rep;
    var body = '<label class="f">What</label><input type="text" name="title" value="' + esc(ev.title || '') + '" placeholder="e.g. Swimming lesson"' + (isNew ? ' autofocus' : '') + '>' +
      '<label class="f">Icon</label>' + U.emojis('emoji', EV_EMO, ev.emoji) +
      '<div class="row" style="gap:10px"><div class="grow"><label class="f">Date</label><input type="date" name="day" value="' + esc(ev.day || S.today) + '"></div></div>' +
      '<div class="row" style="gap:10px"><div class="grow"><label class="f">From</label><input type="time" name="time" value="' + esc(ev.time || '') + '"></div><div class="grow"><label class="f">To</label><input type="time" name="end" value="' + esc(ev.end || '') + '"></div></div>' +
      '<label class="f">Who</label>' + U.chips('who', S.members.map(function (m) { return [m.id, esc(m.emoji) + ' ' + esc(m.name)]; }), String(ev.who || '').split(','), true) +
      '<label class="f">Repeat</label>' + U.chips('rep', [['none', 'Once'], ['daily', 'Every day'], ['weekly', 'Every week'], ['monthly', 'Every month'], ['yearly', 'Every year']], repKey) +
      '<div id="wkd" class="' + (repKey === 'weekly' ? '' : 'hidden') + '" style="margin-top:10px">' + U.chips('wd', [1, 2, 3, 4, 5, 6, 7].map(function (n) { return [n, DAYN[n]]; }), wk ? wk[1].split(',') : [JF.isoDow(ev.day || S.today)], true) + '</div>' +
      '<label class="f">Where</label><input type="text" name="place" value="' + esc(ev.place || '') + '" placeholder="Optional">' +
      '<label class="f">Note</label><input type="text" name="note" value="' + esc(ev.note || '') + '" placeholder="Optional, e.g. bring swim cap">' +
      '<div class="foot">' + (isNew ? '' : '<button class="btn no" data-x="del">' + (repKey !== 'none' ? 'Remove' : 'Delete') + '</button>') + '<button class="btn" data-x="save">' + (isNew ? 'Add' : 'Save') + '</button></div>' +
      (!isNew && repKey !== 'none' ? '<button class="btn alt wide" data-x="skip" style="margin-top:12px">Skip only ' + esc(dayLabel(day)) + '</button>' : '');
    var v = U.sheet(isNew ? 'Add to the agenda' : 'Edit', body, { onChip: function (g, val, root) { if (g === 'rep') U.$('#wkd', root).classList.toggle('hidden', val !== 'weekly'); } });
    U.$('[data-x="save"]', v).onclick = function () {
      var t = U.val(v, 'title'); if (!t) { U.toast('Give it a name first.', true); return; }
      var r = U.readChips(v, 'rep')[0] || 'none';
      if (r === 'weekly') { var ds = U.readChips(v, 'wd'); if (!ds.length) { U.toast('Pick at least one day of the week.', true); return; } r = 'weekly:' + ds.sort().join(','); }
      var o = { id: ev.id || JF.uid('v'), title: t, emoji: U.readChips(v, 'emoji')[0] || '📅', day: U.val(v, 'day') || S.today, time: U.val(v, 'time'), end: U.val(v, 'end'), who: U.readChips(v, 'who').join(','), rep: r, place: U.val(v, 'place'), note: U.val(v, 'note'), skip: ev.skip || '' };
      ST.rec('ev', o); U.closeSheet(); U.toast(isNew ? 'Added to the agenda' : 'Saved');
    };
    var del = U.$('[data-x="del"]', v);
    if (del) del.onclick = function () { if (confirm('Remove "' + ev.title + '" from the agenda' + (repKey !== 'none' ? ', every time it repeats' : '') + '?')) { var o = copy(ev); o.del = 1; ST.rec('ev', o); U.closeSheet(); U.toast('Removed'); } };
    var sk = U.$('[data-x="skip"]', v);
    if (sk) sk.onclick = function () { var o = copy(ev); o.skip = (o.skip ? o.skip + ',' : '') + day; ST.rec('ev', o); U.closeSheet(); U.toast('Skipped ' + dayLabel(day)); };
  }
  function copy(o) { var x = {}; for (var k in o) if (k[0] !== '_' && k !== 't') x[k] = o[k]; return x; }

  /* ================= lists ================= */
  function listsView() {
    var seg = '<div class="seg" role="tablist">' + [['shop', '🛒 Shopping'], ['todo', '✅ To-do'], ['info', '📌 Info']].map(function (s) { return '<button role="tab" aria-selected="' + (V.list === s[0]) + '" class="' + (V.list === s[0] ? 'on' : '') + '" data-a="list" data-v="' + s[0] + '">' + s[1] + '</button>'; }).join('') + '</div>';
    if (V.list === 'info') return seg + infoList();
    var items = S.items.filter(function (i) { return i.list === V.list; });
    var open = items.filter(function (i) { return !i.done; }), done = items.filter(function (i) { return i.done; });
    if (V.list === 'todo') open.sort(function (a, b) { return String(a.due || '9999').localeCompare(String(b.due || '9999')); });
    function row(i) {
      var who = i.who ? S.byId[i.who] : null, late = i.due && i.due < S.today && !i.done;
      return '<div class="li' + (i.done ? ' done' : '') + '"><button class="chk' + (i.done ? ' on' : '') + '" data-a="tick" data-v="' + esc(i.id) + '" aria-label="' + (i.done ? 'Mark not done' : 'Mark done') + ': ' + esc(i.text) + '">' + (i.done ? '✓' : '') + '</button><button class="grow" style="text-align:left;min-height:44px" data-a="edititem" data-v="' + esc(i.id) + '"><div class="txt">' + esc(i.text) + (i.qty ? ' <span class="mute">× ' + esc(i.qty) + '</span>' : '') + '</div>' +
        (i.due ? '<div class="small" style="font-weight:700;color:' + (late ? 'var(--no)' : 'var(--mute)') + '">' + (late ? 'Overdue · ' : 'Due ') + esc(dayLabel(i.due)) + '</div>' : '') + '</button>' + (who ? av(who, 'sm') : '') + '</div>';
    }
    var add = '<div class="addbar"><input type="text" id="newitem" placeholder="' + (V.list === 'shop' ? 'Add something to buy' : 'Add a to-do') + '" enterkeyhint="done" autocomplete="off"><button class="btn" data-a="additem" aria-label="Add">＋</button></div>';
    return seg + add + '<div class="card">' + (open.length ? open.map(row).join('') : '<div class="empty"><span class="big">' + (V.list === 'shop' ? '🧺' : '🎈') + '</span>' + (V.list === 'shop' ? 'Nothing to buy right now.' : 'No to-dos. Nice.') + '</div>') + '</div>' +
      (done.length ? '<div class="sec"><h2 class="mute" style="font-size:17px">' + (V.list === 'shop' ? 'In the basket' : 'Done') + '</h2><button class="link" data-a="cleardone">Clear</button></div><div class="card flat">' + done.map(row).join('') + '</div>' : '');
  }
  function infoList() {
    var notes = S.items.filter(function (i) { return i.list === 'info' && (!i.priv || isParent()); });
    return '<button class="btn wide" data-a="addnote" style="margin-bottom:14px">＋ Add a note</button>' + (notes.length ? notes.map(function (n) {
      return '<button class="card" style="display:block;width:100%;text-align:left" data-a="editnote" data-v="' + esc(n.id) + '"><div class="row"><h3 class="grow">' + esc(n.title || 'Note') + '</h3>' + (n.priv ? '<span class="tag">🔒 Parents</span>' : '') + '</div><div style="white-space:pre-wrap;margin-top:6px;font-weight:550">' + esc(n.text) + '</div></button>';
    }).join('') : '<div class="card"><div class="empty"><span class="big">📌</span>Keep things everyone needs here: school times, uniform days, emergency numbers.</div></div>');
  }
  function itemSheet(i) {
    var todo = i.list === 'todo';
    var v = U.sheet(todo ? 'To-do' : 'Shopping item', '<label class="f">' + (todo ? 'What' : 'Item') + '</label><input type="text" name="text" value="' + esc(i.text) + '">' +
      (todo ? '<label class="f">Who</label>' + U.chips('who', [['', 'Anyone']].concat(S.members.map(function (m) { return [m.id, esc(m.emoji) + ' ' + esc(m.name)]; })), i.who || '') + '<label class="f">Due</label><input type="date" name="due" value="' + esc(i.due || '') + '">'
        : '<label class="f">How many</label><input type="text" name="qty" value="' + esc(i.qty || '') + '" placeholder="Optional, e.g. 2 packs">') +
      '<div class="foot"><button class="btn no" data-x="del">Delete</button><button class="btn" data-x="save">Save</button></div>');
    U.$('[data-x="save"]', v).onclick = function () {
      var o = copy(i); o.text = U.val(v, 'text') || i.text;
      if (todo) { o.who = U.readChips(v, 'who')[0] || ''; o.due = U.val(v, 'due'); } else o.qty = U.val(v, 'qty');
      ST.rec('item', o); U.closeSheet();
    };
    U.$('[data-x="del"]', v).onclick = function () { var o = copy(i); o.del = 1; ST.rec('item', o); U.closeSheet(); U.toast('Deleted'); };
  }
  function noteSheet(n) {
    var isNew = !n; n = n || { list: 'info' };
    var v = U.sheet(isNew ? 'New note' : 'Edit note', '<label class="f">Title</label><input type="text" name="title" value="' + esc(n.title || '') + '" placeholder="e.g. School"' + (isNew ? ' autofocus' : '') + '><label class="f">Note</label><textarea name="text" placeholder="Times, numbers, reminders">' + esc(n.text || '') + '</textarea>' +
      (isParent() ? '<label class="f">Who can see it</label>' + U.chips('priv', [['0', 'Everyone'], ['1', '🔒 Parents only']], n.priv ? '1' : '0') : '') +
      '<div class="foot">' + (isNew ? '' : '<button class="btn no" data-x="del">Delete</button>') + '<button class="btn" data-x="save">Save</button></div>');
    U.$('[data-x="save"]', v).onclick = function () {
      var o = copy(n); o.id = n.id || JF.uid('n'); o.list = 'info'; o.title = U.val(v, 'title'); o.text = U.val(v, 'text');
      if (!o.title && !o.text) { U.toast('Write something first.', true); return; }
      if (isParent()) o.priv = U.readChips(v, 'priv')[0] === '1' ? 1 : 0;
      ST.rec('item', o); U.closeSheet();
    };
    var d = U.$('[data-x="del"]', v); if (d) d.onclick = function () { if (confirm('Delete this note?')) { var o = copy(n); o.del = 1; ST.rec('item', o); U.closeSheet(); } };
  }

  /* ================= shop ================= */
  function shopView() {
    var m = me();
    if (isParent()) {
      var wallets = S.kids.map(function (k) { var st = S.stats[k.id]; return '<div class="card wallet">' + av(k, 'lg') + '<div class="grow"><h3>' + esc(k.name) + '</h3><div class="mute small num">' + esc(JF.rp(st.rp)) + ' · ' + st.coins + ' coins</div></div><button class="btn sm alt" data-a="kid" data-v="' + esc(k.id) + '">Open</button></div>'; }).join('');
      var all = S.rewards.map(function (r) {
        return '<button class="prize' + (r.on === 0 ? ' locked' : '') + '" data-a="editreward" data-v="' + esc(r.id) + '"><div class="em">' + esc(r.emoji || '🎁') + '</div><div class="t">' + esc(r.title) + '</div><div class="row">' + coin(r.c) + '<span class="mute small num">' + esc(JF.rp(r.c * S.coinRp)) + '</span></div>' + (r.on === 0 ? '<span class="tag">Hidden</span>' : '') + '</button>';
      }).join('');
      return '<div class="grid2"><div><div class="sec"><h2>Rewards in the shop</h2><button class="link" data-a="addreward">Add</button></div><div class="shop">' + all + '</div></div><div><div class="sec"><h2>Wallets</h2></div>' + wallets +
        '<div class="card"><div class="row"><span style="font-size:28px">🪙</span><div class="grow"><b>1 coin = ' + esc(JF.rp(S.coinRp)) + '</b><div class="mute small">Change it in Family, Settings.</div></div></div></div></div></div>';
    }
    var st = S.stats[m.id];
    var wallet = '<div class="hero" style="--c:' + esc(m.color) + '"><div class="wallet"><div style="font-size:46px">👛</div><div class="grow"><div class="lvl">My wallet</div><div class="big num">🪙 ' + st.coins + '</div><div class="xp num">' + esc(JF.rp(st.rp)) + '</div></div></div></div>';
    var prizes = S.rewards.filter(function (r) { return r.on !== 0; }).map(function (r) {
      var can = st.coins >= r.c;
      return '<div class="prize' + (can ? '' : ' locked') + '"><div class="em">' + esc(r.emoji || '🎁') + '</div><div class="t">' + esc(r.title) + '</div>' + coin(r.c) +
        (can ? '<button class="btn sm" data-a="buy" data-v="' + esc(r.id) + '">Get it</button>' : '<div class="mute small" style="font-weight:700">' + (r.c - st.coins) + ' more coins</div>') + '</div>';
    }).join('');
    var mine = S.buys.filter(function (e) { return e.d.m === m.id; }).slice(-8).reverse();
    var treats = mine.length ? '<div class="sec"><h2>My treats</h2></div><div class="card">' + mine.map(function (e) {
      return '<div class="li"><span style="font-size:24px">' + esc(e.d.emoji || '🎁') + '</span><div class="grow"><div class="txt">' + esc(e.d.title) + '</div><div class="mute small">' + esc(when(e.ts)) + '</div></div><span class="tag ' + (e.st === 'given' ? 'ok' : e.st === 'waiting' ? 'wait' : 'no') + '">' + (e.st === 'given' ? '✓ Got it' : e.st === 'waiting' ? '⏳ Coming' : 'Refunded') + '</span></div>';
    }).join('') + '</div>' : '';
    return '<div class="grid2"><div>' + wallet + '<div class="sec"><h2>Pick a reward</h2></div><div class="shop">' + (prizes || '<div class="card"><div class="empty">The shop is empty. Ask a parent to add rewards.</div></div>') + '</div></div><div>' + goalCard(m) + treats + '</div></div>';
  }
  function rewardSheet(r) {
    var isNew = !r; r = r || { c: 50, emoji: '🎁', on: 1 };
    var v = U.sheet(isNew ? 'New reward' : 'Edit reward', '<label class="f">Reward</label><input type="text" name="title" value="' + esc(r.title || '') + '" placeholder="e.g. Pick Saturday breakfast"' + (isNew ? ' autofocus' : '') + '>' +
      '<label class="f">Icon</label>' + U.emojis('emoji', REWARD_EMO, r.emoji) +
      '<label class="f">Price in coins</label><input type="number" name="c" inputmode="numeric" value="' + esc(r.c) + '"><p class="small mute" id="rpv" style="font-weight:700;margin:6px 0 0"></p>' +
      '<label class="f">In the shop</label>' + U.chips('on', [['1', 'Showing'], ['0', 'Hidden']], r.on === 0 ? '0' : '1') +
      '<div class="foot">' + (isNew ? '' : '<button class="btn no" data-x="del">Delete</button>') + '<button class="btn" data-x="save">Save</button></div>');
    var inp = U.$('[name="c"]', v), out = U.$('#rpv', v);
    function upd() { out.textContent = 'Worth ' + JF.rp((Number(inp.value) || 0) * S.coinRp); }
    inp.oninput = upd; upd();
    U.$('[data-x="save"]', v).onclick = function () {
      var t = U.val(v, 'title'), c = Math.round(Number(inp.value) || 0);
      if (!t || c <= 0) { U.toast('Give it a name and a price above 0.', true); return; }
      var o = copy(r); o.id = r.id || JF.uid('r'); o.title = t; o.c = c; o.emoji = U.readChips(v, 'emoji')[0] || '🎁'; o.on = U.readChips(v, 'on')[0] === '0' ? 0 : 1;
      ST.rec('reward', o); U.closeSheet();
    };
    var d = U.$('[data-x="del"]', v); if (d) d.onclick = function () { if (confirm('Delete "' + r.title + '" from the shop?')) { var o = copy(r); o.del = 1; ST.rec('reward', o); U.closeSheet(); } };
  }
  function goalSheet(mid) {
    var g = S.stats[mid].goal, isNew = !g; g = g || { m: mid, emoji: '🧱' };
    var v = U.sheet('Savings goal', '<label class="f">I\'m saving for</label><input type="text" name="title" value="' + esc(g.title || '') + '" placeholder="e.g. New LEGO set"' + (isNew ? ' autofocus' : '') + '>' +
      '<label class="f">Icon</label>' + U.emojis('emoji', ['🧱', '🎮', '⚽', '🚲', '🎧', '📚', '🧸', '🎨', '🛹', '🎹', '👟', '🎁'], g.emoji) +
      '<label class="f">How much does it cost (Rp)</label><input type="number" name="rp" inputmode="numeric" value="' + esc(g.rp || '') + '" placeholder="e.g. 450000">' +
      '<div class="foot">' + (isNew ? '' : '<button class="btn no" data-x="del">Remove</button>') + '<button class="btn" data-x="save">Save</button></div>');
    U.$('[data-x="save"]', v).onclick = function () {
      var t = U.val(v, 'title'), rp = Math.round(Number(U.val(v, 'rp')) || 0);
      if (!t || rp <= 0) { U.toast('Write what it is and how much it costs.', true); return; }
      var o = copy(g); o.id = g.id || JF.uid('g'); o.m = mid; o.title = t; o.rp = rp; o.emoji = U.readChips(v, 'emoji')[0] || '🐷';
      ST.rec('goal', o); U.closeSheet(); U.toast('Goal set. You can do it!');
    };
    var d = U.$('[data-x="del"]', v); if (d) d.onclick = function () { var o = copy(g); o.del = 1; ST.rec('goal', o); U.closeSheet(); };
  }

  /* ================= family ================= */
  function familyView() {
    var par = isParent();
    var verse = S.set.verse ? '<div class="verse"' + (par ? ' data-a="verse" role="button" tabindex="0"' : '') + '><div class="small" style="font-weight:800;opacity:.75;margin-bottom:8px">Verse of the week</div><q>' + esc(S.set.verse) + '</q><div class="ref">' + esc(S.set.verseRef || '') + '</div></div>' : (par ? '<button class="card" style="width:100%" data-a="verse">＋ Add a verse of the week</button>' : '');
    var pr = S.prayers.filter(function (p) { return !p.ans; }), ans = S.prayers.filter(function (p) { return p.ans; }).slice(0, 5);
    function prow(p) { var who = S.byId[p.by]; return '<div class="prayer' + (p.ans ? ' ans' : '') + '">' + (who ? av(who, 'sm') : '<span class="av sm">🙏</span>') + '<div class="grow"><div class="txt">' + esc(p.text) + '</div>' + (p.ans ? '<div class="amen">🙌 Answered</div>' : '') + '</div>' + (p.ans ? '' : '<button class="btn sm alt" data-a="answered" data-v="' + esc(p.id) + '">🙌</button>') + '</div>'; }
    var prayer = '<div class="sec"><h2>Prayer wall</h2><button class="link" data-a="addpray">Add</button></div><div class="card">' + (pr.length ? pr.map(prow).join('') : '<div class="empty">Add something to pray for together.</div>') + (ans.length ? '<div class="small mute" style="font-weight:800;margin:12px 0 2px">Answered</div>' + ans.map(prow).join('') : '') + '</div>';
    var bdays = '<div class="sec"><h2>Birthdays</h2></div><div class="card">' + JF.nextBirthdays(S, S.today).map(function (b) {
      return '<div class="li">' + av(b.m) + '<div class="grow"><div class="txt">' + esc(b.m.name) + ' turns ' + b.age + '</div><div class="mute small">' + esc(JF.parseDay(b.day).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })) + '</div></div><b class="num">' + (b.inDays === 0 ? 'Today! 🎉' : b.inDays + ' days') + '</b></div>';
    }).join('') + '</div>';
    var people = '<div class="sec"><h2>Our family</h2>' + (par ? '<button class="link" data-a="addmember">Add</button>' : '') + '</div><div class="card">' + S.members.map(function (m) {
      return '<button class="setrow"' + (par || m.id === ST.me ? ' data-a="member" data-v="' + esc(m.id) + '"' : '') + '>' + av(m) + '<span class="grow">' + esc(m.name) + '<div class="mute small">' + (m.role === 'parent' ? 'Parent' + (m.pin ? ' · PIN on' : ' · no PIN yet') : 'Level ' + S.stats[m.id].lv.lvl + ' ' + esc(S.stats[m.id].lv.title)) + '</div></span>' + (par || m.id === ST.me ? '<span class="go">›</span>' : '') + '</button>';
    }).join('') + '</div>';
    var tools = par ? '<div class="sec"><h2>Parent tools</h2></div><div class="card">' +
      '<button class="setrow" data-a="quests"><span class="ic">🗺️</span><span class="grow">Quests</span><span class="mute small">' + S.quests.length + '</span><span class="go">›</span></button>' +
      '<button class="setrow" data-a="fgoal"><span class="ic">🍿</span><span class="grow">Family team goal</span><span class="go">›</span></button>' +
      '<button class="setrow" data-a="coinval"><span class="ic">🪙</span><span class="grow">Coin value</span><span class="mute small num">' + esc(JF.rp(S.coinRp)) + '</span><span class="go">›</span></button>' +
      '<button class="setrow" data-a="link"><span class="ic">📲</span><span class="grow">Add another phone or iPad</span><span class="go">›</span></button>' +
      '<button class="setrow" data-a="lock"><span class="ic">🔒</span><span class="grow">Lock parent mode now</span><span class="go">›</span></button></div>' : '';
    var dev = '<div class="sec"><h2>This device</h2></div><div class="card">' +
      '<button class="setrow" data-a="sound"><span class="ic">' + (U.soundOn() ? '🔊' : '🔈') + '</span><span class="grow">Sounds</span><span class="mute small">' + (U.soundOn() ? 'On' : 'Off') + '</span></button>' +
      '<button class="setrow" data-a="syncinfo"><span class="ic">☁️</span><span class="grow">Sync and connection</span><span class="go">›</span></button>' +
      '<button class="setrow" data-a="who"><span class="ic">⇄</span><span class="grow">Switch person</span><span class="go">›</span></button></div>';
    return '<div class="grid2"><div>' + verse + prayer + bdays + '</div><div>' + people + tools + dev + '<p class="mute small" style="text-align:center;font-weight:650">JFam keeps everything in your own Google Sheet.</p></div></div>';
  }
  function memberSheet(m) {
    var isNew = !m; m = m || { role: 'kid', emoji: '🐻', color: COLORS[S.members.length % COLORS.length] };
    var par = isParent();
    var v = U.sheet(isNew ? 'Add family member' : m.name, '<label class="f">Name</label><input type="text" name="name" value="' + esc(m.name || '') + '"' + (isNew ? ' autofocus' : '') + '>' +
      '<label class="f">Face</label>' + U.emojis('emoji', MEMBER_EMO, m.emoji) +
      '<label class="f">Color</label><div class="chips" data-group="color">' + COLORS.map(function (c) { return '<button type="button" data-chip="' + c + '" class="chip' + (c === m.color ? ' on' : '') + '" style="width:44px;padding:0;background:' + c + '" aria-label="Color ' + c + '"></button>'; }).join('') + '</div>' +
      (par ? '<label class="f">Role</label>' + U.chips('role', [['parent', 'Parent'], ['kid', 'Child']], m.role) + '<label class="f">Birthday</label><input type="date" name="bday" value="' + esc(m.bday || '') + '">' : '') +
      (par && m.role === 'parent' && !isNew ? '<button class="btn alt wide" data-x="pin" style="margin-top:16px">' + (m.pin ? 'Change PIN' : 'Set a PIN') + '</button>' : '') +
      '<div class="foot">' + (par && !isNew && m.id !== ST.me ? '<button class="btn no" data-x="del">Remove</button>' : '') + '<button class="btn" data-x="save">Save</button></div>');
    U.$('[data-x="save"]', v).onclick = function () {
      var n = U.val(v, 'name'); if (!n) { U.toast('Type a name.', true); return; }
      var o = copy(m); o.id = m.id || JF.uid('m'); o.name = n; o.emoji = U.readChips(v, 'emoji')[0] || m.emoji; o.color = U.readChips(v, 'color')[0] || m.color;
      if (par) { o.role = U.readChips(v, 'role')[0] || m.role; o.bday = U.val(v, 'bday'); o.ord = m.ord != null ? m.ord : S.members.length; }
      ST.rec('member', o); U.closeSheet(); U.toast('Saved');
    };
    var p = U.$('[data-x="pin"]', v); if (p) p.onclick = function () { pinSheet(m, 'set'); };
    var d = U.$('[data-x="del"]', v); if (d) d.onclick = function () { if (confirm('Remove ' + m.name + ' from JFam? Their history stays in the Sheet.')) { var o = copy(m); o.del = 1; ST.rec('member', o); U.closeSheet(); } };
  }
  function questsSheet() {
    var groups = { morning: [], day: [], evening: [] };
    S.quests.forEach(function (q) { (groups[q.part] || groups.day).push(q); });
    var body = '<p class="mute" style="font-weight:650;margin-top:0">Tap a quest to change it. 1 coin = ' + esc(JF.rp(S.coinRp)) + '.</p><button class="btn wide" data-x="add">＋ New quest</button>';
    ['morning', 'day', 'evening'].forEach(function (p) {
      if (!groups[p].length) return;
      body += '<div class="part ' + p + '">' + PARTS[p][0] + ' ' + PARTS[p][1] + '</div><div class="card" style="padding:6px 14px">' + groups[p].map(function (q) {
        var who = q.who === 'any' ? '🎯 Bounty' : q.who === 'all' || !q.who ? 'All kids' : String(q.who).split(',').map(name).join(', ');
        return '<button class="setrow" data-q="' + esc(q.id) + '"' + (q.on === 0 ? ' style="opacity:.5"' : '') + '><span class="ic">' + esc(q.emoji || '⭐') + '</span><span class="grow">' + esc(q.title) + '<div class="mute small">' + esc(who + ' · ' + JF.repLabel(q.rep)) + (q.on === 0 ? ' · paused' : '') + '</div></span>' + coin(q.c) + '</button>';
      }).join('') + '</div>';
    });
    var v = U.sheet('Quests', body);
    U.$('[data-x="add"]', v).onclick = function () { questSheet(null); };
    v.addEventListener('click', function (e) { var b = e.target.closest('[data-q]'); if (b) questSheet(S.recs.quest[b.getAttribute('data-q')]); });
  }
  function questSheet(q) {
    var isNew = !q; q = q || { c: 10, emoji: '⭐', who: 'all', rep: 'daily', part: 'day', on: 1 };
    var wk = /^week:(.*)$/.exec(q.rep || ''), repKey = !q.rep || q.rep === 'daily' ? 'daily' : q.rep === 'once' ? 'once' : wk && wk[1] === '1,2,3,4,5' ? 'school' : wk && wk[1] === '6,7' ? 'weekend' : 'some';
    var whoKey = q.who === 'any' ? ['any'] : q.who === 'all' || !q.who ? ['all'] : String(q.who).split(',');
    var v = U.sheet(isNew ? 'New quest' : 'Edit quest', '<label class="f">Quest</label><input type="text" name="title" value="' + esc(q.title || '') + '" placeholder="e.g. Put shoes on the rack"' + (isNew ? ' autofocus' : '') + '>' +
      '<label class="f">Icon</label>' + U.emojis('emoji', QUEST_EMO, q.emoji) +
      '<label class="f">Coins</label>' + U.chips('c', [[5, '5'], [10, '10'], [15, '15'], [20, '20'], [30, '30'], [50, '50']], q.c) + '<input type="number" name="c" inputmode="numeric" placeholder="Or type another amount" style="margin-top:8px">' +
      '<label class="f">For</label>' + U.chips('who', [['all', 'All kids'], ['any', '🎯 Bounty (first one)']].concat(S.kids.map(function (k) { return [k.id, esc(k.emoji) + ' ' + esc(k.name)]; })), whoKey, true) +
      '<label class="f">When</label>' + U.chips('rep', [['daily', 'Every day'], ['school', 'School days'], ['weekend', 'Weekends'], ['some', 'Pick days'], ['once', 'One time']], repKey) +
      '<div id="wkd" class="' + (repKey === 'some' ? '' : 'hidden') + '" style="margin-top:10px">' + U.chips('wd', [1, 2, 3, 4, 5, 6, 7].map(function (n) { return [n, DAYN[n]]; }), wk ? wk[1].split(',') : [], true) + '</div>' +
      '<label class="f">Time of day</label>' + U.chips('part', [['morning', '🌅 Morning'], ['day', '☀️ Day'], ['evening', '🌙 Evening']], q.part || 'day') +
      '<label class="f">Status</label>' + U.chips('on', [['1', 'Active'], ['0', 'Paused']], q.on === 0 ? '0' : '1') +
      '<div class="foot">' + (isNew ? '' : '<button class="btn no" data-x="del">Delete</button>') + '<button class="btn" data-x="save">Save</button></div>', {
      onChip: function (g, val, root) {
        if (g === 'rep') U.$('#wkd', root).classList.toggle('hidden', val !== 'some');
        if (g === 'who') {
          var on = U.readChips(root, 'who');
          if ((val === 'all' || val === 'any') && on.indexOf(val) >= 0) U.$$('[data-group="who"] [data-chip]', root).forEach(function (b) { if (b.getAttribute('data-chip') !== val) b.classList.remove('on'); });
          else if (val !== 'all' && val !== 'any') U.$$('[data-group="who"] [data-chip="all"], [data-group="who"] [data-chip="any"]', root).forEach(function (b) { b.classList.remove('on'); });
        }
      }
    });
    U.$('[data-x="save"]', v).onclick = function () {
      var t = U.val(v, 'title'); if (!t) { U.toast('Name the quest first.', true); return; }
      var c = Math.round(Number(U.val(v, 'c')) || Number(U.readChips(v, 'c')[0]) || 0); if (c <= 0) { U.toast('Pick how many coins it gives.', true); return; }
      var who = U.readChips(v, 'who'); who = who.indexOf('any') >= 0 ? 'any' : who.indexOf('all') >= 0 || !who.length ? 'all' : who.join(',');
      var r = U.readChips(v, 'rep')[0] || 'daily';
      if (r === 'school') r = 'week:1,2,3,4,5'; else if (r === 'weekend') r = 'week:6,7';
      else if (r === 'some') { var ds = U.readChips(v, 'wd'); if (!ds.length) { U.toast('Pick at least one day.', true); return; } r = 'week:' + ds.sort().join(','); }
      var o = copy(q); o.id = q.id || JF.uid('q'); o.title = t; o.c = c; o.emoji = U.readChips(v, 'emoji')[0] || '⭐'; o.who = who; o.rep = r; o.part = U.readChips(v, 'part')[0] || 'day'; o.on = U.readChips(v, 'on')[0] === '0' ? 0 : 1;
      if (isNew) o.from = S.today;
      ST.rec('quest', o); U.toast('Saved'); questsSheet();
    };
    var d = U.$('[data-x="del"]', v); if (d) d.onclick = function () { if (confirm('Delete "' + q.title + '"? Coins already earned stay.')) { var o = copy(q); o.del = 1; ST.rec('quest', o); questsSheet(); } };
  }
  function pinSheet(m, mode, after) {
    var pin = '', first = '';
    function body(msg) {
      return '<p class="mute" style="text-align:center;font-weight:700;margin:0">' + esc(msg) + '</p><div class="pindots">' + [0, 1, 2, 3].map(function (i) { return '<i class="' + (i < pin.length ? 'on' : '') + '"></i>'; }).join('') + '</div><div class="pinpad">' +
        [1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(function (k) { return k === '' ? '<span></span>' : '<button type="button" data-k="' + k + '" aria-label="' + (k === '⌫' ? 'Delete' : k) + '">' + k + '</button>'; }).join('') + '</div>' +
        (mode === 'set' ? '<p class="small mute" style="text-align:center;font-weight:650">The PIN keeps the kids from approving their own quests.</p>' : '');
    }
    var msg = mode === 'set' ? 'Choose a 4-digit PIN for ' + m.name : 'Enter ' + m.name + '\'s PIN';
    var v = U.sheet(mode === 'set' ? 'Parent PIN' : 'Hi ' + m.name, body(msg));
    function draw(t) { U.$('.bd', v).innerHTML = body(t || msg); }
    v.addEventListener('click', function (e) {
      var b = e.target.closest('[data-k]'); if (!b) return;
      var k = b.getAttribute('data-k');
      if (k === '⌫') pin = pin.slice(0, -1); else if (pin.length < 4) pin += k;
      draw();
      if (pin.length < 4) return;
      if (mode === 'set') {
        if (!first) { first = pin; pin = ''; msg = 'Type it once more'; draw(); return; }
        if (first !== pin) { first = ''; pin = ''; msg = 'Those did not match. Choose a 4-digit PIN'; draw(); U.$('.pindots', v).classList.add('shake'); return; }
        ST.hashPin(m.id, pin).then(function (h) { var o = copy(m); o.pin = h; ST.rec('member', o); ST.unlock(m.id); U.closeSheet(); U.toast('PIN saved'); if (after) after(); });
      } else {
        ST.hashPin(m.id, pin).then(function (h) {
          if (h === m.pin) { ST.unlock(m.id); U.closeSheet(); if (after) after(); }
          else { pin = ''; draw('Wrong PIN. Try again'); U.$('.pindots', v).classList.add('shake'); }
        });
      }
    });
  }
  function syncSheet() {
    var st = ST.sync, n = ST.pendingCount();
    var status = ST.demo ? 'You are looking at a sample family. Nothing is saved to a Sheet.' : !ST.conn ? 'Not connected. Everything is kept on this device only.' :
      st.state === 'err' ? st.msg : st.state === 'busy' ? 'Syncing now…' : st.at ? 'Last synced at ' + clock(st.at) + (n ? '. ' + n + ' change' + (n > 1 ? 's' : '') + ' waiting to sync.' : '. Everything is saved in your Sheet.') : 'Connecting…';
    var v = U.sheet('Sync', '<div class="card flat" style="font-weight:650">' + esc(status) + '</div>' +
      (ST.conn ? '<button class="btn wide" data-x="now">Sync now</button>' : '') +
      '<label class="f">Apps Script address (same as HQ)</label><input type="url" name="u" value="' + esc(ST.conn ? ST.conn.url : '') + '" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://script.google.com/...">' +
      '<label class="f">Secret code</label><input type="text" name="t" value="' + esc(ST.conn ? ST.conn.token : '') + '" autocomplete="off" autocapitalize="off" spellcheck="false">' +
      '<div class="foot">' + (ST.conn ? '<button class="btn no" data-x="off">Disconnect</button>' : '') + '<button class="btn alt" data-x="save">' + (ST.conn ? 'Save' : 'Connect') + '</button></div>' +
      '<p class="small mute" style="font-weight:600">Everything lives in the "jflog" tab of your HQ Data sheet. Rows are only ever added, never changed or removed, so the whole history stays.</p>');
    var now = U.$('[data-x="now"]', v); if (now) now.onclick = function () { U.closeSheet(); ST.syncNow(); };
    U.$('[data-x="save"]', v).onclick = function () { doConnect(U.val(v, 'u'), U.val(v, 't')); };
    var off = U.$('[data-x="off"]', v); if (off) off.onclick = function () { if (confirm('Disconnect this device from your Sheet? Your family data stays safe in the Sheet.')) { U.closeSheet(); ST.disconnect(); } };
  }
  function doConnect(u, t) {
    var lk = /[#&]connect=([^&\s]+)/.exec(u || '');
    if (lk) {
      try { var j = JSON.parse(atob(decodeURIComponent(lk[1]))); u = j.url || ''; t = j.token || ''; }
      catch (e) { U.toast('That connect link is damaged. Paste the address and code from HQ instead.', true); return; }
    }
    if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(u)) { U.toast('That does not look like an Apps Script address. It starts with https://script.google.com/', true); return; }
    if (!t) { U.toast('Type the secret code too.', true); return; }
    U.closeSheet(); ST.setConn(u, t); ST.syncNow().then(function () { if (ST.sync.state === 'ok') U.toast('Connected to your Sheet'); });
  }
  function linkSheet() {
    var link = ST.connLink();
    if (!link) { U.toast('Connect this device to your Sheet first.', true); return; }
    var v = U.sheet('Add another phone or iPad', '<p style="font-weight:650;margin-top:0">Send this link to your family\'s own phone or iPad (AirDrop or WhatsApp to yourself). Open it there in Safari, then tap Share, then Add to Home Screen.</p>' +
      '<div class="banner"><span class="grow">Anyone with this link can open your Sheet, the same as HQ. Only send it to your own family\'s devices.</span></div>' +
      '<div class="foot">' + (navigator.share ? '<button class="btn" data-x="share">Share link</button>' : '') + '<button class="btn alt" data-x="copy">Copy link</button></div>');
    var s = U.$('[data-x="share"]', v); if (s) s.onclick = function () { navigator.share({ title: 'JFam', url: link }).catch(function () {}); };
    U.$('[data-x="copy"]', v).onclick = function () {
      if (navigator.clipboard) navigator.clipboard.writeText(link).then(function () { U.toast('Link copied'); }, function () { U.toast('Could not copy. Use Share instead.', true); });
      else U.toast('Copying is not available here. Use Share instead.', true);
    };
  }

  /* ================= actions ================= */
  var A = {
    tab: function (d) { V.tab = d.v; window.scrollTo(0, 0); render(); },
    who: function () { ST.setMe(''); },
    pick: function (d) {
      var m = S.byId[d.v]; if (!m) return;
      if (m.role === 'parent' && m.pin && !ST.unlocked(m.id)) { pinSheet(m, 'check', function () { V.tab = 'home'; ST.setMe(m.id); }); return; }
      V.tab = 'home'; ST.setMe(m.id);
      if (m.role === 'parent' && !m.pin && !ST.demo) setTimeout(function () { pinSheet(m, 'set'); }, 300);
    },
    lock: function () { ST.lock(); ST.setMe(''); U.toast('Parent mode locked'); },
    done: function (d, el) {
      markDone(d.q, ST.me, false); U.chime();
      var r = el.getBoundingClientRect(); U.confetti(40);
      setTimeout(function () { var q = U.$('#q-' + d.q); if (q) q.classList.add('pop'); }, 30);
      U.toast('Nice! Waiting for a parent to check.');
      void r;
    },
    undo: function (d) { ST.add('rev', { e: d.e, ok: 0, why: 'Undone' }); },
    approve: function (d) { ST.add('rev', { e: d.e, ok: 1 }); U.chime(); },
    approveall: function () { S.pending.forEach(function (e) { ST.add('rev', { e: e.id, ok: 1 }); }); U.chime('big'); U.toast('All approved'); },
    reject: function (d) {
      var e = S.dones.filter(function (x) { return x.id === d.e; })[0]; if (!e) return;
      var v = U.sheet('Not yet', '<p class="mute" style="font-weight:650;margin-top:0">' + esc(name(e.d.m)) + ' will see this and can try again.</p>' + U.chips('why', [['Not finished yet', 'Not finished yet'], ['Please do it properly', 'Please do it properly'], ['Not today', 'Not today']], 'Not finished yet') +
        '<label class="f">Or write your own</label><input type="text" name="why" placeholder="Optional"><div class="foot"><button class="btn" data-x="save">Send back</button></div>');
      U.$('[data-x="save"]', v).onclick = function () { ST.add('rev', { e: d.e, ok: 0, why: U.val(v, 'why') || U.readChips(v, 'why')[0] || 'Not yet' }); U.closeSheet(); };
    },
    give: function (d) { ST.add('give', { e: d.e }); U.toast('Marked as handed over'); },
    refund: function (d) { if (confirm('Refund the coins for this reward?')) ST.add('rev', { e: d.e, ok: 0, why: 'Refunded' }); },
    kid: function (d) { kidSheet(d.v); },
    buy: function (d) {
      var r = S.recs.reward[d.v], st = S.stats[ST.me]; if (!r) return;
      var v = U.sheet('Get this reward?', '<div style="text-align:center"><div style="font-size:64px">' + esc(r.emoji || '🎁') + '</div><h2>' + esc(r.title) + '</h2><p class="mute" style="font-weight:700">Costs ' + r.c + ' coins. You will have ' + (st.coins - r.c) + ' left.</p></div><div class="foot"><button class="btn alt" data-close>Not now</button><button class="btn" data-x="yes">Yes, get it</button></div>');
      U.$('[data-x="yes"]', v).onclick = function () {
        if (S.stats[ST.me].coins < r.c) { U.toast('Not enough coins yet.', true); return; }
        ST.add('buy', { r: r.id, m: ST.me, c: r.c, title: r.title, emoji: r.emoji || '🎁' }); U.closeSheet(); U.celebrate(r.emoji || '🎁', 'It\'s yours!', 'A parent will give it to you soon.');
      };
    },
    goal: function (d) { goalSheet(d.m); },
    addreward: function () { rewardSheet(null); },
    editreward: function (d) { rewardSheet(S.recs.reward[d.v]); },
    agwho: function (d) { V.agWho = d.v; render(); },
    agmore: function () { V.agDays = V.agDays === 7 ? 21 : 42; render(); },
    addev: function () { evSheet(null, S.today); },
    editev: function (d) { var ev = S.recs.ev[d.v]; if (ev) evSheet(ev, d.d); },
    list: function (d) { V.list = d.v; render(); },
    golist: function (d) { V.list = d.v; V.tab = 'lists'; window.scrollTo(0, 0); render(); },
    additem: function () {
      var inp = U.$('#newitem'), t = inp && inp.value.trim(); if (!t) { if (inp) inp.focus(); return; }
      ST.rec('item', { id: JF.uid('i'), list: V.list, text: t, done: 0, by: ST.me });
      setTimeout(function () { var i = U.$('#newitem'); if (i) i.focus(); }, 30);
    },
    tick: function (d) { var i = S.recs.item[d.v]; if (!i) return; var o = copy(i); o.done = i.done ? 0 : 1; ST.rec('item', o); if (o.done) U.chime('soft'); },
    edititem: function (d) { var i = S.recs.item[d.v]; if (i) itemSheet(i); },
    cleardone: function () { S.items.filter(function (i) { return i.list === V.list && i.done; }).forEach(function (i) { var o = copy(i); o.del = 1; ST.rec('item', o); }); },
    addnote: function () { noteSheet(null); },
    editnote: function (d) { noteSheet(S.recs.item[d.v]); },
    addpray: function () {
      var v = U.sheet('Prayer request', '<label class="f">What should we pray for?</label><input type="text" name="t" autofocus placeholder="e.g. For Grandma\'s health"><div class="foot"><button class="btn" data-x="save">Add</button></div>');
      U.$('[data-x="save"]', v).onclick = function () { var t = U.val(v, 't'); if (!t) return; ST.rec('pray', { id: JF.uid('p'), text: t, by: ST.me }); U.closeSheet(); };
    },
    answered: function (d) { var p = S.recs.pray[d.v]; if (!p) return; var o = copy(p); o.ans = 1; o.ansDay = S.today; ST.rec('pray', o); U.celebrate('🙌', 'Praise God!', 'Marked as answered.'); },
    verse: function () {
      if (!isParent()) return;
      var v = U.sheet('Verse of the week', '<label class="f">Verse</label><textarea name="v">' + esc(S.set.verse || '') + '</textarea><label class="f">Reference</label><input type="text" name="r" value="' + esc(S.set.verseRef || '') + '" placeholder="e.g. Joshua 24:15"><div class="foot"><button class="btn" data-x="save">Save</button></div>');
      U.$('[data-x="save"]', v).onclick = function () { var o = copy(S.set); o.id = 'main'; o.verse = U.val(v, 'v'); o.verseRef = U.val(v, 'r'); ST.rec('set', o); U.closeSheet(); };
    },
    fgoal: function () {
      var g = S.fgoals[0] || { emoji: '🍿', target: 500 };
      var v = U.sheet('Family team goal', '<p class="mute" style="font-weight:650;margin-top:0">All the kids\' coins count toward it together, so they cheer each other on instead of competing.</p><label class="f">Goal</label><input type="text" name="t" value="' + esc(g.title || '') + '" placeholder="e.g. Family movie night"><label class="f">Icon</label>' + U.emojis('emoji', ['🍿', '🏖️', '🍕', '🎳', '🏊', '🎡', '🍦', '⛺'], g.emoji) +
        '<label class="f">Coins needed together</label><input type="number" name="n" inputmode="numeric" value="' + esc(g.target) + '"><label class="f">Count from</label>' + U.chips('from', [['keep', g.from ? 'Keep counting' : 'Today'], ['today', 'Start again today']], 'keep') +
        '<div class="foot">' + (g.id ? '<button class="btn no" data-x="del">Remove</button>' : '') + '<button class="btn" data-x="save">Save</button></div>');
      U.$('[data-x="save"]', v).onclick = function () {
        var t = U.val(v, 't'), n = Math.round(Number(U.val(v, 'n')) || 0); if (!t || n <= 0) { U.toast('Name the goal and the coins needed.', true); return; }
        var o = copy(g); o.id = g.id || JF.uid('f'); o.title = t; o.target = n; o.emoji = U.readChips(v, 'emoji')[0] || '🎉'; if (!g.from || U.readChips(v, 'from')[0] === 'today') o.from = S.today;
        ST.rec('fgoal', o); U.closeSheet();
      };
      var dl = U.$('[data-x="del"]', v); if (dl) dl.onclick = function () { var o = copy(g); o.del = 1; ST.rec('fgoal', o); U.closeSheet(); };
    },
    coinval: function () {
      var v = U.sheet('Coin value', '<p class="mute" style="font-weight:650;margin-top:0">How much real money one coin is worth when you pay out. Changing it changes the value of coins the kids already have.</p>' + U.chips('rp', [[50, 'Rp 50'], [100, 'Rp 100'], [200, 'Rp 200'], [250, 'Rp 250'], [500, 'Rp 500'], [1000, 'Rp 1.000']], S.coinRp) + '<div class="foot"><button class="btn" data-x="save">Save</button></div>');
      U.$('[data-x="save"]', v).onclick = function () { var o = copy(S.set); o.id = 'main'; o.coinRp = Number(U.readChips(v, 'rp')[0]) || 100; ST.rec('set', o); U.closeSheet(); };
    },
    quests: function () { questsSheet(); },
    member: function (d) { memberSheet(S.byId[d.v]); },
    addmember: function () { memberSheet(null); },
    link: function () { linkSheet(); },
    sound: function () { try { localStorage.setItem('jf-sound', U.soundOn() ? '0' : '1'); } catch (e) {} render(); U.chime(); },
    syncinfo: function () { syncSheet(); },
    syncnow: function () { ST.syncNow(); },
    hidenote: function () { V.hashNote = ''; render(); },
    badge: function (d) { var b = JF.BADGES.filter(function (x) { return x.id === d.v; })[0]; if (b) U.toast(b.e + ' ' + b.t + ': ' + b.h); },
    connect: function () { doConnect((U.$('#cu').value || '').trim(), (U.$('#ct').value || '').trim()); },
    demo: function () { ST.startDemo(window.JFSeed.demo(JF)); },
    enddemo: function () { ST.endDemo(); },
    markdone: function (d) { markDone(d.q, d.m, true); },
    setup: function () {
      var box = U.$('#setup'), fam = [];
      for (var i = 0; i < 4; i++) {
        var n = U.val(box, 'n' + i); if (!n) continue;
        fam.push({ id: JF.uid('m'), name: n, role: U.val(box, 'r' + i) || 'kid', emoji: ['🦁', '🌻', '🐉', '🦄'][i], color: COLORS[i] });
      }
      if (!fam.some(function (m) { return m.role === 'parent'; })) { U.toast('Add at least one parent.', true); return; }
      JFSeed.seed(JF, fam, S.today, fam[0].id).forEach(function (e) { ST.add(e.k, e.d); });
    }
  };
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-a]'); if (!el || el.closest('.veil')) return;
    var a = A[el.getAttribute('data-a')]; if (!a) return;
    var d = {}; for (var i = 0; i < el.attributes.length; i++) { var at = el.attributes[i]; if (at.name.indexOf('data-') === 0) d[at.name.slice(5)] = at.value; }
    a(d, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target && e.target.id === 'newitem') { e.preventDefault(); A.additem(); }
    if (e.key === 'Enter' && e.target && e.target.getAttribute && e.target.getAttribute('data-a') === 'verse') A.verse();
  });

  /* ================= start ================= */
  ST.load();
  var h = ST.readHash();
  if (h === 'ok') {
    if (U.standalone()) history.replaceState(null, '', location.pathname);
    else V.hashNote = 'Connected. To keep JFam on this ' + (/iPad/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent)) ? 'iPad' : 'phone') + ', tap Share, then Add to Home Screen.';
  } else if (h) V.hashNote = h;
  render();
  if (ST.conn) ST.syncNow();
  // Roll over to the new day while the app stays open.
  setInterval(function () { if (S && S.today !== JF.dayOf()) render(); }, 60000);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
