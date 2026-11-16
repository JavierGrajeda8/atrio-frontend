import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const uiDir = "packages/ui";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : [path];
  });
}

const gateSource = readFileSync(join(uiDir, "src/components/GateStatus.tsx"), "utf-8");

describe("GateStatus: pieza de guard sin i18n ni red", () => {
  it("packages/ui no depende de packages/i18n (recibe los textos por props)", () => {
    const manifest = JSON.parse(readFileSync(join(uiDir, "package.json"), "utf-8")) as Record<
      string,
      Record<string, string> | undefined
    >;
    for (const group of ["dependencies", "devDependencies", "peerDependencies"]) {
      expect(Object.keys(manifest[group] ?? {}), group).not.toContain("@atrio/i18n");
    }
    const offenders = sourceFiles(join(uiDir, "src")).filter(
      (file) => /\.tsx?$/.test(file) && readFileSync(file, "utf-8").includes("@atrio/i18n"),
    );
    expect(offenders).toEqual([]);
  });

  it("no importa módulos ni usa APIs de red", () => {
    expect(gateSource).not.toMatch(/\b(fetch|XMLHttpRequest|WebSocket|sendBeacon|EventSource)\b/);
    const imports = [...gateSource.matchAll(/^import .* from "([^"]+)"/gm)].map((m) => m[1]);
    expect(imports.sort()).toEqual(["./cn", "react"]);
  });

  it("los íconos son SVG propios: sin dependencias de íconos ni imágenes remotas", () => {
    expect(gateSource).not.toMatch(/https?:\/\/|<img/i);
    const manifest = readFileSync(join(uiDir, "package.json"), "utf-8");
    expect(manifest).not.toMatch(/lucide|icons/i);
  });
});
