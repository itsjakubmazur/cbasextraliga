// roundName z czechbadminton.cz API -> kolo v badminton-data.json
//
// Regulérní sezóna: API vrací čisté číslo jako string ("1", "2", ...) -> kolo "1.", "2.", ...
// (ověřeno curlem proti soutěži "Základní část").
//
// Play-off: API vrací český název kola -> převádí se na kódy, které web zná
// z js/statistics.js (playoffKoloNazev, řádky 54-58): QF/SF/F/P5/3M/RR.
const PLAYOFF_ROUND_MAP = {
  'čtvrtfinále': 'QF',
  'semifinále': 'SF',
  'finále': 'F',
  'o 5. místo': 'P5',
  'o 3. místo': '3M',
  'baráž': 'RR',
};

function normalize(str) {
  return String(str || '').trim().toLowerCase();
}

/**
 * Vrátí kolo ve formátu webu, nebo null pokud roundName nejde rozpoznat
 * (volající musí takový zápas označit jako "vyžaduje ruční doplnění kola",
 * nikdy nehádat).
 */
function mapRound(roundName) {
  const normalized = normalize(roundName);
  if (!normalized) return null;
  if (/^\d+$/.test(normalized)) return `${normalized}.`;
  return PLAYOFF_ROUND_MAP[normalized] || null;
}

module.exports = { PLAYOFF_ROUND_MAP, mapRound };
