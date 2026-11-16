import { describe, expect, it } from "vitest";
import { IDLE_BEFORE_UPDATE_MS, canApplyUpdate } from "./policy";

const MIN = 60_000;
const ctx = (over: Partial<Parameters<typeof canApplyUpdate>[0]> = {}) => ({
  idleMs: 0,
  pendingEvents: 0,
  shiftStarting: false,
  ...over,
});

describe("canApplyUpdate (OFF-09)", () => {
  it("la inactividad requerida es de 5 minutos", () => {
    expect(IDLE_BEFORE_UPDATE_MS).toBe(5 * MIN);
  });

  it("con actividad reciente no se aplica", () => {
    for (const idleMs of [0, 1_000, 30_000, 4 * MIN, 5 * MIN - 1]) {
      expect(canApplyUpdate(ctx({ idleMs })), `${idleMs} ms`).toBe(false);
    }
  });

  it("tras 5 minutos de inactividad y sin eventos pendientes se aplica", () => {
    expect(canApplyUpdate(ctx({ idleMs: 5 * MIN }))).toBe(true);
    expect(canApplyUpdate(ctx({ idleMs: 60 * MIN }))).toBe(true);
  });

  it("con eventos pendientes no se aplica, por mucha inactividad que haya", () => {
    expect(canApplyUpdate(ctx({ idleMs: 60 * MIN, pendingEvents: 1 }))).toBe(false);
    expect(canApplyUpdate(ctx({ idleMs: 60 * MIN, pendingEvents: 3 }))).toBe(false);
  });

  it("al iniciar turno se aplica sin esperar la inactividad", () => {
    expect(canApplyUpdate(ctx({ shiftStarting: true }))).toBe(true);
  });

  it("ni siquiera al iniciar turno se aplica con eventos pendientes", () => {
    expect(canApplyUpdate(ctx({ shiftStarting: true, pendingEvents: 1 }))).toBe(false);
  });

  it("ante valores dudosos no se aplica (reloj atrasado, conteo no numérico)", () => {
    expect(canApplyUpdate(ctx({ idleMs: -10 * MIN }))).toBe(false);
    expect(canApplyUpdate(ctx({ idleMs: NaN }))).toBe(false);
    expect(canApplyUpdate(ctx({ idleMs: 60 * MIN, pendingEvents: NaN }))).toBe(false);
    expect(canApplyUpdate(ctx({ idleMs: 60 * MIN, pendingEvents: -1 }))).toBe(false);
  });
});
