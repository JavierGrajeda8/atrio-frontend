import { createHash } from "node:crypto";
import type { Plugin } from "vite";

export type AppName = "guard" | "pass" | "web";

export interface HeaderOptions {
  app: AppName;
  /** Hashes `'sha256-…'` de los scripts y estilos en línea del HTML (sitio estático: sin nonce). */
  scriptHashes?: string[];
  styleHashes?: string[];
  /** Origen de la API (`https://…`, sin ruta) que se agrega a `connect-src`. */
  apiOrigin?: string;
}

const ORIGIN = /^https:\/\/[a-z0-9.-]+(:\d+)?$/i;

/** Un origen puro con `https`: así no se cuela otra directiva ni un comodín en la CSP. */
export function parseApiOrigin(value: string | undefined): string | undefined {
  if (value === undefined || value === "") return undefined;
  if (!ORIGIN.test(value)) {
    throw new Error(`ATRIO_API_ORIGIN debe ser un origen https sin ruta ni comodines: "${value}"`);
  }
  return value;
}

export function contentSecurityPolicy(options: HeaderOptions): string {
  const { scriptHashes = [], styleHashes = [], apiOrigin } = options;
  const directives: Record<string, string[]> = {
    "default-src": ["'none'"],
    // Sin `unsafe-inline` ni `unsafe-eval`: solo archivos propios y, si los hubiera, hashes.
    "script-src": ["'self'", ...scriptHashes],
    "style-src": ["'self'", ...styleHashes],
    "img-src": ["'self'", "data:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...(apiOrigin ? [apiOrigin] : [])],
    "manifest-src": ["'self'"],
    "worker-src": ["'self'"],
    "base-uri": ["'none'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],
    // Trusted Types: un sumidero de DOM con cadenas falla. Solo guard crea una política (`default`,
    // que solo deja pasar su service worker: apps/guard/src/trustedTypes.ts).
    "require-trusted-types-for": ["'script'"],
    "trusted-types": [options.app === "guard" ? "default" : "'none'"],
  };
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

export function permissionsPolicy(app: AppName): string {
  // La cámara solo la usa la app de garita para leer el QR (SEC-65).
  const camera = app === "guard" ? "camera=(self)" : "camera=()";
  return [camera, "microphone=()", "geolocation=()", "payment=()", "usb=()"].join(", ");
}

export function securityHeaders(options: HeaderOptions): Record<string, string> {
  return {
    "Content-Security-Policy": contentSecurityPolicy(options),
    "Cross-Origin-Opener-Policy": "same-origin",
    "X-Content-Type-Options": "nosniff",
    // En la página del pase el token viaja en el fragmento y nada debe filtrar el origen (SEC-35).
    "Referrer-Policy": options.app === "pass" ? "no-referrer" : "strict-origin-when-cross-origin",
    "Permissions-Policy": permissionsPolicy(options.app),
  };
}

export function headersFile(options: HeaderOptions): string {
  const lines = Object.entries(securityHeaders(options)).map(
    ([name, value]) => `  ${name}: ${value}`,
  );
  return `/*\n${lines.join("\n")}\n`;
}

const sha256 = (text: string): string =>
  `'sha256-${createHash("sha256").update(text).digest("base64")}'`;

// Los bloques de datos (`application/json`, plantillas) no se ejecutan: no necesitan hash.
const EXECUTABLE_SCRIPT = /^(|module|text\/javascript|application\/javascript)$/i;

/** Hashes de los `<script>` y `<style>` en línea de un HTML. Los externos (`src`) no cuentan. */
export function inlineHashes(html: string): { scripts: string[]; styles: string[] } {
  const scripts: string[] = [];
  for (const [, attrs = "", body = ""] of html.matchAll(
    /<script\b([^>]*)>([\s\S]*?)<\/script>/gi,
  )) {
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const type = /\btype\s*=\s*["']?([^"'\s>]*)/i.exec(attrs)?.[1] ?? "";
    if (EXECUTABLE_SCRIPT.test(type)) scripts.push(sha256(body));
  }
  const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(([, body = ""]) =>
    sha256(body),
  );
  return { scripts, styles };
}

/** Genera `dist/_headers` (Cloudflare Pages) con los hashes del HTML ya construido. */
export function securityHeadersPlugin(app: AppName): Plugin {
  return {
    name: "atrio:security-headers",
    apply: "build",
    enforce: "post",
    generateBundle(_, bundle) {
      const html = bundle["index.html"];
      const source = html?.type === "asset" ? String(html.source) : "";
      const { scripts, styles } = inlineHashes(source);
      this.emitFile({
        type: "asset",
        fileName: "_headers",
        source: headersFile({
          app,
          scriptHashes: scripts,
          styleHashes: styles,
          apiOrigin: parseApiOrigin(process.env["ATRIO_API_ORIGIN"]),
        }),
      });
    },
  };
}
