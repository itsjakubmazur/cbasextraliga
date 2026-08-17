const { createSessionCookie, verifyPassword } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const storedHash = process.env.ADMIN_PASSWORD_HASH;
  if (!storedHash) {
    res.status(500).json({ error: 'Admin not configured' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const password = body && body.password;

  if (!password || !verifyPassword(password, storedHash)) {
    // Small delay to blunt naive brute-force attempts.
    await new Promise((r) => setTimeout(r, 500));
    res.status(401).json({ error: 'Nesprávné heslo' });
    return;
  }

  res.setHeader('Set-Cookie', createSessionCookie());
  res.status(200).json({ ok: true });
};
