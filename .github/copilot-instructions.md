# Atrio · frontend — instrucciones para Copilot

Las reglas completas están en **`AGENTS.md`** (raíz). Lo no negociable:

1. Antes de codificar lee `docs/SPEC.md` (secciones de los IDs del issue), `docs/DECISIONS.md`, `docs/BRAND.md` y `AGENTS.md`. Precedencia: DECISIONS > SPEC > issue > código.
2. 1 issue = 1 rama = 1 PR, con los IDs de requisito en el commit y el PR.
3. `docs/` y `openapi/` son copias del backend: **no los edites**. Usa solo endpoints que existan en `openapi/openapi.json`; si falta uno, abre un issue `needs-api` en el backend.
4. Colores, tipografía y espacios solo vía tokens de `packages/ui`; todo texto visible en `packages/i18n`; accesibilidad WCAG 2.2 AA.
5. Respeta los presupuestos de bundle (guard < 200 KB, pass < 30 KB, web < 300 KB). Nada de tokens en `localStorage`.
6. Nunca desactives pruebas, linters ni escáneres; nunca despliegues a producción.
7. Antes del PR: `make lint typecheck test build size security` en verde.
8. Responde y escribe en español; el código (identificadores) en inglés.
