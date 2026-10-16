# Atrio · frontend — kit de arranque

Copia todo este contenido a la raíz del repo **frontend**. Aquí vivirán las apps `web` (residente y admin), `guard` (garita) y `pass` (página del visitante) en un monorepo pnpm.

| Archivo | Para qué sirve |
|---|---|
| `docs/` | **Copia** de la documentación del backend (SPEC, DECISIONS, BRAND, KICKOFF, backlog). Llega por PR automático; no editar aquí |
| `openapi/openapi.json` | **Copia** del contrato de API (llega cuando el backend lo publique, issue BE-09) |
| `AGENTS.md` | Reglas para Copilot en este repo |
| `.github/copilot-instructions.md` | Resumen de reglas que Copilot carga en cada conversación |
| `.github/instructions/` | Reglas por tipo de archivo: TypeScript/React, garita, página del pase, design system, E2E |
| `.github/agents/` | Agentes `planificador-frontend` y `revisor-frontend` |
| `.github/prompts/` | Comandos `/fe-planificar`, `/fe-implementar`, `/fe-revisar-pr`, `/fe-desatascar` |
| `.github/workflows/copilot-setup-steps.yml` | Entorno del agente de Copilot en la nube (Node, pnpm, Playwright) |
| `.github/workflows/guard-synced-files.yml` | Rechaza PRs que editen `docs/` u `openapi/` fuera de la sincronización |
| `.github/ISSUE_TEMPLATE/`, `.github/PULL_REQUEST_TEMPLATE.md` | Plantillas de issue y de PR |
| `.vscode/mcp.json` | Servidor MCP de GitHub para el chat |

**Siguiente paso:** `docs/KICKOFF.md`, sección 4 (se configura desde el repo backend).
