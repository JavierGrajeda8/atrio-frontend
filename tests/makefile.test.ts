import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const makefile = readFileSync("Makefile", "utf-8");
const compose = readFileSync("e2e/docker-compose.yml", "utf-8");
const script = readFileSync("scripts/e2e.sh", "utf-8");

// Sin `docker` en CI de unidades: se valida la forma del entorno E2E; `make e2e` lo ejercita entero.
describe("make e2e (FR-10a, REP-05)", () => {
  it("el target e2e corre scripts/e2e.sh y ya no queda ningún target pendiente", () => {
    expect(makefile).toMatch(/^e2e:\n\tscripts\/e2e\.sh$/m);
    expect(makefile).not.toContain("todavía no está implementado");
  });

  it("la API sale de la imagen publicada del backend, con PostgreSQL 17", () => {
    expect(compose).toContain("${E2E_BACKEND_IMAGE:-ghcr.io/javiergrajeda8/atrio-backend:main}");
    expect(compose).toMatch(/image: postgres:17\b/);
    expect(compose).not.toMatch(/image:.*:latest\b/);
  });

  it("migra, siembra y solo entonces levanta la API, que debe responder /healthz", () => {
    expect(compose).toContain('command: ["alembic", "upgrade", "head"]');
    expect(compose).toContain('command: ["python", "-m", "atrio.seed"]');
    expect(compose).toMatch(/migrate:\s*\{ condition: service_completed_successfully \}/);
    expect(compose).toMatch(/seed:\s*\{ condition: service_completed_successfully \}/);
    expect(compose).toContain("/healthz");
  });

  it("solo escucha en 127.0.0.1 y no publica PostgreSQL", () => {
    const ports = [...compose.matchAll(/^\s*- "([^"]*:\d+)"\s*$/gm)].map((match) => match[1]);
    expect(ports).toHaveLength(1);
    expect(ports[0]).toMatch(/^127\.0\.0\.1:/);
  });

  it("la imagen corre endurecida igual que en producción (SEC-82)", () => {
    expect(compose).toMatch(/read_only: true/);
    expect(compose).toMatch(/cap_drop: \[ALL\]/);
    expect(compose).toContain("no-new-privileges:true");
  });

  it("el script espera a que todo esté sano, comprueba el seed y siempre baja el entorno", () => {
    expect(script).toContain("set -euo pipefail");
    expect(script).toContain("up --detach --wait");
    expect(script).toMatch(/trap cleanup EXIT/);
    expect(script).toContain("down --volumes");
    expect(script).toContain("SELECT count(*) FROM residentials");
    expect(script).toContain("playwright test");
  });

  it("el par de claves de los tokens de prueba es efímero: se genera, se usa y se borra (FR-10b)", () => {
    expect(script).toContain("gen-keys.mjs");
    expect(script).toContain("mktemp -d");
    expect(script).toContain('rm -rf "${keydir}"');
    // Al backend solo llega la pública, y solo a la API (no a migrate ni a seed).
    expect(script).toContain('E2E_JWT_PUBLIC_KEY="$(cat "${keydir}/public.pem")"');
    expect(script).not.toMatch(/E2E_JWT_PUBLIC_KEY=.*private/);
    expect(compose.match(/ATRIO_JWT_PUBLIC_KEY/g)).toHaveLength(1);
    expect(compose).not.toMatch(/PRIVATE/i);
    const api = compose.slice(compose.indexOf("\n  api:"));
    expect(api).toContain("ATRIO_JWT_PUBLIC_KEY: ${E2E_JWT_PUBLIC_KEY:-}");
  });

  it("no hay ninguna clave privada versionada", () => {
    const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf-8" })
      .split("\0")
      .filter(Boolean);
    expect(files.filter((file) => /\.(pem|key|p12)$/i.test(file))).toEqual([]);
    for (const file of files.filter((f) => f.startsWith("e2e/") || f.startsWith("scripts/"))) {
      expect(readFileSync(file, "utf-8"), file).not.toMatch(/-----BEGIN [A-Z ]*PRIVATE KEY-----/);
    }
  });
});
