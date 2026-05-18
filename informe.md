# Trabajo Práctico Integrador — DevOps
## Aplicación de Chat en Tiempo Real

---

## 1. Descripción del Proyecto

Se desarrolló una **aplicación de chat web** full-stack con las siguientes características:

- Registro con verificación de email
- Login con JWT
- Búsqueda de usuarios y solicitudes de amistad
- Chat directo entre usuarios
- Chat grupal general (todos los usuarios verificados)
- Mensajería en tiempo real mediante polling

El objetivo del TP no fue solo construir la aplicación, sino aplicar prácticas y herramientas de **DevOps** sobre ella: containerización, integración continua, entrega continua y monitoreo.

---

## 2. Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Backend | Node.js + Express |
| Base de datos | PostgreSQL 16 |
| Frontend | HTML + CSS + Vanilla JS (ES6 modules) + Bootstrap 5 |
| Containerización | Docker (multi-stage) + Docker Compose |
| CI/CD | GitHub Actions |
| Registry | Docker Hub |
| Deploy | Render (PaaS) |
| Proxy reverso | nginx |
| Monitoreo de métricas | Prometheus (prom-client) + Grafana Cloud |
| Trazas distribuidas | OpenTelemetry + Grafana Tempo |
| Email | Nodemailer + Mailtrap Sandbox |
| Seguridad | bcrypt, JWT, rate limiting, Cloudflare Turnstile (CAPTCHA), Bearer Token en /metrics |

---

## 3. Arquitectura

```
Usuario (browser)
      │
      ▼
 [nginx - Frontend]          Render PaaS
      │  /api/* → proxy
      ▼
 [Express - Backend]         Render PaaS
      │
      ├── PostgreSQL DB      Render Managed DB
      │
      └── Mailtrap SMTP      Email testing sandbox
```

**En desarrollo local:**

```
docker-compose
├── frontend  (nginx:alpine  → puerto 80)
├── backend   (node:20-alpine → puerto 3000)
├── db        (postgres:16-alpine → puerto 5432)
└── grafana-agent (opcional, perfil monitoring)
```

---

## 4. La Aplicación

### Funcionalidades

**Autenticación:**
- Registro con username, email y contraseña
- Verificación del email mediante código de 6 dígitos (TTL 15 minutos)
- Reenvío de código desde el formulario de login o registro
- Login con JWT (7 días de validez)
- CAPTCHA Cloudflare Turnstile en el registro

**Social:**
- Búsqueda de usuarios por username
- Solicitudes de amistad con tres estados: pendiente, aceptada, rechazada

**Chat:**
- Chat directo (DM) entre dos usuarios
- Chat grupal "General" (todos los usuarios verificados entran automáticamente)
- Polling incremental cada 3 segundos para nuevos mensajes
- Sanitización de mensajes (prevención de XSS)

### Modelo de Base de Datos

```
users
  ├── id (UUID PK)
  ├── username (UNIQUE)
  ├── email (UNIQUE)
  ├── password_hash
  ├── email_verified
  └── email_verification_code / expires

friendships
  ├── id (UUID PK)
  ├── requester_id → users
  ├── addressee_id → users
  └── status (pending | accepted | rejected)

chats
  ├── id (UUID PK)
  ├── name (NULL para DMs)
  └── is_group

chat_members
  ├── chat_id → chats
  └── user_id → users

messages
  ├── id (UUID PK)
  ├── chat_id → chats
  ├── user_id → users (SET NULL si se borra usuario)
  └── content
```

### API REST

| Método | Ruta | Descripción |
|---|---|---|
| POST | /api/auth/register | Registro + envío de código |
| POST | /api/auth/verify-email | Verificación del código |
| POST | /api/auth/resend-verification | Reenvío de código |
| POST | /api/auth/login | Login → JWT |
| GET | /api/users/me | Usuario autenticado |
| GET | /api/users/search?q= | Búsqueda por username |
| GET | /api/users/friends | Amigos y solicitudes |
| POST | /api/users/friends/request | Enviar solicitud |
| PATCH | /api/users/friends/:id | Aceptar/rechazar solicitud |
| GET | /api/chats | Chats del usuario |
| POST | /api/chats | Crear DM |
| GET | /api/chats/:id/messages | Mensajes (con polling) |
| POST | /api/chats/:id/messages | Enviar mensaje |
| GET | /metrics | Métricas Prometheus |

---

## 5. Docker

### Multi-stage Build (Backend)

El Dockerfile del backend tiene 3 etapas para minimizar el tamaño final de la imagen:

```
Etapa 1 — deps
  node:20-alpine
  npm ci --omit=dev    ← solo dependencias de producción

Etapa 2 — build
  node:20-alpine
  npm ci               ← todas las deps (incluye dev)
  COPY src/            ← código fuente

Etapa 3 — production
  node:20-alpine
  COPY --from=deps node_modules/   ← deps de producción
  COPY --from=build src/           ← código compilado
  COPY migrations/                 ← migraciones SQL
  EXPOSE 3000
  CMD node --require ./src/tracing.js src/app.js
```

