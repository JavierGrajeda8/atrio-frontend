# ADR 0001 — Patrón de endpoint de tenant (plantilla)

- **Estado:** aceptada (BE-12, issue #24)
- **Requisitos:** AGENTS §1.6, §7 y §8; API-01, API-03, API-07; SEC-20, SEC-21, SEC-60; ARC-10
- **Implementación de referencia:** `GET/PATCH /api/v1/residentials/{residential_id}` en
  `src/atrio/modules/tenancy/http/router.py`, con pruebas en
  `tests/integration/test_residencial_endpoint.py`

Todo endpoint nuevo de un tenant **copia este patrón**. Si necesitas apartarte de él, abre un issue
*Decisión requerida*: no lo hagas en silencio.

## 1. Ruta y permiso

- La ruta cuelga de `/api/v1/residentials/{residential_id}/…` (API-01, SEC-20).
- Cada operación declara su permiso con `Depends(require("modulo.accion"))` (existe en
  `permissions.yaml`: un permiso inventado falla al importar). Lectura y escritura son permisos
  **distintos** (`residential.read` / `residential.manage`).
- `require` devuelve el `TenantScope`: la **sesión ya está dentro de la transacción RLS** del
  residencial y se confirma (o revierte) **antes** de enviar la respuesta. No abras otra sesión.
- Declara en `require(...)` solo los `scopes` y `conditions` que el endpoint **implementa**
  (ver `platform/tenancy/authorization.py`); lo demás no se concede.
- `make test-isolation` y `make test-authz` recorren las rutas registradas: tu endpoint aparece
  solo, y una ruta de tenant sin `require` hace fallar el CI.

## 2. Esquemas y errores (API-03)

- Entrada y salida son modelos Pydantic. La entrada de un PATCH usa `extra="forbid"` y todos los
  campos opcionales; `model_fields_set` distingue «no enviado» de `null`. Un cuerpo vacío es 422.
- Lo que el cliente **no puede** cambiar (`id`, `slug`, `type`, `status`…) no está en el esquema:
  enviarlo es 422, no se ignora en silencio.
- Errores: siempre `DomainError(CODIGO, status_code=…)` con un `code` estable en
  `platform/errors.py` y su mensaje `es-GT` + `en-US` en `platform/messages.py`. Nunca texto en el
  código del endpoint. Documenta los códigos posibles en `responses=` para el contrato OpenAPI.
- Un recurso de otro residencial o inexistente es **404 idéntico** (lo resuelve `tenant_context`;
  no lo reimplementes). Sin permiso: 403 `FORBIDDEN`.
- **Texto libre y PII:** la bitácora y el outbox rechazan PII (Q-38). Antes de escribir, valida el
  texto con `personal_data_fields(...)` y responde 422 con el **nombre** del campo
  (`type: "personal_data"`), jamás con el valor.

## 3. Actualización con concurrencia optimista (API-07)

Para configuración y cualquier dato que dos personas puedan editar a la vez:

1. `GET` devuelve la cabecera `ETag` (fuerte, de `platform/concurrency.py`: id + `updated_at`).
2. `PATCH` **exige** `If-Match`: sin cabecera → **428** `PRECONDITION_REQUIRED` (antes de tocar la
   base de datos); con una versión que ya no es la vigente → **412** `PRECONDITION_FAILED`. Solo
   se aceptan `ETag` fuertes; `*` y los débiles no valen.
3. La comparación se hace **después de bloquear la fila** (`SELECT … FOR UPDATE` con
   `populate_existing`): dos PATCH simultáneos con el mismo `If-Match` se serializan y el segundo
   recibe 412. Comparar antes de bloquear deja una ventana de carrera.
4. Cada actualización hace crecer `updated_at` estrictamente (`next_version`); el `ETag` de la
   respuesta sirve para el siguiente PATCH.
5. Un PATCH que no cambia nada responde 200 **sin** escribir, auditar ni emitir.

`Idempotency-Key` (API-05) es para los **POST que crean** recursos sensibles (visitas, accesos
manuales, sincronización offline). Un PATCH con `If-Match` ya es seguro de reintentar.

## 4. Un cambio de estado = fila + audit log + evento (ARC-10)

En la **misma transacción** y en este orden:

```python
residential.name = …                                   # 1. la fila de negocio
await scope.session.flush()
actor = audit.Actor.from_scope(scope)                  # la membresía cuyo permiso habilitó la acción
await audit.record(scope.session, audit.AuditEntry(…)) # 2. audit_logs (SEC-60)
await outbox.emit(scope.session, outbox.Event(…))      # 3. outbox_events (ARC-10)
```

- **Audit log:** `action` = `entidad.accion`; `old_value`/`new_value` con **solo los campos que
  cambiaron**, ids o valores enmascarados (nunca teléfonos, correos, documentos ni códigos); IP y
  user-agent con `platform/request_metadata.py`. Falla cerrada: si la guarda de PII o el registro
  fallan, la transacción entera se revierte.
- **Evento:** tipo `entidad.accion_en_pasado` del catálogo de SPEC §12.2 (agrega el tuyo ahí), con un
  `payload` mínimo (aquí, `changed_fields`). Los consumidores leen el detalle por la interfaz
  pública del módulo dueño.
- Si falla cualquiera de los tres pasos, no queda ninguno (hay una prueba por paso).

## 5. Contrato y pruebas

- Regenera `openapi/openapi.json` con `make openapi` en el mismo PR. Los `operationId` son el
  nombre de la función: `update_residential`, no cambies nombres existentes (sería un cambio
  incompatible, `breaking-api`). Documenta cabeceras de respuesta (`ETag`) y errores.
- Pruebas mínimas (AGENTS §8), todas contra PostgreSQL real: camino feliz con fila + auditoría +
  evento y cadena de hashes válida; 422 con `code` (y que no se devuelve el valor); rol sin permiso
  → 403; membresía no activa → 403; sin token → 401; otro residencial → 404 idéntico al de uno
  inexistente y sin rastro (ni auditoría ni evento) en el otro; concurrencia (incluida una prueba
  **determinista del bloqueo**, porque las carreras de red pueden no reproducirse); atomicidad (si
  falla el audit o el evento no queda nada); y una mutación de prueba de que cada pieza importa.

## Limitaciones conocidas

- La IP del cliente es la del socket; detrás del ALB/Cloudflare (M0b) habrá que configurar el
  proxy de confianza antes de leer `X-Forwarded-For`.
- `old_value` también pasa por la guarda de PII: un dato **antiguo** con forma de PII (anterior a
  la guarda) haría fallar la edición del campo (falla cerrada, 500). Todo dato nuevo entra validado
  con `personal_data_fields`; si aparece un caso real, se corrige el dato por migración.
