# E2E (FR-10a)

Pruebas de extremo a extremo con Playwright contra la **imagen real del backend** (REP-05): `docker compose` levanta PostgreSQL 17, aplica las migraciones, corre `python -m atrio.seed` (2 residenciales sintéticos) y arranca la API. Nada de mocks.

```sh
make e2e                       # imagen ghcr.io/javiergrajeda8/atrio-backend:main
E2E_BACKEND_IMAGE=atrio-backend:local make e2e   # una imagen propia (docker build en atrio-backend)
```

`make e2e` descarga la imagen (salvo que definas `E2E_BACKEND_IMAGE`), espera a que todo esté sano, comprueba que el seed creó los 2 residenciales, corre Playwright y **siempre** baja el entorno (`down --volumes`). Puerto de la API: `E2E_API_PORT` (8000 por defecto).

Requisitos: Docker en marcha. Si el paquete de GHCR no es público, antes: `docker login ghcr.io` con un token con permiso `read:packages`.

## Autenticación en las pruebas

Todavía no hay login (M1). Cada corrida genera un par de claves **Ed25519 efímero** (`support/gen-keys.mjs`, en un directorio temporal que se borra al terminar): la pública se configura en la API (`ATRIO_JWT_PUBLIC_KEY`) y la privada solo la leen las pruebas para firmar sus tokens (`support/jwt.ts`, `sub` = un usuario del seed, ids en `support/seed.ts`). Ninguna clave se versiona. Las pruebas usan el cliente generado `@atrio/api-client`, el mismo que usarán las apps.

## Archivos

| Archivo | Qué es |
|---|---|
| `docker-compose.yml` | PostgreSQL 17 → `migrate` → `seed` → `api` |
| `db/*.sql` | **Copia** de `atrio-backend/dev/db` (roles y dueño de la base; la imagen no los trae). Si el backend cambia los roles, actualízalos aquí |
| `tests/*.spec.ts` | Escenarios. Nombra cada prueba con el ID de la historia (`H2 — …`, SPEC §16) |
| `../scripts/e2e.sh` | Orquesta todo lo anterior |

Reglas de las pruebas: `.github/instructions/e2e.instructions.md`.
