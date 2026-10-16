---
name: Funcionalidad (para agente)
about: Una pieza implementable en un PR de menos de ~400 líneas
title: "[UI] ID — Descripción corta"
labels: ["type:feature"]
---

## Contexto
<!-- Por qué existe este issue. 2–3 líneas. ID del backlog si aplica (ej. FR-06). -->

## App o paquete
<!-- web · guard · pass · packages/ui · packages/i18n · packages/api-client · e2e -->

## Requisitos de SPEC.md
<!-- IDs exactos, ej.: ACC-07, OFF-04, WLK-13 -->
- 

## Criterios de aceptación
```gherkin
Escenario: ...
  Dado ...
  Cuando ...
  Entonces ...
```

## Sin conexión
<!-- Qué debe pasar sin red (obligatorio en guard y pass), o "no aplica". -->

## Diseño de referencia
<!-- Artboard del lienzo de marca, captura o descripción. -->

## Endpoints que usa
<!-- Deben existir en openapi/openapi.json. Si falta alguno: JavierGrajeda8/atrio-backend#N (needs-api). -->

## Fuera de alcance
- 

## Dependencias
<!-- Depende de #N / JavierGrajeda8/atrio-backend#N -->

## Definición de terminado
- [ ] Criterios de aceptación con pruebas
- [ ] `make lint typecheck test build size security` en verde (y `make e2e` si aplica)
- [ ] i18n, accesibilidad (axe) y 390 px
- [ ] Capturas en el PR (claro y oscuro)
