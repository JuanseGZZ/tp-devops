process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const jwt     = require('jsonwebtoken');
const app     = require('../src/app');

jest.mock('express-rate-limit', () => () => (req, res, next) => next());
jest.mock('../src/config/db', () => ({ query: jest.fn() }));

const pool = require('../src/config/db');

const ME    = { sub: 'user-1', username: 'juan' };
const token = jwt.sign(ME, 'test-secret', { expiresIn: '1h' });

const dbRow = (overrides = {}) => ({
  id: 'user-1',
  username: 'juan',
  email: 'a@b.com',
  password_hash: 'h',
  email_verified: true,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

beforeEach(() => jest.resetAllMocks());

// ─── GET /users/me ────────────────────────────────────────────────────────────

describe('GET /api/users/me', () => {
  it('401 — sin token', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });

  it('200 — devuelve datos del usuario autenticado', async () => {
    pool.query.mockResolvedValueOnce({ rows: [dbRow()] });

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('juan');
    expect(res.body).not.toHaveProperty('passwordHash');
  });
});

// ─── GET /users/search ────────────────────────────────────────────────────────

describe('GET /api/users/search', () => {
  it('401 — sin token', async () => {
    const res = await request(app).get('/api/users/search?q=ju');
    expect(res.status).toBe(401);
  });

  it('400 — query demasiado corta (1 char)', async () => {
    const res = await request(app)
      .get('/api/users/search?q=j')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('200 — devuelve lista de usuarios que coinciden', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 'user-2', username: 'pedro' }],
    });

    const res = await request(app)
      .get('/api/users/search?q=pe')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].username).toBe('pedro');
  });

  it('200 — devuelve array vacío si no hay coincidencias', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/users/search?q=zzz')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

// ─── GET /users/friends ───────────────────────────────────────────────────────

describe('GET /api/users/friends', () => {
  it('401 — sin token', async () => {
    const res = await request(app).get('/api/users/friends');
    expect(res.status).toBe(401);
  });

  it('200 — devuelve friends, pendingReceived, pendingSent', async () => {
    // getFriends hace Promise.all de 3 queries
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'user-2', username: 'pedro' }] }) // accepted
      .mockResolvedValueOnce({ rows: [] })                                     // pendingReceived
      .mockResolvedValueOnce({ rows: [] });                                    // pendingSent

    const res = await request(app)
      .get('/api/users/friends')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('friends');
    expect(res.body).toHaveProperty('pendingReceived');
    expect(res.body).toHaveProperty('pendingSent');
    expect(res.body.friends[0].username).toBe('pedro');
  });
});

// ─── POST /users/friends/request ─────────────────────────────────────────────

describe('POST /api/users/friends/request', () => {
  it('401 — sin token', async () => {
    const res = await request(app)
      .post('/api/users/friends/request')
      .send({ addresseeId: 'user-2' });
    expect(res.status).toBe(401);
  });

  it('400 — sin addresseeId', async () => {
    const res = await request(app)
      .post('/api/users/friends/request')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('400 — no se puede enviar solicitud a uno mismo', async () => {
    const res = await request(app)
      .post('/api/users/friends/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ addresseeId: ME.sub });
    expect(res.status).toBe(400);
  });

  it('201 — happy path, crea solicitud pendiente', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [dbRow({ id: 'user-2' })] })   // findById (target)
      .mockResolvedValueOnce({ rows: [] })                           // findByUsers → no existe
      .mockResolvedValueOnce({                                       // create
        rows: [{
          id: 'fs-1',
          requester_id: 'user-1',
          addressee_id: 'user-2',
          status: 'pending',
          created_at: new Date(),
        }],
      });

    const res = await request(app)
      .post('/api/users/friends/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ addresseeId: 'user-2' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending');
  });

  it('409 — solicitud ya existente', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [dbRow({ id: 'user-2' })] })   // findById
      .mockResolvedValueOnce({                                       // findByUsers → ya existe
        rows: [{
          id: 'fs-1',
          requester_id: 'user-1',
          addressee_id: 'user-2',
          status: 'pending',
          created_at: new Date(),
        }],
      });

    const res = await request(app)
      .post('/api/users/friends/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ addresseeId: 'user-2' });
    expect(res.status).toBe(409);
  });
});

// ─── PATCH /users/friends/:id ─────────────────────────────────────────────────

describe('PATCH /api/users/friends/:friendshipId', () => {
  it('401 — sin token', async () => {
    const res = await request(app)
      .patch('/api/users/friends/fs-1')
      .send({ status: 'accepted' });
    expect(res.status).toBe(401);
  });

  it('403 — solo el destinatario puede responder', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 'fs-1',
        requester_id: 'user-2',
        addressee_id: 'user-99', // distinto al token (user-1)
        status: 'pending',
        created_at: new Date(),
      }],
    });

    const res = await request(app)
      .patch('/api/users/friends/fs-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'accepted' });
    expect(res.status).toBe(403);
  });

  it('200 — acepta solicitud correctamente', async () => {
    pool.query
      .mockResolvedValueOnce({                                       // findById
        rows: [{
          id: 'fs-1',
          requester_id: 'user-2',
          addressee_id: 'user-1', // el token es user-1
          status: 'pending',
          created_at: new Date(),
        }],
      })
      .mockResolvedValueOnce({                                       // updateStatus
        rows: [{
          id: 'fs-1',
          requester_id: 'user-2',
          addressee_id: 'user-1',
          status: 'accepted',
          created_at: new Date(),
        }],
      });

    const res = await request(app)
      .patch('/api/users/friends/fs-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'accepted' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('accepted');
  });
});
