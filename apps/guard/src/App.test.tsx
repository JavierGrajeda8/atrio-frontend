// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { act, cleanup, fireEvent, render as baseRender, screen } from "@testing-library/react";
import { I18nProvider } from "@atrio/i18n";
import type { Locale } from "@atrio/i18n";
import type { ReactElement } from "react";
import { axe } from "vitest-axe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { createGuardDb, initGuardDb, setLastSync } from "./db/db";
import type { GuardDb } from "./db/db";

const opened: GuardDb[] = [];

async function freshDb(): Promise<GuardDb> {
  const db = createGuardDb(`test-${crypto.randomUUID()}`);
  opened.push(db);
  return initGuardDb(db);
}

function render(ui: ReactElement, locale?: Locale) {
  return baseRender(ui, {
    wrapper: ({ children }) => <I18nProvider locale={locale}>{children}</I18nProvider>,
  });
}

function setOnline(online: boolean): void {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(online);
  act(() => {
    window.dispatchEvent(new Event(online ? "online" : "offline"));
  });
}

const minutesAgo = (minutes: number): Date => new Date(Date.now() - minutes * 60_000);

beforeEach(() => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
});

afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  window.history.pushState({}, "", "/");
  document.documentElement.removeAttribute("data-theme");
  for (const db of opened.splice(0)) await db.delete();
});

