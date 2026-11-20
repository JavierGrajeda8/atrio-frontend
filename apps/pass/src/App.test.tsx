// @vitest-environment jsdom
import { render } from "preact";
import { act } from "preact/test-utils";
import { axe } from "vitest-axe";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { readShareToken } from "./token";

const TOKEN = "token-de-prueba";
let host: HTMLElement | null = null;

function mount(token: string | null): HTMLElement {
  host = document.createElement("div");
  document.body.append(host);
  act(() => render(<App token={token} />, host as HTMLElement));
  return host;
}

function setOnline(value: boolean): void {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(value);
}

afterEach(() => {
  if (host) render(null, host);
  host?.remove();
  host = null;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("token del fragmento (SEC-35)", () => {
  it("lo lee de `#<token>`", () => {
    expect(readShareToken(`#${TOKEN}`)).toBe(TOKEN);
    expect(readShareToken(TOKEN)).toBe(TOKEN);
  });

  it.each(["", "#", "#   ", "#con espacios", "#a\tb", `#${"x".repeat(513)}`])(
    "descarta %j",
    (hash) => {
      expect(readShareToken(hash)).toBeNull();
    },
  );
});

describe("página del pase: estructura sin datos (VIS-01, SEC-35)", () => {
  it("con token muestra solo la estructura: campos, cómo llegar, QR y pie", () => {
    const view = mount(TOKEN);
    const text = view.textContent ?? "";
    for (const label of [
      "Residencial",
      "Dirección",
      "Visitante",
      "Vigencia",
      "Código",
      "Estado",
      "Cómo llegar",
      "Pase generado con Atrio",
    ]) {
      expect(text).toContain(label);
    }
    expect(view.querySelector('[role="img"]')?.getAttribute("aria-label")).toBe(
      "Código QR del pase",
    );
    expect(view.querySelector("h1")?.textContent).toBe("Tu pase de visita");
  });

  it("no muestra nombre del residente ni unidad", () => {
    const text = mount(TOKEN).textContent ?? "";
    expect(text).not.toMatch(/residente|unidad|apartamento|casa\b/i);
  });

  it("el token no aparece en el DOM: ni texto, ni atributos, ni enlaces", () => {
    const view = mount(TOKEN);
    expect(view.innerHTML).not.toContain(TOKEN);
    expect(document.documentElement.outerHTML).not.toContain(TOKEN);
    expect(view.querySelectorAll("a, img, iframe, script, link, form")).toHaveLength(0);
  });

  it("no hace ninguna petición: ni fetch, ni XHR, ni sendBeacon, ni WebSocket", () => {
    const fetchSpy = vi.fn();
    const xhrSpy = vi.fn();
    const beaconSpy = vi.fn();
    const socketSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubGlobal("XMLHttpRequest", xhrSpy);
    vi.stubGlobal("WebSocket", socketSpy);
    Object.defineProperty(navigator, "sendBeacon", { value: beaconSpy, configurable: true });
    mount(TOKEN);
    for (const spy of [fetchSpy, xhrSpy, beaconSpy, socketSpy]) expect(spy).not.toHaveBeenCalled();
    Reflect.deleteProperty(navigator, "sendBeacon");
  });

  it("no escribe el token en storage, cookies ni consola", () => {
    const writes = vi.fn();
    const trap = new Proxy({}, { get: () => writes });
    vi.stubGlobal("localStorage", trap);
    vi.stubGlobal("sessionStorage", trap);
    const logs = (["log", "info", "warn", "error", "debug"] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => undefined),
    );
    mount(TOKEN);
    expect(writes).not.toHaveBeenCalled();
    expect(document.cookie).toBe("");
    for (const log of logs) expect(log).not.toHaveBeenCalled();
  });

  it("sin token (enlace inválido) muestra solo el estado, sin QR ni campos", () => {
    const view = mount(null);
    expect(view.textContent).toContain("Este enlace no es válido");
    expect(view.textContent).toContain("Pide un pase nuevo a tu anfitrión.");
    expect(view.querySelector('[role="img"]')).toBeNull();
    expect(view.querySelector("dl")).toBeNull();
    expect(view.textContent).toContain("Pase generado con Atrio");
  });
});

describe("sin conexión", () => {
  it("avisa con un estado claro cuando no hay red y lo quita al volver", () => {
    setOnline(false);
    const view = mount(TOKEN);
    const status = [...view.querySelectorAll('[role="status"]')].map((n) => n.textContent);
    expect(status).toContain("Sin conexión. Vuelve a conectarte para ver tu pase.");

    setOnline(true);
    act(() => void window.dispatchEvent(new Event("online")));
    expect(view.textContent).not.toContain("Sin conexión");

    act(() => void window.dispatchEvent(new Event("offline")));
    expect(view.textContent).toContain("Sin conexión");
  });

  it("con red no muestra el aviso", () => {
    setOnline(true);
    expect(mount(TOKEN).textContent).not.toContain("Sin conexión");
  });

  it("quita los listeners al desmontar", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const view = mount(TOKEN);
    act(() => render(null, view));
    expect(remove).toHaveBeenCalledWith("online", expect.any(Function));
    expect(remove).toHaveBeenCalledWith("offline", expect.any(Function));
  });
});

describe("accesibilidad", () => {
  it.each([
    ["con token", TOKEN, true],
    ["sin conexión", TOKEN, false],
    ["enlace inválido", null, true],
  ])("axe no reporta violaciones: %s", async (_name, token, online) => {
    setOnline(online);
    expect((await axe(mount(token))).violations).toEqual([]);
  });
});
