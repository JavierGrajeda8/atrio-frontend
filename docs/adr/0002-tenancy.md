# ADR 0002 — Tenancy: contexto de tenant, RLS y operaciones sin tenant

- **Estado:** aceptada (BE-05, issue #13)
- **Requisitos:** SEC-20, SEC-22, SEC-23, SEC-67, DAT-02, ARC-01, SPEC §9.6
- **Relacionada:** ADR-003 (RLS forzado), ADR-004 (el tenant va en la ruta)

## Contexto

Una fuga entre residenciales es el peor incidente posible (T10). El aislamiento tiene cuatro capas
(SEC-22): ruta con tenant, repositorios con filtro obligatorio, **RLS forzado** de PostgreSQL y FKs
compuestas. Esta ADR fija cómo se organiza el código de las capas 1–3 y qué excepciones existen,
porque RLS con política "solo mi tenant" deja sin camino a los flujos que arrancan **sin tenant**
(crear un residencial, listar mis membresías, canjear una invitación…).

## Decisión

### 1. Dónde vive cada pieza (ARC-01)

`platform` nunca importa módulos. `platform/tenancy` define el **contexto** y los **puertos**; los
módulos los implementan y `main.py` los inyecta al arrancar (`app.state`).

| Pieza | Vive en | Notas |
|---|---|---|
| `TenantContext`, sesión transaccional con `set_config`, `TenantRepository` | `platform/tenancy` | Sin conocer membresías ni usuarios |
| Puerto `Authenticator` (quién es el usuario de la petición) | define `platform/tenancy`; implementa `identity` | Mañana también autenticará dispositivos de garita (DPoP) |
| Puerto `MembershipResolver` (membresías del usuario en un residencial) | define `platform/tenancy`; implementa `modules/tenancy` | |
| Dependencia `tenant_context` | `platform/tenancy` | 404 / 403 según SEC-20 |
| Modelos, repositorios y routers de residenciales y membresías | `modules/tenancy` | |

### 2. Contexto transaccional

- Cada petición de tenant abre **una transacción** y fija, con `set_config(nombre, valor, true)`
  (equivale a `SET LOCAL`, admite parámetros y es compatible con pooling por transacción):
  1. `app.user_id` — para leer las propias membresías;
  2. `app.residential_id` — **solo después** de comprobar que el usuario tiene una membresía activa.
- `tenant_context` se declara con `scope="function"`: el `commit` o `rollback` ocurre **antes** de
  enviar la respuesta, de modo que un fallo al confirmar no se vea como éxito.
- Las políticas leen la variable con `NULLIF(current_setting('app.…', true), '')::uuid`. **Sin el
  `NULLIF`, el valor vacío que `SET LOCAL` deja en una conexión reutilizada al cerrar la
  transacción hace que el `::uuid` lance un error** (verificado en PostgreSQL 17) en lugar de
  devolver 0 filas. Con él, sin contexto o con contexto vacío no hay filas; con un valor que no
  es un UUID sigue habiendo error, que también cierra.

### 3. Políticas RLS

| Tabla | Política | Regla |
|---|---|---|
| `residentials` | `tenant_isolation` | `id` = `app.residential_id` (lectura y escritura) |
| `memberships` | `tenant_isolation` | `residential_id` = `app.residential_id` |
| `memberships` | `own_memberships` (solo `SELECT`) | `user_id` = `app.user_id`; permite resolver mis membresías antes de conocer el tenant |
| `users` | ninguna | Tabla global; solo se accede por el módulo `identity` |
| `audit_logs` | `tenant_read`, `tenant_append` | `residential_id` = `app.residential_id` (`SELECT` / `INSERT`); sin `UPDATE`/`DELETE` (SEC-62) |
| `audit_logs` | `platform_append` (solo `INSERT`) | `residential_id` nulo **y** sin `app.residential_id`: la cadena `platform` se escribe fuera de un tenant y `atrio_app` no la lee |
| `audit_logs` | `maintenance_read` (solo `SELECT`, `TO atrio_maintenance`) | `true`: el comando de verificación (`make audit-verify`, SEC-61) lee todas las cadenas; sin `INSERT`/`UPDATE`/`DELETE` (BE-07b) |
| `outbox_events` | `tenant_read`, `tenant_append` | `residential_id` = `app.residential_id` (`SELECT` / `INSERT`); `atrio_app` no actualiza ni borra (BE-08b) |
| `outbox_events` | `platform_append` (solo `INSERT`) | Igual que en `audit_logs`: eventos de plataforma (`residential_id` nulo) se emiten fuera de un tenant y `atrio_app` no los lee |
| `outbox_events` | `dispatcher_read` (`SELECT`), `dispatcher_publish` (`UPDATE`), ambas `TO atrio_maintenance` | `true`, con `UPDATE (published_at)` como **única** columna escribible: el dispatcher lee los eventos de todos los tenants y los marca publicados |
| `handler_executions` | ninguna | Tabla global `(handler, event_id)` solo con ids: marca de idempotencia de los handlers; `atrio_app` solo `SELECT`/`INSERT` |

`atrio_maintenance` solo tiene permisos de tabla donde un job global lo exige: lectura de
`audit_logs` (BE-07b) y, para el dispatcher (BE-08b), `outbox_events` más `SELECT, INSERT` sobre
`procrastinate_jobs` e `INSERT` sobre `procrastinate_events` (encolar en la misma transacción
con `procrastinate_defer_jobs_v1`). Nunca `UPDATE`/`DELETE` fuera de `published_at`.

Toda tabla con tenant sigue la plantilla de `.github/instructions/migraciones.instructions.md`
(con el `NULLIF`). `atrio_app` nunca es dueño ni tiene `BYPASSRLS` (SEC-23).

### 4. Operaciones sin tenant: lista cerrada

Cualquier operación nueva que deba leer o escribir fuera del tenant de la petición **requiere
modificar esta tabla**, declararse en `tests/isolation/exceptions.py` (ruta o tabla global) y
llevar una prueba propia; si no, `make test-isolation` falla. Prohibido: `BYPASSRLS`, desactivar
RLS, conectar con otro rol de la aplicación o usar un superusuario.

| Operación | Mecanismo | Se implementa |
|---|---|---|
| Crear residencial (EST-01) | **Contexto del id nuevo:** la aplicación genera el UUID, lo fija en `app.residential_id` y en la misma transacción inserta el residencial y la membresía del creador; la política `WITH CHECK` lo permite porque coincide | M1 |
| Listar mis membresías | Política `own_memberships` | Política: BE-05; endpoint: M1 |
| Detectar intento cross-tenant (SEC-67) | `atrio_lookup.residential_exists(uuid) → boolean` | BE-05 |
| Serializar y encadenar el audit log (SEC-61) | `atrio_audit.lock_chain(uuid) → (last_seq, last_hash)`: toma el lock de la cadena y devuelve su cabeza. Solo acepta la cadena del contexto actual (la de `app.residential_id`, o `platform` si no hay), así que ningún tenant lee la cabeza de otra cadena ni retiene su lock | BE-07 |
| Publicar eventos del outbox de todos los tenants (ARC-11) | **Rol `atrio_maintenance`** (credencial propia del proceso `python -m atrio.workers dispatcher`, no la de la API): políticas `dispatcher_*` y encolado en la misma transacción. Cada handler corre después con `atrio_app` y el `app.residential_id` del evento | BE-08b |
| Canjear invitación por `code_hash` | Función `SECURITY DEFINER` con el patrón de abajo | M1 (con su tabla) |
| Enrolar dispositivo de garita | ídem | M2 |
| Resolver el token de un pase | ídem | M2 |
| Webhooks de WhatsApp, Twilio y SES | ídem | M4 |

**Patrón de función `SECURITY DEFINER`** (obligatorio para cada una):

- Vive en un esquema propio de `atrio_definer` (`atrio_lookup` para consultas, `atrio_audit` para
  el audit log), que pertenece al rol `atrio_definer`, y la **posee** ese rol:
  `NOLOGIN`, sin `BYPASSRLS`, sin superusuario. Una función propiedad de `atrio_migrator` no sirve
  porque `FORCE ROW LEVEL SECURITY` también aplica al dueño de la tabla.
- `atrio_definer` solo recibe `SELECT` sobre las **columnas** estrictamente necesarias y una
  política `FOR SELECT TO atrio_definer` por tabla que explica por qué.
- `SET search_path = ''` y nombres totalmente calificados; `REVOKE EXECUTE … FROM PUBLIC` y
  `GRANT EXECUTE` solo a `atrio_app`.
- Devuelve lo mínimo (un booleano, un identificador), nunca filas completas ni datos personales, y
  lleva pruebas que verifican que no filtra más de lo declarado.
- La respuesta al cliente **no cambia** según el resultado: "no existe" y "es de otro tenant" dan
  el mismo 404.

### 5. Semántica de `tenant_context` (SEC-20)

1. Sin token válido → 401 (lo resuelve el `Authenticator`).
2. Sin **ninguna** membresía del usuario en ese residencial, en cualquier estado → **404**
   (`NOT_FOUND`, idéntico a un residencial inexistente). Si el residencial existe, se registra el
   intento cross-tenant (`SecurityEventSink`) sin alterar la respuesta.
3. Con membresías pero ninguna activa → **403** `MEMBERSHIP_NOT_ACTIVE`. Una membresía cuenta
   como activa si su estado es `active` y `valid_until` no ha vencido.
4. Los permisos son la **unión** de los roles de las membresías activas (ROL-03).

## Consecuencias

- Una función `SECURITY DEFINER` nueva exige tocar esta ADR: la lista cerrada es la defensa contra
  la erosión gradual del aislamiento.
- Los flujos sin tenant (crear residencial, canjear invitación…) no necesitan privilegios
  especiales salvo los de esta lista; el resto de la aplicación nunca los tiene.
- Hasta que BE-05b (#14) agregue la suite automática, el aislamiento se prueba con pruebas de
  integración contra PostgreSQL real, tabla por tabla.
- `users`, `sessions` y las demás tablas globales quedan fuera de RLS por diseño (§9.6.5).
- En AWS (M0b) los roles `atrio_*` y la pertenencia `atrio_definer` → `atrio_migrator` los crea
  Terraform; `dev/db/roles.sql` solo sirve para desarrollo y pruebas.
