// Trusted Types (SEC-65): la CSP de guard exige `require-trusted-types-for 'script'`. Registrar el
// service worker pasa una URL como cadena y el navegador la bloquea, así que se instala una
// política `default` que solo acepta el service worker propio. Cualquier otra URL, y cualquier
// HTML o script en cadena, sigue bloqueado (la política no define `createHTML` ni `createScript`).

export const POLICY_NAME = "default";
export const SERVICE_WORKER_PATH = "/sw.js";

interface TrustedTypesApi {
  createPolicy(name: string, rules: { createScriptURL?: (input: string) => string }): unknown;
}

export function isOwnServiceWorker(url: string, base: string): boolean {
  try {
    const parsed = new URL(url, base);
    return (
      parsed.origin === new URL(base).origin &&
      parsed.pathname === SERVICE_WORKER_PATH &&
      parsed.search === "" &&
      parsed.hash === ""
    );
  } catch {
    return false;
  }
}

// Vista mínima del global: así el módulo compila igual en la app (DOM) y en las pruebas de la raíz.
const env = globalThis as { trustedTypes?: TrustedTypesApi; location?: { href: string } };

export function installTrustedTypes(
  api: TrustedTypesApi | undefined = env.trustedTypes,
  base: string = env.location?.href ?? "http://localhost/",
): void {
  // Sin soporte (jsdom, navegadores viejos) no hay nada que instalar: tampoco se aplica la restricción.
  if (!api) return;
  api.createPolicy(POLICY_NAME, {
    createScriptURL(url) {
      if (!isOwnServiceWorker(url, base)) {
        throw new TypeError("URL de script no permitida por la política Trusted Types");
      }
      return url;
    },
  });
}
