import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflowsDir = ".github/workflows";
const guardScript = resolve("scripts/guard-synced-files.sh");

describe("ci.yml", () => {
  const ci = readFileSync(join(workflowsDir, "ci.yml"), "utf-8");

  it("define los checks con nombres estables para el ruleset", () => {
    const jobs = [...ci.slice(ci.indexOf("\njobs:")).matchAll(/^ {2}([a-z-]+):\s*$/gm)].map(
      (match) => match[1],
    );
    expect(jobs).toEqual(["lint", "typecheck", "test", "build", "security", "secrets"]);
  });

  it("corre make security en el job security", () => {
    expect(ci).toMatch(/- run: make security\b/);
  });

  it("fija todas las acciones por SHA en todos los workflows", () => {
    for (const file of readdirSync(workflowsDir)) {
      const content = readFileSync(join(workflowsDir, file), "utf-8");
      for (const match of content.matchAll(/^\s*(?:- )?uses:\s*(\S+)/gm)) {
        expect(match[1], `${file}: ${match[1]}`).toMatch(/@[0-9a-f]{40}$/);
      }
    }
  });
});

describe("make security", () => {
  it("falla con un mensaje claro si falta una herramienta", () => {
    const result = spawnSync("make", ["security"], {
      encoding: "utf-8",
      env: { PATH: "/usr/bin:/bin" },
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/Falta (osv-scanner|gitleaks)/);
  });
});

describe("guard-synced-files.sh", () => {
  function repo(): string {
    const dir = mkdtempSync(join(tmpdir(), "atrio-guard-"));
    const git = (...args: string[]) => execFileSync("git", args, { cwd: dir, stdio: "pipe" });
    git("init", "-q", "-b", "main");
    git("config", "user.email", "test@example.com");
    git("config", "user.name", "Test");
    mkdirSync(join(dir, "docs"));
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "docs", "SPEC.md"), "base\n");
    writeFileSync(join(dir, "src", "a.ts"), "base\n");
    git("add", "-A");
    git("commit", "-q", "-m", "base");
    git("checkout", "-q", "-b", "feature");
    return dir;
  }

  function commit(dir: string, file: string) {
    writeFileSync(join(dir, file), "cambio\n");
    execFileSync("git", ["add", "-A"], { cwd: dir });
    execFileSync("git", ["commit", "-q", "-m", "cambio"], { cwd: dir });
  }

  function guard(dir: string, headRef: string) {
    return spawnSync(guardScript, [headRef, "main"], { cwd: dir, encoding: "utf-8" });
  }

  it("falla si un PR modifica docs/ desde otra rama", () => {
    const dir = repo();
    commit(dir, "docs/SPEC.md");
    const result = guard(dir, "feature");
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("docs/SPEC.md");
  });

  it("falla si un PR modifica openapi/ desde otra rama", () => {
    const dir = repo();
    mkdirSync(join(dir, "openapi"));
    commit(dir, "openapi/openapi.json");
    expect(guard(dir, "feature").status).toBe(1);
  });

  it("permite la rama sync/backend", () => {
    const dir = repo();
    commit(dir, "docs/SPEC.md");
    expect(guard(dir, "sync/backend").status).toBe(0);
  });

  it("permite cambios fuera de docs/ y openapi/", () => {
    const dir = repo();
    commit(dir, "src/a.ts");
    expect(guard(dir, "feature").status).toBe(0);
  });

  it("permite docs/SYNCED_FROM_BACKEND.md, propio del frontend", () => {
    const dir = repo();
    commit(dir, "docs/SYNCED_FROM_BACKEND.md");
    expect(guard(dir, "feature").status).toBe(0);
  });
});