**Beneficios:** imagen final sin dependencias de desarrollo, sin código de build intermedio, tamaño reducido.

### Multi-stage Build (Frontend)

```
Etapa 1 — build
  node:20-alpine
  COPY todo el frontend

Etapa 2 — production
  nginx:alpine
  COPY archivos estáticos → /usr/share/nginx/html
  COPY nginx.conf como template
  CMD envsubst → aplica BACKEND_URL → nginx
```

El frontend no corre JavaScript en servidor: es archivos estáticos servidos por nginx. La URL del backend se inyecta en tiempo de ejecución como variable de entorno.

### Docker Compose

Orquesta todos los servicios para el entorno de desarrollo local:

- **db**: postgres con healthcheck, volumen persistente
- **backend**: depende de db (healthy), variables de entorno inyectadas
- **frontend**: depende de backend, `BACKEND_URL=http://backend:3000`
- **grafana-agent**: perfil `monitoring` (opcional), scrape métricas y envío a Grafana Cloud

---

## 6. CI/CD Pipeline

### Flujo completo

```
Push a cualquier rama (PR)
  └── CI workflow
        ├── npm ci (instalar deps)
        └── npm test (45 tests)

Push a main
  └── CD workflow
        ├── Job 1: test
        │     ├── npm ci
        │     └── npm test
        │
        └── Job 2: build-and-push  ← solo si Job 1 pasó
              ├── Docker login (Docker Hub)
              ├── Build backend → push juangzz/tp-devops-backend:<sha>
              ├── Build frontend → push juangzz/tp-devops-frontend:<sha>
              ├── Deploy backend en Render (POST API con imageUrl:<sha>)
              └── Deploy frontend en Render (POST API con imageUrl:<sha>)
```

### CI (ci.yml)

- Se dispara en **Pull Requests a main**
- Dos jobs: `test` (npm test) → `build` (docker compose build)
- Actúa como **Andon Cord**: si los tests fallan, el PR no puede mergearse

### CD (cd.yml)

- Se dispara en **push a main**
- Los tests corren primero; si fallan, el pipeline se corta antes de buildear
- Las imágenes se taguean con el **SHA del commit** (no `latest`), garantizando trazabilidad total
- Render recibe la URL exacta de la imagen a deployar (`imageUrl`)

### Trazabilidad por SHA

Cada imagen en Docker Hub tiene como tag el hash del commit de git que la generó. Esto permite:
- Saber exactamente qué código está corriendo en producción
- Rollback a cualquier versión anterior por su hash
- Correlacionar un bug en producción con el commit exacto que lo introdujo

### Secrets configurados en GitHub

| Secret | Uso |
|---|---|
| DOCKERHUB_USERNAME | Login a Docker Hub |
| DOCKERHUB_TOKEN | Login a Docker Hub |
| RENDER_API_KEY | Autenticación con la API de Render |
| RENDER_SERVICE_ID_BACKEND | ID del servicio backend en Render |
| RENDER_SERVICE_ID_FRONTEND | ID del servicio frontend en Render |

---

## 7. Monitoreo

### Métricas con Prometheus

El backend expone el endpoint `GET /metrics` (prom-client) con:

- **http_requests_total**: contador de requests por método, ruta y código de respuesta
- **http_request_duration_ms**: histograma de latencia (buckets: 10ms a 5000ms)
- **nodejs_heap_size_used_bytes**: memoria heap usada por el proceso Node.js
- **nodejs_eventloop_lag_seconds**: lag del event loop (indicador de bloqueo)
- **nodejs_gc_duration_seconds**: tiempo que pasa el Garbage Collector limpiando memoria, por tipo (minor, major, incremental)
- **process_cpu_user_seconds_total**: uso de CPU del proceso

El endpoint está **protegido con Bearer Token**: requiere el header `Authorization: Bearer <METRICS_TOKEN>` para responder. Sin el token devuelve 401. Esto evita exponer información interna del sistema (versión de Node.js, rutas, uso de memoria) a cualquier persona que conozca la URL.

### Grafana Cloud — Hosted Collector

Grafana Cloud scrape directamente el endpoint público de Render cada 1 minuto usando el **Hosted Collector** (sin necesidad de instalar un agente). El token se configura en la conexión como Bearer credential.

**Dashboard "Métricas page"** con los siguientes paneles:

| Panel | Métrica | Tipo | Qué muestra |
|---|---|---|---|
| Requests totales por ruta | `http_requests_total` | Stat | Cuántas veces se llamó cada endpoint |
| Heap usado (MB) | `nodejs_heap_size_used_bytes / 1024 / 1024` | Time series | Memoria RAM usada por Node.js |
| Event Loop Lag (ms) | `nodejs_eventloop_lag_seconds * 1000` | Time series | Bloqueo del event loop |
| Latencia promedio (ms) | `rate(duration_sum[2m]) / rate(duration_count[2m])` | Time series | Tiempo de respuesta por ruta |
| Uso de CPU | `rate(process_cpu_user_seconds_total[2m])` | Time series | Carga de CPU en el tiempo |
| GC - tiempo limpiando memoria | `rate(nodejs_gc_duration_seconds_sum[2m])` | Stat | Tiempo activo del Garbage Collector por tipo |
| Requests por código HTTP | `sum(http_requests_total) by (status)` | Time series | Distribución de 200, 304, 401, 404 |

