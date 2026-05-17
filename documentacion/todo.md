# TODO — TP Integrador

## Índice interno
1. [Phase 1 — Infra base](#phase-1--infra-base)
2. [Phase 2 — Backend Auth](#phase-2--backend-auth)
3. [Phase 3 — Backend Users & Friends](#phase-3--backend-users--friends)
4. [Phase 4 — Backend Chat & Mensajes](#phase-4--backend-chat--mensajes)
5. [Phase 5 — Frontend](#phase-5--frontend)
6. [Phase 6 — Tests](#phase-6--tests)
7. [Phase 7 — DevOps](#phase-7--devops)
8. [Phase 8 — Monitoreo](#phase-8--monitoreo)

---

## Phase 1 — Infra base

- [x] `docker-compose.yml` con servicios: `db`, `backend`, `frontend`
- [x] Volumen persistente para PostgreSQL
- [x] Health check en `db` para que `backend` espere antes de arrancar
- [x] `backend` lee variables de entorno del Compose (no `.env` hardcodeado)
- [x] El Compose corre `001_init.sql` al inicializar la DB (`initdb.d`)
- [x] `nginx.conf` en frontend proxea `/api` → `backend:3000`
- [x] `.env.example` raíz + `.gitignore`
- [x] Verificar que `docker compose up` levanta todo junto — ✅ los 3 contenedores up, API responde a través de nginx

---

## Phase 2 — Backend Auth

### Repositories
- [x] `user.repository.findByEmail(email)`
- [x] `user.repository.findByUsername(username)`
- [x] `user.repository.create({ username, email, passwordHash })`
- [x] `user.repository.setEmailVerified(userId)`
- [x] `user.repository.setVerificationCode(userId, code, expiresAt)`

### Services
- [x] `auth.service.register()` — hashea password, guarda user, genera código, llama emailService
- [x] `auth.service.verifyEmail()` — valida código y expiración, marca email_verified
- [x] `auth.service.login()` — valida credenciales, chequea email_verified, devuelve JWT
- [x] `email.service.sendVerificationCode()` — implementar con nodemailer

### Routes / Middleware
- [x] Wiring de `auth.routes` → service → respuesta HTTP correcta
- [x] `emailLimiter` aplicado a `POST /auth/register`
- [x] Tests de auth con mocks (sin DB real)
- [ ] Integración de CAPTCHA (verificar token contra API de hCaptcha o similar)

---

## Phase 3 — Backend Users & Friends

### Repositories
- [x] `user.repository.findById(id)`
- [x] `user.repository.searchByUsername(query, excludeUserId)` — ILIKE, limit 10
- [x] `friendship.repository.findByUsers(requesterId, addresseeId)`
- [x] `friendship.repository.create(requesterId, addresseeId)`
- [x] `friendship.repository.updateStatus(friendshipId, status)`
- [x] `friendship.repository.findAcceptedByUser(userId)`
- [x] `friendship.repository.findPendingReceived / findPendingSent`

### Services
- [x] `user.service.getMe(userId)`
- [x] `user.service.search(query, requesterId)`
- [x] `user.service.getFriends(userId)` — accepted + pendingReceived + pendingSent
- [x] `user.service.sendFriendRequest(requesterId, addresseeId)`
- [x] `user.service.respondFriendRequest(friendshipId, userId, status)`

### Routes
- [x] `authMiddleware` en todas las rutas de `/users`
- [x] Wiring de `user.routes` → service → respuesta HTTP

---

## Phase 4 — Backend Chat & Mensajes

### Repositories
- [x] `chat.repository.findByUser(userId)` — con último mensaje de cada chat
- [x] `chat.repository.findDirectBetween(userIdA, userIdB)`
- [x] `chat.repository.createDirect(userIdA, userIdB)` — transacción atómica
- [x] `chat.repository.isMember(chatId, userId)`
- [x] `message.repository.findByChatId(chatId, after?)` — carga inicial 100 + polling incremental
- [x] `message.repository.create({ chatId, userId, content })`

### Services
- [x] `chat.service.getChatsForUser(userId)`
- [x] `chat.service.openDirectChat(requesterId, targetUserId)` — idempotente
- [x] `chat.service.getMessages(chatId, userId, after?)` — valida membresía
- [x] `chat.service.sendMessage(chatId, userId, content)` — valida membresía, sanitiza XSS

### Routes
- [x] `authMiddleware` en todas las rutas de `/chats`
- [x] Wiring de `chat.routes` → service → respuesta HTTP
- [x] Sanitización de `content` (strip `<>`) antes de guardar

---

## Phase 5 — Frontend ✅

### Auth
- [x] `auth.render` — submit de login: llama API, guarda token en localStorage, emite `LOGGED_IN`
- [x] `auth.render` — submit de registro paso 1: valida campos, llama API, muestra paso 2
- [x] `auth.render` — submit de verificación: llama API, vuelve al login
- [x] `auth.render` — mostrar/ocultar `#auth-screen` vs `#chat-screen` según estado
- [x] `auth.render` — auto-login si hay token en localStorage al cargar la página
- [x] `auth.render` — logout: limpia localStorage, emite `LOGGED_OUT`, muestra login

### Sidebar
- [x] `sidebar.render` — cargar y renderizar lista de amigos en `#friends-list`
- [x] `sidebar.render` — cargar y renderizar lista de chats en `#chats-list` con preview último mensaje
- [x] `sidebar.render` — click en amigo: crea/abre DM, refresca lista, abre chat
- [x] `sidebar.render` — click en chat: emite `CHAT_SELECTED`, resalta activo
- [x] `sidebar.render` — mostrar `@username` en `#sidebar-username`

### Chat
- [x] `chat.render` — al recibir `CHAT_SELECTED`: carga mensajes iniciales (sin `after`), renderiza
- [x] `chat.render` — polling: `setInterval` cada 3s con `?after=<último createdAt>`, appendea nuevos
- [x] `chat.render` — cancelar polling al cambiar de chat (`clearInterval`)
- [x] `chat.render` — submit de `#message-form`: llama API, appendea mensaje propio sin esperar poll
- [x] `chat.render` — scroll automático al último mensaje al abrir chat y al recibir mensajes nuevos
- [x] `chat.render` — habilitar/deshabilitar input y botón según si hay chat activo
- [x] `chat.render` — burbuja propia (`.own`) vs ajena (`.other`) con hora
- [x] `chat.render` — mostrar `[usuario eliminado]` si `username` es null

---

## Phase 6 — Tests ✅ (45/45 passing)

### Auth
- [x] `register` — happy path (201)
- [x] `register` — email duplicado (409)
- [x] `register` — username duplicado (409)
- [x] `register` — campos inválidos (400)
- [x] `verifyEmail` — código correcto (200)
- [x] `verifyEmail` — código incorrecto (400)
- [x] `verifyEmail` — código expirado (400)
- [x] `verifyEmail` — campos inválidos (400)
- [x] `login` — happy path, devuelve JWT (200)
- [x] `login` — email no verificado (403)
- [x] `login` — usuario no existe (401)
- [x] `login` — password incorrecta (401)
- [x] `login` — campos inválidos (400)

### Users
- [x] `GET /users/me` — sin token (401)
- [x] `GET /users/me` — con token válido (200)
- [x] `GET /users/search` — sin token (401)
- [x] `GET /users/search` — query corta (400)
- [x] `GET /users/search` — happy path (200)
- [x] `GET /users/friends` — sin token (401)
- [x] `GET /users/friends` — happy path con 3 secciones (200)
- [x] `POST /users/friends/request` — sin token (401)
- [x] `POST /users/friends/request` — sin addresseeId (400)
- [x] `POST /users/friends/request` — auto-solicitud (400)
- [x] `POST /users/friends/request` — happy path (201)
- [x] `POST /users/friends/request` — duplicado (409)
- [x] `PATCH /users/friends/:id` — sin token (401)
- [x] `PATCH /users/friends/:id` — no es destinatario (403)
- [x] `PATCH /users/friends/:id` — acepta solicitud (200)

### Chat
- [x] `GET /chats` — sin token (401)
- [x] `GET /chats` — happy path (200)
- [x] `POST /chats` — sin token (401)
- [x] `POST /chats` — sin targetUserId (400)
- [x] `POST /chats` — DM idempotente (201)
- [x] `GET /chats/:id/messages` — sin token (401)
- [x] `GET /chats/:id/messages` — no miembro (403)
- [x] `GET /chats/:id/messages` — carga inicial sin `after` (200)
- [x] `GET /chats/:id/messages?after=...` — solo mensajes nuevos (200)
- [x] `GET /chats/:id/messages?after=...` — sin nuevos, devuelve [] (200)
- [x] `POST /chats/:id/messages` — sin token (401)
- [x] `POST /chats/:id/messages` — content vacío (400)
- [x] `POST /chats/:id/messages` — no miembro (403)
- [x] `POST /chats/:id/messages` — happy path (201)
- [x] `POST /chats/:id/messages` — solo espacios → vacío tras trim (400)

---

## Phase 7 — DevOps

### Docker
- [x] Multi-stage `backend/Dockerfile` — buildea OK
- [x] Multi-stage `frontend/Dockerfile` — nginx sirve `index.html` + proxy `/api`
- [x] `docker-compose.yml` — networks, volumes, healthcheck, depends_on
- [x] `docker compose up` — los 3 contenedores up, API y frontend verificados

### GitHub
- [ ] Crear repo en GitHub
- [ ] Pushear código base
- [ ] Configurar rama `main` como protegida (requerir checks antes de merge)

### CI — GitHub Actions
- [ ] Workflow `ci.yml`: trigger en PR a `main`
  - [ ] Step: `npm ci`
  - [ ] Step: `npm test`
  - [ ] Step: `docker build` (verifica que la imagen compila)
- [ ] El merge a `main` bloqueado si CI falla

### CD — GitHub Actions
- [ ] Workflow `cd.yml`: trigger en push a `main`
  - [ ] Build imagen Docker del backend
  - [ ] Push a Docker Hub (o GitHub Container Registry)
  - [ ] (Opcional) Deploy automático a Render via webhook

---

## Phase 8 — Monitoreo

- [ ] Elegir herramienta: Datadog / Sentry / Grafana Cloud
- [ ] Agregar middleware de logging en Express: método, ruta, status, latencia
- [ ] Configurar el agente/SDK de la herramienta elegida en el backend
- [ ] Dashboard: request rate (hits), error rate, latencia p95
- [ ] APM / trazas: ver el tiempo en cada capa (route → service → db)
- [ ] Conectar Compose para que el agente de monitoreo corra como sidecar o env var

---

## Puntos del TP cubiertos al terminar

| Ítem | Pts | Phase |
|---|---|---|
| Dockerfile | 1 | 7 |
| Multi-stage | 1 | 7 |
| Docker Compose buenas prácticas (x2) | 1 | 7 |
| CI: build + unit test | 0.5 | 7 |
| CI: flujo de mergeo | 1 | 7 |
| CD: publicación imagen | 2 | 7 |
| CD: deploy a Render | 1 | 7 |
| Monitoreo: dashboard | 1.5 | 8 |
| Monitoreo: APM / trazas | 1 | 8 |
| **Total** | **10** | |
