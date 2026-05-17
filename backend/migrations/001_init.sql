-- Migration 001 — schema inicial
-- Sin soft delete en mensajes. Sin read_at. Mensajes inmutables.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────
--  USERS
-- ─────────────────────────────────────────
CREATE TABLE users (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username                    VARCHAR(50) UNIQUE NOT NULL,
  email                       VARCHAR(255) UNIQUE NOT NULL,
  password_hash               TEXT        NOT NULL,
  email_verified              BOOLEAN     NOT NULL DEFAULT false,
  email_verification_code     CHAR(6),
  email_verification_expires  TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
--  FRIENDSHIPS
-- ─────────────────────────────────────────
CREATE TABLE friendships (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        VARCHAR(10) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);

-- índice inverso para buscar solicitudes recibidas por addressee
CREATE INDEX idx_friendships_addressee ON friendships (addressee_id);

-- ─────────────────────────────────────────
--  CHATS
-- ─────────────────────────────────────────
CREATE TABLE chats (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100),                        -- NULL = chat directo
  is_group   BOOLEAN      NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
--  CHAT MEMBERS
-- ─────────────────────────────────────────
CREATE TABLE chat_members (
  chat_id   UUID        NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX idx_chat_members_user ON chat_members (user_id);

-- ─────────────────────────────────────────
--  MESSAGES
-- ─────────────────────────────────────────
-- Los mensajes no se borran. Si el autor se elimina, user_id queda NULL
-- y el front muestra "[usuario eliminado]".
CREATE TABLE messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id    UUID        NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- índice principal para el polling: traer mensajes de un chat ordenados
CREATE INDEX idx_messages_chat_created ON messages (chat_id, created_at ASC);

-- ─────────────────────────────────────────
--  SEED — Chat general
-- ─────────────────────────────────────────
-- UUID fijo para que el backend lo referencie como constante
INSERT INTO chats (id, name, is_group)
VALUES ('00000000-0000-0000-0000-000000000001', 'General', true);

-- ─────────────────────────────────────────
--  SEED — Usuario de prueba
--  email: test@test.com / password: test1234
-- ─────────────────────────────────────────
INSERT INTO users (id, username, email, password_hash, email_verified)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'testuser',
  'test@test.com',
  '$2b$12$kg4fp/OrYLqmYJm6LEWn2eoq8ZWpMj/sjQjXurx8pVoGhq3AJN28W',
  true
);

INSERT INTO chat_members (chat_id, user_id)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
