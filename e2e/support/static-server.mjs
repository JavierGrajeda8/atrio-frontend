// Sirve `apps/<app>/dist` como lo hará Cloudflare Pages: aplica `dist/_headers` (CSP, Trusted Types,
// COOP…) a cada respuesta y devuelve `index.html` para las rutas de la SPA. Solo para el E2E: así
// las pruebas de navegador corren contra el build real y con las cabeceras reales (FR-09).
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import process from "node:process";
import { URL } from "node:url";

const [dirArg, portArg] = process.argv.slice(2);
if (!dirArg || !portArg) {
  process.stderr.write("uso: node static-server.mjs <dist> <puerto>\n");
  process.exit(2);
}

const root = resolve(dirArg);
if (!existsSync(join(root, "index.html"))) {
  process.stderr.write(`No hay build en ${root}: corre \`make build\` antes del E2E.\n`);
  process.exit(1);
}

// Cabeceras de la regla `/*` del archivo `_headers`.
const headers = Object.fromEntries(
  readFileSync(join(root, "_headers"), "utf-8")
    .split("\n")
    .filter((line) => line.startsWith("  "))
    .map((line) => {
      const index = line.indexOf(":");
      return [line.slice(2, index), line.slice(index + 1).trim()];
    }),
);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

function resolveFile(pathname) {
  const file = normalize(join(root, decodeURIComponent(pathname)));
  if (file !== root && !file.startsWith(root + sep)) return null; // fuera de dist
  if (existsSync(file) && statSync(file).isFile()) return file;
  // Una ruta de la SPA (sin extensión) se resuelve con el shell; un archivo que falta es 404.
  return extname(pathname) === "" ? join(root, "index.html") : null;
}

createServer((request, response) => {
  const { pathname } = new URL(request.url ?? "/", "http://localhost");
  const file = resolveFile(pathname);
  if (file === null) {
    response.writeHead(404, { "content-type": "text/plain", ...headers });
    response.end("No encontrado");
    return;
  }
  response.writeHead(200, {
    "content-type": types[extname(file)] ?? "application/octet-stream",
    ...headers,
  });
  response.end(readFileSync(file));
}).listen(Number(portArg), "127.0.0.1");
