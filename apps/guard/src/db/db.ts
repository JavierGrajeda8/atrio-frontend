import Dexie from "dexie";
import type { Table } from "dexie";
import {
  DB_NAME,
  SCHEMA_VERSIONS,
  isIsoUtc,
  isMetaRecord,
  type MetaKey,
  type MetaRecord,
  type SchemaVersion,
} from "./schema";

export class GuardDb extends Dexie {
  meta!: Table<MetaRecord, MetaKey>;
}

// No incluye el valor rechazado en el mensaje: un dato sensible no debe terminar en un log.
const REJECTED = "meta: registro no permitido en el almacenamiento local de la garita";

export function createGuardDb(
  name: string = DB_NAME,
  versions: readonly SchemaVersion[] = SCHEMA_VERSIONS,
): GuardDb {
  const db = new GuardDb(name);
  for (const { version, stores, upgrade } of versions) {
    const declared = db.version(version).stores(stores);
    if (upgrade) declared.upgrade(upgrade);
  }

  // Punto único de control: nada que no sea una clave permitida con su forma exacta se persiste,
  // sea cual sea el código que escriba (SEC-44: sin PII, tokens ni documentos).
  db.meta.hook("creating", (_key, record) => {
    if (!isMetaRecord(record)) throw new TypeError(REJECTED);
  });
  db.meta.hook("updating", (changes, _key, record) => {
    if (!isMetaRecord({ ...record, ...changes })) throw new TypeError(REJECTED);
  });
  return db;
}

let shared: GuardDb | undefined;

export function getGuardDb(): GuardDb {
  return (shared ??= createGuardDb());
}

/**
 * Abre la base local y deja `meta.lastSync` creado (`null` = nunca sincronizó). Es idempotente y
 * no necesita red.
 */
export async function initGuardDb(db: GuardDb = getGuardDb()): Promise<GuardDb> {
  await db.open();
  await db.transaction("rw", db.meta, async () => {
    if ((await db.meta.get("lastSync")) === undefined) {
      await db.meta.put({ key: "lastSync", value: null });
    }
  });
  return db;
}

/** Devuelve la última sincronización; un valor ilegible cuenta como "nunca" y fuerza resincronizar. */
export async function getLastSync(db: GuardDb = getGuardDb()): Promise<string | null> {
  const value = (await db.meta.get("lastSync"))?.value;
  return isIsoUtc(value) ? value : null;
}

export async function setLastSync(at: Date, db: GuardDb = getGuardDb()): Promise<void> {
  // `toISOString` siempre produce UTC y lanza RangeError ante una fecha inválida.
  await db.meta.put({ key: "lastSync", value: at.toISOString() });
}
