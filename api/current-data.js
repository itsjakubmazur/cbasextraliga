// Vrátí aktuální obsah badminton-data.json přímo z GitHubu (ne z CDN cache
// statického webu), aby admin po publikaci vždy viděl skutečně poslední stav,
// i těsně po předchozí publikaci než doběhne redeploy.
const { requireAuth } = require('./_lib/auth');

const OWNER = 'itsjakubmazur';
const REPO = 'cbasextraliga';
const FILE_PATH = 'badminton-data.json';

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireAuth(req, res)) return;

  const branch = process.env.GITHUB_TARGET_BRANCH || 'main';
  const url = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${branch}/${FILE_PATH}`;

  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(`GitHub raw fetch selhal (${r.status})`);
    const data = await r.json();
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Nepodařilo se načíst aktuální data', detail: String(err.message || err) });
  }
};
