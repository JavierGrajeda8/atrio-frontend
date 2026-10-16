## Qué cambia
<!-- Resumen en 2–4 líneas. Cierra #issue -->

## App o paquete
<!-- web · guard · pass · packages/… · e2e -->

## Requisitos
| ID | Estado |
|---|---|
| ACC-07 | ✅ cumplido / 🟡 parcial (issue #) / ⛔ fuera de alcance |

## Cómo se probó
<!-- Pruebas agregadas, comandos corridos, links de preview. -->

## Capturas
<!-- Claro, oscuro y 390 px. En guard: también el estado sin conexión. -->

## Riesgos y notas para el revisor

## Checklist
- [ ] Solo endpoints y campos que existen en `openapi/openapi.json`
- [ ] Sin cambios en `docs/` ni `openapi/`
- [ ] Solo tokens de `packages/ui` (sin hex sueltos)
- [ ] Todo texto visible en `packages/i18n`
- [ ] Accesible: axe sin violaciones, foco visible, nada solo por color
- [ ] Sin tokens en `localStorage`/`sessionStorage`; sin `dangerouslySetInnerHTML`
- [ ] Sin documentos, OTP ni teléfonos completos en pantalla o logs
- [ ] `make size` dentro del presupuesto
- [ ] Comportamiento sin conexión probado (guard / pass)
- [ ] No se desactivó ni relajó ninguna prueba o escáner

## Dependencias nuevas (si hay)
| Paquete | Licencia | KB gz | Por qué | Alternativas |
|---|---|---|---|---|
