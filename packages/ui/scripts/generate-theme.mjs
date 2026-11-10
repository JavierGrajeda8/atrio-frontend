/* global process, console */
// Genera `src/theme.css` (tema de Tailwind v4) a partir de `docs/brand/tokens.css`.
// `docs/` es una copia del backend y no se edita aquí: este script deriva el tema para que no
// haya valores duplicados a mano. Uso: `pnpm --filter @atrio/ui tokens`.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const tokensPath = resolve(here, "../../../docs/brand/tokens.css");
export const themePath = resolve(here, "../src/theme.css");

const HEADER =
  "/* GENERADO por scripts/generate-theme.mjs desde docs/brand/tokens.css. No editar a mano:\n" +
  "   corre `pnpm --filter @atrio/ui tokens`. */";

// Los tokens `--space-N` y `--touch-*` no están en un espacio de nombres de Tailwind: se exponen
// como `--spacing-*` para tener p-4, gap-3, min-h-touch-min, h-touch-gate…
function aliases(names) {
  return names.flatMap((name) => {
    if (name.startsWith("--space-")) return [[`--spacing-${name.slice(8)}`, `var(${name})`]];
    if (name.startsWith("--touch-")) return [[`--spacing-${name.slice(2)}`, `var(${name})`]];
    return [];
  });
}

export function buildTheme(tokensCss) {
  const css = tokensCss.replace(/\/\*[\s\S]*?\*\//g, "");
  const open = css.indexOf(":root {");
  if (open === -1) throw new Error("tokens.css no tiene un bloque :root");
  const close = css.indexOf("}", open);
  const body = css.slice(open + ":root {".length, close);
  const rest = css.slice(close + 1).trim();

  const declarations = body
    .split(";")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const colon = line.indexOf(":");
      return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
    });

  const all = [
    ...declarations,
    ...aliases(declarations.map(([name]) => name)),
    ["--default-font-family", "var(--font-body)"],
    ["--default-mono-font-family", "var(--font-mono)"],
  ];

  const lines = [
    "  --color-*: initial;",
    "  --font-*: initial;",
    "  --text-*: initial;",
    "  --radius-*: initial;",
    "  --shadow-*: initial;",
    ...all.map(([name, value]) => `  ${name}: ${value};`),
  ];

  return `${HEADER}\n@theme static {\n${lines.join("\n")}\n}\n\n${rest}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(themePath, buildTheme(readFileSync(tokensPath, "utf-8")));
  console.log(`Tema escrito en ${themePath}`);
}
