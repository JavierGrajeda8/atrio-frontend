import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// FR-11: la guía de previews de Cloudflare Pages debe decir lo que el repo realmente hace.
const guide = readFileSync("frontend-docs/previews.md", "utf-8");
const apps = ["web", "guard", "pass"] as const;
const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf-8" })
  .split("\0")
  .filter(Boolean);

describe("frontend-docs/previews.md (FR-11)", () => {
  it.each(apps)(
    "%s: comando de build, directorio de salida y paquete coinciden con el repo",
    (app) => {
      const pkg = JSON.parse(readFileSync(`apps/${app}/package.json`, "utf-8")) as {
        name: string;
        scripts: Record<string, string>;
      };
      expect(pkg.name).toBe(`@atrio/${app}`);
      expect(pkg.scripts["build"]).toBeDefined();
      expect(guide).toContain(`\`pnpm --filter ${pkg.name} build\``);
      // Vite escribe en `dist` si la app no cambia `outDir`, y sirve desde `/` si no cambia `base`.
      const vite = readFileSync(`apps/${app}/vite.config.ts`, "utf-8");
      expect(vite).not.toMatch(/\boutDir\b|\bbase\s*:/);
      expect(guide).toContain(`\`apps/${app}/dist\``);
    },
  );

  it("documenta el directorio raíz, las variables y la versión de pnpm y de Node que usa el repo", () => {
    const root = JSON.parse(readFileSync("package.json", "utf-8")) as { packageManager: string };
    const pnpm = root.packageManager.replace("pnpm@", "");
    expect(guide).toContain(`\`PNPM_VERSION\` | \`${pnpm}\``);
    const node = readFileSync(".nvmrc", "utf-8").trim();
    expect(guide).toContain(`.nvmrc\` (Node ${node})`);
    expect(guide).toContain("ATRIO_API_ORIGIN");
    expect(guide).toMatch(/raíz del repo/);
  });

  it("explica por qué no hay _redirects y que no se use /* /index.html 200", () => {
    expect(guide).toContain("404.html");
    expect(guide).toContain("/* /index.html 200");
    expect(guide).toContain("Infinite loop detected");
  });
});

describe("las apps son SPA en Cloudflare Pages (FR-11)", () => {
  it("ninguna app tiene un 404.html (Pages dejaría de servir el shell en las rutas internas)", () => {
    expect(tracked.filter((file) => /(^|\/)404\.html$/.test(file))).toEqual([]);
    for (const app of apps) {
      expect(existsSync(`apps/${app}/public/404.html`), app).toBe(false);
      expect(readFileSync(`apps/${app}/index.html`, "utf-8")).toContain('<div id="root">');
    }
  });

  it("ningún _redirects usa la regla de SPA que Pages rechaza", () => {
    const files = new Set([
      ...tracked.filter((f) => /(^|\/)_redirects$/.test(f)),
      ...apps.map((app) => `apps/${app}/public/_redirects`).filter((f) => existsSync(f)),
    ]);
    for (const file of files) {
      expect(readFileSync(file, "utf-8"), file).not.toMatch(/^\/\*\s+\/index\.html\s+200/m);
    }
  });
});
