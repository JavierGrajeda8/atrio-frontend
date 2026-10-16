# Backlog de M0 — insumo para `/planificar-milestone`

El agente planificador convierte estas filas en issues del repo donde se ejecuta (usa la plantilla `.github/ISSUE_TEMPLATE/feature.md`, criterios en Gherkin cuando aplique, dependencias explícitas). Puede dividir un ítem si lo estima en más de ~400 líneas, pero **no agregar alcance**. Orden = orden sugerido de ejecución.

Leyenda: 🔒 `security-critical` (tú lees el código línea por línea) · 🏠 hacer en modo agente local · ☁️ apto para el agente en la nube.

---

## M0a — Backend (repo `backend`)

| ID | Issue | Requisitos | Depende de | Modo | Criterio de terminado |
|---|---|---|---|---|---|
| BE-01 | **Esqueleto del proyecto:** `pyproject.toml` (uv, Python 3.13), `src/atrio/main.py` con FastAPI y `/healthz` `/readyz`, estructura de módulos vacía (§9.4), `Makefile` con el contrato de `AGENTS.md`, `docker-compose.yml` (PostgreSQL 17, Valkey, MinIO, Mailpit), ruff, mypy `--strict`, pre-commit con gitleaks, `.env.example`; las pruebas usan `TEST_DATABASE_URL` si está definida (agente en la nube) y testcontainers si no | §9.2, §9.5, ARC-01 | — | 🏠 | `make setup dev` levanta todo; `make lint typecheck test` en verde con una prueba trivial |
| BE-02 | **CI de PR:** workflow con lint, tipos, pruebas (testcontainers) y seguridad (Semgrep, Bandit, pip-audit, gitleaks); actualizar `copilot-setup-steps.yml` con los comandos reales | SEC-80, §13.2 | BE-01 | 🏠 | PR de prueba con un secreto falso es bloqueado; checks visibles para el ruleset |
| BE-03 | **Núcleo `platform`:** configuración (pydantic-settings), modelo de error API-03 con catálogo de `code`, middleware de `request_id`, logging JSON con structlog y **redacción de PII** (+ prueba SEC-56), mensajes de error i18n, OpenTelemetry básico | API-03, SEC-56, OBS-01, OBS-02, I18N-01 | BE-01 | ☁️ | Error de validación devuelve el formato estándar localizado; prueba de logging falla si aparece un teléfono |
| BE-04 | **Base de datos:** SQLAlchemy 2 async + Alembic, roles `atrio_migrator` y `atrio_app` (sin BYPASSRLS, sin dueño de tablas), UUIDv7, migración inicial de `residentials`, `users`, `memberships` | DAT-01…07, SEC-23 | BE-01 | 🏠 | `make migrate` sube y baja limpio; la app conecta como `atrio_app` |
| BE-05 🔒 | **Contexto de tenant + RLS + arnés de aislamiento:** dependencia `tenant_context` (404 sin membresía, 403 si no activa), `SET LOCAL` por transacción, `TenantRepository`, políticas RLS forzadas, FKs compuestas, **suite automática** que recorre todos los endpoints registrados contra recursos de otro residencial | SEC-20, SEC-22…25, §9.6, H6 | BE-04 | 🏠 | Endpoint de ejemplo `GET /api/v1/residentials/{rid}` probado: cross-tenant → 404; consulta sin contexto → 0 filas; la suite falla si un endpoint nuevo no está cubierto |
| BE-06 🔒 | **Permisos:** `permissions.yaml` (roles de Fase 1 de §4.2), dependencia `require("…")`, prueba *fail-closed* (todo endpoint declara permiso) y **generador de pruebas de autorización** rol × endpoint | ROL-03, ROL-04, SEC-21, §13.1 | BE-05 | 🏠 | Un endpoint sin `require` hace fallar CI; la matriz generada cubre el endpoint de ejemplo |
| BE-07 🔒 | **Audit log:** `audit.record()`, cadena de hashes por residencial, trigger que rechaza UPDATE/DELETE, comando de verificación de la cadena | SEC-60…63 | BE-05 | 🏠 | Alterar una fila a mano hace fallar la verificación |
| BE-08 | **Outbox + cola:** `outbox.emit()` en la misma transacción, dispatcher (LISTEN/NOTIFY + barrido), Procrastinate con colas `critical/default/bulk`, idempotencia `(handler, event_id)`, `dead_letters` | ARC-10…13 | BE-04 | ☁️ | Prueba: evento emitido en transacción revertida no se publica; handler reintentado no duplica efectos |
| BE-09 | **Contrato publicado:** `make openapi` genera `openapi/openapi.json` determinista; CI falla si está desactualizado; `oasdiff` contra `main` etiqueta `breaking-api` | API-02, REP-01, REP-04 | BE-03 | ☁️ | Cambiar un campo sin regenerar rompe CI |
| BE-10 | **Imagen Docker:** multi-stage, slim, usuario no root, Trivy, SBOM, publicación en GHCR en cada merge a `main` | SEC-82, REP-05 | BE-02 | ☁️ | Imagen `ghcr.io/OWNER/backend:main` disponible; escaneo sin críticos |
| BE-11 | **Datos sintéticos:** `make seed` con 2 residenciales, admins, residentes y guardias de prueba (para aislamiento y E2E) | §9.11 | BE-05 | ☁️ | Dos residenciales consultables; sin datos reales |
| BE-12 | **Endpoint de ejemplo de punta a punta** (`GET/PATCH /residentials/{rid}`) con permiso, audit log, evento y OpenAPI: sirve de **plantilla** para todo lo que sigue | EST-01 (parcial) | BE-06, BE-07, BE-08, BE-09 | 🏠 | Documentado en `docs/adr/0001-patron-endpoint.md` como patrón a copiar |

