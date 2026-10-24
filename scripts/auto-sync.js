#!/usr/bin/env node
// Automatický sync badminton-data.json z czechbadminton.cz (spouští ho
// .github/workflows/auto-sync.yml, jde pustit i lokálně).
//
//   node scripts/auto-sync.js [--dry-run] [--new-season 2026/27] [--report-dir DIR]
//
// - nové a změněné dílčí zápasy bez varování se aplikují rovnou
// - zápasy s varováním (neznámý tým/kolo/disciplína, chybí sestava) se přeskočí a nahlásí
// - zmizelé zápasy se NIKDY nemažou, jen se nahlásí
// - když _sezona v tournamentConfig.json neodpovídá rocnik v datech, nic se nezapíše
// - --new-season nejdřív archivuje aktuální ročník do historicke_rocniky a založí
//   prázdný nový (jako "Založit novou sezónu" v adminu), pak teprve synchronizuje
//
// Do --report-dir zapíše summary.md (souhrn běhu), issue.md (co je potřeba
// zkontrolovat ručně; prázdný = nic) a result.json.
const fs = require('fs');
const path = require('path');
const { syncCompetition } = require('../api/_lib/syncCompetition');
const { seasonKey, knownTeamsEverywhere, reconcileTeamName, computeDiff } = require('../api/_lib/merge');
const tournamentConfig = require('../api/_lib/tournamentConfig.json');

const SOUTEZE = ['extraliga', 'prvni-liga-vychod', 'prvni-liga-zapad', 'prvni-liga-playoff', 'baraze'];
const DATA_PATH = path.join(__dirname, '..', 'badminton-data.json');

function parseArgs(argv) {
  const args = { dryRun: false, newSeason: null, reportDir: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--new-season') args.newSeason = (argv[++i] || '').trim() || null;
    else if (argv[i] === '--report-dir') args.reportDir = argv[++i];
    else throw new Error(`Neznámý argument: ${argv[i]}`);
  }
  return args;
}

// Stejne jako AdminSettings.zalozitNovouSezonu - archiv se prepise aktualnim
// zivym stavem, konfigurace se ponecha jako vychozi bod nove sezony.
function zalozitNovouSezonu(data, novy) {
  const archived = data.rocnik || null;
  if (archived) {
    data.historicke_rocniky = data.historicke_rocniky || {};
    data.historicke_rocniky[archived] = JSON.parse(JSON.stringify({
      zapasy: data.zapasy,
      tymy: data.tymy,
      konfigurace: data.konfigurace,
    }));
  }
  data.zapasy = Object.fromEntries(SOUTEZE.map((s) => [s, []]));
  data.tymy = Object.fromEntries(SOUTEZE.map((s) => [s, []]));
  data.rocnik = novy;
  return archived;
}

function addTym(data, soutez, nazev) {
  const list = data.tymy[soutez];
  if (!list.includes(nazev)) {
    list.push(nazev);
    list.sort();
    return true;
  }
  return false;
}

function matchIdOf(zapas) {
  // "api:<matchId>:<gameNumber>" -> matchId
  const parts = String(zapas.id).split(':');
  return parts.length === 3 ? parts[1] : String(zapas.id);
}

