# Tareas pendientes

## Índice interno

1. [Email (SMTP)](#email-smtp)
2. [CI/CD — GitHub Actions](#cicd--github-actions)
3. [Monitoreo](#monitoreo)
4. [Cloudflare Turnstile — claves de producción](#cloudflare-turnstile--claves-de-producción)
5. [Limpieza antes de producción](#limpieza-antes-de-producción)
6. [Deploy (opcional)](#deploy-opcional)

---

## Email (SMTP)

El `email.service.js` está implementado con nodemailer pero sin configuración SMTP real.
Actualmente el registro funciona pero no envía el email de verificación.

**Qué hacer:**
1. Obtener credenciales SMTP (el usuario tiene su propio servicio de email)
2. Completar las variables en `.env` / `docker-compose.yml`:
   ```
   SMTP_HOST=...
   SMTP_PORT=587
   SMTP_USER=...
   SMTP_PASS=...
   EMAIL_FROM=noreply@tudominio.com
   ```
3. Verificar que llega el email de verificación al registrar un usuario nuevo.

---

## CI/CD — GitHub Actions

Crear los workflows en `.github/workflows/`:

### `ci.yml` — se dispara en Pull Request a `main`

```yaml
on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: backend/package-lock.json
      - run: npm ci
        working-directory: backend
      - run: npm test
        working-directory: backend

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - run: docker compose build
```

### `cd.yml` — se dispara en push a `main` (merge de PR)

```yaml
on:
  push:
    branches: [main]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - run: |
          docker build -t ghcr.io/${{ github.repository }}/backend:latest ./backend
          docker push ghcr.io/${{ github.repository }}/backend:latest
          docker build -t ghcr.io/${{ github.repository }}/frontend:latest ./frontend
          docker push ghcr.io/${{ github.repository }}/frontend:latest
```

**Secrets a configurar en GitHub (Settings → Secrets):**
- `JWT_SECRET`
- `TURNSTILE_SECRET` (clave real de producción)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

**Branch protection en `main`:**
- Require PR antes de merge
- Require que pasen los checks del CI (`test` + `build`)

---

## Monitoreo

Elegir una herramienta y configurarla:

| Opción | Tier gratuito | Lo que da |
|---|---|---|
| **Datadog** | 14 días trial | APM traces, dashboards, alertas |
| **Sentry** | Gratuito (5k eventos/mes) | Error tracking, performance monitoring |
| **Grafana Cloud** | Gratuito (10k métricas) | Dashboards personalizables, Loki para logs |

**Independientemente de la herramienta, agregar al backend:**

Un middleware de logging en `src/app.js` (antes de las rutas):
```javascript
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(JSON.stringify({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms,
    }));
  });
  next();
});
```

**Dashboard mínimo a mostrar:**
- Requests por minuto (hits)
- Tasa de errores (4xx / 5xx)
- Latencia p95

---

## Cloudflare Turnstile — claves de producción

Actualmente usa las claves de prueba de Cloudflare (siempre pasan, sin fricción real).

**Cuando se tenga el dominio final:**
1. Ir a [dash.cloudflare.com → Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
2. Crear un nuevo sitio con el dominio de producción
3. Reemplazar en `frontend/index.html`:
   ```html
   data-sitekey="1x00000000000000000000AA"
   ```
   por la sitekey real.
4. Setear en producción (variable de entorno / GitHub Secret):
   ```
   TURNSTILE_SECRET=<secret_real>
   ```
   El backend ya lee `process.env.TURNSTILE_SECRET` — no hay que cambiar código.

---

## Limpieza antes de producción

- [ ] Quitar la exposición del puerto `5432` de la DB en `docker-compose.yml` (solo era temporal para pgAdmin durante el desarrollo)
- [ ] Verificar que `JWT_SECRET` sea un string largo y aleatorio (no el default de desarrollo)
- [ ] Asegurarse que `NODE_ENV=production` esté seteado en el Compose de producción

---

## Deploy (opcional — 1 punto extra)

Opción recomendada: **Render** (tier gratuito disponible)

**Pasos básicos:**
1. Crear cuenta en render.com
2. Conectar el repositorio de GitHub
3. Crear un Web Service para el backend (Docker, puerto 3000)
4. Crear un Static Site o Web Service para el frontend (nginx, puerto 80)
5. Crear una PostgreSQL DB en Render
6. Configurar las variables de entorno en el dashboard de Render
7. Configurar el dominio de Render en Cloudflare Turnstile (sitekey real)
