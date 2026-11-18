import { http, HttpResponse } from "msw";
import type { HttpHandler, JsonBodyType } from "msw";
import { mockOperations } from "./generated/mocks";

// Mocks de MSW para pruebas. Las respuestas salen del contrato (`generated/mocks.ts`); aquí solo
// se convierten en manejadores. Se importa como `@atrio/api-client/mocks`: `msw` no entra en el
// bundle de ninguna app.

type Operations = typeof mockOperations;
export type MockOperationId = keyof Operations;
export type MockStatus<Id extends MockOperationId> = Extract<
  keyof Operations[Id]["responses"],
  number
>;

interface LooseOperation {
  method: "get" | "put" | "post" | "delete" | "patch";
  path: string;
  responses: Record<number, { body: unknown }>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function build(operation: LooseOperation, status: number, patch?: Record<string, unknown>) {
  const response = operation.responses[status];
  if (!response) throw new Error(`El contrato no declara ${status} para ${operation.path}`);
  const body = patch && isRecord(response.body) ? { ...response.body, ...patch } : response.body;
  // `{residential_id}` del contrato → `:residential_id` de MSW; `*` admite cualquier origen.
  const url = `*${operation.path.replace(/\{(\w+)\}/g, ":$1")}`;
  const register: typeof http.get = http[operation.method];
  return register(url, () =>
    body === null
      ? new HttpResponse(null, { status })
      : HttpResponse.json(body as JsonBodyType, { status }),
  );
}

/**
 * Manejador de MSW para una operación y un estado que el contrato declara. `patch` se mezcla
 * (en el primer nivel) con el cuerpo generado, p. ej. `{ name: "Los Olivos" }` o, para un error,
 * `{ error: { code: "MEMBERSHIP_NOT_ACTIVE", message: "…", details: {}, request_id: "r" } }`.
 */
export function mockHandler<Id extends MockOperationId>(
  id: Id,
  status: MockStatus<Id>,
  patch?: Record<string, unknown>,
): HttpHandler {
  return build(mockOperations[id] as unknown as LooseOperation, status, patch);
}

/** Un manejador por operación con su primera respuesta 2xx: el «camino feliz» del contrato. */
export const defaultHandlers: HttpHandler[] = Object.values(mockOperations).map((operation) => {
  const loose = operation as unknown as LooseOperation;
  const ok = Object.keys(loose.responses)
    .map(Number)
    .find((status) => status >= 200 && status < 300);
  if (ok === undefined) throw new Error(`${loose.path} no declara una respuesta 2xx`);
  return build(loose, ok);
});

export { mockOperations };
