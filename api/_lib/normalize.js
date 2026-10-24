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

  const domaci = formatPlayers(game.homeRosters);
  const hoste = formatPlayers(game.awayRosters);
  if (!domaci) warnings.push('Chybí sestava domácích');
  if (!hoste) warnings.push('Chybí sestava hostů');

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

module.exports = { normalizeGame, formatPlayers, formatDatum };
