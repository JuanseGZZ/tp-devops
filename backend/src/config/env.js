// En Docker las vars vienen del Compose; dotenv solo aplica en dev local
try { require('dotenv').config(); } catch { /* dotenv no instalado en prod */ }

module.exports = {
  port: process.env.PORT || 3000,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'tp_chat',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'noreply@tpchat.com',
  },
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
    max: Number(process.env.RATE_LIMIT_MAX) || 60,
    emailPerIpPerDay: Number(process.env.EMAIL_RATE_LIMIT_PER_IP_PER_DAY) || 3,
  },
  turnstile: {
    // Clave de prueba Cloudflare (siempre pasa): 1x0000000000000000000000000000000AA
    secret: process.env.TURNSTILE_SECRET || '1x0000000000000000000000000000000AA',
  },
};
