// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const registerSW = vi.hoisted(() => vi.fn());
vi.mock("virtual:pwa-register", () => ({ registerSW }));

import {
  ACTIVITY_EVENTS,
  CHECK_EVERY_MS,
  LOOK_FOR_UPDATE_EVERY_MS,
  markUpdateActivity,
  startUpdatePolicy,
} from "./register";

const MIN = 60_000;
const updateSW = vi.fn<(reload?: boolean) => Promise<void>>(() => Promise.resolve());
let options: { onNeedRefresh(): void; onRegisteredSW(url: string, reg: unknown): void };
let stop: () => void;

beforeEach(() => {
  vi.useFakeTimers();
  updateSW.mockClear();
  registerSW.mockReset();
  registerSW.mockImplementation((given) => {
    options = given;
    return updateSW;
  });
});

afterEach(() => {
  stop?.();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const tick = (ms: number) => vi.advanceTimersByTimeAsync(ms);

describe("registro y política de actualización (OFF-09 / FE-04)", () => {
  it("registra el service worker al arrancar", () => {
    stop = startUpdatePolicy();
    expect(registerSW).toHaveBeenCalledWith(expect.objectContaining({ immediate: true }));
  });

  it("sin versión nueva no recarga nunca", async () => {
    stop = startUpdatePolicy();
    await tick(60 * MIN);
    expect(updateSW).not.toHaveBeenCalled();
  });

  it("con actividad reciente no se aplica y a los 5 min de inactividad sí (una sola vez)", async () => {
    stop = startUpdatePolicy();
    options.onNeedRefresh();
    await tick(4 * MIN);
    expect(updateSW).not.toHaveBeenCalled();

    window.dispatchEvent(new Event("pointerdown")); // el guardia toca la pantalla
    await tick(4 * MIN + 30_000);
    expect(updateSW).not.toHaveBeenCalled();

    await tick(MIN);
    expect(updateSW).toHaveBeenCalledTimes(1);
    expect(updateSW).toHaveBeenCalledWith(true);

    await tick(30 * MIN);
    expect(updateSW).toHaveBeenCalledTimes(1);
  });

  it.each(ACTIVITY_EVENTS)("«%s» cuenta como actividad", async (type) => {
    stop = startUpdatePolicy();
    options.onNeedRefresh();
    await tick(4 * MIN + 30_000);
    window.dispatchEvent(new Event(type));
    await tick(4 * MIN + 30_000);
    expect(updateSW).not.toHaveBeenCalled();
  });

  it("la actividad se detecta aunque un elemento detenga la propagación del evento", async () => {
    stop = startUpdatePolicy();
    const button = document.createElement("button");
    button.addEventListener("pointerdown", (event) => event.stopPropagation());
    document.body.append(button);
    options.onNeedRefresh();
    await tick(4 * MIN + 30_000);
    button.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    await tick(4 * MIN + 30_000);
    expect(updateSW).not.toHaveBeenCalled();
    button.remove();
  });

  it("la actividad reportada a mano (p. ej. un escaneo con la cámara) también cuenta", async () => {
    stop = startUpdatePolicy();
    options.onNeedRefresh();
    await tick(4 * MIN + 30_000);
    markUpdateActivity(); // sin tocar la pantalla: el guardia está escaneando
    await tick(4 * MIN + 30_000);
    expect(updateSW).not.toHaveBeenCalled();
    await tick(MIN);
    expect(updateSW).toHaveBeenCalledTimes(1);
  });

  it("markUpdateActivity no hace nada si la política no está corriendo", () => {
    expect(() => markUpdateActivity()).not.toThrow();
    stop = startUpdatePolicy();
    stop();
    expect(() => markUpdateActivity()).not.toThrow();
  });

  it("si la versión llega cuando el guardia lleva más de 5 min inactivo, se aplica de inmediato", async () => {
    stop = startUpdatePolicy();
    await tick(6 * MIN);
    options.onNeedRefresh();
    await tick(0);
    expect(updateSW).toHaveBeenCalledTimes(1);
  });

  it("con eventos pendientes no se aplica; al sincronizarse, sí", async () => {
    let pending = 1;
    stop = startUpdatePolicy({ pendingEvents: () => pending, shiftStarting: () => false });
    options.onNeedRefresh();
    await tick(10 * MIN);
    expect(updateSW).not.toHaveBeenCalled();
    pending = 0;
    await tick(CHECK_EVERY_MS);
    expect(updateSW).toHaveBeenCalledTimes(1);
  });

  it("gancho de turno: al iniciar turno se aplica en la siguiente evaluación", async () => {
    let starting = false;
    stop = startUpdatePolicy({ pendingEvents: () => 0, shiftStarting: () => starting });
    options.onNeedRefresh();
    await tick(MIN);
    expect(updateSW).not.toHaveBeenCalled();
    starting = true;
    await tick(CHECK_EVERY_MS);
    expect(updateSW).toHaveBeenCalledTimes(1);
  });

  it("al detenerla deja de evaluar y de escuchar la actividad", async () => {
    stop = startUpdatePolicy();
    options.onNeedRefresh();
    stop();
    await tick(60 * MIN);
    expect(updateSW).not.toHaveBeenCalled();
  });

  it("si aplicar falla, registra solo el nombre del error y reintenta", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    updateSW.mockRejectedValueOnce(new TypeError("dato-sensible-123"));
    stop = startUpdatePolicy();
    options.onNeedRefresh();
    await tick(6 * MIN);
    expect(consoleError).toHaveBeenCalledWith("guard-update", "TypeError");
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("dato-sensible-123");
    expect(updateSW).toHaveBeenCalledTimes(2);
  });

  it("busca una versión nueva cada hora si hay red, y no lo intenta sin red", async () => {
    const registration = { update: vi.fn(() => Promise.resolve()) };
    stop = startUpdatePolicy();
    options.onRegisteredSW("/sw.js", registration);

    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    await tick(LOOK_FOR_UPDATE_EVERY_MS);
    expect(registration.update).not.toHaveBeenCalled();

    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    await tick(LOOK_FOR_UPDATE_EVERY_MS);
    expect(registration.update).toHaveBeenCalledTimes(1);
  });

  it("no usa fetch por su cuenta: la lógica no depende de la red", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    stop = startUpdatePolicy();
    options.onNeedRefresh();
    await tick(6 * MIN);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
