import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import guard from "../apps/guard/vite.config";
import pass from "../apps/pass/vite.config";
import web from "../apps/web/vite.config";

const apps = { web, guard, pass };

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : [path];
  });
}

describe("esqueletos de las apps", () => {
  it("cada app usa un puerto fijo y distinto", () => {
    const ports = Object.values(apps).map((config) => config.server?.port);
    expect(new Set(ports).size).toBe(3);
    for (const config of Object.values(apps)) {
      expect(config.server?.strictPort).toBe(true);
    }
  });

  it("pass no depende de React ni lo importa", () => {
    const pkg = JSON.parse(readFileSync("apps/pass/package.json", "utf-8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const declared = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(declared.filter((name) => name.startsWith("react"))).toEqual([]);

    for (const file of sourceFiles("apps/pass/src")) {
      expect(readFileSync(file, "utf-8"), file).not.toMatch(/from\s+["']react(-dom)?(\/|["'])/);
    }
  });
});
