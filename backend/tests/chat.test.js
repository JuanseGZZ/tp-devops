process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const jwt     = require('jsonwebtoken');
const app     = require('../src/app');

jest.mock('express-rate-limit', () => () => (req, res, next) => next());
jest.mock('../src/config/db', () => ({
  query:   jest.fn(),
  connect: jest.fn(),
}));

const pool = require('../src/config/db');

const ME      = { sub: 'user-1', username: 'juan' };
const token   = jwt.sign(ME, 'test-secret', { expiresIn: '1h' });
const CHAT_ID = 'chat-uuid-1';

const msgRow = (overrides = {}) => ({
  id: 'msg-1',
  chat_id: CHAT_ID,
  user_id: 'user-1',
  username: 'juan',
  content: 'hola',
  created_at: new Date().toISOString(),
  ...overrides,
});

const mockIsMember    = () => pool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
const mockNotMember   = () => pool.query.mockResolvedValueOnce({ rows: [] });

beforeEach(() => jest.resetAllMocks());

// ─── GET /chats ───────────────────────────────────────────────────────────────

describe('GET /api/chats', () => {
  it('401 — sin token', async () => {
    const res = await request(app).get('/api/chats');
    expect(res.status).toBe(401);
  });

  it('200 — devuelve lista de chats del usuario', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: CHAT_ID,
        name: null,
        is_group: false,
        created_at: new Date(),
        members: [{ id: 'user-2', username: 'pedro' }],
        last_content: 'hola',
        last_created_at: new Date(),
        last_username: 'pedro',
      }],
    });

    const res = await request(app)
      .get('/api/chats')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].id).toBe(CHAT_ID);
  });

  it('200 — devuelve array vacío si no tiene chats', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/chats')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

// ─── POST /chats ──────────────────────────────────────────────────────────────

describe('POST /api/chats', () => {
  it('401 — sin token', async () => {
    const res = await request(app).post('/api/chats').send({ targetUserId: 'user-2' });
    expect(res.status).toBe(401);
  });

  it('400 — sin targetUserId', async () => {
    const res = await request(app)
      .post('/api/chats')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('201 — devuelve DM existente (idempotente)', async () => {
    // findDirectBetween devuelve un chat ya existente → no llama createDirect
    pool.query.mockResolvedValueOnce({
      rows: [{ id: CHAT_ID, name: null, is_group: false, created_at: new Date() }],
    });

    const res = await request(app)
      .post('/api/chats')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetUserId: 'user-2' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(CHAT_ID);
    expect(res.body.isGroup).toBe(false);
  });
});

// ─── GET /chats/:id/messages ──────────────────────────────────────────────────

describe('GET /api/chats/:chatId/messages', () => {
  it('401 — sin token', async () => {
    const res = await request(app).get(`/api/chats/${CHAT_ID}/messages`);
    expect(res.status).toBe(401);
  });

  it('403 — usuario no es miembro del chat', async () => {
    mockNotMember();

    const res = await request(app)
      .get(`/api/chats/${CHAT_ID}/messages`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('200 — carga inicial sin after, devuelve todos los mensajes', async () => {
    mockIsMember();
    pool.query.mockResolvedValueOnce({ rows: [msgRow(), msgRow({ id: 'msg-2' })] });

    const res = await request(app)
      .get(`/api/chats/${CHAT_ID}/messages`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  it('200 — polling con after, devuelve solo mensajes nuevos', async () => {
    const after = new Date(Date.now() - 5000).toISOString();
    mockIsMember();
    pool.query.mockResolvedValueOnce({ rows: [msgRow({ id: 'msg-3' })] });

    const res = await request(app)
      .get(`/api/chats/${CHAT_ID}/messages?after=${encodeURIComponent(after)}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('200 — polling sin mensajes nuevos devuelve array vacío', async () => {
    const after = new Date().toISOString();
    mockIsMember();
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get(`/api/chats/${CHAT_ID}/messages?after=${encodeURIComponent(after)}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

// ─── POST /chats/:id/messages ─────────────────────────────────────────────────

describe('POST /api/chats/:chatId/messages', () => {
  it('401 — sin token', async () => {
    const res = await request(app)
      .post(`/api/chats/${CHAT_ID}/messages`)
      .send({ content: 'hola' });
    expect(res.status).toBe(401);
  });

  it('400 — content vacío', async () => {
    const res = await request(app)
      .post(`/api/chats/${CHAT_ID}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '' });
    expect(res.status).toBe(400);
  });

  it('403 — usuario no es miembro del chat', async () => {
    mockNotMember();

    const res = await request(app)
      .post(`/api/chats/${CHAT_ID}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'hola' });
    expect(res.status).toBe(403);
  });

  it('201 — happy path, devuelve mensaje creado', async () => {
    mockIsMember();
    pool.query.mockResolvedValueOnce({ rows: [msgRow()] });

    const res = await request(app)
      .post(`/api/chats/${CHAT_ID}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'hola' });
    expect(res.status).toBe(201);
    expect(res.body.content).toBe('hola');
    expect(res.body.chat_id).toBe(CHAT_ID);
  });

  it('400 — content solo espacios queda vacío tras sanitize+trim', async () => {
    // El service valida después de isMember, así que necesitamos mockear ambos
    mockIsMember();
    // No mockeamos create → el service lanza 400 "vacío" antes de llegar a create

    const res = await request(app)
      .post(`/api/chats/${CHAT_ID}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '   ' });
    expect(res.status).toBe(400);
  });
});