## M0a — Frontend (repo `frontend`)

| ID | Issue | Requisitos | Depende de | Modo | Criterio de terminado |
|---|---|---|---|---|---|
| FR-01 | **Monorepo pnpm:** `apps/web`, `apps/guard` (React 19 + Vite + TS strict), `apps/pass` (Preact o TS sin framework), `packages/ui`, `i18n`, `api-client`, `config`; ESLint, Prettier, `tsc`; `Makefile` con el contrato de `AGENTS.md` | §9.2, §9.5 | — | 🏠 | `make setup dev` levanta las 3 apps; `make lint typecheck test` en verde |
| FR-02 | **CI de PR:** lint, tipos, Vitest, build, **presupuestos de bundle** (size-limit: guard < 200 KB, pass < 30 KB, web < 300 KB), OSV-Scanner, gitleaks, check de archivos sincronizados; actualizar `copilot-setup-steps.yml` | FE-01, SEC-80, REP-01 | FR-01 | 🏠 | Un import pesado en `pass` rompe CI |
| FR-03 | **`packages/ui`:** tokens desde `docs/brand/tokens.css` a Tailwind v4, fuentes auto-hospedadas (Atkinson Hyperlegible, Bricolage Grotesque, JetBrains Mono), componentes base con Radix (Button, Input, Field, Card, Badge) y **pantalla de estado de garita** (ADELANTE / NO PASA / SIN CONEXIÓN) | BRAND §4–5, NFR-05, FE-05 | FR-01 | ☁️ | Página `/_ui` en `web` muestra todo en claro y oscuro; axe sin violaciones |
| FR-04 | **`packages/i18n`:** FormatJS con catálogos `es-GT` y `en-US`, formato de fecha en la zona del residencial, regla ESLint que prohíbe texto literal en JSX | I18N-01…04 | FR-01 | ☁️ | Texto literal en JSX rompe lint |
| FR-05 | **`packages/api-client`:** `openapi-typescript` + `openapi-fetch` generados desde `openapi/openapi.json` al instalar (no se versionan, REP-07); token en memoria, refresh por cookie, mapeo del error API-03; mocks MSW generados del contrato | API-02, FE-02, REP-02, REP-03, REP-07 | FR-01 + PR de sincronización con BE-09 | 🏠 | Un cambio incompatible en `openapi.json` rompe `tsc` en CI |
| FR-06 | **Shell de `guard`:** PWA instalable (vite-plugin-pwa), shell offline, indicador de conexión, pantalla de inicio de 3 botones, Dexie inicializado, política de actualización OFF-09 | OFF-01, OFF-07, OFF-09, §8.1, WLK-01 | FR-03, FR-04 | 🏠 | Lighthouse PWA instalable; funciona con la red apagada |
| FR-07 | **Shell de `pass`:** página ultraliviana con estructura del pase, `noindex`, `Referrer-Policy: no-referrer`, lectura del token desde el fragmento | VIS-01, SEC-35 | FR-03 | ☁️ | < 30 KB JS; el token nunca aparece en peticiones como query |
| FR-08 | **Shell de `web`:** ruteo (TanStack Router), layout responsive residente/admin, pantallas vacías de login, selector de residencial | §8.2, §8.3 | FR-03, FR-04 | ☁️ | Navegable en 390 px y 1440 px |
| FR-09 🔒 | **Cabeceras de seguridad:** `_headers` de Cloudflare Pages por app con CSP estricta (nonce o hashes), Trusted Types, Permissions-Policy (cámara solo en `guard`), COOP | SEC-65, FE-02 | FR-06, FR-07, FR-08 | 🏠 | Prueba E2E verifica las cabeceras en el build |
| FR-10 | **E2E:** Playwright + `docker compose` con la imagen del backend desde GHCR + `make seed`; primer smoke test que llama al endpoint de ejemplo con el cliente generado; axe en cada página | REP-05, §13.1 | FR-05, BE-10, BE-12 | 🏠 | E2E verde en CI |
| FR-11 | **Previews:** proyectos de Cloudflare Pages por app (lo configuras tú en el panel; el agente deja comandos de build, `_redirects` y la guía en `docs/frontend/previews.md`) | §9.11 | FR-06…08 | ☁️ | Cada PR muestra 3 URLs de preview |

## M0b — Staging (repo `backend`, requiere cuentas AWS)

| ID | Issue | Requisitos | Depende de | Modo |
|---|---|---|---|---|
| INF-01 🔒 | Terraform base: estado remoto, cuentas `nonprod`/`prod`, OIDC GitHub → AWS (sin llaves de larga duración) | SEC-83, SEC-90 | M0a | 🏠 |
| INF-02 | Red y datos de staging: VPC, RDS PostgreSQL, ElastiCache Valkey, S3, KMS, Secrets Manager | §9.11, SEC-91 | INF-01 | 🏠 |
| INF-03 | Cómputo: ECS Fargate (`api`, `worker`, `scheduler`), ALB, migraciones como tarea previa al deploy | §9.11, CD-02 | INF-02 | 🏠 |
| INF-04 | Workflow de deploy a staging en cada merge + smoke tests + ZAP baseline | §13.2, SEC-85 | INF-03 | ☁️ |
| INF-05 | Cloudflare: DNS, WAF, Turnstile; previews del frontend apuntando a la API de staging | SEC-64 | INF-04, FR-11 | 🏠 |
