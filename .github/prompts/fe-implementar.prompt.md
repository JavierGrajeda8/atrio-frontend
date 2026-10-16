---
description: "[frontend] Implementa un issue siguiendo AGENTS.md y abre el PR"
agent: agent
argument-hint: "issue=#12"
---

Implementa el issue **${input:issue:#}** del repo **frontend** (carpeta `frontend` del workspace).

1. Lee el issue completo, `AGENTS.md`, las instrucciones de `.github/instructions/` que apliquen y las secciones de `docs/SPEC.md` de cada ID citado. Revisa `docs/DECISIONS.md` por decisiones relacionadas.
2. Si algo es ambiguo y no tiene default en `DECISIONS.md`, **detente** y propón el issue *Decisión requerida*; no adivines.
3. Comenta en el issue un plan de 5–10 líneas: archivos, endpoints o componentes, tablas, eventos, pruebas. Muéstramelo antes de seguir.
4. Crea la rama según `AGENTS.md` §1, implementa en pasos pequeños y escribe las pruebas junto con el código.
5. Corre los comandos de verificación de `AGENTS.md` (sección Comandos) hasta que estén en verde. No desactives nada para lograrlo.
6. Abre el PR con la plantilla completa, enlazando el issue (`Closes #N`) y marcando el estado de cada ID de requisito. Si toca código crítico, etiqueta `security-critical` y `needs-human-review`.
7. Termina con un resumen de 3–5 líneas: qué hiciste, qué quedó fuera y qué debería mirar con más cuidado el revisor.
