# Documentación — TP Integrador DevOps

## Índice general

1. [indice.md](./indice.md) — Este archivo. Punto de entrada a toda la documentación.
2. [estructura.md](./estructura.md) — Árbol de archivos del proyecto y arquitectura de capas.
3. [models.md](./models.md) — Modelos de datos (esquema SQL, relaciones, decisiones de diseño).
4. [api.md](./api.md) — Endpoints de la API REST (rutas, métodos, payloads, respuestas).
5. [decisiones.md](./decisiones.md) — Decisiones técnicas y de diseño tomadas durante el TP.
6. [tareas_pendientes.md](./tareas_pendientes.md) — Tareas que faltan para completar el proyecto.

---

## Resumen del proyecto

Aplicación de chat en tiempo real con autenticación JWT, validación de email por código, CAPTCHA Cloudflare Turnstile, sistema de amigos y chats directos/grupales con polling incremental.

| Capa | Tecnología |
|---|---|
| Frontend | Vanilla JS (ES Modules), Bootstrap 5 dark |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL 16 |
| Infra | Docker + Docker Compose (multi-stage images) |
| CI/CD | GitHub Actions |
| Monitoreo | A definir (pendiente) |

---

## Estado de implementación

| Módulo | Estado |
|---|---|
| Estructura de archivos | Completo |
| Modelos SQL + migration | Completo |
| Auth (register / verify-email / login) | Completo |
| CAPTCHA (Cloudflare Turnstile) | Completo — claves de prueba activas |
| Rate limiting (global + email) | Completo |
| Friends (request / accept / reject / list) | Completo |
| Chat & Mensajes (DM + General) | Completo |
| Polling incremental (`?after=ISO`) | Completo |
| Chat General (UUID fijo, auto-join) | Completo |
| Docker / Compose multi-stage | Completo |
| Tests unitarios (45/45) | Completo |
| Email service (SMTP) | Pendiente |
| CI/CD (GitHub Actions) | Pendiente |
| Monitoreo | Pendiente |
| Deploy (Render u otra plataforma) | Opcional |
