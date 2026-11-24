import { defineConfig } from "@playwright/test";

// La API real corre en `docker compose` (e2e/docker-compose.yml); `make e2e` la levanta antes.
const apiPort = process.env["E2E_API_PORT"] ?? "8000";

export default defineConfig({
  testDir: "./tests",
  // Sin reintentos: un E2E que falla a veces es un defecto, no ruido.
  retries: 0,
  forbidOnly: !!process.env["CI"],
  reporter: process.env["CI"] ? [["github"], ["list"]] : "list",
  use: {
    baseURL: process.env["E2E_API_URL"] ?? `http://127.0.0.1:${apiPort}`,
    trace: "retain-on-failure",
  },
});
