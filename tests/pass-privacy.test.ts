import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : [path];
  });
}

const html = readFileSync("apps/pass/index.html", "utf-8");
const shipped = sourceFiles("apps/pass/src").filter((file) => !/\.test\.tsx?$/.test(file));
const code = shipped.filter((file) => /\.tsx?$/.test(file));

describe("privacidad de la página del pase (SEC-35, VIS-01)", () => {
  it("declara noindex y Referrer-Policy no-referrer por <meta>", () => {
    expect(html).toMatch(/<meta\s+name="robots"\s+content="[^"]*\bnoindex\b[^"]*"/);
    expect(html).toMatch(/<meta\s+name="referrer"\s+content="no-referrer"/);
  });

  it("no carga scripts, estilos ni fuentes de terceros", () => {
    expect(html).not.toMatch(/(src|href)="(https?:)?\/\//);
    for (const file of shipped.filter((f) => f.endsWith(".css"))) {
      expect(readFileSync(file, "utf-8"), file).not.toMatch(/url\(\s*["']?(https?:)?\/\//);
    }
  });

  it("no importa React, @atrio/ui ni el paquete i18n completo (presupuesto de 30 KB)", () => {
    for (const file of code) {
      expect(readFileSync(file, "utf-8"), file).not.toMatch(
        /from\s+["'](react(-dom|-intl)?(\/[^"']*)?|@atrio\/ui(\/[^"']*)?|@atrio\/i18n)["']/,
      );
    }
  });

  it("el código que se envía no usa red, storage, cookies, consola ni la query", () => {
    expect(code.length).toBeGreaterThan(0);
    for (const file of code) {
      expect(readFileSync(file, "utf-8"), file).not.toMatch(
        /\b(fetch|XMLHttpRequest|WebSocket|sendBeacon|EventSource|localStorage|sessionStorage|console)\b|document\.cookie|location\.search/,
      );
    }
  });
});
