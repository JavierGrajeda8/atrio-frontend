// Las tres apps ya construidas, servidas por `support/static-server.mjs` con sus `_headers`.
// Puertos propios (distintos de los de `vite dev`/`preview`) para no chocar con un servidor local.
export const APPS = {
  web: { port: Number(process.env["E2E_WEB_PORT"] ?? 4173), dist: "../apps/web/dist" },
  guard: { port: Number(process.env["E2E_GUARD_PORT"] ?? 4174), dist: "../apps/guard/dist" },
  pass: { port: Number(process.env["E2E_PASS_PORT"] ?? 4175), dist: "../apps/pass/dist" },
} as const;

export const url = (app: keyof typeof APPS, path = "/"): string =>
  `http://127.0.0.1:${APPS[app].port}${path}`;

// Cada página de cada app (FE-05). Si agregas una ruta, agrégala aquí: `tests/e2e-pages.test.ts`
// falla si esta lista no coincide con las rutas del código.
export const WEB_PATHS = [
  "/",
  "/visits",
  "/announcements",
  "/admin",
  "/admin/management",
  "/admin/log",
  "/login",
  "/residentials",
  "/_ui",
  "/esta-ruta-no-existe", // 404
] as const;

export const GUARD_PATHS = ["/", "/scan", "/code", "/walk-in"] as const;

// El token es ficticio: la página del pase solo lee el fragmento, no lo canjea todavía.
export const PASS_PATHS = ["/#token-de-prueba", "/"] as const;

export const SCHEMES = ["light", "dark"] as const;
