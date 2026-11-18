// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "@atrio/i18n";
import type { Locale } from "@atrio/i18n";
import { createMemoryHistory } from "@tanstack/react-router";
import { axe } from "vitest-axe";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { createAppRouter } from "./routes";

async function renderAt(path: string, locale?: Locale) {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }));
  await act(async () => {
    await router.load();
  });
  const view = render(
    <I18nProvider locale={locale}>
      <App router={router} />
    </I18nProvider>,
  );
  return { router, ...view };
}

afterEach(() => {
  cleanup();
  // Aquí y no al final de cada prueba: si una falla, no deja espías ni globales simulados.
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-theme");
  document.title = "";
});

const SCREENS = [
  ["/", "Inicio"],
  ["/visits", "Visitas"],
  ["/announcements", "Comunicados"],
  ["/admin", "Panel"],
  ["/admin/management", "Gestión"],
  ["/admin/log", "Bitácora"],
] as const;

describe("shell de web: layout residente/admin (SPEC §8.2, §8.3)", () => {
  it.each(SCREENS)(
    "%s muestra «%s» dentro del layout, con su título de documento",
    async (path, title) => {
      await renderAt(path);
      expect(await screen.findByRole("heading", { level: 1, name: title })).toBeTruthy();
      expect(screen.getByRole("navigation", { name: "Navegación principal" })).toBeTruthy();
      expect(screen.getByText("Esta sección todavía no tiene contenido.")).toBeTruthy();
      expect(document.title).toBe(`${title} · Atrio`);
    },
  );

  it("la navegación tiene los dos grupos y los 6 enlaces, cada uno de al menos 44 px", async () => {
    await renderAt("/");
    const nav = screen.getByRole("navigation", { name: "Navegación principal" });
    expect(Array.from(nav.querySelectorAll("a")).map((a) => a.getAttribute("href"))).toEqual(
      SCREENS.map(([path]) => path),
    );
    expect(screen.getByRole("list", { name: "Residente" }).querySelectorAll("a")).toHaveLength(3);
    expect(screen.getByRole("list", { name: "Administración" }).querySelectorAll("a")).toHaveLength(
      3,
    );
    for (const link of nav.querySelectorAll("a")) {
      expect(link.className).toContain("min-h-touch-min");
    }
  });

  it("marca la ruta actual con aria-current; Inicio y Panel solo en su propia ruta", async () => {
    await renderAt("/admin/management");
    const current = Array.from(document.querySelectorAll("[aria-current=page]"));
    expect(current.map((a) => a.textContent)).toEqual(["Gestión"]);
    expect(screen.getByRole("link", { name: "Panel" }).hasAttribute("aria-current")).toBe(false);
    expect(screen.getByRole("link", { name: "Inicio" }).hasAttribute("aria-current")).toBe(false);
  });

  it("navega entre pantallas sin recargar la página", async () => {
    const { router } = await renderAt("/");
    fireEvent.click(screen.getByRole("link", { name: "Visitas" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Visitas" })).toBeTruthy();
    expect(router.state.location.pathname).toBe("/visits");
    expect(screen.getByRole("link", { name: "Visitas" }).getAttribute("aria-current")).toBe("page");

    fireEvent.click(screen.getByRole("link", { name: "Bitácora" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Bitácora" })).toBeTruthy();
    expect(router.state.location.pathname).toBe("/admin/log");
  });

  it("incluye un enlace para saltar al contenido principal", async () => {
    await renderAt("/");
    const skip = screen.getByRole("link", { name: "Saltar al contenido" });
    expect(skip.getAttribute("href")).toBe("#main");
    expect(screen.getByRole("main").id).toBe("main");
  });

  it("todos los textos salen del catálogo: en en-US cambian", async () => {
    await renderAt("/admin", "en-US");
    expect(await screen.findByRole("heading", { level: 1, name: "Dashboard" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Announcements" })).toBeTruthy();
    expect(document.title).toBe("Dashboard · Atrio");
  });
});

describe("ruta desconocida: pantalla 404", () => {
  it.each(["/no-existe", "/admin/no-existe", "/visits/123/extra"])(
    "%s muestra la 404, sin el layout",
    async (path) => {
      await renderAt(path);
      expect(
        await screen.findByRole("heading", { level: 1, name: "Página no encontrada" }),
      ).toBeTruthy();
      expect(screen.getByText(/no existe o cambió de lugar/)).toBeTruthy();
      expect(screen.queryByRole("navigation")).toBeNull();
      expect(document.title).toBe("Página no encontrada · Atrio");
    },
  );

  it("permite volver al inicio", async () => {
    const { router } = await renderAt("/no-existe");
    fireEvent.click(await screen.findByRole("link", { name: "Ir al inicio" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Inicio" })).toBeTruthy();
    expect(router.state.location.pathname).toBe("/");
  });

  it("también en en-US", async () => {
    await renderAt("/no-existe", "en-US");
    expect(await screen.findByRole("heading", { level: 1, name: "Page not found" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Go to start" })).toBeTruthy();
  });
});

describe("/_ui pasa a ser una ruta del router (FR-03b)", () => {
  it("muestra el catálogo de componentes, fuera del layout", async () => {
    await renderAt("/_ui");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Catálogo de componentes" }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Pantalla de garita" })).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Navegación principal" })).toBeNull();
  });
});

describe("login vacío, sin backend de autenticación (SPEC §8.2)", () => {
  it("muestra la pantalla de login fuera del layout de la app", async () => {
    await renderAt("/login");
    expect(await screen.findByRole("heading", { level: 1, name: "Inicia sesión" })).toBeTruthy();
    expect(screen.getByText(/te enviaremos un código/)).toBeTruthy();
    expect(screen.getByLabelText("Teléfono").getAttribute("type")).toBe("tel");
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(document.title).toBe("Inicia sesión · Atrio");
  });

  it("deja claro que no está disponible: el botón está deshabilitado y explicado", async () => {
    await renderAt("/login");
    const submit = await screen.findByRole("button", { name: "Enviar código" });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/todavía no está disponible/)).toBeTruthy();
    expect(submit.getAttribute("aria-describedby")).toBe(
      screen.getByText(/todavía no está disponible/).id,
    );
  });

  it("no envía, guarda ni registra nada, ni escribiendo un teléfono y pulsando Enter", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const consoleSpy = vi.spyOn(console, "log");
    const storage = () => ({
      length: 0,
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(() => null),
    });
    const local = storage();
    const session = storage();
    vi.stubGlobal("localStorage", local);
    vi.stubGlobal("sessionStorage", session);
    const { router } = await renderAt("/login");
    const phone = (await screen.findByLabelText("Teléfono")) as HTMLInputElement;

    fireEvent.change(phone, { target: { value: "+502 5555-1234" } });
    const form = phone.closest("form") as HTMLFormElement;
    const submitEvent = new Event("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(submitEvent);
    fireEvent.keyDown(phone, { key: "Enter", code: "Enter" });

    expect(submitEvent.defaultPrevented).toBe(true); // el formulario ignora el envío
    expect(router.state.location.pathname).toBe("/login");
    expect(fetchSpy).not.toHaveBeenCalled();
    // Node 26 define su propio `localStorage` experimental y tapa el de jsdom: se simulan ambos
    // almacenamientos para comprobar que NUNCA se escribe en ellos.
    expect(local.setItem).not.toHaveBeenCalled();
    expect(session.setItem).not.toHaveBeenCalled();
    expect(document.cookie).toBe("");
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("el campo pide el teclado y el autocompletado de teléfono", async () => {
    await renderAt("/login");
    const phone = await screen.findByLabelText("Teléfono");
    expect(phone.getAttribute("inputmode")).toBe("tel");
    expect(phone.getAttribute("autocomplete")).toBe("tel");
  });

  it("también en en-US", async () => {
    await renderAt("/login", "en-US");
    expect(await screen.findByRole("heading", { level: 1, name: "Sign in" })).toBeTruthy();
    expect(screen.getByLabelText("Phone")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send code" })).toBeTruthy();
  });
});

describe("selector de residencial vacío (SPEC §8.2)", () => {
  it("muestra el estado vacío, sin datos ni lista", async () => {
    await renderAt("/residentials");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Elige tu residencial" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 2, name: "Todavía no tienes residenciales" }),
    ).toBeTruthy();
    expect(screen.getByText(/te dé acceso a un residencial, aparecerá aquí/)).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.queryByRole("listitem")).toBeNull();
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(document.title).toBe("Elige tu residencial · Atrio");
  });

  it("no pide datos al backend: el contrato aún no expone las membresías", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await renderAt("/residentials");
    await screen.findByRole("heading", { level: 1 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("también en en-US", async () => {
    await renderAt("/residentials", "en-US");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Choose your residential" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 2, name: "You don't have any residentials yet" }),
    ).toBeTruthy();
  });
});

describe("accesibilidad (axe)", () => {
  // jsdom no evalúa `color-contrast`; el contraste de los tokens se mide en tests/ui-contrast.
  for (const theme of ["light", "dark"] as const) {
    it(`ninguna pantalla reporta violaciones, tema ${theme}`, async () => {
      document.documentElement.setAttribute("data-theme", theme);
      for (const path of [
        ...SCREENS.map(([route]) => route),
        "/login",
        "/residentials",
        "/no-existe",
        "/_ui",
      ]) {
        const { container, unmount } = await renderAt(path);
        await screen.findAllByRole("heading", { level: 1 });
        const { violations } = await axe(container);
        expect(violations, path).toEqual([]);
        unmount();
      }
    }, 30_000);
  }
});
