# Matriz de permisos (generada)

> **No editar a mano.** Se genera desde [`permissions.yaml`](../permissions.yaml) con `make docs-permissions` (ROL-04). La matriz de producto con sus notas está en `SPEC.md` §4.2.

Leyenda: ✅ `all` todo el residencial · 🏠 `unit` su unidad · 🔸 `own` lo propio · ⚙ condición de dominio que el endpoint aplica · 🔒 exige step-up · — sin acceso. Los permisos marcados con † no están literalmente en la matriz de SPEC §4.2 y esperan confirmación.

## Roles

- **`admin`** — Control total de un residencial.
- **`resident`** — Usuario asociado a una o más unidades; el sub-rol (propietario, inquilino, familiar) vive en la asignación de unidad.
- **`guard`** — Usuario operativo asignado a garitas.

## Estructura

| Permiso | Acción | admin | resident | guard |
|---|---|---|---|---|
| `residential.read` † | Ver los datos básicos del residencial. | ✅ all | ✅ all | ✅ all |
| `residential.manage` | Configurar el residencial. | ✅ all | — | — |
| `structure.manage` | Gestionar sectores, unidades y garitas. | ✅ all | — | — |
| `units.import` | Importar el Excel de unidades. | ✅ all | — | — |

## Registro

| Permiso | Acción | admin | resident | guard |
|---|---|---|---|---|
| `invitations.manage` | Generar, exportar y revocar códigos de invitación. | ✅ all<br>🔒 step-up | — | — |
| `invitations.request` | Solicitar el alta de inquilinos y familiares en la propia unidad. | — | 🏠 unit<br>⚙ `owner_only` | — |
| `memberships.read` † | Ver las membresías del residencial. | ✅ all | — | — |
| `memberships.manage` | Aprobar, rechazar, suspender y desactivar residentes. | ✅ all | — | — |
| `guards.manage` | Gestionar guardias. | ✅ all<br>🔒 step-up | — | — |
| `devices.manage` | Enrolar y revocar dispositivos de garita. | ✅ all<br>🔒 step-up | — | — |
| `admin.transfer` | Transferir el rol de admin. | ✅ all<br>🔒 step-up | — | — |

## Accesos

| Permiso | Acción | admin | resident | guard |
|---|---|---|---|---|
| `visits.create` | Crear una visita. | ✅ all<br>⚙ `administrative_visits_only` | 🔸 own<br>⚙ `family_can_create_visits` | — |
| `visits.cancel` | Cancelar una visita. | ✅ all | 🔸 own | — |
| `visits.read` | Ver visitas. | ✅ all | 🔸 own | ✅ all<br>⚙ `assigned_gates_active_shift` |
| `access.validate` | Validar un QR o código y registrar salidas. | — | — | ✅ all<br>⚙ `enrolled_device_active_shift` |
| `access.walk_in` | Registrar una visita sin pase y solicitar autorización. | — | — | ✅ all<br>⚙ `enrolled_device_active_shift` |
| `access_requests.respond` | Responder una solicitud de ingreso a su unidad. | ✅ all<br>⚙ `addressed_to_administration` | 🏠 unit<br>⚙ `family_can_authorize` | — |
| `access.override` | Registrar un acceso manual de emergencia. | — | — | ✅ all<br>⚙ `manual_access_rules` |
| `identities.read` | Ver identidades de visitantes (enmascaradas). | ✅ all | — | ✅ all<br>⚙ `assigned_gates_active_shift` |
| `identities.reveal` | Revelar el número completo o la foto del documento. | ✅ all<br>🔒 step-up | — | — |
| `identities.restrict` | Restringir o quitar la restricción a una persona. | ✅ all<br>🔒 step-up | — | — |
| `access_logs.read` | Ver la bitácora de accesos. | ✅ all | 🔸 own | ✅ all<br>⚙ `assigned_gates_active_shift` |

## Comunicación

| Permiso | Acción | admin | resident | guard |
|---|---|---|---|---|
| `announcements.send` | Enviar un comunicado. | ✅ all | — | — |
| `announcements.read` | Leer comunicados. | ✅ all | ✅ all | ✅ all<br>⚙ `staff_announcements_only` |

## Dashboard

| Permiso | Acción | admin | resident | guard |
|---|---|---|---|---|
| `dashboard.read` | Ver el dashboard y las métricas del residencial. | ✅ all | — | — |

## Auditoría

| Permiso | Acción | admin | resident | guard |
|---|---|---|---|---|
| `audit.read` | Ver el audit log. | ✅ all | — | — |

## Condiciones

| Condición | Qué exige |
|---|---|
| `administrative_visits_only` | Solo visitas administrativas, sin unidad asociada (nota 3). |
| `family_can_create_visits` | Si el usuario es familiar en la unidad, exige `visits.family_can_create` (nota 4). |
| `family_can_authorize` | Si el usuario es familiar en la unidad, exige `access.family_can_authorize` (nota 20). |
| `owner_only` | Solo el propietario de la unidad (sub-rol `owner`) (nota 2). |
| `addressed_to_administration` | Solo solicitudes dirigidas a "Administración" (nota 3). |
| `assigned_gates_active_shift` | Solo garitas asignadas y turno en curso (nota 6). |
| `enrolled_device_active_shift` | Solo desde un dispositivo de garita enrolado y con turno iniciado (nota 7). |
| `manual_access_rules` | Justificación escrita, notificación inmediata y límite diario por garita (nota 8). |
| `staff_announcements_only` | Solo comunicados dirigidos al personal operativo (nota 11). |
