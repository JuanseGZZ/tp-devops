# Modelos de datos

## Índice interno

1. [Tablas y columnas](#tablas-y-columnas)
2. [Relaciones](#relaciones)
3. [Diagrama ER (texto)](#diagrama-er-texto)
4. [Decisiones de diseño](#decisiones-de-diseño)
5. [Estado — pendiente de iterar](#estado--pendiente-de-iterar)

---

## Tablas y columnas

### `users`

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() |
| `username` | VARCHAR(50) | UNIQUE NOT NULL |
| `email` | VARCHAR(255) | UNIQUE NOT NULL |
| `password_hash` | TEXT | NOT NULL |
| `email_verified` | BOOLEAN | NOT NULL DEFAULT false |
| `email_verification_code` | CHAR(6) | NULL |
| `email_verification_expires` | TIMESTAMPTZ | NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |

---

### `friendships`

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | UUID | PK |
| `requester_id` | UUID | FK → users.id ON DELETE CASCADE |
| `addressee_id` | UUID | FK → users.id ON DELETE CASCADE |
| `status` | VARCHAR(10) | NOT NULL DEFAULT 'pending' — CHECK IN ('pending','accepted','rejected') |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |

Índice único: `(requester_id, addressee_id)` — evita duplicar la solicitud.

---

### `chats`

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | UUID | PK |
| `name` | VARCHAR(100) | NULL (null = chat directo) |
| `is_group` | BOOLEAN | NOT NULL DEFAULT false |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |

---

### `chat_members` (tabla de unión)

| Columna | Tipo | Restricciones |
|---|---|---|
| `chat_id` | UUID | PK parcial, FK → chats.id ON DELETE CASCADE |
| `user_id` | UUID | PK parcial, FK → users.id ON DELETE CASCADE |
| `joined_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |

PK compuesta: `(chat_id, user_id)`

---

### `messages`

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | UUID | PK |
| `chat_id` | UUID | FK → chats.id ON DELETE CASCADE |
| `user_id` | UUID | FK → users.id ON DELETE SET NULL |
| `content` | TEXT | NOT NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |

Índice: `(chat_id, created_at ASC)` — cubre exactamente la query de polling incremental.

---

## Relaciones

```
users  1 ──< friendships >── 1  users
             (requester)         (addressee)

users  *──< chat_members >──*  chats
                                  |
                                  1
                                  |
                              messages >── 1  users
```

- Un `user` puede tener muchas `friendships` como requester o addressee.
- Un `user` puede pertenecer a muchos `chats` a través de `chat_members`.
- Un `chat` tiene muchos `messages`.
- Un `message` pertenece a un `chat` y a un `user`.

---

## Diagrama ER (texto)

```
┌──────────────────┐       ┌─────────────────────┐
│     users        │       │     friendships      │
│──────────────────│       │─────────────────────│
│ id (PK)          │──┐    │ id (PK)              │
│ username         │  ├───>│ requester_id (FK)    │
│ email            │  └───>│ addressee_id (FK)    │
│ password_hash    │       │ status               │
│ email_verified   │       │ created_at           │
│ ...              │       └─────────────────────┘
└────────┬─────────┘
         │
         │  (via chat_members)
         ▼
┌──────────────────┐       ┌──────────────────┐
│  chat_members    │       │     chats        │
│──────────────────│       │──────────────────│
│ chat_id (FK) ────┼──────>│ id (PK)          │
│ user_id (FK)     │       │ name             │
│ joined_at        │       │ is_group         │
└──────────────────┘       │ created_at       │
                           └────────┬─────────┘
                                    │
                                    ▼
                           ┌──────────────────┐
                           │    messages      │
                           │──────────────────│
                           │ id (PK)          │
                           │ chat_id (FK)     │
                           │ user_id (FK)     │
                           │ content          │
                           │ created_at       │
                           └──────────────────┘
```

---

## Decisiones de diseño

**¿Por qué UUID en lugar de SERIAL?**
Evita enumerar IDs en la URL (protección básica contra enumeración de recursos). Además, es más fácil generar IDs en el cliente si en el futuro se necesita.

**¿Por qué `friendships` tiene `requester_id` y `addressee_id` separados?**
Permite saber quién inició la solicitud, mostrar "solicitudes recibidas" vs "enviadas", y el índice único `(requester_id, addressee_id)` evita duplicados en una sola dirección.

**¿Por qué `chat_members` en vez de columnas en `chats`?**
Soporta chats grupales con N miembros sin cambiar el esquema. El mismo modelo sirve para DMs (2 miembros, `is_group=false`) y grupos.

**¿Por qué `ON DELETE SET NULL` en `messages.user_id`?**
Si un usuario se elimina, sus mensajes quedan huérfanos pero visibles (con username "[eliminado]"). Así no se rompe el historial del chat.

---

## Estrategia de actualización de mensajes (polling incremental)

**Carga inicial** (al abrir un chat): `GET /api/chats/:chatId/messages` → últimos 100 mensajes, ordenados ASC. El front los guarda en memoria y renderiza.

**Polling**: cada 3 segundos el front manda el `createdAt` de su último mensaje local:

```
GET /api/chats/:chatId/messages?after=2025-05-12T14:32:00.123Z
```

El back ejecuta:
```sql
SELECT m.id, m.user_id, u.username, m.content, m.created_at
FROM messages m
LEFT JOIN users u ON u.id = m.user_id
WHERE m.chat_id = $1 AND m.created_at > $2
ORDER BY m.created_at ASC
```

Si no hay nada nuevo devuelve `[]` — prácticamente gratis. Si hay mensajes nuevos, el front los appendea al DOM sin re-renderizar nada.

El índice `(chat_id, created_at ASC)` en `messages` cubre exactamente esta query.

Cuando escale: reemplazar el interval por WebSockets sin tocar el schema ni el endpoint.

---

## Chat General

UUID fijo `'00000000-0000-0000-0000-000000000001'` — seeded en `001_init.sql`:

```sql
INSERT INTO chats (id, name, is_group)
VALUES ('00000000-0000-0000-0000-000000000001', 'General', true);
```

Cada usuario se agrega a este chat automáticamente cuando verifica su email (`auth.service.verifyEmail` llama `chatRepository.addMember` con `ON CONFLICT DO NOTHING`).

---

## Estado

- [x] DDL SQL completo — `backend/migrations/001_init.sql`
- [x] Seed chat General — incluido en migration
- [x] `read_at` — descartado (fuera del MVP)
- [x] Soft delete en mensajes — descartado (mensajes inmutables)
- [x] Índice inverso en friendships — incluido (`idx_friendships_addressee`)
- [x] Índice en messages — `(chat_id, created_at ASC)` para polling incremental
- [x] Estrategia de sync — polling incremental `?after=ISO` cada 3s
