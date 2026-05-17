const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const globalLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

// Stricter limiter for email-sending endpoint (3 per IP per day)
const emailLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: env.rateLimit.emailPerIpPerDay,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Email verification limit reached for today.' },
});

function applyRateLimit(app) {
  app.use(globalLimiter);
}

module.exports = { applyRateLimit, emailLimiter };
