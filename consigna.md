# Trabajo Práctico DevOps

## Contexto

Los alumnos deben realizar un trabajo práctico integrador que incluye:

- Desarrollar una API básica.
- Agregar pruebas unitarias.
- Dockerizar la aplicación.
- Orquestación con docker-compose.
- Gestionar el repositorio git y GitHub.
- Configurar un CI y CD.
- Publicar la imagen de Docker a Docker Registry.
- El despliegue continuo a Render u otra plataforma gratuita (no requerido para aprobar).
- Utilizar monitoreo (Datadog, New Relic, Grafana Cloud, Sentry).

### Conceptos a aplicar

- Three Ways
- Andon Cords
- Metodologías ágiles
- Lean

### Modalidad

- Grupos de máximo 2 personas o individual.
- Se elabora un informe de todo lo realizado y se presenta en clase.
- La evaluación es individual.
- En la fecha final, cada alumno en su rama o fork del repositorio debe agregar una **funcionalidad extra relacionada a DevOps**.
- El trabajo práctico tendrá 2 o 3 **niveles de dificultad** según la experiencia del alumno.

---

## Puntaje actual

| Categoría | Ítem | Puntos |
|---|---|---|
| **Dockerfile** | Dockerfile (requerido) | 1 |
| **Dockerfile** | Multi-stage image | 1 |
| **Docker Compose** | Buenas prácticas | 0.5 |
| **Docker Compose** | Buenas prácticas | 0.5 |
| **CI** | Checks (build y unit test) | 0.5 |
| **CI** | Flujo de mergeo | 1 |
| **CD** | Publicación Dockerfile | 2 |
| **CD** | Despliegue a Render o un servicio | 1 |
| **Monitoreo** | Dashboard (Hits, etc.) | 1.5 |
| **Monitoreo** | APM / Trazas | 1 |

**Nota máxima: 10**

---

## Funcionalidades que NO se piden (opcionales / avanzadas)

Estas son funcionalidades extra que no son parte del TP base pero pueden sumar:

- Crear un status page.
- Configurar rama protegida en GitHub (mínimo los checks).
- Workflows reutilizables.
- Semantic versioning.
- Publicar la imagen a Docker Hub.
- Publicar la imagen en GitHub Actions.
- Branch de desarrollo.
- Hacer releases.
- Crear notas de release.
- Conventional commits.
- Uso de Kubernetes (limitado por costos de cloud y acceso a servicios gratuitos).
- Terraform (Render soporta manejo de infraestructura por Terraform).
- Swagger / OpenAPI.
- OWASP API best practices.
- Rollback de la versión deployada.

---

## Objetivo

- Tener al menos **2 versiones** del TP: una básica y una avanzada (para quienes quieran un desafío).
- Implementar una **funcionalidad/automatización o herramienta de DevOps de forma individual** para la fecha final.
- Los módulos y notas están organizados de forma acumulativa: a medida que se cumplen los ítems, se suman puntos.
- **Nota máxima: 10.**
