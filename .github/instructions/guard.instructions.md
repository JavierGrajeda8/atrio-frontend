---
applyTo: "apps/guard/**"
description: "Reglas de la app de garita: offline-first, UX de 3 botones, seguridad del dispositivo"
---

# App de garita (`apps/guard`)

La garita **nunca se detiene** (`SPEC.md` P3) y la usa un guardia con poca luz, prisa y un Android barato.

- UX: pantalla principal con 3 botones (Escanear QR · Ingresar código · Sin pase), objetivos ≥ 56 px, texto ≥ 18 px. Resultados a pantalla completa con color + ícono + palabra: ADELANTE (jade), NO PASA (achiote), VÁLIDO SIN CONEXIÓN (maíz). Vibración y sonido distintos.
- Offline: el shell funciona sin red (service worker); datos en IndexedDB con Dexie; eventos en cola con `client_event_id` y sincronización idempotente (OFF-01…10, FE-03). Toda funcionalidad nueva debe decir qué hace sin conexión.
- Indicador de conexión siempre visible: En línea / Sin conexión (hace N min) / Datos vencidos.
- Nunca recargar la app en medio de un turno por una actualización (OFF-09).
- Seguridad del dispositivo: clave no exportable (WebCrypto) para DPoP; PIN de turno; al revocar, borrar caché local. Caché mínimo según SEC-44: sin teléfonos ni documentos completos.
- Rendimiento: < 200 KB JS gz inicial; escaneo con `BarcodeDetector` y polyfill solo si no existe.
- Pruebas: todo flujo nuevo con un E2E que corra con `context.setOffline(true)` cuando aplique.
- Etiqueta `security-critical` en PRs que toquen escaneo, validación offline, almacenamiento local o DPoP.
