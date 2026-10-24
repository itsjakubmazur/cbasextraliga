const { mapDiscipline } = require('./disciplineMap');
const { mapRound } = require('./roundMap');

function formatPlayers(rosters) {
  return (rosters || [])
    .filter((r) => r.person)
    .map((r) => `${r.person.lastName} ${r.person.firstName}`.trim())
    .join(', ');
}

function formatDatum(startDate) {
  if (!startDate) return '';
  return startDate.slice(0, 10); // "2026-03-29T10:00:00.000000" -> "2026-03-29"
}

// Vrací 'domaci'/'hoste' (kdo skrečoval) nebo null.
function detectSkrec(domaci, hoste, setsScore) {
  if (!!domaci === !!hoste) return null;
  const sety = String(setsScore || '').split(',').map((x) => x.trim()).filter(Boolean)
    .map((x) => x.split(':').map((n) => parseInt(n, 10)));
  if (!sety.length || sety.some((st) => st.length !== 2 || st.some(isNaN))) return null;
  if (!domaci && sety.every(([d, h]) => d === 0 && h > 0)) return 'domaci';
  if (!hoste && sety.every(([d, h]) => h === 0 && d > 0)) return 'hoste';
  return null;
}

/**
 * Prevede jeden 'game' (hru) z /games/withrosters + jeho nadrazeny 'match' na
 * zapis ve tvaru badminton-data.json (zapasy.<soutez>[] polozka).
 *
 * Vraci { zapas, warnings } - warnings je pole stringu popisujici co se
 * nepodarilo rozpoznat automaticky (nezname kolo/disciplina) - takove
 * zaznamy se v admin UI nesmi tise publikovat, uzivatel je musi rucne doplnit.
 */
function normalizeGame(match, game) {
  const warnings = [];

  const disciplina = mapDiscipline(game.sportDisciplineName);
  if (!disciplina) warnings.push(`Nerozpoznaná disciplína: "${game.sportDisciplineName}"`);

  const kolo = mapRound(match.roundName);
  if (!kolo) warnings.push(`Nerozpoznané kolo: "${match.roundName}"`);

  let domaci = formatPlayers(game.homeRosters);
  let hoste = formatPlayers(game.awayRosters);
  // Skreč: API ji nijak neoznačuje - pozná se podle toho, že jedné straně
  // chybí sestava a všechny sety vyhrála druhá strana X:0. Zapisuje se stejně
  // jako dřív ručně ("SKREČ" místo jmen), web s tím už počítá (Statistics.isSkrec).
  const skrec = detectSkrec(domaci, hoste, game.setsScore);
  if (skrec === 'domaci') domaci = 'SKREČ';
  else if (skrec === 'hoste') hoste = 'SKREČ';
  else {
    if (!domaci) warnings.push('Chybí sestava domácích');
    if (!hoste) warnings.push('Chybí sestava hostů');
  }

  const zapas = {
    id: `api:${match.id}:${game.gameNumber}`,
    kolo: kolo || match.roundName || '',
    datum: formatDatum(match.startDate),
    disciplina: disciplina || game.sportDisciplineName || '',
    domaci,
    hoste,
    vysledek: `${game.homeScore}:${game.awayScore}`,
    sety: game.setsScore || '',
    tymDomaci: match.homeTeamName,
    tymHoste: match.awayTeamName,
  };

  return { zapas, warnings, sourceMatchId: match.id, sourceGameId: game.id };
}

module.exports = { normalizeGame, formatPlayers, formatDatum, detectSkrec };
