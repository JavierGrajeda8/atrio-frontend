import { describe, expect, it, vi } from "vitest";
import { createUpdateCoordinator } from "./coordinator";
import type { UpdateHooks } from "./policy";

const MIN = 60_000;

function setup(hooks?: Partial<UpdateHooks>) {
  let clock = 1_000_000;
  const apply = vi.fn(() => Promise.resolve());
  const coordinator = createUpdateCoordinator({
    apply,
    now: () => clock,
    hooks: { pendingEvents: () => 0, shiftStarting: () => false, ...hooks },
  });
  return {
    apply,
    coordinator,
    advance(ms: number) {
      clock += ms;
    },
  };
}

describe("coordinador de actualizaciones (OFF-09)", () => {
  it("no hace nada si no hay una versión nueva esperando", async () => {
    const { coordinator, apply, advance } = setup();
    advance(60 * MIN);
    expect(await coordinator.check()).toBe(false);
    expect(apply).not.toHaveBeenCalled();
  });

  it("no actualiza en medio de un turno: con actividad reciente no se aplica", async () => {
    const { coordinator, apply, advance } = setup();
    coordinator.notifyUpdateAvailable();
    for (let minute = 0; minute < 5; minute++) {
      expect(await coordinator.check()).toBe(false);
      advance(MIN - 1_000);
    }
    expect(apply).not.toHaveBeenCalled();
  });

  it("se aplica tras 5 minutos de inactividad", async () => {
    const { coordinator, apply, advance } = setup();
    coordinator.notifyUpdateAvailable();
    advance(5 * MIN - 1);
    expect(await coordinator.check()).toBe(false);
    advance(1);
    expect(await coordinator.check()).toBe(true);
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("cada actividad reinicia la cuenta de los 5 minutos", async () => {
    const { coordinator, apply, advance } = setup();
    coordinator.notifyUpdateAvailable();
    advance(4 * MIN + 59_000);
    coordinator.markActivity();
    advance(5 * MIN - 1_000);
    expect(await coordinator.check()).toBe(false);
    advance(1_000);
    expect(await coordinator.check()).toBe(true);
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("la actividad antes de que llegue la versión también cuenta", async () => {
    const { coordinator, apply, advance } = setup();
    advance(10 * MIN);
    coordinator.markActivity();
    coordinator.notifyUpdateAvailable();
    advance(MIN);
    expect(await coordinator.check()).toBe(false);
    expect(apply).not.toHaveBeenCalled();
  });

  it("con eventos pendientes no se aplica; cuando se sincronizan, sí", async () => {
    let pending = 2;
    const { coordinator, apply, advance } = setup({ pendingEvents: () => pending });
    coordinator.notifyUpdateAvailable();
    advance(60 * MIN);
    expect(await coordinator.check()).toBe(false);
    pending = 0;
    expect(await coordinator.check()).toBe(true);
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("el gancho de eventos pendientes puede ser asíncrono (p. ej. una consulta a Dexie)", async () => {
    const { coordinator, apply, advance } = setup({ pendingEvents: async () => 1 });
    coordinator.notifyUpdateAvailable();
    advance(60 * MIN);
    expect(await coordinator.check()).toBe(false);
    expect(apply).not.toHaveBeenCalled();
  });

  it("gancho de turno: al iniciar turno se aplica sin esperar la inactividad", async () => {
    let starting = false;
    const { coordinator, apply } = setup({ shiftStarting: () => starting });
    coordinator.notifyUpdateAvailable();
    expect(await coordinator.check()).toBe(false);
    starting = true;
    expect(await coordinator.check()).toBe(true);
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("la actividad que ocurre mientras espera al gancho se tiene en cuenta", async () => {
    let release!: () => void;
    const { coordinator, apply, advance } = setup({
      pendingEvents: () => new Promise<number>((resolve) => (release = () => resolve(0))),
    });
    coordinator.notifyUpdateAvailable();
    advance(6 * MIN);
    const pendingCheck = coordinator.check();
    coordinator.markActivity(); // el guardia toca la pantalla justo ahora
    release();
    expect(await pendingCheck).toBe(false);
    expect(apply).not.toHaveBeenCalled();
  });

  it("no aplica dos veces aunque se evalúe varias veces o a la vez", async () => {
    const { coordinator, apply, advance } = setup();
    coordinator.notifyUpdateAvailable();
    advance(6 * MIN);
    const results = await Promise.all([coordinator.check(), coordinator.check()]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await coordinator.check()).toBe(false);
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("si aplicar falla, no se pierde: se puede reintentar", async () => {
    const { coordinator, apply, advance } = setup();
    apply.mockRejectedValueOnce(new Error("falló"));
    coordinator.notifyUpdateAvailable();
    advance(6 * MIN);
    await expect(coordinator.check()).rejects.toThrow("falló");
    expect(await coordinator.check()).toBe(true);
    expect(apply).toHaveBeenCalledTimes(2);
  });

  it("no depende de la red", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { coordinator, advance } = setup();
    coordinator.notifyUpdateAvailable();
    advance(6 * MIN);
    await coordinator.check();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