async function syncSoutez(data, soutez, report) {
  const config = tournamentConfig[soutez];
  if (!config) return;
  const r = { soutez, matchCount: 0, applied: { new: 0, changed: 0 }, unchanged: 0, removed: [], skipped: [], newTeams: [], logos: 0 };
  report.souteze.push(r);

  const result = await syncCompetition(config);
  r.matchCount = result.matchCount;
  r.pendingCount = result.pendingCount || 0;
  data.zapasy[soutez] = data.zapasy[soutez] || [];
  data.tymy[soutez] = data.tymy[soutez] || [];

  const everywhere = knownTeamsEverywhere(data);
  const warningsById = new Map(result.warnings.map((w) => [w.id, [...w.issues]]));
  const pendingTeams = new Map(); // candidate.id -> [nazvy k doplneni do tymy[soutez]]

  result.candidates.forEach((c) => {
    const issues = warningsById.get(c.id) || [];
    const toAdd = [];
    ['tymDomaci', 'tymHoste'].forEach((field) => {
      const rec = reconcileTeamName(data.tymy[soutez], everywhere, c[field]);
      c[field] = rec.name;
      if (!rec.matched) issues.push(`Neznámý tým: "${rec.name}"`);
      else if (rec.source === 'jinde') toAdd.push(rec.name);
    });
    if (issues.length) warningsById.set(c.id, issues);
    pendingTeams.set(c.id, toAdd);
  });

  const rows = computeDiff(data.zapasy[soutez], result.candidates);
  rows.forEach((row) => {
    if (row.status === 'unchanged') {
      r.unchanged++;
      return;
    }
    if (row.status === 'removed') {
      r.removed.push(row.current);
      return;
    }
    const issues = [...(warningsById.get(row.warningsKey) || []), ...(row.issues || [])];
    if (issues.length) {
      r.skipped.push({ zapas: row.candidate, key: row.warningsKey, status: row.status, issues });
      return;
    }
    (pendingTeams.get(row.warningsKey) || []).forEach((t) => {
      if (addTym(data, soutez, t)) r.newTeams.push(t);
    });
    const list = data.zapasy[soutez];
    const idx = list.findIndex((z) => String(z.id) === String(row.candidate.id));
    if (idx === -1) list.push(row.candidate);
    else list[idx] = row.candidate;
    r.applied[row.status]++;
  });

  // Loga se ukladaji jen pro tymy, ktere v datech opravdu jsou - jinak by
  // vznikaly polozky pod syrovym API nazvem, ktery na webu nikde neni.
  const everywhereNow = knownTeamsEverywhere(data);
  data.tymLoga = data.tymLoga || {};
  Object.entries(result.teamLogos || {}).forEach(([apiName, url]) => {
    const rec = reconcileTeamName(data.tymy[soutez], everywhereNow, apiName);
    if (rec.matched && url && data.tymLoga[rec.name] !== url) {
      data.tymLoga[rec.name] = url;
      r.logos++;
    }
  });
}

function zapasLabel(z) {
  return `${z.kolo} ${z.datum} ${z.tymDomaci} – ${z.tymHoste}`;
}

function renderSummary(report) {
  const lines = [`## Auto-sync ${report.dryRun ? '(dry-run, nic se nezapsalo)' : ''}`.trim(), ''];
  lines.push(`Ročník v datech: **${report.rocnik || '—'}** · sezóna v tournamentConfig: **${tournamentConfig._sezona}**`, '');
  if (report.newSeason) lines.push(`🆕 Založena nová sezóna **${report.newSeason.novy}**` + (report.newSeason.archived ? ` (archivován ${report.newSeason.archived})` : ''), '');
  if (report.blocked) {
    lines.push(`⛔ ${report.blocked}`);
    return lines.join('\n') + '\n';
  }
  lines.push('| Soutěž | Utkání (čeká na schválení) | Nové | Změněné | Beze změny | Přeskočeno | Zmizelé | Nové týmy | Loga |');
  lines.push('|---|---|---|---|---|---|---|---|---|');
  report.souteze.forEach((r) => {
    lines.push(`| ${r.soutez} | ${r.matchCount}${r.pendingCount ? ` (${r.pendingCount})` : ''} | ${r.applied.new} | ${r.applied.changed} | ${r.unchanged} | ${r.skipped.length} | ${r.removed.length} | ${r.newTeams.join(', ') || '—'} | ${r.logos} |`);
  });
  lines.push('');
  report.errors.forEach((e) => lines.push(`❌ ${e}`));
  lines.push(report.changed ? (report.dryRun ? '➡ Soubor by se změnil.' : '✅ badminton-data.json aktualizován.') : 'Žádná změna dat.');
  return lines.join('\n') + '\n';
}

