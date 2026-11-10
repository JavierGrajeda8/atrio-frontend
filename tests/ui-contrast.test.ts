import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// jsdom no calcula estilos reales, así que axe no puede verificar `color-contrast` ahí.
// Este test resuelve los tokens de packages/ui/src/theme.css y mide WCAG 2.x directamente.
const css = readFileSync("packages/ui/src/theme.css", "utf-8");

function declarations(block: string): Record<string, string> {
  return Object.fromEntries(
    [...block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], (m[2] as string).trim()]),
  );
}

function blockAfter(marker: string): string {
  const start = css.indexOf(marker);
  expect(start, marker).toBeGreaterThan(-1);
  return css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
}

const light = declarations(blockAfter("@theme static"));
const dark = { ...light, ...declarations(blockAfter(':root[data-theme="dark"]')) };

function resolve(tokens: Record<string, string>, name: string): string {
  let value = tokens[`--${name}`];
  expect(value, name).toBeDefined();
  for (let depth = 0; depth < 5 && value?.startsWith("var("); depth++) {
    value = tokens[value.slice(4, -1).trim()];
  }
  expect(value, name).toMatch(/^#[0-9a-fA-F]{6}$/);
  return value as string;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

// [primer plano, fondo, quién lo usa]
const text: Array<[string, string, string]> = [
  ["color-text", "color-bg", "texto sobre la página"],
  ["color-text", "color-surface", "texto en Card"],
  ["color-text-muted", "color-bg", "texto secundario sobre la página"],
  ["color-text-muted", "color-surface", "descripción de Field y placeholder"],
  ["color-text-muted", "color-surface-muted", "texto secundario en Card anidada"],
  ["color-on-primary", "color-primary", "Button primary"],
  ["color-on-primary", "color-primary-hover", "Button primary (hover)"],
  ["color-text", "color-surface-muted", "Button secondary (hover) y Badge neutral"],
  ["color-primary", "color-bg", "Button ghost sobre la página"],
  ["color-primary", "color-surface", "Button ghost en Card"],
  ["color-primary", "color-primary-soft", "Button ghost (hover) y Badge primary"],
  ["color-surface", "color-danger", "Button danger"],
  ["color-danger", "color-surface", "error de Field"],
  ["color-danger", "color-surface-muted", "Badge danger"],
  ["color-success", "color-surface-muted", "Badge success"],
  ["color-warning-text", "color-surface-muted", "Badge warning"],
];

// Componentes de interfaz (WCAG 1.4.11): bordes de Input y foco.
const nonText: Array<[string, string, string]> = [
  ["color-text-muted", "color-surface", "borde de Input"],
  ["color-danger", "color-surface", "borde de Input inválido"],
  ["color-primary", "color-bg", "anillo de foco (outline-primary) sobre la página"],
  ["color-primary", "color-surface", "anillo de foco (outline-primary) en Card"],
];

describe("contraste de los tokens que usan los componentes (WCAG 2.2 AA)", () => {
  for (const [themeName, tokens] of [
    ["claro", light],
    ["oscuro", dark],
  ] as const) {
    describe(`tema ${themeName}`, () => {
      for (const [fg, bg, use] of text) {
        it(`${use}: ${fg} sobre ${bg} ≥ 4.5:1`, () => {
          expect(ratio(resolve(tokens, fg), resolve(tokens, bg))).toBeGreaterThanOrEqual(4.5);
        });
      }
      for (const [fg, bg, use] of nonText) {
        it(`${use}: ${fg} sobre ${bg} ≥ 3:1`, () => {
          expect(ratio(resolve(tokens, fg), resolve(tokens, bg))).toBeGreaterThanOrEqual(3);
        });
      }
    });
  }
});
