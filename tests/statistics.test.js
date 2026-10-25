// Testy výpočtů tabulky podle Rozpisu soutěží družstev 2026/27 (III.3/III.4, IV.3/IV.4).
// js/statistics.js je skript pro prohlížeč - načte se do vm kontextu.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function engine(zapasy, bodovaniTyp = 'extraliga') {
  const ctx = vm.createContext({ console, document: { createElement: () => ({}) }, App: { aktualni_rocnik: null } });
  ['js/data.js', 'js/statistics.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx));
  vm.runInContext('this.Data = Data; this.Statistics = Statistics;', ctx);
  ctx.Data.konfigurace = { bodovani: { s: bodovaniTyp === 'extraliga'
    ? { typ: 'margin-tiered', remizaMozna: false, tiers: [{ minZapasyVitez: 6, body: [3, 0] }, { minZapasyVitez: 4, body: [2, 1] }] }
    : { typ: 'win-draw-loss', remizaMozna: true, body: { vyhra: 3, remiza: 2, prohra: 1 } } } };
  ctx.Data.zapasy = { s: zapasy };
  ctx.Data.tymy = { s: [] };
  return ctx.Statistics;
}

// utkání: [kolo, domácí, hosté, ['3:0', '1:3', ...] výsledky dílčích zápasů na sety]
function utkani(kolo, d, h, vysledky, sety = null) {
  return vysledky.map((v, i) => ({ kolo, tymDomaci: d, tymHoste: h, disciplina: 'D' + i, domaci: 'a' + i, hoste: 'b' + i, vysledek: v,
    sety: sety ? sety[i] : (v.startsWith('3') ? '11:5, 11:5, 11:5' : '5:11, 5:11, 5:11') }));
}

test('forma počítá vyhrané zápasy, ne součet setů (Ostrava–Plzeň 4:3, sety 13:13)', () => {
  // 4 těsné výhry 3:2 + 3 prohry -> zápasy 4:3 pro Ostravu, ale sety 13:17 pro Plzeň
  const z = utkani('1.', 'Ostrava', 'Plzeň', ['3:2', '3:2', '3:2', '3:2', '1:3', '0:3', '0:3']);
  const S = engine(z);
  assert.deepEqual([...S.vypocitejFormuTymu('Ostrava', 's')], ['w']);
  assert.deepEqual([...S.vypocitejFormuTymu('Plzeň', 's')], ['l']);
});

test('extraliga bodování: 6+ zápasů 3:0, jinak 2:1', () => {
  const S = engine([
    ...utkani('1.', 'A', 'B', ['3:0', '3:0', '3:0', '3:0', '3:0', '3:0', '0:3']),
    ...utkani('1.', 'C', 'D', ['3:0', '3:0', '3:0', '3:0', '0:3', '0:3', '0:3']),
  ]);
  const t = S.vypocitejTabulku('s');
  assert.equal(t.A.body, 3); assert.equal(t.B.body, 0);
  assert.equal(t.C.body, 2); assert.equal(t.D.body, 1);
});

test('extraliga remíza (neodehraný zápas): vítěz na sety 2 b, poražený 1 b, počítá se jako remíza', () => {
  const S = engine(utkani('1.', 'A', 'B', ['3:0', '3:0', '3:0', '0:3', '1:3', '2:3', '0:0']));
  const t = S.vypocitejTabulku('s');
  assert.equal(t.A.remizy, 1); assert.equal(t.B.remizy, 1);
  assert.equal(t.A.body, 2); assert.equal(t.B.body, 1); // sety 12:9 pro A
});

test('utkání bez odehraného zápasu se do tabulky nepočítá (tým jen s nulami)', () => {
  const S = engine(utkani('1.', 'A', 'B', ['0:0', '0:0']));
  const t = S.vypocitejTabulku('s');
  assert.deepEqual([t.A.utkani, t.A.vyhry, t.A.prohry, t.A.remizy, t.A.body], [0, 0, 0, 0, 0]);
  assert.deepEqual([t.B.utkani, t.B.body], [0, 0]);
});

test('1. liga: výhra 3, remíza 2, prohra 1', () => {
  const S = engine([
    ...utkani('1.', 'A', 'B', ['3:0', '3:0', '3:0', '3:0', '3:0', '0:3', '0:3', '0:3']),
    ...utkani('1.', 'C', 'D', ['3:0', '3:0', '3:0', '3:0', '0:3', '0:3', '0:3', '0:3']),
  ], '1liga');
  const t = S.vypocitejTabulku('s');
  assert.deepEqual([t.A.body, t.B.body, t.C.body, t.D.body], [3, 1, 2, 2]);
});

test('pořadí: při shodě bodů, výher i rozdílu zápasů rozhoduje vzájemné utkání (před sety)', () => {
  // A porazil B 5:3; A prohrál s C 3:5 těsně, B porazil D 5:3 vysoko na sety.
  // A i B: 4 body, 1 výhra, rozdíl zápasů 0; B má lepší rozdíl setů, A vyhrál vzájemné utkání.
  const vyhra5 = (tesne) => [...Array(5).fill(tesne ? '3:2' : '3:0'), ...Array(3).fill(tesne ? '2:3' : '0:3')];
  const S = engine([
    ...utkani('1.', 'A', 'B', [...Array(5).fill('3:2'), ...Array(3).fill('0:3')]),
    ...utkani('2.', 'C', 'A', vyhra5(true)),
    ...utkani('3.', 'B', 'D', vyhra5(false)),
  ], '1liga');
  const t = S.vypocitejTabulku('s');
  assert.equal(t.A.body, 4); assert.equal(t.B.body, 4);
  assert.equal(t.A.vyhry, t.B.vyhry);
  assert.equal(t.A.zapasyV - t.A.zapasyP, 0); assert.equal(t.B.zapasyV - t.B.zapasyP, 0);
  assert.ok(t.B.setyV - t.B.setyP > t.A.setyV - t.A.setyP, 'B má lepší sety');
  const poradi = S.seraditTymyPodleTabulky(t);
  assert.ok(poradi.indexOf('A') < poradi.indexOf('B'), 'A je před B díky vzájemnému utkání: ' + poradi.join(', '));
});
