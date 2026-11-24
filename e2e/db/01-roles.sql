-- COPIA de atrio-backend/dev/db/roles.sql (la imagen del backend no trae los roles). Si el backend
-- cambia los roles, hay que actualizar este archivo; ver e2e/README.md.
-- Roles de la aplicación (SEC-23, SPEC §9.6). Idempotente: se puede ejecutar varias veces.
-- Solo desarrollo y pruebas (compose y suite de pruebas): en AWS los crea Terraform (M0b).
-- Las contraseñas son sintéticas y válidas únicamente en el entorno local.
--
--   atrio_migrator     dueño de las tablas; lo usan las migraciones
--   atrio_app          la API y los workers; ni dueño, ni BYPASSRLS
--   atrio_maintenance  jobs globales (verificación del audit log, dispatcher del outbox, retención);
--                      solo los permisos que enumera docs/adr/0002-tenancy.md §3
--                      (migraciones 0004 y 0006); el resto de jobs globales (M5) los decidirá aparte
--   atrio_definer      NOLOGIN; dueño de las funciones SECURITY DEFINER de docs/adr/0002-tenancy.md
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'atrio_migrator') THEN
    CREATE ROLE atrio_migrator LOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'atrio_app') THEN
    CREATE ROLE atrio_app LOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'atrio_maintenance') THEN
    CREATE ROLE atrio_maintenance LOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'atrio_definer') THEN
    CREATE ROLE atrio_definer NOLOGIN;
  END IF;
END
$$;

ALTER ROLE atrio_migrator PASSWORD 'atrio_dev_only' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
ALTER ROLE atrio_app PASSWORD 'atrio_dev_only' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
ALTER ROLE atrio_maintenance PASSWORD 'atrio_dev_only' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
ALTER ROLE atrio_definer NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;

-- Las migraciones crean el esquema y las funciones SECURITY DEFINER a nombre de atrio_definer
-- (SET ROLE). INHERIT FALSE: el migrador puede asumir el rol, pero no hereda sus privilegios ni
-- las políticas que lo nombran (si no, vería todas las filas del tenant sin contexto).
GRANT atrio_definer TO atrio_migrator WITH INHERIT FALSE, SET TRUE;
