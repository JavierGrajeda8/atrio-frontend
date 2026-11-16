import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

// Prueba el build real de guard: lo que el navegador instala y lo que el service worker cachea.
const dist = "apps/guard/dist";
const read = (file: string): string => readFileSync(join(dist, file), "utf-8");

type Icon = { src: string; sizes: string; type: string; purpose?: string };
type Manifest = Record<string, unknown> & { icons: Icon[] };

let manifest: Manifest;
let sw: string;
let precached: string[];

beforeAll(() => {
  // Igual que `make build`: en producción Workbox genera el service worker minificado.
  const build = spawnSync("pnpm", ["--filter", "@atrio/guard", "build"], {
    encoding: "utf-8",
    env: { ...process.env, NODE_ENV: "production" },
  });
  expect(build.status, build.stdout + build.stderr).toBe(0);
  manifest = JSON.parse(read("manifest.webmanifest")) as Manifest;
  sw = read("sw.js");
  precached = [...sw.matchAll(/\{url:"([^"]+)"/g)].map((match) => match[1] as string);
}, 120_000);

function pngSize(file: string): [number, number] {
  const bytes = readFileSync(file);
  expect(bytes.subarray(1, 4).toString("ascii"), file).toBe("PNG");
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

function token(name: string): string {
  const theme = readFileSync("packages/ui/src/theme.css", "utf-8");
  return new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6});`).exec(theme)?.[1] as string;
}

describe("guard es una PWA instalable (OFF-01)", () => {
  it("el manifiesto declara una app independiente con nombre, alcance y colores de marca", () => {
    expect(manifest).toMatchObject({
      name: "Atrio Garita",
      short_name: "Atrio",
      lang: "es-GT",
      start_url: "/",
      scope: "/",
      display: "standalone",
    });
    expect(manifest["theme_color"]).toBe(token("anil-600"));
    expect(manifest["background_color"]).toBe(token("cal"));
  });

  it("tiene íconos PNG de 192 y 512 px (uno maskable) cuyas dimensiones reales coinciden", () => {
    const png = manifest.icons.filter((icon) => icon.type === "image/png");
    const sizes = png.map((icon) => icon.sizes);
    expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    expect(png.some((icon) => icon.purpose === "maskable")).toBe(true);
    for (const icon of png) {
      const [width, height] = pngSize(join(dist, icon.src));
      expect(`${width}x${height}`, icon.src).toBe(icon.sizes);
    }
  });

  it("el HTML enlaza el manifiesto, registra el service worker y trae los íconos", () => {
    const html = read("index.html");
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest">');
    expect(html).toMatch(/<script[^>]+src="\/registerSW\.js"/);
    expect(html).toContain('rel="apple-touch-icon"');
    expect(read("registerSW.js")).toContain("serviceWorker.register('/sw.js'");
  });
});

describe("shell sin conexión: el service worker precachea lo necesario", () => {
  it("el precaché incluye index.html, todo el JS del build y los íconos del manifiesto", () => {
    expect(precached).toContain("index.html");
    for (const file of readdirSync(join(dist, "assets")).filter((name) => name.endsWith(".js"))) {
      expect(precached, file).toContain(`assets/${file}`);
    }
    for (const icon of manifest.icons) {
      expect(precached, icon.src).toContain(icon.src.replace(/^\//, ""));
    }
  });

  it("cada entrada del precaché existe en el build y no hay duplicadas", () => {
    for (const url of precached) expect(existsSync(join(dist, url)), url).toBe(true);
    expect(new Set(precached).size).toBe(precached.length);
  });

  it("las navegaciones se resuelven con el shell (index.html)", () => {
    expect(sw).toContain('createHandlerBoundToURL("index.html")');
  });
});

describe("el service worker no cachea respuestas de la API", () => {
  it("no define cachés de ejecución: la única ruta es la navegación al shell", () => {
    const workbox = readdirSync(dist).filter((name) => /^workbox-.*\.js$/.test(name));
    expect(workbox).toHaveLength(1);
    const code = sw + read(workbox[0] as string);
    expect(code).not.toMatch(
      /StaleWhileRevalidate|NetworkFirst|CacheFirst|CacheOnly|NetworkOnly|runtimeCaching/,
    );
    expect(sw.match(/registerRoute\(/g)).toHaveLength(1);
    expect(sw).toContain("new e.NavigationRoute(");
  });

  it("una navegación a /api/ no se responde con el shell", () => {
    expect(sw).toContain("denylist:[/^\\/api\\//]");
  });

  it("el service worker no intercepta `fetch` por su cuenta ni usa Background Sync", () => {
    expect(sw).not.toMatch(/addEventListener\("fetch"|addEventListener\("sync"/);
  });

  it("una versión nueva no toma el control sola (OFF-09): no llama a skipWaiting ni clientsClaim", () => {
    // `skipWaiting` solo se ejecuta si la app lo pide con un mensaje explícito (FR-06d).
    expect(sw).not.toMatch(/clientsClaim\(\)/);
    expect(sw.match(/skipWaiting\(\)/g)).toHaveLength(1);
    expect(sw).toMatch(/"SKIP_WAITING"===e\.data\.type&&self\.skipWaiting\(\)/);
  });
});
