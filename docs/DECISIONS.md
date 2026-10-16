# DECISIONS — Atrio

Este archivo **prevalece sobre `SPEC.md`** cuando hay conflicto. Tiene dos partes:

- **A. Decisiones de arquitectura (ADR):** ya tomadas. Cambiarlas requiere un ADR nuevo que la reemplace.
- **B. Preguntas abiertas de negocio:** cada una tiene un **default** que los agentes usan mientras el dueño del producto no decida. Cuando decidas, cambia el estado a ✅ y, si cambia el valor, ajusta el default.

---

## A. Decisiones de arquitectura

| ID | Decisión | Contexto y motivo | Consecuencias / alternativa |
|---|---|---|---|
| ADR-001 | **Monolito modular** (un despliegue, módulos con fronteras verificadas por import-linter) | Un solo dueño, agentes como equipo, dominio aún en descubrimiento. Los microservicios multiplican la superficie de ataque, el costo y la complejidad operativa | Se extrae un servicio solo con evidencia (SPEC §9.12). Primer candidato: `gate-api` como servicio separado con la **misma** imagen |
| ADR-002 | **Python 3.13 + FastAPI + SQLAlchemy 2 + Pydantic v2** | Requisito original; OpenAPI automático; ecosistema criptográfico maduro | Un segundo lenguaje (TypeScript) en frontend; se mitiga con cliente generado desde OpenAPI |
| ADR-003 | **PostgreSQL con RLS forzado** como cuarta capa de aislamiento multi-tenant, además de rutas, repositorios y FKs compuestas | Una fuga entre residenciales es el peor incidente posible | Cada tabla nueva requiere su política RLS (plantilla en `AGENTS.md`). Ligero costo de rendimiento, aceptable |
| ADR-004 | **El tenant va en la ruta**, no en el JWT | Un usuario tiene varias membresías; los roles cambian y deben surtir efecto de inmediato | Resolución de membresías por petición con caché ≤ 60 s invalidada por eventos |
| ADR-005 | **QR firmado (Ed25519) con clave por residencial**, en lugar de un id aleatorio que se busca en BD | Permite validar **offline** sin descargar todos los códigos, impide falsificación y limita el impacto de una clave comprometida a un residencial | Requiere gestión de claves (rotación, `kid`, revocación por lista). Clave privada con envelope encryption (una sola CMK: una CMK por residencial costaría ~US$1/mes cada una) |
| ADR-006 | **Dispositivos de garita enrolados + DPoP + PIN por guardia** | El dispositivo de garita es el activo más expuesto; trazabilidad por persona | Enrolamiento con step-up del admin; la PWA no puede atestiguar el hardware → Play Integrity cuando se envuelva con Capacitor (Fase 1.5) |
| ADR-007 | **Cola de trabajos sobre PostgreSQL (Procrastinate) + outbox transaccional**, detrás de una interfaz `TaskQueue` | Encolar en la misma transacción elimina inconsistencias; cero infraestructura extra | Migrar a SQS si se superan ~200 jobs/s sostenidos o si la cola compite con la carga OLTP |
| ADR-008 | **PWA primero; Capacitor en Fase 1.5**; nada de apps nativas reescritas | Un solo código, instalación sin tiendas, la página del pase no requiere app | Push en iOS exige PWA instalada (iOS 16.4+): se mitiga con guía de instalación y WhatsApp de respaldo para lo crítico |
| ADR-009 | **AWS us-east-1 (backups en us-east-2) + Cloudflare** | Madurez, precio, catálogo; Cloudflare da WAF, DDoS, Turnstile y previews por PR a bajo costo | Equivalencias GCP abajo, por si se prefiere. Región México de AWS: evaluar cuando haya clientes que la exijan |
| ADR-010 | **Autenticación propia** (OTP + WebAuthn + TOTP) con librerías auditadas, en lugar de un IdP gestionado | La cadena WhatsApp → SMS → email, las membresías multi-tenant y el costo por usuario activo no encajan bien en IdPs comerciales | Código sensible: cobertura alta, pentest dirigido a auth, sin criptografía casera. Reevaluar (Ory Kratos o Zitadel autohospedados) si el mantenimiento pesa |
| ADR-011 | **Dinero en enteros de unidades menores + ledger append-only** (Fase 2) | Exactitud y auditabilidad | Saldos = vista; correcciones solo por asientos |
| ADR-012 | **FEL por exportación primero**, integración directa después según demanda | La obligación depende de cada residencial; riesgo tributario y de credenciales | Ver SPEC PAY-20 |
| ADR-013 | **Audit log con cadena de hashes y anclas diarias en S3 Object Lock** | Evidencia verificable ante disputas y ante un admin o atacante con acceso a la BD | Verificación diaria; el rol de la app solo puede insertar |
| ADR-014 | **Español neutro con "tú" en el producto** | Expansión regional; el voseo queda para marketing en Guatemala | Catálogo `es-GT` puede sobreescribir textos puntuales |
| ADR-015 | **Entitlements y flags en BD** con interfaz compatible con OpenFeature | Simplicidad; los módulos son además parte del plan comercial | Migrable a Unleash/GrowthBook |
| ADR-016 | **Dos repositorios** (`backend`, `frontend`) unidos por un contrato OpenAPI que publica el backend; `docs/` vive en el backend y se sincroniza al frontend | Decisión del dueño del producto (repos ya creados). Separa permisos, CI y agentes por stack | Sin cambios atómicos entre repos: se compensa con contrato primero (REP-02), PRs de sincronización automáticos y E2E contra la imagen del backend (REP-05) |
| ADR-017 | **GitHub Copilot** como agente: modo agente en VS Code para cimientos y código crítico de seguridad; agente en la nube (asignar issue a Copilot) para issues rutinarios | Herramienta elegida por el dueño del producto; lee `AGENTS.md`, `.github/copilot-instructions.md`, `.github/instructions/`, `.github/agents/` y `.github/prompts/` | Revisión con un agente revisor en sesión separada (QA independiente). Reevaluar si el consumo o la calidad no alcanzan |

