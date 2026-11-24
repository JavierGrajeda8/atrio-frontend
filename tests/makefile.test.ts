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
});
