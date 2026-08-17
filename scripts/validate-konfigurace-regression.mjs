#!/usr/bin/env node
// Overuje, ze refaktor bodovaciho/zonoveho/play-off enginu (js/statistics.js,
// js/table.js, js/playoff.js) nezmenil vysledky pro zadnou uz existujici
// sezonu v badminton-data.json.
//
// Pouziti: node scripts/validate-konfigurace-regression.mjs [git-ref]
// git-ref = verze souboru pred refaktorem (default: HEAD). Working tree
// (aktualni stav souboru na disku) je vzdy "po refaktoru".

import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const REF = process.argv[2] || 'HEAD';

const SOUTEZE = ['extraliga', 'prvni-liga-vychod', 'prvni-liga-zapad', 'prvni-liga-playoff', 'baraze'];
const FILES = ['js/data.js', 'js/statistics.js', 'js/table.js', 'js/playoff.js'];

function gitShow(ref, relPath) {
  return execFileSync('git', ['show', `${ref}:${relPath}`], { cwd: REPO, encoding: 'utf8' });
}

function readWorkingTree(relPath) {
  return fs.readFileSync(path.join(REPO, relPath), 'utf8');
}

function makeEl() {
  let text = '';
  let html = '';
  return {
    set textContent(v) { text = String(v); html = ''; },
    get textContent() { return text; },
    get innerHTML() {
      if (html) return html;
      return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },
    set innerHTML(v) { html = v; },
    style: {},
    classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
  };
}

function buildContext(sources) {
  const elements = {};
  const sandbox = {
    console,
    document: {
      getElementById(id) {
        if (!elements[id]) elements[id] = makeEl();
        return elements[id];
      },
      createElement() { return makeEl(); },
      body: { classList: { contains: () => false } },
      querySelectorAll() { return []; },
    },
    App: { aktualni_rocnik: null },
  };
  const ctx = vm.createContext(sandbox);
  sources.forEach(({ code, filename }) => {
    vm.runInContext(code, ctx, { filename });
  });
  // top-level `const X = ...` creates a lexical binding, not a property on the
  // sandbox object - expose the globals we need onto the sandbox explicitly.
  vm.runInContext('this.Data = Data; this.Statistics = Statistics; this.Table = Table; this.Playoff = Playoff;', ctx);
  return ctx;
}

function loadData(ctx, json) {
  ctx.Data.zapasy = { ...ctx.Data.zapasy, ...json.zapasy };
  ctx.Data.tymy = { ...ctx.Data.tymy, ...json.tymy };
  ctx.Data.vitezove = json.vitezove || [];
  ctx.Data.historickeRocniky = json.historicke_rocniky || {};
  ctx.Data.rocnik = json.rocnik || null;
  if (json.konfigurace) ctx.Data.konfigurace = json.konfigurace;
  if (json.tymLoga) ctx.Data.tymLoga = json.tymLoga;
}

function buildOld(ref) {
  const sources = FILES.map((f) => ({ code: gitShow(ref, f), filename: `${ref}:${f}` }));
  return buildContext(sources);
}

function buildNew() {
  const sources = FILES.map((f) => ({ code: readWorkingTree(f), filename: `wt:${f}` }));
  return buildContext(sources);
}

// Legacy dispatch logic replicated from js/app.js `_renderHistorickyPlayoff`
// (lines ~255-279 at time of writing) — used to independently verify the new
// Playoff.renderByKonfigurace() (if present) picks the exact same renderer.
function legacyPlayoffHtml(ctx, typ) {
  const konfig = ctx.Data.getKonfigurace(ctx.App.aktualni_rocnik);
  if (typ === 'extraliga') {
    const format = konfig.extraliga_playoff || 'QF+SF+F';
    const tabulkaData = ctx.Statistics.vypocitejTabulku('extraliga');
    let tymy = ctx.Playoff.seraditTymy(tabulkaData);
    const res = ctx.Playoff.getPlayoffResults('extraliga');
    if (tymy.length < 6) tymy = ctx.Playoff._deriveExtraligaTeamsFromResults(res);
    if (format === 'QF+SF+F+3rd') return ctx.Playoff.renderExtraligaBracketWithThirdPlace(tymy, tabulkaData, res);
    return ctx.Playoff.renderExtraligaBracket(tymy, tabulkaData, res);
  }
  const format = konfig.prvni_liga_playoff || 'combined-8';
  switch (format) {
    case 'combined-4': return ctx.Playoff.renderPrvniLigaCombined4();
    case 'separate-SF+F': return ctx.Playoff.renderPrvniLigaSeparate('SF');
    case 'separate-QF+SF+F+3rd': return ctx.Playoff.renderPrvniLigaSeparate('QF');
    default: return ctx.Playoff.renderPrvniLigaBracket();
  }
}

