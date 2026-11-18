/* global console */
// Genera `src/generated/mocks.ts` desde `openapi/openapi.json`: una respuesta de ejemplo por cada
// estado que el contrato declara para cada operación. Cada cuerpo lleva el tipo del esquema
// (`satisfies components["schemas"][…]`): si el contrato cambia y el mock deja de cumplirlo,
// `tsc` falla. No se versiona (REP-07), igual que `schema.d.ts`.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const CONTRACT = resolve(here, "../../../openapi/openapi.json");
const STATUS_CODES = resolve(here, "../src/status-codes.json");
const OUT = resolve(here, "../src/generated/mocks.ts");

const contract = JSON.parse(readFileSync(CONTRACT, "utf-8"));
const statusCodes = JSON.parse(readFileSync(STATUS_CODES, "utf-8"));
const schemas = contract.components?.schemas ?? {};
const METHODS = ["get", "put", "post", "delete", "patch"];

const refName = (ref) => ref.split("/").pop();

// Valor de ejemplo que cumple el esquema. Es determinista: la misma entrada da la misma salida.
function sample(schema, seen = []) {
  if (!schema || typeof schema !== "object") return null;
  if (schema.$ref) {
    const name = refName(schema.$ref);
    return seen.includes(name) ? null : sample(schemas[name], [...seen, name]);
  }
  if ("example" in schema) return schema.example;
  if ("const" in schema) return schema.const;
  if (Array.isArray(schema.enum)) return schema.enum[0];
  if (schema.allOf) {
    return Object.assign({}, ...schema.allOf.map((part) => sample(part, seen)));
  }
  const options = schema.anyOf ?? schema.oneOf;
  if (options) {
    const first = options.find((option) => option.type !== "null") ?? options[0];
    return sample(first, seen);
  }
  switch (schema.type) {
    case "string":
      if (schema.format === "uuid") return "3fa85f64-5717-4562-b3fc-2c963f66afa6";
      if (schema.format === "date-time") return "2026-01-01T00:00:00Z";
      if (schema.format === "date") return "2026-01-01";
      if (schema.format === "email") return "usuario@example.com";
      if (schema.format === "uri") return "https://example.com";
      return "string";
    case "integer":
    case "number":
      return schema.minimum ?? 0;
    case "boolean":
      return false;
    case "array":
      return [sample(schema.items, seen)];
    case "object": {
      const out = {};
      for (const [key, value] of Object.entries(schema.properties ?? {})) {
        out[key] = sample(value, seen);
      }
      return out;
    }
    default:
      return null; // esquema sin tipo (JSON libre)
  }
}

// Un cuerpo de error estándar (API-03) lleva el código estable que corresponde a su estado.
function withErrorCode(body, status) {
  const isApi03 =
    body && typeof body === "object" && body.error && typeof body.error.code === "string";
  if (!isApi03) return body;
  const code = statusCodes[String(status)] ?? "HTTP_ERROR";
  return { error: { ...body.error, code, message: `Mock ${code}`, request_id: "mock-request-id" } };
}

const operations = {};
for (const [path, item] of Object.entries(contract.paths ?? {})) {
  for (const method of METHODS) {
    const op = item[method];
    if (!op) continue;
    const id = op.operationId ?? `${method} ${path}`;
    const responses = {};
    for (const [status, response] of Object.entries(op.responses ?? {})) {
      if (!/^\d{3}$/.test(status)) continue;
      const schema = response.content?.["application/json"]?.schema;
      const body = schema ? withErrorCode(sample(schema), Number(status)) : null;
      const type = schema?.$ref ? refName(schema.$ref) : null;
      responses[status] = { body, type };
    }
    operations[id] = { method, path, responses };
  }
}

const lines = [
  "// GENERADO por scripts/generate-mocks.mjs desde openapi/openapi.json. No editar ni versionar.",
  'import type { components } from "./schema";',
  "",
  "export const mockOperations = {",
];
for (const [id, op] of Object.entries(operations)) {
  lines.push(`  ${JSON.stringify(id)}: {`, `    method: ${JSON.stringify(op.method)},`);
  lines.push(`    path: ${JSON.stringify(op.path)},`, "    responses: {");
  for (const [status, { body, type }] of Object.entries(op.responses)) {
    const json = JSON.stringify(body, null, 2).replace(/\n/g, "\n        ");
    const typed = type ? ` satisfies components["schemas"][${JSON.stringify(type)}]` : "";
    lines.push(`      ${status}: { status: ${status}, body: ${json}${typed} },`);
  }
  lines.push("    },", "  },");
}
lines.push("} as const;", "");

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, lines.join("\n"));
console.log(`🧪 mocks → src/generated/mocks.ts (${Object.keys(operations).length} operaciones)`);
