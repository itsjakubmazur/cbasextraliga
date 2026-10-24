// Slučování kandidátů ze syncu s badminton-data.json. Sdílí ho admin
// (prohlížeč, window.SyncMerge) i scripts/auto-sync.js (node, přes
// api/_lib/merge.js), ať ruční i automatický sync párují zápasy stejně.
// Funkce jsou čisté (nic nemutují).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SyncMerge = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  // Porovnava jen pismena/cislice - API i rucne zapsane nazvy se casto lisi
  // v mezerach kolem zkratek (napr. "B.O.CHANCE" vs "B.O. Chance") nebo tecek.
  function normTeam(s) {
    return String(s || '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]/gu, '');
  }

  function aliasMap(aliases) {
    return new Map(
      Object.entries(aliases || {}).filter(([k]) => !k.startsWith('_')).map(([api, nazev]) => [normTeam(api), nazev])
    );
  }

  // "2025/26", "2025/2026", "2025-2026" -> "2025/2026"; null když nejde rozpoznat.
  function seasonKey(str) {
    const m = String(str || '').match(/(\d{4})\s*[/-]\s*(\d{4}|\d{2})/);
    if (!m) return null;
    const end = m[2].length === 2 ? m[1].slice(0, 2) + m[2] : m[2];
    return `${m[1]}/${end}`;
  }

  // Vsechny tymy, ktere uz nekdy v datech byly (aktualni tymy vsech soutezi
  // + historicke rocniky) - pro nove sezony, kdy tymy[soutez] zacina prazdne.
  function knownTeamsEverywhere(data) {
    const all = new Set();
    const add = (tymy) => Object.values(tymy || {}).forEach((list) => (list || []).forEach((t) => all.add(t)));
    add(data.tymy);
    Object.values(data.historicke_rocniky || {}).forEach((r) => add(r && r.tymy));
    return [...all];
  }

  /**
   * known = tymy[soutez], everywhere = knownTeamsEverywhere(data),
   * aliases = obsah api/_lib/teamAliases.json.
   * Vrací { name, matched, source } - source 'soutez' (už je v tymy[soutez]),
   * 'jinde' (nalezen jinde v datech / přes alias, je třeba ho do soutěže
   * doplnit) nebo null (neznámý tým, nic se nedohaduje).
   */
  function reconcileTeamName(known, everywhere, apiName, aliases) {
    const raw = String(apiName || '').trim();
    if (known.includes(raw)) return { name: raw, matched: true, source: 'soutez' };
    const n = normTeam(raw);
    const inSoutez = known.find((t) => normTeam(t) === n);
    if (inSoutez) return { name: inSoutez, matched: true, source: 'soutez' };

    const alias = aliasMap(aliases).get(n);
    if (alias) {
      return { name: alias, matched: true, source: known.includes(alias) ? 'soutez' : 'jinde' };
    }
    const elsewhere = everywhere.find((t) => normTeam(t) === n);
    if (elsewhere) return { name: elsewhere, matched: true, source: 'jinde' };
    return { name: raw, matched: false, source: null };
  }

  // Prirozeny klic pro sparovani "tohle je tentyz realny dilci zapas", nezavisly
  // na tom, jak vznikl 'id' (rucne pres stary nastroj = timestamp, sync = "api:...").
  function naturalKey(z) {
    return [z.kolo, z.tymDomaci, z.tymHoste, z.disciplina, z.domaci, z.hoste].join('|||');
  }

  function differs(old, merged) {
    // sjednoceni klicu - i zmizele pole (napr. neschvaleno po schvaleni) je zmena
    const keys = new Set([...Object.keys(old), ...Object.keys(merged)]);
    return [...keys].some((k) => JSON.stringify(old[k]) !== JSON.stringify(merged[k]));
  }

  // Volnejsi klic pro druhe kolo parovani: stejne utkani, disciplina a presne
  // stejne skore, ale bez hracu a kola - zachyti rucne zapsany zapas, u ktereho
  // se v API mezitim zmenilo jmeno hrace (napr. po svatbe) nebo kod kola.
  function looseKey(z) {
    return [z.tymDomaci, z.tymHoste, z.disciplina, z.vysledek, z.sety].join('|||');
  }

  function slotKey(z) {
    return [z.kolo, z.tymDomaci, z.tymHoste, z.disciplina].join('|||');
  }

  /**
   * Stejné statusy jako v admin UI: new / changed / unchanged / removed.
   * Párování probíhá ve dvou kolech: nejdřív podle 'id' (záznamy, které už
   * dřív přišly ze syncu) a naturalKey, pak teprve podle looseKey - aby volnější
   * klíč "neukradl" záznam, který patří jinému kandidátovi.
   * Řádek může mít 'issues' - nový kandidát, který se nepodařilo spárovat, ale
   * ve stejném kole/utkání/disciplíně už ručně zapsaný zápas je (možná duplicita).
   */
  function computeDiff(current, candidates) {
    const byId = new Map(current.map((z) => [String(z.id), z]));
    const byNaturalKey = new Map(current.map((z) => [naturalKey(z), z]));
    const matchedIds = new Set();
    const pairs = candidates.map(() => null);

    candidates.forEach((c, i) => {
      const old = byId.get(String(c.id)) || byNaturalKey.get(naturalKey(c));
      if (old && !matchedIds.has(String(old.id))) {
        matchedIds.add(String(old.id));
        pairs[i] = old;
      }
    });
    candidates.forEach((c, i) => {
      if (pairs[i]) return;
      const old = current.find((z) => !matchedIds.has(String(z.id)) && looseKey(z) === looseKey(c));
      if (old) {
        matchedIds.add(String(old.id));
        pairs[i] = old;
      }
    });

    const rows = candidates.map((c, i) => {
      const old = pairs[i];
      if (!old) {
        const row = { status: 'new', id: c.id, warningsKey: c.id, candidate: c, current: null };
        const clash = current.find((z) => !String(z.id).startsWith('api:') && !matchedIds.has(String(z.id)) && slotKey(z) === slotKey(c));
        if (clash) row.issues = [`Možná duplicita s ručně zapsaným zápasem (${clash.domaci} vs ${clash.hoste}, ${clash.vysledek})`];
        return row;
      }
      const merged = { ...c, id: old.id };
      const status = differs(old, merged) ? 'changed' : 'unchanged';
      return { status, id: old.id, warningsKey: c.id, candidate: merged, current: old };
    });

    current.forEach((z) => {
      if (String(z.id).startsWith('api:') && !matchedIds.has(String(z.id))) {
        rows.push({ status: 'removed', id: z.id, warningsKey: z.id, candidate: null, current: z });
      }
    });

    return rows;
  }

  return { normTeam, seasonKey, knownTeamsEverywhere, reconcileTeamName, naturalKey, computeDiff };
});
