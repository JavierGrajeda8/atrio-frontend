# AGENTS.md — Atrio · frontend

Este repositorio contiene las tres apps web de Atrio (`web`: residente y admin; `guard`: garita offline-first; `pass`: página del visitante) y sus paquetes compartidos, en un monorepo pnpm. Se construye principalmente con GitHub Copilot bajo supervisión de un único dueño de producto. La API vive en el repositorio backend. Estas reglas aplican a todo agente y a todo PR.

## 1. Lo esencial (léelo siempre)

1. **Lee antes de escribir código:** `docs/SPEC.md` (las secciones de los IDs del issue), `docs/DECISIONS.md`, `docs/BRAND.md` y este archivo. Precedencia: `DECISIONS.md` > `SPEC.md` > issue > código existente.
2. **Un issue a la vez.** 1 issue = 1 rama = 1 PR. Rama: `feat/ACC-06-pantalla-validacion`, `fix/…`, `chore/…`.
3. **No inventes reglas de negocio.** Ante ambigüedad: (a) usa el default de `DECISIONS.md` §B; (b) si no existe, abre un issue con la plantilla *Decisión requerida* y continúa con lo demás. **Nunca asumas** en: seguridad, dinero, permisos, retención de datos o temas legales.
4. **Fase 1 solamente** (`SPEC.md` §3).
5. **Seguridad primero** (`SPEC.md` §5). Ante conflicto entre comodidad y seguridad, gana la seguridad.

## 2. Este repo y el backend

- `docs/` y `openapi/openapi.json` son **copias** que llegan desde el backend en PRs automáticos con la etiqueta `sync`. **No los edites aquí**: un check de CI rechaza el PR.
- **Contrato primero** (`SPEC.md` REP-02): un issue `[UI]` empieza cuando el endpoint ya está en `openapi/openapi.json`. Mientras tanto puedes avanzar con mocks MSW generados del contrato, nunca con endpoints imaginados.
- **Nunca inventes endpoints ni campos** (REP-03). Si falta algo, abre un issue `needs-api` en el repo backend con el caso de uso, la forma de datos que necesitas y el ID de requisito, y deja tu issue en `blocked`.
- Toda llamada a la API usa el cliente generado de `packages/api-client`.

## 3. Prohibido

- Desplegar a producción o pedir credenciales de producción.
- Commitear secretos, tokens o datos reales de personas.
- Desactivar, saltar o relajar pruebas, linters, presupuestos de bundle o escáneres de seguridad.
- Modificar `.github/workflows/` salvo que el issue lo pida explícitamente.
- Editar `docs/` u `openapi/` (ver §2).
- Agregar dependencias sin justificarlas en el PR (licencia, tamaño en el bundle, mantenimiento, alternativas). En `apps/pass` y `apps/guard` cada KB cuenta.
- Guardar tokens en `localStorage`/`sessionStorage`; usar `dangerouslySetInnerHTML` (salvo el renderizador Markdown sanitizado); usar `eval` o cargar scripts de terceros.
- Mostrar o registrar números de documento completos, OTP, tokens o teléfonos completos.

## 4. Roles en el pipeline

| Rol | Quién | Hace | No hace |
|---|---|---|---|
| Planificador | Agente `planificador-frontend` (`/fe-planificar`) | Convierte un milestone en issues pequeños de este repo | Escribir código |
| Constructor | Copilot: modo agente (`/fe-implementar`) o agente en la nube | Implementa issues `agent:ready` y abre PR con la plantilla | Aprobar su propio PR |
| Revisor | Agente `revisor-frontend` (`/fe-revisar-pr`), **sesión nueva** | Revisa el PR contra el issue, `SPEC.md`, `BRAND.md` y el checklist; agrega pruebas | Aprobar o fusionar |
| Dueño de producto | Humano | Decide `needs-decision`, aprueba merges | — |

## 5. Etiquetas

`agent:ready` · `agent:in-progress` · `needs-decision` · `needs-human-review` · `needs-api` · `blocked` · `security-critical` · `sync` · `type:feature` · `type:bug` · `type:chore`

Usa `security-critical` + `needs-human-review` en PRs que toquen autenticación, manejo de tokens, el escáner de QR, la validación offline, el almacenamiento local de `guard` o las cabeceras de seguridad.

## 6. Comandos (contrato del Makefile; FR-01 lo crea)

| Comando | Qué hace |
|---|---|
| `make setup` | `pnpm install` y hooks |
| `make dev` | Servidores de desarrollo de las 3 apps (API local del backend en `http://localhost:8000`) |
| `make test` | Vitest en todos los paquetes |
| `make lint` · `make typecheck` | ESLint · `tsc --noEmit` |
| `make build` | Build de producción de las 3 apps |
| `make size` | Presupuestos de bundle (guard < 200 KB, pass < 30 KB, web < 300 KB de JS gz inicial) |
| `make security` | OSV-Scanner, gitleaks |
| `make api-client` | Regenera `packages/api-client` desde `openapi/openapi.json` |
| `make e2e` | Playwright con la imagen del backend en `docker compose` (incluye escenarios offline) |

Antes de abrir un PR: `make lint typecheck test build size security` en verde, y `make e2e` si tocaste flujos. Si el Makefile todavía no existe, el issue que estás implementando es el que lo crea (FR-01).

## 7. Convenciones

- TypeScript `strict`; sin `any`.
- Componentes de `packages/ui`; colores, tipografía, espacios y radios **solo vía tokens** (nada de hex sueltos).
- **Todo texto visible** en los catálogos de `packages/i18n` (nada de literales en JSX); español neutro con "tú".
- Fechas y horas en la **zona horaria del residencial**, no la del dispositivo (I18N-03).
- Accesibilidad WCAG 2.2 AA: elementos nativos (`button`, `a`, `label`), Radix para lo complejo, foco visible, nunca solo color. En `guard`: objetivos ≥ 56 px, texto ≥ 18 px, resultados con ícono + palabra.
- Estado del servidor con TanStack Query; formularios con react-hook-form + zod.
- Reglas específicas por app en `.github/instructions/` (`guard`, `pass`).

## 8. Pruebas mínimas por funcionalidad

1. Componente o hook con Vitest + Testing Library (camino feliz y error de la API mapeado por `code`).
2. Estados de carga, vacío y error visibles.
3. Textos desde i18n.
4. E2E con Playwright para flujos críticos (`SPEC.md` §16), con axe.
5. En `guard`: el flujo sigue funcionando con `context.setOffline(true)` cuando aplique.

## 9. Commits y PRs

- Conventional Commits con ID: `feat(guard): pantalla de resultado de validación [ACC-07]`.
- PR < 400 líneas netas (sin contar código generado); si crece, divídelo.
- Plantilla de PR completa, con links de preview y capturas (claro, oscuro y 390 px).

## 10. Definición de terminado

- [ ] Criterios de aceptación cumplidos y demostrados con pruebas.
- [ ] `make lint typecheck test build size security` en verde (y `make e2e` si aplica).
- [ ] Solo endpoints que existen en `openapi/openapi.json`.
- [ ] Textos en i18n (es-GT completo).
- [ ] Accesible (axe sin violaciones) y usable a 390 px.
- [ ] Capturas en el PR.

## 11. Cuando te atasques

- Dos intentos fallidos con el mismo enfoque → detente, documenta lo intentado en el issue y etiqueta `blocked`.
- Falta un endpoint o campo → issue `needs-api` en el backend, no lo simules en producción.
- Si el issue contradice `SPEC.md`, `BRAND.md` o `DECISIONS.md` → `needs-decision`; no elijas tú.
