// @vitest-environment jsdom
import { cleanup, fireEvent, render as baseRender, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { axe } from "vitest-axe";
import { afterEach, describe, expect, it } from "vitest";
import { I18nProvider } from "@atrio/i18n";
import type { Locale } from "@atrio/i18n";
import { UiCatalog } from "./UiCatalog";

function render(ui: ReactElement, locale?: Locale) {
  return baseRender(ui, {
    wrapper: ({ children }) => <I18nProvider locale={locale}>{children}</I18nProvider>,
  });
}

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-theme");
  window.history.pushState({}, "", "/");
});

describe("página /_ui", () => {
  it("muestra Button, Input, Field, Card y Badge", () => {
    render(<UiCatalog />);
    for (const name of ["Botón", "Campo de texto", "Tarjeta", "Insignia", "Pantalla de garita"]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeTruthy();
    }
    expect(
      screen.getAllByRole("status").map((status) => status.getAttribute("data-status")),
    ).toEqual(["granted", "denied", "offline"]);
    expect(screen.getAllByRole("button").length).toBeGreaterThan(4);
    expect(screen.getAllByRole("textbox").length).toBeGreaterThan(1);
    expect(screen.getByText("Aprobado")).toBeTruthy();
  });

  it("todos sus textos salen del catálogo y cambian con el idioma", () => {
    render(<UiCatalog />, "en-US");
    expect(screen.getByRole("heading", { level: 1, name: "Component catalog" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Theme" })).toBeTruthy();
    expect(screen.getByLabelText("Visitor name")).toBeTruthy();
    expect(screen.getByText("Approved")).toBeTruthy();
    expect(screen.queryByText("Aprobado")).toBeNull();
  });

  it("alterna entre tema claro, oscuro y el del sistema", () => {
    render(<UiCatalog />);
    const root = document.documentElement;

    fireEvent.click(screen.getByRole("button", { name: "Oscuro" }));
    expect(root.getAttribute("data-theme")).toBe("dark");
    expect(screen.getByRole("button", { name: "Oscuro" }).getAttribute("aria-pressed")).toBe(
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Claro" }));
    expect(root.getAttribute("data-theme")).toBe("light");

    fireEvent.click(screen.getByRole("button", { name: "Sistema" }));
    expect(root.hasAttribute("data-theme")).toBe(false);
  });

  it("no reporta violaciones de accesibilidad en claro ni en oscuro", async () => {
    const { container } = render(<UiCatalog />);
    expect((await axe(container)).violations).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Oscuro" }));
    expect((await axe(container)).violations).toEqual([]);
  });
});