// Objects coming out of different vm.Context realms have different
// Object.prototype references, so assert.deepStrictEqual (which checks
// prototypes) spuriously fails even for structurally identical plain data.
// Round-tripping through JSON normalizes both sides into this realm's plain
// objects - safe here since everything compared is plain JSON-shaped data.
function normalize(x) {
  return x === undefined ? undefined : JSON.parse(JSON.stringify(x));
}

function safeCall(fn, label, failures) {
  try {
    return fn();
  } catch (err) {
    failures.push(`${label}: THREW ${err.message}`);
    return undefined;
  }
}

function main() {
  // Data se nacitaji per-kontext stejne jako kod (git ref pro "pred", working
  // tree pro "po") - pokud commit meni i TVAR dat (napr. migrace konfigurace),
  // stary kod dostane stara data a novy kod nova data, misto aby se stary kod
  // tvaril, ze rozumi datum, ktera jeste neexistovala.
  const oldJson = JSON.parse(gitShow(REF, 'badminton-data.json'));
  const newJson = JSON.parse(fs.readFileSync(path.join(REPO, 'badminton-data.json'), 'utf8'));

  console.log(`Regresni test: ${REF} (pred) vs working tree (po)`);

  const oldCtx = buildOld(REF);
  const newCtx = buildNew();
  loadData(oldCtx, oldJson);
  loadData(newCtx, newJson);

  const seasons = [null, ...Object.keys(newJson.historicke_rocniky || {})];
  const failures = [];
  let checks = 0;

  seasons.forEach((rocnik) => {
    oldCtx.Data.aktivovatRocnik(rocnik);
    newCtx.Data.aktivovatRocnik(rocnik);
    oldCtx.App.aktualni_rocnik = rocnik;
    newCtx.App.aktualni_rocnik = rocnik;
    const label = rocnik || 'live';

    SOUTEZE.forEach((soutez) => {
      const oldTab = safeCall(() => oldCtx.Statistics.vypocitejTabulku(soutez), `${label}/${soutez} vypocitejTabulku(old)`, failures);
      const newTab = safeCall(() => newCtx.Statistics.vypocitejTabulku(soutez), `${label}/${soutez} vypocitejTabulku(new)`, failures);
      checks++;
      if (oldTab !== undefined && newTab !== undefined) {
        try {
          assert.deepStrictEqual(normalize(newTab), normalize(oldTab));
        } catch {
          failures.push(`${label}/${soutez}: vypocitejTabulku MISMATCH\n  old=${JSON.stringify(oldTab)}\n  new=${JSON.stringify(newTab)}`);
        }
      }

      const oldOrder = oldTab ? oldCtx.Statistics.seraditTymyPodleTabulky(oldTab) : [];
      const newOrder = newTab ? newCtx.Statistics.seraditTymyPodleTabulky(newTab) : [];
      checks++;
      try {
        assert.deepStrictEqual(normalize(newOrder), normalize(oldOrder));
      } catch {
        failures.push(`${label}/${soutez}: seraditTymyPodleTabulky MISMATCH old=${JSON.stringify(oldOrder)} new=${JSON.stringify(newOrder)}`);
      }

      const oldHtml = safeCall(() => { oldCtx.Table.render(soutez); return oldCtx.document.getElementById('tabulkaObsah').innerHTML; }, `${label}/${soutez} Table.render(old)`, failures);
      const newHtml = safeCall(() => { newCtx.Table.render(soutez); return newCtx.document.getElementById('tabulkaObsah').innerHTML; }, `${label}/${soutez} Table.render(new)`, failures);
      checks++;
      if (oldHtml !== undefined && newHtml !== undefined && oldHtml !== newHtml) {
        failures.push(`${label}/${soutez}: Table.render() HTML MISMATCH (lengths old=${oldHtml.length} new=${newHtml.length})`);
      }
    });

    // Playoff series data (vitez/skore/zlatyZapas) - extraliga + spolecne 1.liga play-off
    ['extraliga'].forEach((soutez) => {
      const oldRes = safeCall(() => oldCtx.Playoff.getPlayoffResults(soutez), `${label}/${soutez} getPlayoffResults(old)`, failures);
      const newRes = safeCall(() => newCtx.Playoff.getPlayoffResults(soutez), `${label}/${soutez} getPlayoffResults(new)`, failures);
      checks++;
      if (oldRes !== undefined && newRes !== undefined) {
        try {
          assert.deepStrictEqual(normalize(newRes), normalize(oldRes));
        } catch {
          failures.push(`${label}/${soutez}: getPlayoffResults MISMATCH\n  old=${JSON.stringify(oldRes)}\n  new=${JSON.stringify(newRes)}`);
        }
      }
    });
    const oldPL = safeCall(() => oldCtx.Playoff.getPlayoffResultsPrvniLiga(), `${label} getPlayoffResultsPrvniLiga(old)`, failures);
    const newPL = safeCall(() => newCtx.Playoff.getPlayoffResultsPrvniLiga(), `${label} getPlayoffResultsPrvniLiga(new)`, failures);
    checks++;
    if (oldPL !== undefined && newPL !== undefined) {
      try {
        assert.deepStrictEqual(normalize(newPL), normalize(oldPL));
      } catch {
        failures.push(`${label}: getPlayoffResultsPrvniLiga MISMATCH\n  old=${JSON.stringify(oldPL)}\n  new=${JSON.stringify(newPL)}`);
      }
    }

    // Baraz HTML (pouziva _vypocitejSerii primo)
    const oldBaraz = safeCall(() => oldCtx.Playoff.renderBaraze(), `${label} renderBaraze(old)`, failures);
    const newBaraz = safeCall(() => newCtx.Playoff.renderBaraze(), `${label} renderBaraze(new)`, failures);
    checks++;
    if (oldBaraz !== undefined && newBaraz !== undefined && oldBaraz !== newBaraz) {
      failures.push(`${label}: renderBaraze() HTML MISMATCH (lengths old=${oldBaraz.length} new=${newBaraz.length})`);
    }

    // Dispatch wiring: legacy switch (replicated here from app.js) vs the new
    // unified Playoff.renderByKonfigurace(), if it exists yet in the new context.
    if (typeof newCtx.Playoff.renderByKonfigurace === 'function') {
      ['extraliga', 'liga'].forEach((typ) => {
        const legacy = safeCall(() => legacyPlayoffHtml(newCtx, typ), `${label}/${typ} legacyPlayoffHtml`, failures);
        const viaNew = safeCall(() => newCtx.Playoff.renderByKonfigurace(typ), `${label}/${typ} renderByKonfigurace`, failures);
        checks++;
        if (legacy !== undefined && viaNew !== undefined && legacy !== viaNew) {
          failures.push(`${label}/${typ}: renderByKonfigurace() != legacy dispatch (lengths legacy=${legacy.length} new=${viaNew.length})`);
        }
      });
    }
  });

  console.log(`Provedeno ${checks} kontrol napric ${seasons.length} sezonami x ${SOUTEZE.length} soutezemi.`);
  if (failures.length) {
    console.error(`\n✗ ${failures.length} REGRESI NALEZENO:\n`);
    failures.forEach((f) => console.error(' - ' + f));
    process.exit(1);
  } else {
    console.log('\n✓ Zadna regrese - nova logika odpovida stavajici pro vsechna existujici data.');
  }
}

main();
