// Pomůcka pro nastavení nové sezóny: podle tournamentId vrátí seznam
// competitionId + jejich názvů, aby se daly ručně vložit do
// api/_lib/tournamentConfig.json. Používá se jen výjimečně (jednou za sezónu).
const { requireAuth } = require('../_lib/auth');
const { fetchCompetitions } = require('../_lib/czechbadminton');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireAuth(req, res)) return;

  const tournamentId = req.query && req.query.tournamentId;
  if (!tournamentId) {
    res.status(400).json({ error: 'Chybí query parametr tournamentId' });
    return;
  }

  try {
    const competitions = await fetchCompetitions(tournamentId);
    res.status(200).json({
      tournamentId,
      competitions: competitions.map((c) => ({
        id: c.id,
        name: c.name,
        tournamentName: c.tournamentName,
        dateFrom: c.dateFrom,
        dateTill: c.dateTill,
      })),
    });
  } catch (err) {
    res.status(502).json({ error: 'Stažení z czechbadminton.cz selhalo', detail: String(err.message || err) });
  }
};
