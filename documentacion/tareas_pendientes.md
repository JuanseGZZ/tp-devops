# Tareas pendientes

## Índice interno

1. [Email (SMTP)](#email-smtp)
2. [GitHub Secrets](#github-secrets)
3. [Branch protection en GitHub](#branch-protection-en-github)
4. [Deploy en Render](#deploy-en-render)
5. [Monitoreo — Grafana Cloud](#monitoreo--grafana-cloud)
6. [Cloudflare Turnstile — claves de producción](#cloudflare-turnstile--claves-de-producción)

---

## Email (SMTP)

El `email.service.js` está implementado con nodemailer pero sin configuración SMTP real.

**Qué hacer:**
1. Obtener credenciales SMTP (Gmail con App Password, o Mailtrap para pruebas)
2. Completar las variables en `.env` / GitHub Secrets:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=tu_email@gmail.com
   SMTP_PASS=tu_app_password
   EMAIL_FROM=noreply@tpchat.com
   ```
3. Verificar que llega el email de verificación al registrar un usuario nuevo.

---

## GitHub Secrets

Ir a `github.com/JuanseGZZ/tp-devops → Settings → Secrets → Actions` y crear:

| Secret | Valor |
|---|---|
| `DOCKERHUB_USERNAME` | Tu usuario de Docker Hub |
| `DOCKERHUB_TOKEN` | Access Token de Docker Hub (Account Settings → Security) |
| `JWT_SECRET` | String largo aleatorio: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `RENDER_DEPLOY_HOOK_BACKEND` | URL del deploy hook del servicio backend en Render |
| `SMTP_HOST` | Host SMTP |
| `SMTP_PORT` | Puerto SMTP |
| `SMTP_USER` | Usuario SMTP |
| `SMTP_PASS` | Password SMTP |
| `TURNSTILE_SECRET` | Clave real de producción de Cloudflare Turnstile |

---

## Branch protection en GitHub

Ir a `github.com/JuanseGZZ/tp-devops → Settings → Branches → Add branch ruleset`:

1. Target: `main`
2. Activar: **Require a pull request before merging**
3. Activar: **Require status checks to pass** → agregar los checks `test` y `build`
4. Guardar

Esto bloquea el merge si el CI falla.

---

## Deploy en Render

### Flujo completo (lo que pide el profe)

```
git push → GitHub Actions (CI test + build) → PR aprobado → merge a main
→ GitHub Actions CD: docker build → push a Docker Hub (tag: SHA + latest)
→ curl al Deploy Hook de Render
→ Render: pull nueva imagen → redeploy
```

### Pasos

**1. Crear cuenta en [render.com](https://render.com)**

**2. Crear PostgreSQL Database**
- New → PostgreSQL
- Anotar: host, port, database, user, password (internal connection string)

**3. Crear Web Service para el backend**
- New → Web Service → Docker
- Image URL: `docker.io/TU_USUARIO/tp-devops-backend:latest`
- Puerto: `3000`
- Variables de entorno:
  ```
  NODE_ENV=production
  PORT=3000
  DB_HOST=<render db internal host>
  DB_PORT=5432
  DB_NAME=<nombre db>
  DB_USER=<user db>
  DB_PASSWORD=<password db>
  JWT_SECRET=<string largo aleatorio>
  SMTP_HOST=...
  SMTP_PORT=587
  SMTP_USER=...
  SMTP_PASS=...
  EMAIL_FROM=noreply@tpchat.com
  TURNSTILE_SECRET=<clave real>
  RATE_LIMIT_WINDOW_MS=60000
  RATE_LIMIT_MAX=60
  EMAIL_RATE_LIMIT_PER_IP_PER_DAY=3
  # Opcional: si se configura Grafana Cloud para trazas directas
  OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod-us-east-0.grafana.net/otlp
  OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic <base64(instanceId:apiKey)>
  ```
- Ir a **Settings → Deploy Hook** → copiar la URL
- Guardar esa URL como secret `RENDER_DEPLOY_HOOK_BACKEND` en GitHub

**4. Crear Web Service para el frontend**
- New → Web Service → Docker
- Image URL: `docker.io/TU_USUARIO/tp-devops-frontend:latest`
- Puerto: `80`
- Variables de entorno:
  ```
  BACKEND_URL=https://<tu-backend>.onrender.com
  ```

**5. Verificar el pipeline completo**
- Crear un branch, hacer un cambio chico, abrir PR
- Ver que el CI corre automáticamente (test + build)
- Mergear el PR
- Ver que el CD pushea a Docker Hub y triggerea Render
- Ver en Render que el servicio se redeploya con la nueva imagen

---

## Monitoreo — Grafana Cloud

### Crear cuenta y obtener credenciales

1. Crear cuenta gratuita en [grafana.com](https://grafana.com/auth/sign-up)
2. Ir a tu stack → **Details**
3. En "Prometheus" (Metrics): anotar la **Remote Write Endpoint** y el **username**
4. En "Tempo" (Traces): anotar el **Endpoint** (formato `tempo-prod-XX.grafana.net:443`) y el **username**
5. Crear una **API Key** (Grafana Cloud → Security → API Keys) con scope `MetricsPublisher`

### Configurar `.env` local

```env
OTEL_EXPORTER_OTLP_ENDPOINT=http://grafana-agent:4318

GRAFANA_CLOUD_PROM_URL=https://prometheus-prod-XX.grafana.net/api/prom/push
GRAFANA_CLOUD_PROM_USER=123456
GRAFANA_CLOUD_TEMPO_ENDPOINT=tempo-prod-XX.grafana.net:443
GRAFANA_CLOUD_TEMPO_USER=123456
GRAFANA_CLOUD_API_KEY=tu_api_key
```

### Levantar con monitoreo

```bash
docker compose --profile monitoring up
```

Esto levanta los 3 servicios base + el Grafana Agent que:
- Scrape de métricas en `backend:3000/metrics` → push a Grafana Cloud Prometheus
- Recibe trazas OTLP del backend en `4318` → forward a Grafana Cloud Tempo

### Dashboard en Grafana Cloud

Crear un dashboard con estas métricas:
- **Hits (requests/min)**: `rate(http_requests_total[1m])`
- **Error rate**: `rate(http_requests_total{status=~"4..|5.."}[1m])`
- **Latencia p95**: `histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))`

Para las trazas: Grafana → Explore → seleccionar datasource Tempo → buscar por servicio `tp-devops-backend`

---

## Cloudflare Turnstile — claves de producción

Actualmente usa las claves de prueba (siempre pasan, sin fricción real).

**Cuando se tenga el dominio final:**
1. Ir a [dash.cloudflare.com → Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
2. Crear un nuevo sitio con el dominio de producción
3. Reemplazar en `frontend/index.html`:
   ```html
   data-sitekey="1x00000000000000000000AA"
   ```
   por la sitekey real.
4. Setear en producción (GitHub Secret + Render env var):
   ```
   TURNSTILE_SECRET=<secret_real>
   ```
