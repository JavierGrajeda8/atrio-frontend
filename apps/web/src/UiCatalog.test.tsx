// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { UiCatalog } from "./UiCatalog";

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-theme");
  window.history.pushState({}, "", "/");
});

describe("página /_ui", () => {
  it("muestra Button, Input, Field, Card y Badge", () => {
    render(<UiCatalog />);
    for (const name of ["Button", "Input y Field", "Card", "Badge"]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeTruthy();
    }
    expect(screen.getAllByRole("button").length).toBeGreaterThan(4);
    expect(screen.getAllByRole("textbox").length).toBeGreaterThan(1);
    expect(screen.getByText("Aprobado")).toBeTruthy();
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

  it("App la sirve solo en /_ui", () => {
    window.history.pushState({}, "", "/_ui");
    const { unmount } = render(<App />);
    expect(screen.getByRole("heading", { level: 1, name: "Catálogo de componentes" })).toBeTruthy();
    unmount();

    window.history.pushState({}, "", "/");
    render(<App />);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });
});
