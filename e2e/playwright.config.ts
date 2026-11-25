import { defineConfig } from "@playwright/test";
import { APPS, url } from "./support/apps";

// La API real corre en `docker compose` (e2e/docker-compose.yml); `make e2e` la levanta antes.
const apiPort = process.env["E2E_API_PORT"] ?? "8000";

export default defineConfig({
  testDir: "./tests",
  // Sin reintentos: un E2E que falla a veces es un defecto, no ruido.
  retries: 0,
  forbidOnly: !!process.env["CI"],
  reporter: process.env["CI"] ? [["github"], ["list"]] : "list",
  use: {
    // `baseURL` es la API (pruebas de `request`); las páginas usan `url()` de support/apps.ts.
    baseURL: process.env["E2E_API_URL"] ?? `http://127.0.0.1:${apiPort}`,
    trace: "retain-on-failure",
    // Móvil de 390 px: el caso de uso real de guard y pass.
    viewport: { width: 390, height: 844 },
  },
  // Las tres apps construidas (`make build`), con sus `_headers` reales (FR-09).
  webServer: (Object.keys(APPS) as Array<keyof typeof APPS>).map((app) => ({
    command: `node support/static-server.mjs ${APPS[app].dist} ${APPS[app].port}`,
    url: url(app),
    reuseExistingServer: false,
    stdout: "pipe" as const,
    stderr: "pipe" as const,
  })),
});
