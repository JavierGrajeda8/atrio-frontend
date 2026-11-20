import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  contentSecurityPolicy,
  headersFile,
  inlineHashes,
  parseApiOrigin,
  permissionsPolicy,
  securityHeaders,
} from "../packages/config/security-headers";
import { POLICY_NAME } from "../apps/guard/src/trustedTypes";

const apps = ["guard", "pass", "web"] as const;
type Built = Record<(typeof apps)[number], string>;

const outDir = mkdtempSync(join(tmpdir(), "atrio-headers-"));
const built = {} as Built;
let passWithApi = "";

function buildApp(app: string, out: string, env: Record<string, string> = {}): void {
  // Igual que `make build`: el mismo Vite y la misma configuración de cada app.
  const result = spawnSync(
    "pnpm",
    ["--filter", `@atrio/${app}`, "exec", "vite", "build", "--outDir", out, "--emptyOutDir"],
    { encoding: "utf-8", env: { ...process.env, ...env } },
  );
  expect(result.status, result.stdout + result.stderr).toBe(0);
}

/** Valor de una directiva de la CSP, o `undefined` si no existe. */
function directive(csp: string, name: string): string | undefined {
  return csp
    .split(";")
    .map((part) => part.trim())
    .find((part) => part === name || part.startsWith(`${name} `))
    ?.slice(name.length)
    .trim();
}

function parse(file: string): Record<string, string> {
  const [rule, ...lines] = file.trimEnd().split("\n");
  expect(rule).toBe("/*");
  return Object.fromEntries(
    lines.map((line) => {
      const index = line.indexOf(":");
      return [line.slice(2, index), line.slice(index + 1).trim()];
    }),
  );
}

const headersOf = (app: keyof Built): Record<string, string> =>
  parse(readFileSync(join(built[app], "_headers"), "utf-8"));

beforeAll(() => {
  for (const app of apps) {
    built[app] = join(outDir, app);
    buildApp(app, built[app]);
  }
  // Con el origen de la API configurado (previews y producción).
  passWithApi = join(outDir, "pass-api");
  buildApp("pass", passWithApi, { ATRIO_API_ORIGIN: "https://api.example.test" });
}, 240_000);

afterAll(() => rmSync(outDir, { recursive: true, force: true }));