// Obsah issue "k ruční kontrole"; prázdný string = není co řešit.
function renderIssue(report) {
  const out = [];
  if (report.blocked) out.push(`### ⛔ Sync zablokován\n\n${report.blocked}\n`);
  if (report.errors.length) out.push('### ❌ Chyby stahování\n\n' + report.errors.map((e) => `- ${e}`).join('\n') + '\n');

  report.souteze.forEach((r) => {
    if (!r.skipped.length && !r.removed.length) return;
    out.push(`### ${r.soutez}\n`);
    if (r.skipped.length) {
      // seskupeno po utkanich - jedno utkani = az 9 dilcich zapasu se stejnym problemem
      const byMatch = new Map();
      r.skipped.forEach((s) => {
        const key = matchIdOf({ id: s.key });
        const g = byMatch.get(key) || { zapas: s.zapas, games: 0, issues: new Set() };
        g.games++;
        s.issues.forEach((i) => g.issues.add(i));
        byMatch.set(key, g);
      });
      out.push('Přeskočené zápasy (nezapsáno):\n');
      byMatch.forEach((g) => out.push(`- ${zapasLabel(g.zapas)} (${g.games}× dílčí zápas): ${[...g.issues].join('; ')}`));
      out.push('');
    }
    if (r.removed.length) {
      out.push('Zápasy, které API už nevrací (ponechány, zkontroluj ručně v adminu):\n');
      r.removed.forEach((z) => out.push(`- ${zapasLabel(z)} · ${z.disciplina} · ${z.domaci} vs ${z.hoste} (id \`${z.id}\`)`));
      out.push('');
    }
  });
  if (!out.length) return '';
  if (report.souteze.some((r) => r.skipped.length)) out.push('---\nNeznámý tým: doplň ho v adminu do týmů soutěže (přesně pod názvem z API), nebo přidej alias do `api/_lib/teamAliases.json`. Issue se samo zavře, až nebude co řešit.');
  return out.join('\n') + '\n';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const original = fs.readFileSync(DATA_PATH, 'utf8');
  const data = JSON.parse(original);
  const report = { dryRun: args.dryRun, rocnik: data.rocnik, newSeason: null, blocked: null, errors: [], souteze: [], changed: false };

  if (args.newSeason) {
    if (seasonKey(args.newSeason) !== seasonKey(tournamentConfig._sezona)) {
      report.blocked = `Nová sezóna "${args.newSeason}" neodpovídá _sezona "${tournamentConfig._sezona}" v tournamentConfig.json - nejdřív doplň ID soutěží nové sezóny.`;
    } else if (seasonKey(data.rocnik) === seasonKey(args.newSeason)) {
      // uz zalozeno (napr. opakovane spusteni workflow) - nic nearchivovat
    } else {
      const archived = zalozitNovouSezonu(data, args.newSeason);
      report.newSeason = { novy: args.newSeason, archived };
      report.rocnik = data.rocnik;
    }
  }

  if (!report.blocked && seasonKey(tournamentConfig._sezona) !== seasonKey(data.rocnik)) {
    report.blocked =
      `Ročník v datech (${data.rocnik}) neodpovídá _sezona v tournamentConfig.json (${tournamentConfig._sezona}). ` +
      'Nic se nezapsalo. Založ novou sezónu (workflow_dispatch s vstupem new_season), nebo oprav tournamentConfig.json.';
  }

  if (!report.blocked) {
    for (const soutez of SOUTEZE) {
      try {
        await syncSoutez(data, soutez, report);
      } catch (err) {
        report.errors.push(`${soutez}: ${err.message || err}`);
      }
    }
  }

  const before = JSON.parse(original);
  delete before.datum;
  const after = { ...data };
  delete after.datum;
  report.changed = !report.blocked && JSON.stringify(before) !== JSON.stringify(after);

  if (report.changed && !args.dryRun) {
    data.datum = new Date().toISOString();
    // stejny format jako api/publish.js (2 mezery, bez koncoveho \n)
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  }

  const summary = renderSummary(report);
  const issue = renderIssue(report);
  process.stdout.write(summary + (issue ? '\n' + issue : ''));

  if (args.reportDir) {
    fs.mkdirSync(args.reportDir, { recursive: true });
    fs.writeFileSync(path.join(args.reportDir, 'summary.md'), summary);
    fs.writeFileSync(path.join(args.reportDir, 'issue.md'), issue);
    fs.writeFileSync(
      path.join(args.reportDir, 'result.json'),
      JSON.stringify({ changed: report.changed, blocked: !!report.blocked, errors: report.errors.length, needsReview: !!issue }, null, 2)
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
