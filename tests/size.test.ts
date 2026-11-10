import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";

interface Budget {
  name: string;
  path: string;
  gzip: boolean;
  limit: string;
}

const budgets: Budget[] = JSON.parse(readFileSync(".size-limit.json", "utf-8"));
const scratch = ".size-test";

// size-limit resuelve sus plugins desde el repo, por eso el dist falso vive dentro de él.
function runSizeLimit(app: string, bytes: number) {
  const dist = join(scratch, "apps", app, "dist", "assets");
  mkdirSync(dist, { recursive: true });
  // Bytes aleatorios: no se comprimen, así que el tamaño gzip es ~el tamaño real.
  writeFileSync(join(dist, "index-test.js"), randomBytes(bytes));

  // size-limit resuelve las rutas relativas a la carpeta del archivo de configuración.
  const config = budgets.filter((budget) => budget.path.startsWith(`apps/${app}/`));
  const configPath = join(scratch, "size-limit.json");
  writeFileSync(configPath, JSON.stringify(config));

  return spawnSync("pnpm", ["exec", "size-limit", "--config", configPath], {
    encoding: "utf-8",
  });
}

afterEach(() => rmSync(scratch, { recursive: true, force: true }));

describe("presupuestos de bundle", () => {
  it("fija guard < 200 kB, pass < 30 kB y web < 300 kB de JS gzip", () => {
    const limits = Object.fromEntries(budgets.map((b) => [b.name.split(" ")[0], b.limit]));
    expect(limits).toEqual({ guard: "200 kB", pass: "30 kB", web: "300 kB" });
    expect(budgets.every((b) => b.gzip)).toBe(true);
  });

  it("falla cuando pass supera su presupuesto (import pesado)", () => {
    const result = runSizeLimit("pass", 40 * 1000);
    expect(result.status).not.toBe(0);
    expect(result.stderr + result.stdout).toMatch(/has exceeded by/i);
  });

  it("pasa cuando pass está dentro de su presupuesto", () => {
    expect(runSizeLimit("pass", 10 * 1000).status).toBe(0);
  });
});