describe("dist/_headers de cada app (SEC-65, FE-02)", () => {
  it.each(apps)("%s: se genera con una sola regla /* y las cabeceras de seguridad", (app) => {
    const headers = headersOf(app);
    expect(Object.keys(headers)).toEqual([
      "Content-Security-Policy",
      "Cross-Origin-Opener-Policy",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
    ]);
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Cross-Origin-Opener-Policy"]).toBe("same-origin");
  });

  it.each(apps)("%s: la CSP no permite unsafe-inline ni unsafe-eval en scripts", (app) => {
    const csp = headersOf(app)["Content-Security-Policy"] ?? "";
    const scripts = directive(csp, "script-src");
    expect(scripts).toBeDefined();
    expect(scripts).not.toMatch(/unsafe-inline|unsafe-eval|\*|https?:|data:/);
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toContain("unsafe-inline");
    expect(directive(csp, "default-src")).toBe("'none'");
    expect(directive(csp, "frame-ancestors")).toBe("'none'");
    expect(directive(csp, "object-src")).toBe("'none'");
    expect(directive(csp, "base-uri")).toBe("'none'");
  });

  it.each(apps)("%s: habilita Trusted Types", (app) => {
    const csp = headersOf(app)["Content-Security-Policy"] ?? "";
    expect(directive(csp, "require-trusted-types-for")).toBe("'script'");
    expect(directive(csp, "trusted-types")).toBeDefined();
  });

  it("solo guard crea una política de Trusted Types, y es la que instala su código", () => {
    expect(directive(headersOf("guard")["Content-Security-Policy"] ?? "", "trusted-types")).toBe(
      POLICY_NAME,
    );
    for (const app of ["pass", "web"] as const) {
      expect(directive(headersOf(app)["Content-Security-Policy"] ?? "", "trusted-types")).toBe(
        "'none'",
      );
    }
  });

  it("la cámara solo se permite en guard", () => {
    expect(headersOf("guard")["Permissions-Policy"]).toContain("camera=(self)");
    for (const app of ["pass", "web"] as const) {
      expect(headersOf(app)["Permissions-Policy"]).toContain("camera=()");
      expect(headersOf(app)["Permissions-Policy"]).not.toContain("camera=(self)");
    }
  });

  it("pass envía Referrer-Policy: no-referrer; las demás strict-origin-when-cross-origin", () => {
    expect(headersOf("pass")["Referrer-Policy"]).toBe("no-referrer");
    expect(headersOf("guard")["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headersOf("web")["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  });

  it("sin origen de API configurado, connect-src es solo 'self'", () => {
    for (const app of apps) {
      expect(directive(headersOf(app)["Content-Security-Policy"] ?? "", "connect-src")).toBe(
        "'self'",
      );
    }
  });

  it("con ATRIO_API_ORIGIN agrega ese origen (y solo ese) a connect-src", () => {
    const csp = parse(readFileSync(join(passWithApi, "_headers"), "utf-8"))[
      "Content-Security-Policy"
    ];
    expect(directive(csp ?? "", "connect-src")).toBe("'self' https://api.example.test");
  });

  it.each(apps)("%s: cada script en línea del HTML tiene su hash en la CSP", (app) => {
    const html = readFileSync(join(built[app], "index.html"), "utf-8");
    const csp = headersOf(app)["Content-Security-Policy"] ?? "";
    const { scripts, styles } = inlineHashes(html);
    for (const hash of scripts) expect(directive(csp, "script-src")).toContain(hash);
    for (const hash of styles) expect(directive(csp, "style-src")).toContain(hash);
    // Hoy no hay en línea: si aparece alguno, debe llegar con hash (esta prueba lo vigila).
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
    expect(html).not.toMatch(/\sstyle\s*=/i);
  });

  it("el service worker de guard no usa importScripts (Trusted Types lo bloquearía)", () => {
    const sw = readFileSync(join(built["guard"], "sw.js"), "utf-8");
    expect(sw).not.toContain("importScripts");
  });

  it.each(apps)(
    "%s: la CSP cabe en el límite de 2000 caracteres por línea de Cloudflare",
    (app) => {
      const line = readFileSync(join(built[app], "_headers"), "utf-8")
        .split("\n")
        .find((l) => l.includes("Content-Security-Policy"));
      expect((line ?? "").length).toBeLessThan(2000);
    },
  );
});

describe("generador de cabeceras", () => {
  const sha = (text: string): string =>
    `'sha256-${createHash("sha256").update(text).digest("base64")}'`;

  it("hashea scripts y estilos en línea, no los externos ni los bloques de datos", () => {
    const html = `<html><head>
      <script>window.a=1</script>
      <script type="module">import "/x.js"</script>
      <script src="/app.js"></script>
      <script type="application/json">{"a":1}</script>
      <style>body{margin:0}</style>
    </head></html>`;
    expect(inlineHashes(html)).toEqual({
      scripts: [sha("window.a=1"), sha('import "/x.js"')],
      styles: [sha("body{margin:0}")],
    });
  });

  it("agrega los hashes a script-src y style-src sin abrir unsafe-inline", () => {
    const csp = contentSecurityPolicy({
      app: "web",
      scriptHashes: [sha("a")],
      styleHashes: [sha("b")],
    });
    expect(directive(csp, "script-src")).toBe(`'self' ${sha("a")}`);
    expect(directive(csp, "style-src")).toBe(`'self' ${sha("b")}`);
    expect(csp).not.toContain("unsafe");
  });

  it.each(["https://api.atrio.test", "https://api.atrio.test:8443"])("acepta el origen %s", (o) => {
    expect(parseApiOrigin(o)).toBe(o);
  });

  it.each([
    "http://api.atrio.test",
    "*",
    "https://*.atrio.test",
    "https://api.atrio.test/v1",
    "https://api.atrio.test; script-src *",
    "https://api.atrio.test https://evil.test",
    "api.atrio.test",
  ])("rechaza el origen %j (no se puede colar otra directiva)", (o) => {
    expect(() => parseApiOrigin(o)).toThrow(/ATRIO_API_ORIGIN/);
  });

  it("sin valor no hay origen", () => {
    expect(parseApiOrigin(undefined)).toBeUndefined();
    expect(parseApiOrigin("")).toBeUndefined();
  });

  it("Permissions-Policy: solo guard puede usar la cámara", () => {
    expect(permissionsPolicy("guard")).toContain("camera=(self)");
    expect(permissionsPolicy("pass")).toContain("camera=()");
    expect(permissionsPolicy("web")).toContain("camera=()");
  });

  it("el archivo usa el formato de Cloudflare Pages (regla /* con cabeceras indentadas)", () => {
    const file = headersFile({ app: "pass" });
    expect(file.startsWith("/*\n  Content-Security-Policy: ")).toBe(true);
    expect(Object.keys(securityHeaders({ app: "pass" }))).toHaveLength(5);
  });
});
