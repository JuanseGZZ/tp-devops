const { Router } = require('express');
const authService = require('../services/auth.service');
const { emailLimiter } = require('../middleware/rateLimit.middleware');
const { verifyTurnstile } = require('../middleware/turnstile.middleware');

const router = Router();

function handleError(res, err) {
  if (err.status) return res.status(err.status).json({ message: err.message });
  console.error(err);
  res.status(500).json({ message: 'Error interno del servidor.' });
}

// POST /api/auth/register
router.post('/register', emailLimiter, verifyTurnstile, async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'username, email y password son requeridos.' });
  }
  try {
    await authService.register({ username, email, password });
    res.status(201).json({ message: 'Código de verificación enviado al email.' });
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ message: 'email y code son requeridos.' });
  }
  try {
    await authService.verifyEmail({ email, code });
    res.status(200).json({ message: 'Email verificado. Ya podés iniciar sesión.' });
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'email y password son requeridos.' });
  }
  try {
    const result = await authService.login({ email, password });
    res.status(200).json(result);
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.status(200).json({ message: 'Sesión cerrada.' });
});

module.exports = router;
