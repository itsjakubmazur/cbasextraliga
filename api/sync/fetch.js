const { requireAuth } = require('../_lib/auth');
const { fetchMatches, fetchGamesForMatch } = require('../_lib/czechbadminton');
const { normalizeGame } = require('../_lib/normalize');
const tournamentConfig = require('../_lib/tournamentConfig.json');

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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireAuth(req, res)) return;

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const competitionKey = body && body.competitionKey;
  const config = competitionKey && tournamentConfig[competitionKey];

  if (!config) {
    res.status(400).json({
      error: 'Neznámý nebo nenakonfigurovaný competitionKey',
      known: Object.keys(tournamentConfig).filter((k) => !k.startsWith('_')),
    });
    return;
  }

  try {
    const competitionEntries = Object.entries(config.competitions);

    // 1) seznam schvalenych zapasu napric vsemi castmi souteze (zakladni cast + play-off apod.)
    const allMatches = [];
    for (const [competitionName, competitionId] of competitionEntries) {
      const matches = await fetchMatches(config.tournamentId, competitionId);
      matches
        .filter((m) => m.stateName === 'Schváleno' || m.stateId === 'Approved')
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

    res.status(200).json({
      competitionKey,
      matchCount: allMatches.length,
      candidates,
      warnings,
    });
  } catch (err) {
    res.status(502).json({ error: 'Stažení z czechbadminton.cz selhalo', detail: String(err.message || err) });
  }
};