describe("indicador de conexión (OFF-07)", () => {
  it("en línea: texto, ícono y estado", async () => {
    const db = await freshDb();
    render(<App db={db} />);
    const status = screen.getByRole("status");
    expect(status.getAttribute("data-state")).toBe("online");
    expect(status.textContent).toBe("En línea");
    expect(status.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("sin conexión con datos de hace 12 min", async () => {
    const db = await freshDb();
    await setLastSync(minutesAgo(12), db);
    render(<App db={db} />);
    setOnline(false);
    expect(
      (await screen.findByText("Sin conexión — datos de hace 12 min")).closest("[role=status]"),
    ).toHaveProperty("dataset.state", "offline");
  });

  it("con más de una hora muestra la edad en horas", async () => {
    const db = await freshDb();
    await setLastSync(minutesAgo(3 * 60 + 20), db);
    render(<App db={db} />);
    setOnline(false);
    expect(await screen.findByText("Sin conexión — datos de hace 3 h")).toBeTruthy();
  });

  it("recién sincronizado no dice «hace 0 min»", async () => {
    const db = await freshDb();
    await setLastSync(new Date(), db);
    render(<App db={db} />);
    setOnline(false);
    expect(await screen.findByText("Sin conexión — datos recién sincronizados")).toBeTruthy();
  });

  it("vencido tras 12 h: pide el protocolo manual", async () => {
    const db = await freshDb();
    await setLastSync(minutesAgo(12 * 60 + 1), db);
    render(<App db={db} />);
    setOnline(false);
    const text = await screen.findByText("Datos offline vencidos — usa el protocolo manual");
    expect(text.closest("[role=status]")?.getAttribute("data-state")).toBe("expired");
  });

  it("sin red y sin haber sincronizado nunca: vencido", async () => {
    const db = await freshDb();
    render(<App db={db} />);
    setOnline(false);
    expect(await screen.findByText(/Datos offline vencidos/)).toBeTruthy();
  });

  it("cada estado tiene un ícono distinto además del texto (nunca solo color)", async () => {
    const db = await freshDb();
    await setLastSync(minutesAgo(5), db);
    const icons: string[] = [];
    const { container } = render(<App db={db} />);
    const icon = () => container.querySelector("[role=status] svg")?.innerHTML ?? "";

    icons.push(icon()); // en línea
    setOnline(false);
    await screen.findByText(/datos de hace 5 min/);
    icons.push(icon()); // sin conexión
    await act(async () => {
      await setLastSync(minutesAgo(13 * 60), db);
    });
    await screen.findByText(/vencidos/);
    icons.push(icon()); // vencido

    expect(new Set(icons).size).toBe(3);
    expect(icons.every((markup) => markup.length > 0)).toBe(true);
  });

  it("se actualiza solo cuando cambia meta.lastSync", async () => {
    const db = await freshDb();
    render(<App db={db} />);
    setOnline(false);
    await screen.findByText(/vencidos/);
    await act(async () => {
      await setLastSync(minutesAgo(2), db);
    });
    expect(await screen.findByText("Sin conexión — datos de hace 2 min")).toBeTruthy();
  });

  it("justo después de sincronizar no se muestra vencido aunque el reloj interno esté atrasado", async () => {
    const db = await freshDb();
    vi.useFakeTimers({ toFake: ["Date"] }); // el reloj avanza, pero el temporizador de 30 s no
    render(<App db={db} />);
    setOnline(false);
    await screen.findByText(/vencidos/);

    // Pasa un minuto sin que el componente se entere; luego termina una sincronización.
    vi.setSystemTime(Date.now() + 60_000);
    await act(async () => {
      await setLastSync(new Date(), db);
    });

    expect(await screen.findByText("Sin conexión — datos recién sincronizados")).toBeTruthy();
    expect(screen.queryByText(/vencidos/)).toBeNull();
  });

  it("vuelve a «En línea» al recuperar la red", async () => {
    const db = await freshDb();
    render(<App db={db} />);
    setOnline(false);
    await screen.findByText(/vencidos/);
    setOnline(true);
    expect(await screen.findByText("En línea")).toBeTruthy();
  });

  it("el paso del tiempo lo vence solo: de vigente a vencido sin tocar nada", async () => {
    const db = await freshDb();
    await setLastSync(minutesAgo(11 * 60 + 59), db);
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    render(<App db={db} />);
    setOnline(false);
    await screen.findByText(/datos de hace 11 h/);

    await act(async () => {
      vi.setSystemTime(Date.now() + 2 * 60_000);
      vi.advanceTimersByTime(30_000);
    });
    expect(await screen.findByText(/vencidos/)).toBeTruthy();
  });
});

describe("pantalla de inicio (WLK-01)", () => {
  it("hay 3 botones: Escanear QR, Ingresar código y Sin pase, de al menos 56 px", async () => {
    render(<App db={await freshDb()} />);
    const nav = screen.getByRole("navigation");
    const links = Array.from(nav.querySelectorAll("a"));
    expect(links.map((link) => link.textContent)).toEqual([
      "Escanear QR",
      "Ingresar código",
      "Sin pase",
    ]);
    for (const link of links) {
      expect(link.className, link.textContent ?? "").toContain("min-h-touch-gate");
      expect(link.className).toContain("text-md");
      expect(link.querySelector("svg")).not.toBeNull();
    }
  });

  it.each([
    ["Escanear QR", "/scan"],
    ["Ingresar código", "/code"],
    ["Sin pase", "/walk-in"],
  ])("«%s» navega a %s, una ruta vacía, y se puede volver", async (name, path) => {
    render(<App db={await freshDb()} />);
    fireEvent.click(screen.getByRole("link", { name }));

    expect(window.location.pathname).toBe(path);
    expect(screen.getByRole("heading", { level: 2, name })).toBeTruthy();
    expect(screen.queryByRole("navigation")).toBeNull();
    // Es una ruta vacía: solo el título y el regreso.
    expect(screen.getByRole("main").querySelectorAll("a, button, input")).toHaveLength(1);

    fireEvent.click(screen.getByRole("link", { name: "Volver al inicio" }));
    expect(window.location.pathname).toBe("/");
    expect(screen.getByRole("navigation")).toBeTruthy();
  });

  it("el indicador se ve en todas las rutas", async () => {
    render(<App db={await freshDb()} />);
    for (const name of ["Escanear QR", "Ingresar código", "Sin pase"]) {
      fireEvent.click(screen.getByRole("link", { name }));
      expect(screen.getByRole("status").textContent).toBe("En línea");
      fireEvent.click(screen.getByRole("link", { name: "Volver al inicio" }));
    }
  });

  it("abrir /scan directamente (como tras una recarga sin red) muestra esa ruta", async () => {
    window.history.pushState({}, "", "/scan");
    render(<App db={await freshDb()} />);
    expect(screen.getByRole("heading", { level: 2, name: "Escanear QR" })).toBeTruthy();
  });

  it("el botón Atrás del navegador vuelve al inicio", async () => {
    render(<App db={await freshDb()} />);
    fireEvent.click(screen.getByRole("link", { name: "Sin pase" }));
    act(() => {
      window.history.pushState({}, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByRole("navigation")).toBeTruthy();
  });

  it("un clic con Ctrl/⌘ no se intercepta (abre en otra pestaña)", async () => {
    render(<App db={await freshDb()} />);
    fireEvent.click(screen.getByRole("link", { name: "Sin pase" }), { ctrlKey: true });
    expect(window.location.pathname).toBe("/");
  });
});

describe("sin conexión, i18n y accesibilidad", () => {
  it("no hace ninguna petición de red", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const db = await freshDb();
    render(<App db={db} />);
    setOnline(false);
    fireEvent.click(screen.getByRole("link", { name: "Escanear QR" }));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("todos los textos salen del catálogo: en en-US cambian", async () => {
    render(<App db={await freshDb()} />, "en-US");
    expect(screen.getByRole("heading", { level: 1, name: "Atrio Gate" })).toBeTruthy();
    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Scan QR",
      "Enter code",
      "No pass",
    ]);
    expect(screen.getByRole("status").textContent).toBe("Online");
  });

  it.each(["light", "dark"] as const)(
    "axe no reporta violaciones en cada estado, tema %s",
    async (theme) => {
      document.documentElement.setAttribute("data-theme", theme);
      const db = await freshDb();
      const { container } = render(<App db={db} />);
      expect((await axe(container)).violations).toEqual([]);

      setOnline(false);
      await screen.findByText(/vencidos/);
      expect((await axe(container)).violations).toEqual([]);

      await act(async () => {
        await setLastSync(minutesAgo(30), db);
      });
      await screen.findByText(/datos de hace 30 min/);
      expect((await axe(container)).violations).toEqual([]);

      fireEvent.click(screen.getByRole("link", { name: "Sin pase" }));
      expect((await axe(container)).violations).toEqual([]);
    },
  );
});
