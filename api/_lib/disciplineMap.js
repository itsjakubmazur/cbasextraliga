// sportDisciplineName z czechbadminton.cz API -> disciplina v badminton-data.json
// Stejná tabulka jako importDisciplineMap v badminton-stats-fixed-4.html (řádek 1783).
const DISCIPLINE_MAP = {
  '1. dvouhra mužů': 'Dvouhra mužů',
  '2. dvouhra mužů': 'Dvouhra mužů',
  '3. dvouhra mužů': 'Dvouhra mužů',
  '1. dvouhra žen': 'Dvouhra žen',
  '2. dvouhra žen': 'Dvouhra žen',
  '1. čtyřhra mužů': 'Čtyřhra mužů',
  '2. čtyřhra mužů': 'Čtyřhra mužů',
  'čtyřhra žen': 'Čtyřhra žen',
  'smíšená čtyřhra': 'Smíšená čtyřhra',
};

function mapDiscipline(sportDisciplineName) {
  if (!sportDisciplineName) return null;
  return DISCIPLINE_MAP[sportDisciplineName] || null;
}

module.exports = { DISCIPLINE_MAP, mapDiscipline };
