# Decisiones técnicas y de diseño

## Índice interno

1. [Stack tecnológico](#stack-tecnológico)
2. [Seguridad](#seguridad)
3. [Arquitectura de capas](#arquitectura-de-capas)
4. [Frontend](#frontend)
5. [DevOps e infraestructura](#devops-e-infraestructura)
6. [Pendiente de decidir](#pendiente-de-decidir)
7. [Cerrado](#cerrado)

---

## Stack tecnológico

| Decisión | Elección | Razón |
|---|---|---|
| Backend | Node.js + Express | Requisito del TP |
| Base de datos | PostgreSQL 16 | Requisito del TP; soporta UUID nativo y transacciones |
| Frontend | Vanilla JS (ES Modules) | Requisito del TP; sin build tool necesario |
| CSS framework | Bootstrap 5 (CDN, dark theme) | Ahorra tiempo en CSS, componentes listos |
| Auth | JWT (Bearer token) | Stateless, fácil de probar, sin sesiones server-side |
| Passwords | bcrypt (12 rounds) | Estándar de la industria para hashing de passwords |
| Validación email | Código 6 dígitos + expiración 15 min | Simple de implementar y demostrar |
| CAPTCHA | Cloudflare Turnstile | Gratis, sin fricción para el usuario, no requiere Google |

---

## Seguridad

**SQL Injection**
Todos los queries usan parámetros posicionales (`$1, $2, ...`) con el driver `pg`. Nunca concatenación de strings en SQL.

**XSS**
El frontend nunca usa `innerHTML` con contenido del usuario. Usa `textContent` o crea nodos DOM con `createElement`.

**Rate limiting**
- Global: 60 requests / minuto / IP (Express middleware).
- Endpoint de registro: máximo 3 por IP por día (limita abuso de envío de emails).

**CAPTCHA — Cloudflare Turnstile**
Integrado en el formulario de registro. El frontend obtiene un token al completar el widget; lo envía como `cf-turnstile-response` en el body del POST. El backend verifica el token contra la API de Cloudflare (`/siteverify`) antes de procesar el registro. Rechaza con 400 si falta o es inválido.

Claves de prueba activas para desarrollo (siempre pasan, sin fricción). En producción reemplazar con claves reales de [dash.cloudflare.com → Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile).

**Hashing de passwords**
`bcrypt` con salt rounds = 12. La password nunca se guarda en texto plano ni aparece en logs.

**JWT**
- El secret se carga desde `env.JWT_SECRET` (nunca hardcodeado).
- Expiración configurable vía `JWT_EXPIRES_IN` (default 7 días).
- El logout es stateless (el cliente descarta el token). Blacklist de JTI fuera del MVP.

**Deduplicación de mensajes en frontend**
El frontend mantiene un `Set` de IDs de mensajes ya renderizados. Antes de appendear cualquier mensaje, verifica si el ID ya está en el Set. Esto resuelve la pérdida de precisión microsecond→millisecond al serializar timestamps PostgreSQL a JSON (JS Date pierde los últimos 3 dígitos), que causaría que el poll re-fetcheara el último mensaje en cada ciclo.

---

## Arquitectura de capas

Se eligió arquitectura en capas (no hexagonal completa) para mantener el código entendible sin sobreingeniería:

```
api (routes) → services → repositories → db
```

- Las rutas no tienen lógica de negocio.
- Los repositories solo tienen SQL.
- Los services son la única capa que toma decisiones.
- Los models son clases planas sin acceso a DB (no Active Record).

**¿Por qué no ORM (Sequelize, Prisma)?**
El TP requiere entender SQL explícito. Además, menos magia = más fácil de testear y de demostrar en la presentación.

---

## Frontend

**¿Por qué EventBus?**
Desacopla los módulos de render entre sí. El módulo de auth no necesita saber que existe el sidebar; solo emite `LOGGED_IN`. Facilita agregar nuevos módulos sin modificar los existentes.

**¿Por qué ES Modules sin bundler?**
Permite servir los archivos directamente con nginx sin necesidad de build step. El Dockerfile del front no hace `npm run build` — solo copia los archivos estáticos.

**¿Por qué Bootstrap dark theme?**
Ahorra tokens de CSS sin sacrificar calidad visual. El chat usa burbujas con colores diferenciados: azul (propio) y verde (ajeno), con username visible en todos los mensajes.

**Estructura espejo back/front**
`api/`, `dtos/`, `models/` existen en ambos lados. El DTO del front mapea la respuesta cruda de la API a una clase del modelo de front.

---

## DevOps e infraestructura

**Contenedores**
- `backend`: multi-stage (deps → build → production node:20-alpine)
- `frontend`: multi-stage (node copy → nginx:alpine)
- `db`: postgres:16-alpine con volumen persistente

**Docker Compose**
Orquesta los 3 servicios en red `internal`. Solo el frontend expone el puerto 80. El backend y la DB son internos. La DB expone temporalmente el puerto 5432 para acceso desde pgAdmin durante el desarrollo.

**Migration**
`backend/migrations/001_init.sql` se monta en `/docker-entrypoint-initdb.d/` de PostgreSQL. Se ejecuta automáticamente la primera vez que se crea el volumen. Incluye el seed del chat General con UUID fijo `'00000000-0000-0000-0000-000000000001'`.

**CI (GitHub Actions) — pendiente**
- En PR: `npm ci` + `npm test` + `docker build`
- En merge a main: build de imágenes + push a registry

**Monitoreo — pendiente**
El backend debe loguear method, ruta, status y latencia de cada request para que la herramienta de APM pueda trazar. A definir entre Datadog, Sentry y Grafana Cloud.

---

## Pendiente de decidir

- [ ] Herramienta de monitoreo definitiva (Datadog vs Sentry vs Grafana Cloud)
- [ ] Plataforma de deploy (Render u otra gratuita)
- [ ] Integración del servicio de email SMTP propio

---

## Cerrado

- [x] **Sync de mensajes**: polling incremental `GET /messages?after=ISO` cada 3s. Sin WebSockets en el MVP. El endpoint y el schema soportan upgrade a WebSockets sin cambios.
- [x] **Retención de mensajes**: los mensajes no se borran. `ON DELETE SET NULL` en `user_id` — si el autor se elimina, el mensaje queda con "[usuario eliminado]".
- [x] **`read_at`**: fuera del MVP.
- [x] **Soft delete en mensajes**: fuera del MVP (mensajes inmutables).
- [x] **Chat General**: UUID fijo `'00000000-0000-0000-0000-000000000001'`, seeded en migration. Cada usuario se agrega automáticamente al verificar su email.
- [x] **CAPTCHA**: Cloudflare Turnstile integrado en registro. Claves de prueba para dev, claves reales para prod.
- [x] **Deduplicación de mensajes**: `Set` de IDs en frontend resuelve el problema de precisión de microsegundos al comparar timestamps.
