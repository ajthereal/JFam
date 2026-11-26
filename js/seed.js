/* Starter quests, rewards and family goal. Used for the demo and for a new family.
   No real names live in this repo: names come from the Sheet. */
(function (root) {
  'use strict';
  function seed(JF, fam, today, by) {
    var ts = Date.now() - 1000, out = [];
    function ev(k, d, t, who) { out.push({ id: JF.uid('e'), ts: t || ts++, by: who || by || '', k: k, d: d }); }
    function rec(t, o) { o.t = t; ev('rec', o); }
    fam.forEach(function (m, i) { m.ord = i; rec('member', m); });
    var kids = fam.filter(function (m) { return m.role === 'kid'; });
    var little = kids.length > 1 ? kids[kids.length - 1] : null; // youngest
    var Q = [
      ['Make your bed', '🛏️', 5, 'all', 'daily', 'morning'],
      ['Ready to go by 6:15', '⏰', 10, 'all', 'week:1,2,3,4,5', 'morning'],
      ['Feed the cat', '🐱', 5, 'any', 'daily', 'morning'],
      ['Homework done', '📚', 10, 'all', 'week:1,2,3,4,5', 'day'],
      ['Pack your bag for tomorrow', '🎒', 5, 'all', 'week:7,1,2,3,4', 'evening'],
      ['Tidy your room', '🧸', 10, 'all', 'daily', 'evening'],
      ['Clear your plate after dinner', '🍽️', 5, 'all', 'daily', 'evening'],
      ['Read for 20 minutes', '📖', 10, 'all', 'daily', 'evening'],
      ['Pray before bed', '🙏', 5, 'all', 'daily', 'evening'],
      ['Fold your laundry', '🧺', 15, 'all', 'week:6,7', 'day'],
      ['Water the plants', '🪴', 10, 'any', 'week:6,7', 'day'],
      ['Help wash the car', '🚗', 30, 'any', 'once', 'day']
    ];
    if (little) Q.push(['In bed by 8 pm', '🌙', 5, little.id, 'daily', 'evening']);
    Q.forEach(function (q, i) { rec('quest', { id: 'q' + (i + 1), title: q[0], emoji: q[1], c: q[2], who: q[3], rep: q[4], part: q[5], on: 1, ord: i }); });
    var R = [
      ['30 minutes extra game time', '🎮', 40], ['Board game with a parent', '🎲', 50], ['Pick the family movie', '📺', 60],
      ['Ice cream treat', '🍦', 80], ['Stay up 30 minutes later on Saturday', '🦉', 100], ['Choose Friday dinner', '🍕', 120],
      ['Trip to the playground or pool', '🏊', 150], ['A small toy (up to Rp 50.000)', '🎁', 500]
    ];
    R.forEach(function (r, i) { rec('reward', { id: 'r' + (i + 1), title: r[0], emoji: r[1], c: r[2], on: 1 }); });
    rec('fgoal', { id: 'g1', title: 'Family movie night', emoji: '🍿', target: 500, from: today });
    rec('set', { id: 'main', coinRp: 100, verse: 'As for me and my household, we will serve the Lord.', verseRef: 'Joshua 24:15', sound: 1 });
    return out;
  }
  function demo(JF) {
    var today = JF.dayOf();
    var fam = [
      { id: 'dad', name: 'Dad', role: 'parent', emoji: '🦁', color: '#0F9E8E', bday: '1985-03-12' },
      { id: 'mum', name: 'Mum', role: 'parent', emoji: '🌻', color: '#E2577A', bday: '1986-07-05' },
      { id: 'leo', name: 'Leo', role: 'kid', emoji: '🐉', color: '#3E6FE0', bday: '2016-11-17' },
      { id: 'mia', name: 'Mia', role: 'kid', emoji: '🦄', color: '#9A5BE0', bday: JF.addDays(today, 9).replace(/^\d{4}/, '2020') }
    ];
    var out = seed(JF, fam, JF.addDays(today, -6), 'dad');
    var base = JF.parseDay(today).getTime();
    function at(dayOff, h, mm) { return base + dayOff * 864e5 + (h * 60 + (mm || 0)) * 6e4; }
    function done(m, q, c, title, emoji, dOff, h, ok) {
      var e = { id: JF.uid('e'), ts: at(dOff, h), by: m, k: 'done', d: { q: q, m: m, day: JF.addDays(today, dOff), c: c, title: title, emoji: emoji } };
      out.push(e);
      if (ok) out.push({ id: JF.uid('e'), ts: at(dOff, h + 1), by: 'dad', k: 'rev', d: { e: e.id, ok: 1 } });
      return e;
    }
    for (var d = -5; d <= -1; d++) {
      done('leo', 'q1', 5, 'Make your bed', '🛏️', d, 6, 1);
      done('leo', 'q8', 10, 'Read for 20 minutes', '📖', d, 19, 1);
      if (d > -3) done('mia', 'q6', 10, 'Tidy your room', '🧸', d, 18, 1);
    }
    done('leo', 'q1', 5, 'Make your bed', '🛏️', 0, 6, 1);
    done('leo', 'q3', 5, 'Feed the cat', '🐱', 0, 6, 0);
    done('mia', 'q1', 5, 'Make your bed', '🛏️', 0, 7, 0);
    var b = { id: JF.uid('e'), ts: at(-1, 20), by: 'leo', k: 'buy', d: { r: 'r4', m: 'leo', c: 80, title: 'Ice cream treat', emoji: '🍦' } };
    out.push(b);
    out.push({ id: JF.uid('e'), ts: at(-2, 12), by: 'dad', k: 'bonus', d: { m: 'mia', c: 20, why: 'Helped Grandma carry the shopping' } });
    out.push({ id: JF.uid('e'), ts: at(-3, 9), by: 'dad', k: 'bonus', d: { m: 'leo', c: 60, why: 'Great school report' } });
    function rec(t, o) { o.t = t; out.push({ id: JF.uid('e'), ts: at(-6, 8) + out.length, by: 'mum', k: 'rec', d: o }); }
    rec('goal', { id: 'gl1', m: 'leo', title: 'New LEGO set', emoji: '🧱', rp: 450000 });
    rec('ev', { id: 'v1', title: 'Leave for school', emoji: '🚐', day: JF.addDays(today, -30), time: '06:15', rep: 'weekly:1,2,3,4,5', who: 'leo,mia' });
    rec('ev', { id: 'v2', title: 'Swimming lesson', emoji: '🏊', day: JF.addDays(today, -30), time: '16:00', end: '17:00', rep: 'weekly:3', who: 'leo', place: 'Club pool' });
    rec('ev', { id: 'v3', title: 'Church', emoji: '⛪', day: JF.addDays(today, -30), time: '10:00', rep: 'weekly:7', who: 'dad,mum,leo,mia' });
    rec('ev', { id: 'v4', title: 'Dentist check-up', emoji: '🦷', day: JF.addDays(today, 2), time: '15:30', who: 'mia,mum', place: 'Dental clinic' });
    rec('ev', { id: 'v5', title: 'Tennis with friends', emoji: '🎾', day: JF.addDays(today, 1), time: '19:00', end: '21:00', who: 'dad' });
    rec('ev', { id: 'v6', title: 'Mia in bed', emoji: '🌙', day: JF.addDays(today, -30), time: '20:00', rep: 'daily', who: 'mia' });
    [['Eggs', 'shop'], ['Milk', 'shop'], ['Rice 5 kg', 'shop'], ['Cat food', 'shop'], ['Bananas', 'shop', 1]].forEach(function (x, i) { rec('item', { id: 'i' + i, list: 'shop', text: x[0], done: x[2] || 0 }); });
    rec('item', { id: 't1', list: 'todo', text: 'Pay school fees', who: 'mum', due: JF.addDays(today, 3) });
    rec('item', { id: 't2', list: 'todo', text: 'Fix the bathroom tap', who: 'dad' });
    rec('item', { id: 'n1', list: 'info', title: 'School', text: 'Pick-up gate opens at 2:30 pm. Uniform: batik on Fridays.' });
    rec('item', { id: 'n2', list: 'info', title: 'Doctors', text: 'Paediatrician and dentist numbers go here.', priv: 1 });
    rec('pray', { id: 'p1', text: 'For Grandma\'s knee to heal well', by: 'mia' });
    rec('pray', { id: 'p2', text: 'Thank You for a safe trip home', by: 'dad', ans: 1 });
    return out.map(JF.toRow);
  }
  root.JFSeed = { seed: seed, demo: demo };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.JFSeed;
})(this);
