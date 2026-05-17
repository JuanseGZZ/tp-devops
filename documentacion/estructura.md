# Estructura del proyecto

## Índice interno

1. [Árbol de archivos completo](#árbol-de-archivos-completo)
2. [Backend — capas y responsabilidades](#backend--capas-y-responsabilidades)
3. [Frontend — capas y responsabilidades](#frontend--capas-y-responsabilidades)
4. [Infra y config](#infra-y-config)
5. [Flujo de una request](#flujo-de-una-request)

---

## Árbol de archivos completo

```
TP - Integrador/
├── documentacion/
│   ├── indice.md
│   ├── estructura.md          ← este archivo
│   ├── models.md
│   ├── api.md
│   ├── decisiones.md
│   └── tareas_pendientes.md
│
├── backend/
│   ├── Dockerfile             (multi-stage: deps → build → production alpine)
│   ├── .env.example
│   ├── package.json
│   ├── migrations/
│   │   └── 001_init.sql       (DDL completo + seed del chat General)
│   ├── tests/
│   │   ├── auth.test.js       (register / verify-email / login — 15 tests)
│   │   ├── user.test.js       (me / search / friends / request / patch — 15 tests)
│   │   └── chat.test.js       (list / create / messages get+post — 15 tests)
│   └── src/
│       ├── app.js             (Express entry point)
│       ├── api/               (rutas HTTP — solo reciben y responden)
│       │   ├── index.js
│       │   ├── auth.routes.js
│       │   ├── user.routes.js
│       │   └── chat.routes.js
│       ├── config/
│       │   ├── env.js         (lee process.env, exporta config tipada)
│       │   └── db.js          (Pool de PostgreSQL)
│       ├── dtos/              (shapes de entrada/salida — sin lógica)
│       │   ├── auth.dto.js
│       │   ├── user.dto.js
│       │   └── chat.dto.js
│       ├── middleware/
│       │   ├── auth.middleware.js       (verifica JWT Bearer)
│       │   ├── rateLimit.middleware.js  (global 60/min + email 3/día/IP)
│       │   └── turnstile.middleware.js  (verifica token Cloudflare Turnstile)
│       ├── models/            (clases que representan entidades del dominio)
│       │   ├── user.model.js
│       │   ├── friendship.model.js
│       │   ├── chat.model.js
│       │   └── message.model.js
│       ├── repositories/      (acceso a DB — solo SQL parametrizado)
│       │   ├── user.repository.js
│       │   ├── friendship.repository.js
│       │   ├── chat.repository.js
│       │   └── message.repository.js
│       └── services/          (lógica de negocio — orquesta repositories)
│           ├── auth.service.js
│           ├── email.service.js
│           ├── user.service.js
│           └── chat.service.js
│
├── frontend/
│   ├── Dockerfile             (node build → nginx alpine)
│   ├── nginx.conf             (proxy /api/ → backend:3000, SPA fallback)
│   ├── index.html             (login screen + chat skeleton, Bootstrap 5 dark)
│   ├── styles.css             (burbujas de mensajes, scrollbars, hover)
│   └── src/
│       ├── main.js            (entry point — import e init de módulos)
│       ├── api/               (fetch wrappers — agregan Authorization header)
│       │   ├── auth.api.js
│       │   ├── user.api.js
│       │   └── chat.api.js
│       ├── dtos/              (mapeo raw API → modelo de front)
│       │   ├── auth.dto.js
│       │   ├── user.dto.js
│       │   └── chat.dto.js
│       ├── events/            (pub/sub interno — desacopla módulos)
│       │   ├── eventBus.js
│       │   └── chat.events.js (constantes: LOGGED_IN, CHAT_SELECTED, etc.)
│       ├── models/            (clases de dominio del front)
│       │   ├── user.model.js
│       │   ├── chat.model.js
│       │   └── message.model.js
│       └── render/            (manipulación del DOM)
│           ├── auth.render.js  (login / register / verify-email flow)
│           ├── sidebar.render.js (lista de chats, amigos, búsqueda)
│           └── chat.render.js  (apertura de chat, polling, envío)
│
├── docker-compose.yml         (db + backend + frontend en red interna)
├── consigna.md
└── desicion.md
```

---

## Backend — capas y responsabilidades

| Capa | Carpeta | Responsabilidad |
|---|---|---|
| API / Routes | `src/api/` | Recibir HTTP, parsear body, delegar a service, responder JSON |
| DTOs | `src/dtos/` | Definir shapes de entrada y salida; sin lógica |
| Middleware | `src/middleware/` | Auth JWT, rate limiting, verificación Turnstile |
| Services | `src/services/` | Lógica de negocio. Única capa que toma decisiones |
| Repositories | `src/repositories/` | Acceso a PostgreSQL. Solo SQL parametrizado, sin lógica |
| Models | `src/models/` | Clases que representan entidades. Sin acceso a DB |
| Config | `src/config/` | Lectura de env vars y pool de conexiones PG |

**Flujo de dependencias:** `api → service → repository → db`
Ninguna capa importa a una capa superior.

---

## Frontend — capas y responsabilidades

| Capa | Carpeta | Responsabilidad |
|---|---|---|
| API | `src/api/` | Fetch wrappers. Agregan el header Authorization automáticamente |
| DTOs | `src/dtos/` | Mapean respuestas raw de la API a modelos de front |
| Models | `src/models/` | Clases de dominio (User, Chat, Message) |
| Events | `src/events/` | EventBus pub/sub — desacopla módulos sin referencias cruzadas |
| Render | `src/render/` | Manipulación del DOM. Reaccionan a eventos del EventBus |

---

## Infra y config

| Archivo | Propósito |
|---|---|
| `docker-compose.yml` | Orquesta db, backend, frontend en red `internal` |
| `backend/Dockerfile` | Multi-stage: deps → build → production (node:20-alpine) |
| `frontend/Dockerfile` | Multi-stage: node build → nginx:alpine |
| `frontend/nginx.conf` | Proxy `/api/` → `backend:3000`, `try_files` para SPA |
| `backend/.env.example` | Template de variables de entorno necesarias |
| `backend/migrations/001_init.sql` | DDL + seed del chat General (montado en initdb.d) |

---

## Flujo de una request

```
Usuario hace submit en form de login
  → auth.render.js captura el evento submit
  → llama auth.api.js → fetch POST /api/auth/login
  → nginx proxy → Express → auth.routes.js
  → authService.login()
  → userRepository.findByEmail() → pool.query() → PostgreSQL
  → respuesta sube por la cadena
  → auth.render.js recibe { token, user }
  → localStorage.setItem('token', ...) + localStorage.setItem('user', ...)
  → EventBus.emit(EVENTS.LOGGED_IN, { user, token })
  → sidebar.render.js carga chats y amigos
  → chat.render.js espera selección de chat
  → se oculta #auth-screen, se muestra #chat-screen
```
