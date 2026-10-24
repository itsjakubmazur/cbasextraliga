// Tenký klient pro veřejné (neautentizované) API czechbadminton.cz.
const BASE = 'https://www.czechbadminton.cz/api/public-zone/tournaments';
const PAGE_SIZE = 100;

function buildEqualsFilterParams(field, value) {
  return [
    [`fields[${field}][o]`, 'valuesEqual'],
    [`fields[${field}][v][]`, value],
  ];
}

async function fetchAllPages(path, extraParams) {
  const results = [];
  let offset = 0;
  // Bezpečnostní pojistka proti nekonečné smyčce, kdyby API vracelo nesmyslné 'total'.
  for (let page = 0; page < 50; page++) {
    const params = new URLSearchParams();
    extraParams.forEach(([k, v]) => params.append(k, v));
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(offset));

    const url = `${BASE}${path}?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`czechbadminton.cz API ${path} selhalo: ${res.status}`);
    }
    const json = await res.json();
    const data = json.data || [];
    results.push(...data);

    if (data.length < PAGE_SIZE || results.length >= (json.total || 0)) break;
    offset += PAGE_SIZE;
  }
  return results;
}

async function fetchCompetitions(tournamentId) {
  return fetchAllPages('/competitions/simple', buildEqualsFilterParams('tournamentId', tournamentId));
}

async function fetchTeams(tournamentId) {
  return fetchAllPages('/teams', buildEqualsFilterParams('tournamentId', tournamentId));
}

async function fetchMatches(tournamentId, competitionId) {
  const params = [
    ...buildEqualsFilterParams('tournamentId', tournamentId),
    ...buildEqualsFilterParams('competitionId', competitionId),
  ];
  const url = new URLSearchParams();
  params.forEach(([k, v]) => url.append(k, v));
  url.set('sort', 'startDate,homeTeamName,awayTeamName');
  url.set('limit', String(PAGE_SIZE));
  url.set('offset', '0');

  const results = [];
  let offset = 0;
  for (let page = 0; page < 50; page++) {
    url.set('offset', String(offset));
    const res = await fetch(`${BASE}/matches?${url.toString()}`);
    if (!res.ok) throw new Error(`czechbadminton.cz API /matches selhalo: ${res.status}`);
    const json = await res.json();
    const data = json.data || [];
    results.push(...data);
    if (data.length < PAGE_SIZE || results.length >= (json.total || 0)) break;
    offset += PAGE_SIZE;
  }
  return results;
}

async function fetchGamesForMatch(matchId) {
  return fetchAllPages('/games/withrosters', [
    ['sort', 'gameNumber'],
    ...buildEqualsFilterParams('matchId', matchId),
  ]);
}

module.exports = { fetchCompetitions, fetchMatches, fetchGamesForMatch, fetchTeams };
