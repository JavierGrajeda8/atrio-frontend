#!/usr/bin/env bash
# Falla si un PR modifica `docs/` u `openapi/` (copias del backend, REP-01) desde una rama que no
# sea `sync/backend`. `docs/SYNCED_FROM_BACKEND.md` es propio del frontend y se permite.
#
# Uso: scripts/guard-synced-files.sh <rama-del-pr> <referencia-base>
#   ej.: scripts/guard-synced-files.sh "$HEAD_REF" origin/main
set -euo pipefail

HEAD_REF="${1:?uso: guard-synced-files.sh <rama-del-pr> <referencia-base>}"
BASE="${2:?uso: guard-synced-files.sh <rama-del-pr> <referencia-base>}"

if [ "${HEAD_REF}" = "sync/backend" ]; then
  echo "PR de sincronización: permitido."
  exit 0
fi

changed=$(git diff --name-only "${BASE}...HEAD" -- docs openapi | grep -v '^docs/SYNCED_FROM_BACKEND.md$' || true)
if [ -n "${changed}" ]; then
  echo "::error::Estos archivos se editan en el repo backend y llegan por el PR de sincronización:"
  echo "${changed}"
  exit 1
fi
echo "Sin cambios en archivos sincronizados."
