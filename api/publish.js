const { requireAuth } = require('./_lib/auth');

const OWNER = 'itsjakubmazur';
const REPO = 'cbasextraliga';
const FILE_PATH = 'badminton-data.json';
const REQUIRED_KEYS = ['zapasy', 'tymy'];

function targetBranch() {
  return process.env.GITHUB_TARGET_BRANCH || 'main';
}

function githubHeaders() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is not configured');
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
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

  const data = body && body.data;
  const note = (body && body.message) || '';

  if (!data || typeof data !== 'object') {
    res.status(400).json({ error: 'Chybí data k publikování' });
    return;
  }
  const missing = REQUIRED_KEYS.filter((k) => !(k in data));
  if (missing.length) {
    res.status(400).json({ error: `Data postrádají povinná pole: ${missing.join(', ')}` });
    return;
  }

  data.datum = new Date().toISOString();

  const branch = targetBranch();
  const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;

  try {
    const currentRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
      headers: githubHeaders(),
    });
    if (!currentRes.ok) {
      throw new Error(`Nepodařilo se přečíst aktuální soubor z GitHubu (${currentRes.status})`);
    }
    const current = await currentRes.json();

    const content = Buffer.from(JSON.stringify(data, null, 2), 'utf8').toString('base64');
    const message = note
      ? `Admin: ${note}`
      : `Admin: aktualizace dat (${new Date().toISOString().slice(0, 10)})`;

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: githubHeaders(),
      body: JSON.stringify({
        message,
        content,
        sha: current.sha,
        branch,
      }),
    });

    if (putRes.status === 409) {
      res.status(409).json({ error: 'Soubor mezitím změnil někdo jiný, načti data znovu a zkus to prosím znovu.' });
      return;
    }
    if (!putRes.ok) {
      const errBody = await putRes.text();
      throw new Error(`GitHub commit selhal (${putRes.status}): ${errBody}`);
    }

    const putJson = await putRes.json();
    res.status(200).json({
      ok: true,
      commitSha: putJson.commit && putJson.commit.sha,
      branch,
    });
  } catch (err) {
    res.status(502).json({ error: 'Publikování selhalo', detail: String(err.message || err) });
  }
};