### Trazas con OpenTelemetry

El backend incluye instrumentación opcional de OpenTelemetry (`tracing.js`) que registra:

- Requests HTTP entrantes y salientes
- Queries a PostgreSQL
- Spans de Express

Las trazas se envían a **Grafana Tempo** vía OTLP. Se activan configurando la variable `OTEL_EXPORTER_OTLP_ENDPOINT`.

---

## 8. Seguridad

| Medida | Implementación |
|---|---|
| Contraseñas | bcrypt con salt=12 |
| Autenticación | JWT firmado con secret |
| Rate limiting | 60 req/min global, 3 emails/día por IP |
| CAPTCHA | Cloudflare Turnstile en registro |
| XSS | Sanitización de mensajes (remueve `<>`) |
| HTTPS | nginx con `proxy_ssl_server_name on` |
| Proxy seguro | Express `trust proxy` + headers X-Forwarded-For |

---

## 9. Conceptos DevOps Aplicados

### The Three Ways

**1er Way — Flow (flujo):**
El pipeline CI/CD automatiza todo el camino desde un commit hasta producción sin intervención manual. El código va: commit → test → build → Docker Hub → Render.

**2do Way — Feedback (retroalimentación):**
- Los tests fallan rápido y bloquean el pipeline antes de que código roto llegue a producción
- El monitoreo con Grafana muestra el estado del sistema en tiempo real
- Los logs de Render y GitHub Actions dan visibilidad inmediata de errores

**3er Way — Continual Learning (aprendizaje continuo):**
- Cada error en el pipeline quedó documentado y se corrigió el proceso
- Las decisiones técnicas (como cambiar de `latest` a SHA tags) surgen de haber entendido el problema y mejorado el enfoque

### Andon Cord

El CI actúa como un "cordón de parada" de línea de producción:
- Si un test falla en un PR, el merge está bloqueado
- Si los tests fallan en el CD (push a main), el deploy no ocurre
- Nadie puede "romper producción" sin que el sistema lo detecte y detenga el flujo

### Lean

- El Dockerfile multi-stage elimina waste (dependencias de dev, archivos temporales de build)
- El polling incremental de mensajes (`after` timestamp) evita transferir datos ya recibidos
- Las migraciones automáticas al startup eliminan un paso manual en cada deploy

---

## 10. Puntaje del TP

| Categoría | Ítem | Puntos |
|---|---|---|
| Dockerfile | Dockerfile base | 1 |
| Dockerfile | Multi-stage (backend y frontend) | 1 |
| Docker Compose | Orquestación con healthchecks y dependencias | 0.5 |
| Docker Compose | Buenas prácticas (redes, volúmenes, perfiles) | 0.5 |
| CI | Checks de build y unit tests | 0.5 |
| CI | Flujo de mergeo (PR bloqueado si falla) | 1 |
| CD | Publicación imagen a Docker Hub con SHA tag | 2 |
| CD | Despliegue automático a Render | 1 |
| Monitoreo | Dashboard con métricas HTTP (Grafana Cloud) | 1.5 |
| Monitoreo | Trazas distribuidas (OpenTelemetry + Tempo) | 1 |
| **Total** | | **10** |

### Extras implementados (no requeridos)

- Rama protegida en GitHub (checks requeridos para merge)
- Conventional commits
- Semantic versioning por SHA de commit
- CAPTCHA Cloudflare Turnstile
- OWASP API best practices (rate limit, sanitización, bcrypt, JWT)
- Verificación de email con código temporal (Mailtrap sandbox)
- Reenvío de código de verificación

---

## 11. Estructura del Repositorio

```
tp-devops/
├── .github/
│   └── workflows/
│       ├── ci.yml          ← tests en PRs
│       └── cd.yml          ← build + deploy en push a main
├── backend/
│   ├── Dockerfile          ← multi-stage
│   ├── migrations/
│   │   └── 001_init.sql    ← schema + seed
│   └── src/
│       ├── app.js
│       ├── tracing.js      ← OpenTelemetry
│       ├── api/            ← rutas Express
│       ├── services/       ← lógica de negocio
│       ├── repositories/   ← acceso a DB
│       ├── models/         ← modelos de datos
│       ├── dtos/           ← objetos de transferencia
│       ├── middleware/      ← auth, rate limit, métricas
│       └── config/         ← env, db pool
├── frontend/
│   ├── Dockerfile          ← multi-stage (build + nginx)
│   ├── nginx.conf          ← proxy reverso + SPA routing
│   ├── index.html
│   ├── styles.css
│   └── src/
│       ├── api/            ← fetch al backend
│       ├── render/         ← lógica de UI
│       ├── models/
│       ├── dtos/
│       └── events/         ← EventBus pub/sub
├── docker-compose.yml
└── grafana-agent.yml
```
