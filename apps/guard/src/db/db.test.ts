import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuardDb, createGuardDb, getLastSync, initGuardDb, setLastSync } from "./db";
import { DB_NAME, SCHEMA_VERSION, SCHEMA_VERSIONS } from "./schema";
import type { SchemaVersion } from "./schema";

const opened: GuardDb[] = [];

function freshDb(versions?: readonly SchemaVersion[], name = `test-${crypto.randomUUID()}`) {
  const db = createGuardDb(name, versions);
  opened.push(db);
  return db;
}

afterEach(async () => {
  for (const db of opened.splice(0)) await db.delete();
});

// Todo lo que hay guardado, tabla por tabla.
async function dump(db: GuardDb): Promise<Record<string, unknown[]>> {
  return Object.fromEntries(
    await Promise.all(db.tables.map(async (t) => [t.name, await t.toArray()])),
  );
}

describe("inicialización (SPEC §8.1)", () => {
  it("abre con la versión de esquema y la tabla meta con lastSync = null", async () => {
    const db = await initGuardDb(freshDb());
    expect(db.isOpen()).toBe(true);
    expect(db.verno).toBe(SCHEMA_VERSION);
    expect(db.tables.map((table) => table.name)).toEqual(["meta"]);
    expect(await db.meta.toArray()).toEqual([{ key: "lastSync", value: null }]);
    expect(await getLastSync(db)).toBeNull();
  });

  it("es idempotente: abrir de nuevo no pisa una sincronización ya guardada", async () => {
    const db = freshDb();
    await initGuardDb(db);
    await setLastSync(new Date("2026-11-16T20:04:00.000Z"), db);
    await initGuardDb(db);
    expect(await getLastSync(db)).toBe("2026-11-16T20:04:00.000Z");
  });

  it("lo guardado sobrevive a cerrar y volver a abrir la base", async () => {
    const name = `test-${crypto.randomUUID()}`;
    const first = freshDb(undefined, name);
    await initGuardDb(first);
    await setLastSync(new Date("2026-11-16T20:04:00.000Z"), first);
    first.close();

    const second = await initGuardDb(freshDb(undefined, name));
    expect(await getLastSync(second)).toBe("2026-11-16T20:04:00.000Z");
  });

  it("el nombre de la base es el de la garita y no usa la red", async () => {
    expect(DB_NAME).toBe("atrio-guard");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const db = await initGuardDb(freshDb());
    await setLastSync(new Date(), db);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe("sin datos sensibles", () => {
  it("lastSync se guarda en UTC y es lo único que hay en toda la base", async () => {
    const db = await initGuardDb(freshDb());
    // Un instante con zona horaria distinta de UTC se normaliza a UTC.
    await setLastSync(new Date("2026-11-16T14:04:00-06:00"), db);
    expect(await dump(db)).toEqual({
      meta: [{ key: "lastSync", value: "2026-11-16T20:04:00.000Z" }],
    });
  });

  it.each([
    ["una clave que no está permitida (teléfono)", { key: "phone", value: "5555-1234" }],
    ["una clave de token", { key: "accessToken", value: "eyJhbGciOi" }],
    ["un documento como valor de lastSync", { key: "lastSync", value: "2456789012345" }],
    ["un correo como valor de lastSync", { key: "lastSync", value: "juan@correo.com" }],
    ["un objeto como valor", { key: "lastSync", value: { name: "Juan Pérez" } }],
    ["una fecha sin zona (no es UTC)", { key: "lastSync", value: "2026-11-16T14:04:00" }],
    ["un campo extra en el registro", { key: "lastSync", value: null, phone: "55551234" }],
  ])("rechaza escribir %s", async (_label, record) => {
    const db = await initGuardDb(freshDb());
    await expect(db.meta.put(record as never)).rejects.toThrow(TypeError);
    expect(await db.meta.toArray()).toEqual([{ key: "lastSync", value: null }]);
  });

  it("rechaza también las actualizaciones y deja intacto lo guardado", async () => {
    const db = await initGuardDb(freshDb());
    await setLastSync(new Date("2026-11-16T20:04:00.000Z"), db);
    await expect(db.meta.update("lastSync", { value: "juan@correo.com" })).rejects.toThrow(
      TypeError,
    );
    await expect(db.meta.update("lastSync", { phone: "55551234" } as never)).rejects.toThrow(
      TypeError,
    );
    expect(await getLastSync(db)).toBe("2026-11-16T20:04:00.000Z");
  });

  it("el error no repite el valor rechazado, para que no llegue a un log", async () => {
    const db = await initGuardDb(freshDb());
    const secret = "2456789012345";
    const error: unknown = await db.meta.put({ key: "lastSync", value: secret } as never).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(TypeError);
    const { message, stack } = error as TypeError;
    expect(message).not.toContain(secret);
    expect(stack).not.toContain(secret);
  });

  it("setLastSync rechaza una fecha inválida en vez de guardar basura", async () => {
    const db = await initGuardDb(freshDb());
    await expect(setLastSync(new Date("no es fecha"), db)).rejects.toThrow(RangeError);
    expect(await getLastSync(db)).toBeNull();
  });

  it("no hay ninguna secuencia larga de dígitos (documento o teléfono) en lo guardado", async () => {
    const db = await initGuardDb(freshDb());
    await setLastSync(new Date(), db);
    expect(JSON.stringify(await dump(db))).not.toMatch(/\d{8,}/);
  });
});

describe("migración de esquema", () => {
  const v1: SchemaVersion = { version: 1, stores: { meta: "key" } };
  const v2 = (upgrade?: SchemaVersion["upgrade"]): SchemaVersion => ({
    version: 2,
    stores: { probe: "++id" },
    ...(upgrade ? { upgrade } : {}),
  });

  it("una versión nueva migra sin perder meta", async () => {
    const name = `test-${crypto.randomUUID()}`;
    const old = freshDb([v1], name);
    await initGuardDb(old);
    await setLastSync(new Date("2026-11-16T20:04:00.000Z"), old);
    old.close();

    const upgrade = vi.fn();
    const migrated = await initGuardDb(freshDb([v1, v2(upgrade)], name));
    expect(migrated.verno).toBe(2);
    expect(upgrade).toHaveBeenCalledTimes(1);
    expect(migrated.tables.map((table) => table.name).sort()).toEqual(["meta", "probe"]);
    expect(await getLastSync(migrated)).toBe("2026-11-16T20:04:00.000Z");
  });

  it("sigue protegiendo meta después de migrar", async () => {
    const name = `test-${crypto.randomUUID()}`;
    freshDb([v1], name);
    const migrated = await initGuardDb(freshDb([v1, v2()], name));
    await expect(migrated.meta.put({ key: "phone", value: "5555" } as never)).rejects.toThrow(
      TypeError,
    );
  });

  it("las versiones declaradas son consecutivas desde 1 y meta nunca desaparece ni cambia de clave", async () => {
    expect(SCHEMA_VERSIONS.map((entry) => entry.version)).toEqual(
      SCHEMA_VERSIONS.map((_entry, index) => index + 1),
    );
    const db = await initGuardDb(freshDb());
    expect(db.meta.schema.primKey.name).toBe("key");
    for (const entry of SCHEMA_VERSIONS) {
      expect(entry.stores["meta"], `v${entry.version} no debe borrar meta`).not.toBeNull();
    }
  });
});
