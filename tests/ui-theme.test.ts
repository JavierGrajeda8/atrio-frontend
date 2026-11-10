import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { compile } from "@tailwindcss/node";
import { describe, expect, it } from "vitest";
import { buildTheme, themePath, tokensPath } from "../packages/ui/scripts/generate-theme.mjs";

const uiDir = "packages/ui";
const tokens = readFileSync(tokensPath, "utf-8");

// Declaraciones del primer bloque :root de tokens.css (la base clara).
function lightTokens(): string[] {
  const css = tokens.replace(/\/\*[\s\S]*?\*\//g, "");
  const start = css.indexOf(":root {");
  const block = css.slice(start + 7, css.indexOf("}", start));
  return [...block.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1] as string);
}

async function build(candidates: string[]): Promise<string> {
  const compiler = await compile('@import "./src/styles.css";', {
    base: join(process.cwd(), uiDir),
    onDependency: () => undefined,
  });
  return compiler.build(candidates);
}

// Compacta el CSS (sin espacios ni el último `;` de cada bloque) para comparar reglas.
function compact(css: string): string {
  return css.replace(/\s+/g, "").replace(/;}/g, "}");
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : [path];
  });
}

describe("tema de Tailwind generado desde docs/brand/tokens.css", () => {
  it("theme.css está al día con tokens.css (corre `pnpm --filter @atrio/ui tokens`)", () => {
    expect(readFileSync(themePath, "utf-8")).toBe(buildTheme(tokens));
  });

  it("expone colores, tipografía, espacios, radios y sombras como utilidades", async () => {
    const out = await build([
      "bg-bg",
      "bg-surface",
      "text-text-muted",
      "bg-primary",
      "text-on-primary",
      "bg-gate-granted-bg",
      "text-gate-denied-fg",
      "font-display",
      "font-body",
      "font-mono",
      "text-gate",
      "p-4",
      "gap-3",
      "min-h-touch-gate",
      "h-touch-min",
      "rounded-md",
      "rounded-arch",
      "shadow-2",
    ]);
    for (const expected of [
      ".bg-bg{background-color:var(--color-bg)}",
      ".bg-primary{background-color:var(--color-primary)}",
      ".bg-gate-granted-bg{background-color:var(--color-gate-granted-bg)}",
      ".font-display{font-family:var(--font-display)}",
      ".text-gate{font-size:var(--text-gate)}",
      ".p-4{padding:var(--spacing-4)}",
      ".min-h-touch-gate{min-height:var(--spacing-touch-gate)}",
      ".rounded-md{border-radius:var(--radius-md)}",
      ".rounded-arch{border-radius:var(--radius-arch)}",
    ]) {
      expect(compact(out), expected).toContain(expected);
    }
  });

  it("cada color semántico de tokens.css tiene su utilidad", async () => {
    const colors = lightTokens()
      .filter((name) => name.startsWith("--color-"))
      .map((name) => name.slice("--color-".length));
    const out = compact(await build(colors.map((name) => `bg-${name}`)));
    for (const name of colors) {
      expect(out, name).toContain(`.bg-${name}{background-color:var(--color-${name})}`);
    }
  });

  it("no deja la paleta por defecto de Tailwind: solo los tokens de la marca", async () => {
    const out = await build(["bg-white", "bg-red-500", "text-base", "rounded-xl"]);
    expect(out).not.toMatch(/\.bg-white|\.bg-red-500|\.text-base|\.rounded-xl/);
  });

  it("incluye el modo oscuro de los tokens, por preferencia del sistema y por data-theme", async () => {
    const out = await build(["bg-bg"]);
    expect(out).toContain("@media (prefers-color-scheme: dark)");
    expect(out).toContain(':root:not([data-theme="light"])');
    expect(out).toContain(':root[data-theme="dark"]');
    expect(out).toMatch(/:root\[data-theme="dark"\]\s*\{[^}]*--color-bg:\s*#0F1220/);
  });
});

describe("modo oscuro sin colores sueltos en el código", () => {
  it("las apps y packages/ui no definen colores literales fuera del tema generado", () => {
    const files = [...sourceFiles("apps/web/src"), ...sourceFiles(join(uiDir, "src"))]
      .filter((file) => /\.(tsx?|css)$/.test(file))
      .filter((file) => !file.endsWith("theme.css"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(readFileSync(file, "utf-8"), file).not.toMatch(
        /#[0-9a-fA-F]{3,8}\b|\b(rgb|rgba|hsl|hsla|oklch)\(/,
      );
    }
  });
});

describe("fuentes propias", () => {
  it("fonts.css solo importa paquetes @fontsource instalados, sin URLs externas", () => {
    for (const file of ["fonts.css", "styles.css"]) {
      const css = readFileSync(join(uiDir, "src", file), "utf-8");
      expect(css, file).not.toMatch(/https?:\/\//);
    }
    const fonts = readFileSync(join(uiDir, "src", "fonts.css"), "utf-8");
    const imports = [...fonts.matchAll(/@import "([^"]+)"/g)].map((match) => match[1] as string);
    expect(imports).toHaveLength(5);
    for (const path of imports) {
      expect(path, path).toMatch(/^@fontsource\//);
      expect(existsSync(join(uiDir, "node_modules", path)), path).toBe(true);
    }
  });

  it("el build de web empaqueta las 3 familias y no referencia ningún host externo", () => {
    const result = spawnSync("pnpm", ["--filter", "@atrio/web", "build"], { encoding: "utf-8" });
    expect(result.status, result.stdout + result.stderr).toBe(0);

    const assets = join("apps/web/dist/assets");
    const files = readdirSync(assets);
    for (const family of ["bricolage-grotesque", "atkinson-hyperlegible", "jetbrains-mono"]) {
      expect(
        files.some((file) => file.startsWith(family) && file.endsWith(".woff2")),
        family,
      ).toBe(true);
    }
    const css = files.find((file) => file.endsWith(".css")) as string;
    const content = readFileSync(join(assets, css), "utf-8");
    // El comentario de licencia de Tailwind menciona su sitio: solo importan url() e @import.
    expect(content, relative(".", css)).not.toMatch(/(url\(|@import\s+)["']?(https?:)?\/\//);
    expect(content).toContain("font-display:swap");
  }, 60_000);
});
