// Testy sdilene logiky syncu (node --test). Pousti je .github/workflows/test.yml.
const test = require('node:test');
const assert = require('node:assert/strict');
const { seasonKey, reconcileTeamName, computeDiff, knownTeamsEverywhere } = require('../api/_lib/merge');
const { detectSkrec, normalizeGame } = require('../api/_lib/normalize');
const { mapRound } = require('../api/_lib/roundMap');

const zapas = (over) => ({
  id: 1, kolo: '1.', datum: '2026-10-11', disciplina: 'Dvouhra mužů', domaci: 'A', hoste: 'B',
  vysledek: '2:0', sety: '15:10, 15:12', tymDomaci: 'T1', tymHoste: 'T2', ...over,
});

test('seasonKey sjednoti zapis rocniku', () => {
  assert.equal(seasonKey('2025/26'), '2025/2026');
  assert.equal(seasonKey('2026/2027'), '2026/2027');
  assert.equal(seasonKey('2026-27'), '2026/2027');
  assert.equal(seasonKey(''), null);
});

test('reconcileTeamName: soutez, mezery/velikost, alias, historie, neznamy', () => {
  assert.deepEqual(reconcileTeamName(['BK Meteor Praha'], [], 'BK METEOR PRAHA'), { name: 'BK Meteor Praha', matched: true, source: 'soutez' });
  assert.equal(reconcileTeamName([], [], ' BA Olomouc').name, 'Badminton Akademie Olomouc');
  assert.equal(reconcileTeamName([], ['TJ Sokol Radotín'], 'TJ Sokol Radotín  ').source, 'jinde');
  assert.deepEqual(reconcileTeamName([], [], 'Novy Tym'), { name: 'Novy Tym', matched: false, source: null });
});

test('knownTeamsEverywhere bere i historicke rocniky', () => {
  const data = { tymy: { extraliga: ['A'] }, historicke_rocniky: { '2024/25': { tymy: { extraliga: ['B'] } } } };
  assert.deepEqual(knownTeamsEverywhere(data).sort(), ['A', 'B']);
});

test('computeDiff: unchanged / changed podle id / new', () => {
  const current = [zapas({ id: 'api:m1:1' })];
  const rows = computeDiff(current, [
    zapas({ id: 'api:m1:1' }),
    zapas({ id: 'api:m1:2', disciplina: 'Dvouhra žen', domaci: 'C', hoste: 'D' }),
  ]);
  assert.deepEqual(rows.map((r) => r.status), ['unchanged', 'new']);
  const changed = computeDiff(current, [zapas({ id: 'api:m1:1', domaci: 'A2' })]);
  assert.equal(changed[0].status, 'changed');
});

test('computeDiff: zmena jmena hrace u rucne zapsaneho zapasu neni duplicita', () => {
  const current = [zapas({ id: 1760000000000, domaci: 'Krpatová Lucie' })];
  const rows = computeDiff(current, [zapas({ id: 'api:m1:1', domaci: 'Skálová Lucie' })]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, 'changed');
  assert.equal(rows[0].candidate.id, 1760000000000);
});

test('computeDiff: mozna duplicita s rucnim zapisem se oznaci', () => {
  const current = [zapas({ id: 1760000000000, vysledek: '2:1', sety: '15:10, 10:15, 15:5' })];
  const rows = computeDiff(current, [zapas({ id: 'api:m1:1', domaci: 'X' })]);
  assert.equal(rows[0].status, 'new');
  assert.ok(rows[0].issues && rows[0].issues[0].includes('duplicita'));
});

test('computeDiff: zmizely api zapas se jen nahlasi', () => {
  const rows = computeDiff([zapas({ id: 'api:m1:1' })], []);
  assert.deepEqual(rows.map((r) => r.status), ['removed']);
});

test('detectSkrec', () => {
  assert.equal(detectSkrec('A', '', '11:0, 11:0, 11:0'), 'hoste');
  assert.equal(detectSkrec('', 'B', '0:21, 0:21'), 'domaci');
  assert.equal(detectSkrec('A', '', '11:5, 11:0'), null);
  assert.equal(detectSkrec('A', 'B', '11:0, 11:0'), null);
});

test('normalizeGame zapise skreč a nevaruje', () => {
  const match = { id: 'm1', roundName: '1', startDate: '2026-10-11T10:00:00', homeTeamName: 'T1', awayTeamName: 'T2' };
  const game = {
    gameNumber: 5, sportDisciplineName: '1. čtyřhra mužů', homeScore: 2, awayScore: 0, setsScore: '15:0, 15:0',
    homeRosters: [{ person: { lastName: 'Novák', firstName: 'Jan' } }], awayRosters: [],
  };
  const { zapas: z, warnings } = normalizeGame(match, game);
  assert.equal(z.hoste, 'SKREČ');
  assert.deepEqual(warnings, []);
});

test('mapRound', () => {
  assert.equal(mapRound('3'), '3.');
  assert.equal(mapRound('Čvrtfinále'), 'QF');
  assert.equal(mapRound('o pořadí'), 'P5');
  assert.equal(mapRound('neco jineho'), null);
});
