# API REST — Endpoints

## Índice interno

1. [Convenciones](#convenciones)
2. [Auth — /api/auth](#auth--apiauth)
3. [Usuarios — /api/users](#usuarios--apiusers)
4. [Chats — /api/chats](#chats--apichats)
5. [Errores estándar](#errores-estándar)

---

## Convenciones

- Base URL: `http://localhost:3000/api`
- Todas las respuestas son JSON.
- Endpoints protegidos requieren header: `Authorization: Bearer <token>`
- Los IDs son UUID v4.
- Fechas en ISO 8601 / UTC.

---

## Auth — /api/auth

### POST /api/auth/register

Crea un usuario y envía un código de verificación al email.
Requiere captcha resuelto antes de poder llamar este endpoint (máx 3 por IP por día).

**Body:**
```json
{
  "username": "juanito",
  "email": "juan@mail.com",
  "password": "segura123",
  "cf-turnstile-response": "<token generado por el widget Cloudflare Turnstile>"
}
```

**Respuesta 201:**
```json
{ "message": "Código de verificación enviado al email." }
```

---

### POST /api/auth/verify-email

Verifica el código de 6 dígitos recibido por email.

**Body:**
```json
{
  "email": "juan@mail.com",
  "code": "482910"
}
```

**Respuesta 200:**
```json
{ "message": "Email verificado. Ya podés iniciar sesión." }
```

---

### POST /api/auth/login

Devuelve un JWT si las credenciales son correctas y el email está verificado.

**Body:**
```json
{
  "email": "juan@mail.com",
  "password": "segura123"
}
```

**Respuesta 200:**
```json
{
  "token": "eyJ...",
  "user": {
    "id": "uuid",
    "username": "juanito",
    "email": "juan@mail.com"
  }
}
```

---

### POST /api/auth/logout

(Stateless — invalida el token en el cliente. Puede blacklistear el JTI en el futuro.)

**Respuesta 200:**
```json
{ "message": "Sesión cerrada." }
```

---

## Usuarios — /api/users

> Todos requieren `Authorization: Bearer <token>`

### GET /api/users/me

Devuelve el perfil del usuario autenticado.

**Respuesta 200:**
```json
{
  "id": "uuid",
  "username": "juanito",
  "email": "juan@mail.com",
  "emailVerified": true,
  "createdAt": "2025-05-11T..."
}
```

---

### GET /api/users/search?q=texto

Busca usuarios por username (para agregar como amigo).

**Respuesta 200:**
```json
[
  { "id": "uuid", "username": "pedro" }
]
```

---

### GET /api/users/friends

Lista amigos aceptados y solicitudes pendientes del usuario autenticado.

**Respuesta 200:**
```json
{
  "friends": [ { "id": "uuid", "username": "pedro" } ],
  "pendingReceived": [ { "friendshipId": "uuid", "from": { "id": "...", "username": "..." } } ],
  "pendingSent": [ { "friendshipId": "uuid", "to": { "id": "...", "username": "..." } } ]
}
```

---

### POST /api/users/friends/request

Envía solicitud de amistad.

**Body:**
```json
{ "addresseeId": "uuid" }
```

**Respuesta 201:**
```json
{ "friendshipId": "uuid", "status": "pending" }
```

---

### PATCH /api/users/friends/:friendshipId

Acepta o rechaza una solicitud recibida.

**Body:**
```json
{ "status": "accepted" }
```

**Respuesta 200:**
```json
{ "friendshipId": "uuid", "status": "accepted" }
```

---

## Chats — /api/chats

> Todos requieren `Authorization: Bearer <token>`

### GET /api/chats

Lista todos los chats del usuario autenticado.

**Respuesta 200:**
```json
[
  {
    "id": "uuid",
    "name": null,
    "isGroup": false,
    "members": [ { "id": "uuid", "username": "pedro" } ],
    "lastMessage": { "content": "hola", "createdAt": "..." }
  }
]
```

---

### POST /api/chats

Crea un chat directo o grupal.

**Body (DM):**
```json
{ "targetUserId": "uuid" }
```

**Body (grupo):**
```json
{ "isGroup": true, "name": "Los pibes", "memberIds": ["uuid1", "uuid2"] }
```

**Respuesta 201:**
```json
{ "id": "uuid", "isGroup": false }
```

---

### GET /api/chats/:chatId/messages

Devuelve mensajes del chat. Dos modos:

- **Sin `after`**: carga inicial — devuelve los últimos 100 mensajes ordenados ASC.
- **Con `after`**: polling — devuelve solo los mensajes con `created_at > after`. El front manda el `createdAt` de su último mensaje local. Si no llegó nada nuevo, devuelve `[]`.

**Query params:**
- `after` (opcional) — ISO 8601 UTC, ej. `2025-05-12T14:32:00.123Z`

**Respuesta 200:**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "username": "juanito",
    "content": "hola",
    "createdAt": "2025-05-12T14:32:00.123Z"
  }
]
```

El front acumula mensajes localmente y solo appendea lo nuevo. El poll corre cada 3s mientras el chat está abierto y cancela si el chat cambia.

---

### POST /api/chats/:chatId/messages

Envía un mensaje al chat.

**Body:**
```json
{ "content": "hola a todos" }
```

**Respuesta 201:**
```json
{ "id": "uuid", "content": "hola a todos", "createdAt": "..." }
```

---

## Errores estándar

| Status | Cuándo |
|---|---|
| 400 | Body inválido / validación fallida |
| 401 | Token ausente, inválido o expirado |
| 403 | Autenticado pero sin permisos sobre el recurso |
| 404 | Recurso no encontrado |
| 409 | Conflicto (username/email ya existe, solicitud duplicada) |
| 429 | Rate limit alcanzado |
| 500 | Error interno del servidor |

Formato de error:
```json
{
  "message": "Descripción legible",
  "details": ["campo requerido: email"]
}
```
