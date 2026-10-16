---
description: "[frontend] Propone salidas para un issue bloqueado"
agent: agent
argument-hint: "issue=#12"
---

El issue **${input:issue:#}** del repo **frontend** está bloqueado. Lee su historial completo (comentarios, PRs y commits relacionados), `AGENTS.md` y las secciones de `docs/SPEC.md` citadas.

Entrega:
1. La causa raíz probable, en 2–3 líneas.
2. **Dos enfoques alternativos** con sus trade-offs (complejidad, riesgo, impacto en el resto del plan).
3. Tu recomendación y si conviene dividir el issue.

**No implementes nada** hasta que yo elija.