**Equivalencias si se elige GCP:** ECS Fargate → Cloud Run · RDS PostgreSQL → Cloud SQL for PostgreSQL · ElastiCache → Memorystore · S3 → Cloud Storage · KMS → Cloud KMS · Secrets Manager → Secret Manager · SES → proveedor externo de email · CloudWatch → Cloud Logging/Monitoring · Object Lock → Bucket Lock.

---

## B. Preguntas abiertas de negocio

Estados: ⏳ pendiente (los agentes usan el default) · ✅ confirmada.

| ID | Pregunta | Default que usan los agentes | Afecta | Estado |
|---|---|---|---|---|
| Q-01 | Nombre definitivo del producto | **Atrio** (elegido 2026-10-16); en tiendas de apps "Atrio Residencial". Pendiente: búsqueda y registro de marca mixta y dominio (ver `BRAND.md` 1.3) | Marca, dominios | ✅ |
| Q-02 | Vigencia máxima de un pase | 7 días | ACC-01, SEC-31 | ⏳ |
| Q-03 | ¿El Excel incluye `telefono_contacto` para enviar invitaciones automáticamente? | Sí, columna opcional; el envío lo dispara el admin; el teléfono se borra cuando la invitación se usa o vence | XLS-01, REG-02 | ⏳ |
| Q-04 | ¿El propietario aprueba directamente a sus inquilinos y familiares? | No: aprueba el admin (setting `auto_approve_owner_invites=false`) | REG-08 | ⏳ |
| Q-05 | ¿Los familiares pueden crear visitas? | Sí (configurable) | ACC-01 | ⏳ |
| Q-06 | ¿Registrar salidas en el MVP? | Sí, manual: lista "Dentro ahora" + "Registrar salida" (WLK-15). Alertas de permanencia en Fase 1.5 | WLK-15, §3 | ⏳ |
| Q-07 | ¿Mostrar el número de unidad en la página del visitante? | No (configurable) | SEC-35 | ⏳ |
| Q-08 | ¿A quién se le registra documento de identidad? | A las visitas **sin pase** (`access.id_capture = walk_ins`); el residencial puede exigirlo a todas (`all`) o apagarlo (`off`) | WLK-04, WLK-17 | ⏳ |
| Q-09 | Retención de datos | Teléfono del visitante: 30 días tras vencer la visita. Nombre en bitácora: seudonimizado a 24 meses. Audit log: 5 años. Residencial cerrado: 5 años datos financieros, 24 meses operativos. **Validar con abogado** | SEC-54, LIF-03 | ⏳ |
| Q-10 | Umbral de accesos manuales por garita y día | 10 | SEC-36 | ⏳ |
| Q-11 | Vigencia del paquete offline | 12 h (máximo configurable 24 h) | SEC-44 | ⏳ |
| Q-12 | ¿Plan gratuito permanente? | No. Piloto gratuito de 60 días + mínimo mensual de Q300 por residencial | §18 | ⏳ |
| Q-13 | Precio del plan *Acceso* | Q6 por unidad al mes | §18 | ⏳ |
| Q-14 | Residencial que no paga el servicio | Funciones administrativas limitadas; **la garita sigue funcionando 30 días** con avisos | LIF-06 | ⏳ |
| Q-15 | ¿La morosidad puede restringir visitas o ingreso? | **Nunca por defecto.** Solo reservas, si se configura (Fase 2–3). Consultar abogado antes de ofrecer más | PAY-36, RES-09 | ⏳ |
| Q-16 | Orden de aplicación de pagos | Cargo vencido más antiguo primero; dentro del período, recargos antes que capital | PAY-30 | ⏳ |
| Q-17 | Retención de datos financieros | ≥ 5 años (validar con contador) | PAY-43 | ⏳ |
| Q-18 | Encuestas: ¿voto por unidad o por persona? | Por unidad, emitido por el propietario | MSG-17 | ⏳ |
| Q-19 | ¿Una o varias monedas por residencial? | Una (GTQ por defecto, USD opcional) | PAY-15 | ⏳ |
| Q-20 | Región de la nube | AWS us-east-1 | ADR-009 | ⏳ |
| Q-21 | Tono: "tú" o "vos" | "Tú" en el producto; voseo en marketing en Guatemala | I18N-05 | ⏳ |
| Q-22 | Recuperación cuando el único admin no está disponible | Break-glass de soporte con acta de junta firmada; el nuevo admin configura MFA | LIF-02 | ⏳ |
| Q-23 | Países habilitados para OTP | Solo `+502` al inicio; otros países a solicitud del residencial | SEC-12 | ⏳ |
| Q-24 | ¿Cuentas de guardia por persona o genéricas por garita? | **Por persona**, en dispositivo compartido con PIN (trazabilidad) | SEC-42 | ⏳ |
| Q-25 | Vista consolidada para empresas administradoras de varios residenciales | Fase 2 (las membresías ya lo permiten) | §18 | ⏳ |
| Q-26 | ¿Cuándo habilitar la Fase 2? | Solo después de 2 semanas de piloto estable (M6) | §14 | ⏳ |
| Q-27 | ¿El sistema gestiona documentos físicos retenidos en garita ("deje su DPI")? | **No.** Registrar los datos reemplaza la retención. **Validar con abogado** si retener el DPI es lícito antes de ofrecer cualquier soporte | WLK-18 | ⏳ |
| Q-28 | Retención de identidades de visitantes | Número completo: 90 días desde la última visita. Nombre + índice ciego: 12 meses sin visitas. Fotos: 30 días. Restringidos: mientras dure la restricción. Validar con abogado | SEC-38, SEC-54 | ⏳ |
| Q-29 | ¿Fotos del documento o del visitante? | Apagadas por defecto; el admin puede activarlas (con step-up) | WLK-05 | ⏳ |
| Q-30 | ¿Los familiares pueden autorizar visitas sin pase? | Sí (configurable) | WLK-07 | ⏳ |
| Q-31 | Tiempos de escalamiento | WhatsApp a los 45 s, sugerir llamada a los 120 s, vencer a los 300 s | WLK-08 | ⏳ |
| Q-32 | ¿Teléfonos de contacto en el caché offline de la garita? | No por defecto; el admin puede activarlo (solo contacto principal) | WLK-21, SEC-44 | ⏳ |
| Q-33 | ¿La garita pasa de 2 a 3 botones principales? (desvío del requisito original) | Sí: Escanear QR · Ingresar código · Sin pase. El acceso manual se mueve dentro de "Sin pase" | WLK-01, §8.1 | ⏳ |
| Q-34 | ¿Lista de personas restringidas en el MVP? | Sí, solo la administra el admin, con step-up, categoría y nota obligatorias | WLK-16 | ⏳ |
| Q-35 | ¿Validar el DPI contra registros oficiales mediante un proveedor externo? | No en el MVP (cuesta por consulta y requiere fecha de nacimiento). Evaluar en Fase 2 como opción de pago por residencial | §6.5 | ⏳ |

---

## C. Registro de cambios

| Fecha | Cambio | Quién |
|---|---|---|
| 2026-10-08 | Versión inicial | Dueño del producto + Claude |
| 2026-10-08 | Visitas sin pase con registro de documento y autorización en vivo pasan de Fase 1.5 al MVP; Q-06 y Q-08 actualizadas; Q-27…Q-35 nuevas | Dueño del producto + Claude |
| 2026-10-16 | Nombre del producto: **Atrio** (reemplaza a Zaguán); código interno `atrio`, prefijo de token QR `AT1` | Dueño del producto |
| 2026-10-16 | Dos repositorios (ADR-016) y GitHub Copilot como agente (ADR-017); M0 dividido en M0a (local) y M0b (staging) | Dueño del producto + Claude |

