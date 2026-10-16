---
applyTo: "packages/ui/**"
description: "Reglas del design system de Atrio"
---

# Design system (`packages/ui`)

- Fuente de verdad visual: `docs/BRAND.md` y `docs/brand/tokens.css` (copias del backend; no editar ahí). Si un token falta, propónlo en el PR y en `docs/BRAND.md` vía issue al backend.
- Componentes consumen **tokens semánticos** (`--color-primary`, `--color-gate-granted-bg`…), nunca los de base ni hex.
- Claro y oscuro desde el día 1; contraste AA mínimo (AAA en pantallas de garita).
- Accesibles por defecto: primitivas de Radix para lo complejo (diálogos, menús, selects), foco visible, `aria-*` correctos.
- Cada componente nuevo aparece en la página `/_ui` de `apps/web` con sus variantes.
- Fuentes auto-hospedadas (Atkinson Hyperlegible, Bricolage Grotesque, JetBrains Mono), nunca desde Google Fonts en runtime.
