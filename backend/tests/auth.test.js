process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const app = require('../src/app');

// Deshabilitar rate limiters en tests
jest.mock('express-rate-limit', () => () => (req, res, next) => next());
jest.mock('../src/middleware/turnstile.middleware', () => ({
  verifyTurnstile: (req, res, next) => next(),
}));

jest.mock('../src/config/db', () => ({ query: jest.fn() }));
jest.mock('../src/services/email.service', () => ({
  sendVerificationCode: jest.fn(),
}));
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const pool         = require('../src/config/db');
const bcrypt       = require('bcrypt');
const emailService = require('../src/services/email.service');

// resetAllMocks limpia TAMBIÉN la cola de mockResolvedValueOnce entre tests
beforeEach(() => {
  jest.resetAllMocks();
  // Re-setup de mocks con implementación default
  bcrypt.hash.mockResolvedValue('$2b$hashed');
  emailService.sendVerificationCode.mockResolvedValue(undefined);
});

const dbRow = (overrides = {}) => ({
  id: 'user-1',
  username: 'juan',
  email: 'a@b.com',
  password_hash: '$2b$hashed',
  email_verified: false,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

// ─── REGISTER ────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('400 — faltan campos', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  it('201 — happy path', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })           // findByEmail
      .mockResolvedValueOnce({ rows: [] })           // findByUsername
      .mockResolvedValueOnce({ rows: [dbRow()] })    // create
      .mockResolvedValueOnce({ rows: [] });          // setVerificationCode

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'juan', email: 'a@b.com', password: 'pass123' });
    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/código/i);
  });

  it('409 — email duplicado', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [dbRow()] })    // findByEmail → existe
      .mockResolvedValueOnce({ rows: [] });          // findByUsername

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'otro', email: 'a@b.com', password: 'pass123' });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/email/i);
  });

  it('409 — username duplicado', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })           // findByEmail → libre
      .mockResolvedValueOnce({ rows: [dbRow()] });   // findByUsername → existe

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'juan', email: 'nuevo@b.com', password: 'pass123' });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/username/i);
  });
});

// ─── VERIFY EMAIL ─────────────────────────────────────────────────────────────

describe('POST /api/auth/verify-email', () => {
  it('400 — faltan campos', async () => {
    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  it('200 — código correcto', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [dbRow()] })    // findByEmail
      .mockResolvedValueOnce({                       // SELECT code + expires
        rows: [{
          email_verification_code: '123456',
          email_verification_expires: new Date(Date.now() + 60_000),
        }],
      })
      .mockResolvedValueOnce({ rows: [] })           // setEmailVerified
      .mockResolvedValueOnce({ rows: [] });          // addMember (global chat)

    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ email: 'a@b.com', code: '123456' });
    expect(res.status).toBe(200);
  });

  it('400 — código incorrecto', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [dbRow()] })
      .mockResolvedValueOnce({
        rows: [{
          email_verification_code: '999999',
          email_verification_expires: new Date(Date.now() + 60_000),
        }],
      });

    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ email: 'a@b.com', code: '123456' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/incorrecto/i);
  });

  it('400 — código expirado', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [dbRow()] })
      .mockResolvedValueOnce({
        rows: [{
          email_verification_code: '123456',
          email_verification_expires: new Date(Date.now() - 60_000), // en el pasado
        }],
      });

    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ email: 'a@b.com', code: '123456' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/expir/i);
  });
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('400 — faltan campos', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  it('401 — usuario no existe', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'x@x.com', password: '123' });
    expect(res.status).toBe(401);
  });

  it('403 — email no verificado', async () => {
    pool.query.mockResolvedValueOnce({ rows: [dbRow({ email_verified: false })] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'pass123' });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/verific/i);
  });

  it('401 — password incorrecta', async () => {
    pool.query.mockResolvedValueOnce({ rows: [dbRow({ email_verified: true })] });
    bcrypt.compare.mockResolvedValueOnce(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'mala' });
    expect(res.status).toBe(401);
  });

  it('200 — happy path, devuelve token y user', async () => {
    pool.query.mockResolvedValueOnce({ rows: [dbRow({ email_verified: true })] });
    bcrypt.compare.mockResolvedValueOnce(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'pass123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.username).toBe('juan');
  });
});
