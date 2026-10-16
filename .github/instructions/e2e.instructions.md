---
applyTo: "e2e/**"
description: "Reglas de las pruebas E2E con Playwright"
---

# E2E (Playwright)

- Corre contra la imagen real del backend (`docker compose` en `e2e/`, imagen de GHCR) con `make seed`; nada de mocks en E2E.
- Los escenarios siguen las historias de `SPEC.md` §16 (H1…H9); nombra cada prueba con el ID (`H2 — pase vencido muestra NO PASA`).
- Selectores por rol y nombre accesible (`getByRole`), no por clases ni `data-testid` salvo que no haya alternativa.
- axe en cada página visitada; cero violaciones.
- Escenarios offline con `context.setOffline(true)` para `guard` y `pass`.
- Sin `waitForTimeout` fijos: espera estados visibles.
