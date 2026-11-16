import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : [path];
  });
}

// Código que se envía (sin pruebas): ahí no debe haber otro almacenamiento ni red en la base local.
const shipped = sourceFiles("apps/guard/src").filter((file) => !/\.test\.tsx?$/.test(file));
const dbFiles = shipped.filter((file) => file.includes("/db/"));

describe("almacenamiento local de guard (SEC-44, AGENTS §3)", () => {
  it("no usa localStorage, sessionStorage ni cookies en ningún archivo", () => {
    expect(shipped.length).toBeGreaterThan(0);
    for (const file of shipped) {
      expect(readFileSync(file, "utf-8"), file).not.toMatch(
        /\b(localStorage|sessionStorage)\b|document\.cookie/,
      );
    }
  });

  it("la base local no hace peticiones de red: funciona igual sin conexión", () => {
    expect(dbFiles.length).toBeGreaterThan(0);
    for (const file of dbFiles) {
      expect(readFileSync(file, "utf-8"), file).not.toMatch(
        /\b(fetch|XMLHttpRequest|WebSocket|sendBeacon|EventSource)\b/,
      );
    }
  });

  it("el esquema declara solo la tabla meta", () => {
    const schema = readFileSync("apps/guard/src/db/schema.ts", "utf-8");
    const stores = [...schema.matchAll(/stores:\s*\{([^}]*)\}/g)].map((match) => match[1]?.trim());
    expect(stores).toEqual(['meta: "key"']);
  });
});
