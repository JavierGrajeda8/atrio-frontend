-- COPIA de atrio-backend/dev/db/database.sql; ver e2e/README.md.
-- Acceso a la base de desarrollo (compose). Corre después de roles.sql, conectado a POSTGRES_DB.
ALTER DATABASE atrio OWNER TO atrio_migrator;
REVOKE CONNECT ON DATABASE atrio FROM PUBLIC;
GRANT CONNECT ON DATABASE atrio TO atrio_migrator, atrio_app, atrio_maintenance;
