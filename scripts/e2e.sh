#!/usr/bin/env bash
# `make e2e` (REP-05, SPEC §13.1): levanta la imagen real del backend con PostgreSQL 17, migraciones
# y datos sintéticos (docker compose), corre Playwright y siempre baja el entorno al terminar.
#
# E2E_BACKEND_IMAGE  imagen del backend (por defecto ghcr.io/javiergrajeda8/atrio-backend:main).
#                    Si la defines (p. ej. una imagen construida en local), no se descarga nada.
# E2E_API_PORT       puerto local de la API (por defecto 8000).
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
compose=(docker compose -f e2e/docker-compose.yml)
export E2E_API_PORT="${E2E_API_PORT:-8000}"

command -v docker >/dev/null || { echo "Falta docker: make e2e levanta el backend con docker compose." >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo "El daemon de Docker no está corriendo." >&2; exit 1; }

cleanup() {
  status=$?
  if [ "${status}" -ne 0 ]; then "${compose[@]}" logs --no-color --tail 60 >&2 || true; fi
  "${compose[@]}" down --volumes --remove-orphans >/dev/null 2>&1 || true
  exit "${status}"
}
trap cleanup EXIT

if [ -z "${E2E_BACKEND_IMAGE:-}" ]; then
  # `:main` cambia con cada merge del backend: siempre la última.
  "${compose[@]}" pull --quiet api || {
    echo "No se pudo descargar ghcr.io/javiergrajeda8/atrio-backend:main." >&2
    echo "Si el paquete no es público: docker login ghcr.io con un token con permiso read:packages," >&2
    echo "o define E2E_BACKEND_IMAGE con una imagen local (docker build en atrio-backend)." >&2
    exit 1
  }
fi

# Entorno limpio: sin restos de una corrida anterior.
"${compose[@]}" down --volumes --remove-orphans >/dev/null 2>&1 || true
# `--wait` falla si PostgreSQL no queda sano, si `migrate` o `seed` terminan con error o si la
# API no responde /healthz.
"${compose[@]}" up --detach --wait

# El seed corrió como atrio_app con RLS; el superusuario del contenedor de PostgreSQL lo comprueba.
residentials="$("${compose[@]}" exec -T postgres psql -U atrio -d atrio -tA -c 'SELECT count(*) FROM residentials')"
[ "${residentials}" = "2" ] || { echo "El seed debía crear 2 residenciales y hay ${residentials}." >&2; exit 1; }
echo "Entorno E2E listo: 2 residenciales sembrados."

pnpm --filter @atrio/e2e exec playwright test
