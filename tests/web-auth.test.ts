import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Las pantallas de login y selector no tienen backend (el contrato no expone login ni
// membresías, REP-03). No deben enviar, guardar ni registrar nada: el teléfono es un dato
// sensible (SEC-56) y los tokens no van a localStorage/sessionStorage (AGENTS §3).
const screens = [
  "apps/web/src/LoginPage.tsx",
  "apps/web/src/ResidentialSelectorPage.tsx",
  "apps/web/src/AuthLayout.tsx",
];

describe("pantallas de entrada de web sin backend", () => {
  it.each(screens)("%s no usa red, almacenamiento del navegador ni consola", (file) => {
    const source = readFileSync(file, "utf-8");
    expect(source).not.toMatch(/\b(fetch|XMLHttpRequest|WebSocket|sendBeacon|EventSource)\b/);
    expect(source).not.toMatch(/\b(localStorage|sessionStorage|indexedDB)\b|document\.cookie/);
    expect(source).not.toMatch(/\bconsole\./);
  });

  it("no importan el cliente de API: no hay endpoints de login ni de membresías", () => {
    for (const file of screens) {
      expect(readFileSync(file, "utf-8"), file).not.toContain("@atrio/api-client");
    }
  });
});
