// Run: node tests/core.test.js
const JF = require('../js/core.js');
const Seed = require('../js/seed.js');
let fails = 0;
function ok(c, m) { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); }
const rows = Seed.demo(JF);
const log = rows.map(JF.parseRow);
ok(log.every(Boolean), 'demo rows parse');
const S = JF.build(log);
ok(S.members.length === 4 && S.kids.length === 2, '4 members, 2 kids');
const leo = S.stats.leo, mia = S.stats.mia;
ok(leo.streak === 6, 'Leo streak 6 (5 past days + today) got ' + leo.streak);
ok(leo.hits.length === 1 && leo.hits[0].n === 3, 'Leo got the 3-day streak bonus');
ok(S.pending.length === 2, 'two quests waiting for review');
ok(S.toGive.length === 1, 'one reward to hand over');
// coins: 5 days * 15 + today 5 + bonus 60 + streak 5 - 80 ice cream
ok(leo.coins === 75 + 5 + 60 + 5 - 80, 'Leo coins ' + leo.coins);
ok(mia.coins === 20 + 20, 'Mia coins ' + mia.coins);
const ql = JF.questsFor(S, S.byId.leo, S.today);
ok(ql.some(x => x.q.id === 'q1' && x.st === 'ok'), 'bed made shows approved');
ok(ql.some(x => x.q.id === 'q3' && x.st === 'wait'), 'feed cat waiting');
const qm = JF.questsFor(S, S.byId.mia, S.today);
ok(qm.some(x => x.q.id === 'q3' && x.st === 'taken'), 'bounty taken by Leo shows as taken for Mia');
ok(qm.some(x => x.q.id === 'q13'), 'youngest gets bedtime quest');
ok(!ql.some(x => x.q.id === 'q13'), 'eldest does not get bedtime quest');
// merge is a union and idempotent
const m2 = JF.merge(log, log.slice(0, 10));
ok(m2.length === log.length, 'merge dedupes');
// reject then redo
const e = S.pending[0];
const log2 = log.concat([{ id: 'x1', ts: Date.now() + 5, by: 'dad', k: 'rev', d: { e: e.id, ok: 0, why: 'Not finished yet' } }]);
const S2 = JF.build(log2);
const l2 = JF.questsFor(S2, S2.byId[e.d.m], S2.today);
ok(l2.some(x => x.q.id === e.d.q && x.st === 'todo' && x.rej), 'rejected quest can be done again');
// agenda
const ag = JF.agenda(S, S.today, 7);
ok(ag.length === 7, 'agenda 7 days');
const wk = ag.find(d => JF.isoDow(d.day) === 3);
ok(wk.items.some(i => i.ev && i.ev.id === 'v2'), 'weekly Wednesday swim shows on Wednesday');
const bd = JF.nextBirthdays(S, S.today);
ok(bd[0].m.id === 'mia' && bd[0].inDays === 9, 'Mia birthday in 9 days');
ok(JF.occursOn({ day: '2026-01-01', rep: 'weekly:1', skip: '2026-11-30' }, '2026-11-30') === false, 'skip a repeating day');
ok(JF.rp(450000) === 'Rp 450.000', 'rupiah format');
ok(JF.level(0).lvl === 1 && JF.level(50).lvl === 2 && JF.level(2250).lvl === 10, 'levels');
// once quest finished on an earlier day disappears
const t = JF.dayOf(), y = JF.addDays(t, -1);
const L = [
  { id: 'a', ts: 1, by: '', k: 'rec', d: { t: 'member', id: 'k', name: 'K', role: 'kid' } },
  { id: 'b', ts: 2, by: '', k: 'rec', d: { t: 'quest', id: 'o', title: 'Once', c: 30, who: 'any', rep: 'once' } },
  { id: 'c', ts: 3, by: 'k', k: 'done', d: { q: 'o', m: 'k', day: y, c: 30 } },
  { id: 'd', ts: 4, by: 'p', k: 'rev', d: { e: 'c', ok: 1 } }
];
ok(JF.questsFor(JF.build(L), { id: 'k', role: 'kid' }, t).length === 0, 'one-time quest gone the day after');
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
