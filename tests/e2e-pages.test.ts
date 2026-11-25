import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GUARD_PATHS, PASS_PATHS, WEB_PATHS } from "../e2e/support/apps";

// Las pruebas de axe de FR-10c recorren las páginas de `e2e/support/apps.ts`: si una ruta nueva
// no está en esa lista, quedaría sin revisar de accesibilidad.
const sorted = (paths: readonly string[]): string[] => [...paths].sort();

describe("lista de páginas del E2E (FR-10c, FE-05)", () => {
  it("web: cubre cada ruta de routes.tsx, el catálogo y un 404", () => {
    const source = readFileSync("apps/web/src/routes.tsx", "utf-8");
    const routes = [
      ...[...source.matchAll(/page\("([^"]+)"/g)].map((match) => match[1] as string),
      ...[...source.matchAll(/\bpath: "([^"]+)"/g)].map((match) => match[1] as string),
    ];
    expect(routes.length).toBeGreaterThanOrEqual(9);
    const covered = WEB_PATHS.filter((path) => !path.includes("no-existe"));
    expect(sorted(covered)).toEqual(sorted(routes));
    expect(WEB_PATHS.some((path) => path.includes("no-existe"))).toBe(true);
  });

  it("guard: cubre cada ruta de router.tsx", () => {
    const source = readFileSync("apps/guard/src/router.tsx", "utf-8");
    const block = /export const ROUTES = \{([\s\S]*?)\} as const/.exec(source)?.[1] ?? "";
    const routes = [...block.matchAll(/:\s*"([^"]+)"/g)].map((match) => match[1] as string);
    expect(routes.length).toBe(4);
    expect(sorted(GUARD_PATHS)).toEqual(sorted(routes));
  });

  it("pass: cubre el pase con token y el enlace inválido", () => {
    expect(PASS_PATHS.some((path) => path.startsWith("/#"))).toBe(true);
    expect(PASS_PATHS).toContain("/");
  });
});
