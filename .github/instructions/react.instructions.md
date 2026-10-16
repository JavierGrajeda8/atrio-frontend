---
applyTo: "**/*.ts,**/*.tsx"
description: "Convenciones TypeScript/React del frontend de Atrio"
---

# TypeScript y React

- TypeScript `strict`, sin `any` ni `@ts-ignore` (si es inevitable, `@ts-expect-error` con comentario).
- Componentes de función; estado del servidor con TanStack Query; formularios con react-hook-form + zod; ruteo con TanStack Router (en `web`).
- API: solo con el cliente de `packages/api-client`. Si el endpoint o el campo no existe en `openapi/openapi.json`, **detente**: issue `needs-api` en el backend.
- Errores de la API: decide por `error.code`, nunca por el texto del mensaje; muestra el mensaje localizado.
- Estilos: clases de Tailwind basadas en los tokens de `packages/ui`. Nunca hex, px de color o fuentes sueltas.
- Texto visible: siempre desde `packages/i18n` (`<FormattedMessage>` / `useIntl`). Fechas con la zona horaria del residencial.
- Accesibilidad: `button` para acciones, `a` para navegación, `label` asociado a cada `input`, `aria-label` en botones de solo ícono, foco visible, nada que dependa solo del color.
- Seguridad: tokens de acceso solo en memoria; nada de `localStorage`/`sessionStorage` para credenciales; nada de `dangerouslySetInnerHTML`, `eval` ni scripts de terceros.
- Importa solo lo necesario (nada de librerías completas por una función); revisa el impacto en `make size`.
