import type { Transaction } from "dexie";

/**
 * Esquema de la base local de la garita (IndexedDB vía Dexie).
 *
 * Es almacenamiento en el dispositivo: SOLO metadatos. Prohibido guardar aquí PII, tokens,
 * documentos o teléfonos (SPEC SEC-44). Cada tabla nueva de un milestone posterior pasa por
 * revisión de seguridad.
 */
export const DB_NAME = "atrio-guard";

/** Claves permitidas en `meta`. Agregar una exige revisar que no sea un dato sensible. */
export type MetaKey = "lastSync";

export interface MetaValues {
  /** Instante de la última sincronización, ISO 8601 en UTC; `null` si nunca sincronizó. */
  lastSync: string | null;
}

export interface MetaRecord<K extends MetaKey = MetaKey> {
  key: K;
  value: MetaValues[K];
}

export interface SchemaVersion {
  version: number;
  /** Solo las tablas que cambian respecto de la versión anterior (semántica de Dexie). */
  stores: Record<string, string | null>;
  upgrade?: (transaction: Transaction) => void | Promise<void>;
}

/**
 * Versiones del esquema, en orden. Una versión nueva se AGREGA al final: nunca se edita ni se
 * borra una anterior, y `meta` debe sobrevivir a toda migración (lo verifica una prueba).
 */
export const SCHEMA_VERSIONS: readonly SchemaVersion[] = [{ version: 1, stores: { meta: "key" } }];

export const SCHEMA_VERSION: number = SCHEMA_VERSIONS[SCHEMA_VERSIONS.length - 1]?.version ?? 0;

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

export function isIsoUtc(value: unknown): value is string {
  return typeof value === "string" && ISO_UTC.test(value) && !Number.isNaN(Date.parse(value));
}

/** Un registro de `meta` es válido solo con una clave permitida y un valor de su forma exacta. */
export function isMetaRecord(record: unknown): record is MetaRecord {
  if (typeof record !== "object" || record === null) return false;
  const { key, value, ...rest } = record as Record<string, unknown>;
  if (Object.keys(rest).length > 0) return false;
  return key === "lastSync" && (value === null || isIsoUtc(value));
}
