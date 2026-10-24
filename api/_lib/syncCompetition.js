// Stažení kandidátů (dílčích zápasů) jedné soutěže z czechbadminton.cz.
// Sdílí ho admin endpoint api/sync/fetch.js i scripts/auto-sync.js, ať
// ruční i automatický sync vidí přesně stejná data.
const { fetchMatches, fetchGamesForMatch, fetchTeams } = require('./czechbadminton');
const { normalizeGame, isApproved } = require('./normalize');

function isWaitingForApproval(m) {
  return m.stateId === 'WaitForApproval' || m.stateName === 'Čeká na schválení';
}

const CONCURRENCY = 5;

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * config = jedna položka z tournamentConfig.json ({ tournamentId, competitions }).
 * Vrací { matchCount, pendingCount, candidates, warnings, teamLogos } - stejný tvar, jaký
 * admin UI dostává z /api/sync/fetch.
 */
async function syncCompetition(config) {
  const competitionEntries = Object.entries(config.competitions);

  // 1) seznam schvalenych a na schvaleni cekajicich zapasu napric vsemi castmi
  // souteze (zakladni cast + play-off apod.). "Ceka na schvaleni" uz ma v API
  // kompletni vysledky i sestavy - zapisou se s priznakem neschvaleno, ktery
  // zmizi, az svaz zapas schvali. "Odehrano" je rozpracovany zapis, ten se bere az pozdeji.
  const allMatches = [];
  for (const [competitionName, competitionId] of competitionEntries) {
    const matches = await fetchMatches(config.tournamentId, competitionId);
    matches
      .filter((m) => isApproved(m) || isWaitingForApproval(m))
      .forEach((m) => allMatches.push({ ...m, _competitionName: competitionName }));
  }

  // 2) pro kazdy zapas hry jednotlivych disciplin (s omezenou konkurenci, ať to nezahltí API/timeout)
  const perMatch = await mapWithConcurrency(allMatches, CONCURRENCY, async (match) => {
    const games = await fetchGamesForMatch(match.id);
    return games.map((game) => normalizeGame(match, game));
  });

  const candidates = [];
  const warnings = [];
  perMatch.flat().forEach(({ zapas, warnings: gameWarnings }) => {
    candidates.push(zapas);
    if (gameWarnings.length) {
      warnings.push({ id: zapas.id, tymDomaci: zapas.tymDomaci, tymHoste: zapas.tymHoste, issues: gameWarnings });
    }
  });

  // 3) loga tymu (jeden dotaz, nezavisly na poctu zapasu)
  let teamLogos = {};
  try {
    const teams = await fetchTeams(config.tournamentId);
    teamLogos = Object.fromEntries(
      teams.filter((t) => t.logoUrl).map((t) => [t.name, 'https://is.czechbadminton.cz' + t.logoUrl])
    );
  } catch {
    // loga jsou bonus - pokud selzou, sync jako celek by kvuli tomu nemel spadnout
  }

  const pendingCount = allMatches.filter((m) => !isApproved(m)).length;
  return { matchCount: allMatches.length, pendingCount, candidates, warnings, teamLogos };
}

module.exports = { syncCompetition };
