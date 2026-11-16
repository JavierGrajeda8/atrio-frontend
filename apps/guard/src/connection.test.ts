import { describe, expect, it } from "vitest";
import { OFFLINE_DATA_MAX_AGE_HOURS, connectionState } from "./connection";

const NOW = Date.parse("2026-11-16T20:00:00.000Z");
const ago = (minutes: number): string => new Date(NOW - minutes * 60_000).toISOString();
const HOURS = 60;

describe("connectionState (OFF-07)", () => {
  it("la vigencia por defecto es de 12 h (DECISIONS Q-11)", () => {
    expect(OFFLINE_DATA_MAX_AGE_HOURS).toBe(12);
  });

  it("con red está en línea, sin importar lastSync", () => {
    for (const lastSync of [null, ago(5), ago(48 * HOURS), "basura"]) {
      expect(connectionState({ online: true, lastSync, now: NOW })).toEqual({ kind: "online" });
    }
  });

  it("sin red y con datos vigentes: sin conexión con la edad en minutos", () => {
    expect(connectionState({ online: false, lastSync: ago(12), now: NOW })).toEqual({
      kind: "offline",
      ageMinutes: 12,
    });
    expect(connectionState({ online: false, lastSync: ago(0), now: NOW })).toEqual({
      kind: "offline",
      ageMinutes: 0,
    });
  });

  it("la edad se redondea hacia abajo", () => {
    const lastSync = new Date(NOW - 90_000).toISOString(); // 1 min 30 s
    expect(connectionState({ online: false, lastSync, now: NOW })).toMatchObject({ ageMinutes: 1 });
  });

  it("vence a las 12 h: 11 h 59 min sigue vigente y 12 h exactas ya vencieron", () => {
    expect(connectionState({ online: false, lastSync: ago(12 * HOURS - 1), now: NOW })).toEqual({
      kind: "offline",
      ageMinutes: 12 * HOURS - 1,
    });
    expect(connectionState({ online: false, lastSync: ago(12 * HOURS), now: NOW })).toEqual({
      kind: "expired",
    });
    expect(connectionState({ online: false, lastSync: ago(30 * HOURS), now: NOW })).toEqual({
      kind: "expired",
    });
  });

  it("respeta una vigencia distinta (configurable hasta 24 h)", () => {
    const input = { online: false, lastSync: ago(20 * HOURS), now: NOW };
    expect(connectionState(input).kind).toBe("expired");
    expect(connectionState({ ...input, maxAgeHours: 24 }).kind).toBe("offline");
  });

  it("sin red y sin sincronización válida: vencido (no hay paquete offline)", () => {
    expect(connectionState({ online: false, lastSync: null, now: NOW })).toEqual({
      kind: "expired",
    });
    expect(connectionState({ online: false, lastSync: "no es fecha", now: NOW })).toEqual({
      kind: "expired",
    });
  });

  it("si el reloj retrocedió respecto de lastSync no se confía en la edad: vencido (SEC-44)", () => {
    const future = new Date(NOW + 60_000).toISOString();
    expect(connectionState({ online: false, lastSync: future, now: NOW })).toEqual({
      kind: "expired",
    });
  });
});
