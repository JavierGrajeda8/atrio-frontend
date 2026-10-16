---
applyTo: "apps/pass/**"
description: "Reglas de la página del pase del visitante: ultraliviana y privada"
---

# Página del pase (`apps/pass`)

La abre un visitante sin cuenta, desde WhatsApp, con mala señal.

- Presupuesto: < 30 KB de JS gz. Preact o TypeScript sin framework; nada de React, librerías de UI ni de fechas pesadas.
- El token del pase viene en el **fragmento** de la URL (`#…`) y se canjea con `POST`; nunca lo pongas en query, logs ni analítica (SEC-35).
- `noindex`, `Referrer-Policy: no-referrer`, sin scripts de terceros ni fuentes externas (auto-hospedadas y subconjunto mínimo).
- Muestra solo: residencial, dirección con "Cómo llegar", nombre del visitante, vigencia, QR, código y estado. Nunca el nombre del residente ni la unidad salvo configuración explícita.
- Pase vencido o cancelado: sin QR, solo el estado.
- Tras la primera carga, debe poder mostrarse sin conexión (VIS-02).
- Pie con "Pase generado con Atrio" (VIS-04).
