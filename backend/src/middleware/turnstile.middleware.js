const env = require('../config/env');

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

async function verifyTurnstile(req, res, next) {
  const token = req.body['cf-turnstile-response'];
  if (!token) {
    return res.status(400).json({ message: 'Captcha requerido.' });
  }

  try {
    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: env.turnstile.secret,
        response: token,
        remoteip: req.ip,
      }),
    });
    const data = await response.json();
    if (!data.success) {
      return res.status(400).json({ message: 'Captcha inválido. Intentá de nuevo.' });
    }
    next();
  } catch {
    return res.status(500).json({ message: 'Error verificando captcha.' });
  }
}

module.exports = { verifyTurnstile };
