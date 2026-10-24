const { requireAuth } = require('../_lib/auth');
const { syncCompetition } = require('../_lib/syncCompetition');
const tournamentConfig = require('../_lib/tournamentConfig.json');

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
    const result = await syncCompetition(config);
    res.status(200).json({
      competitionKey,
      sezona: tournamentConfig._sezona,
      ...result,
    });
  } catch (err) {
    res.status(502).json({ error: 'Stažení z czechbadminton.cz selhalo', detail: String(err.message || err) });
  }
};
