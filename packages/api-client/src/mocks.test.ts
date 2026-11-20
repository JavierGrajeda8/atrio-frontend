import { readFileSync } from "node:fs";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ApiError, createApiClient, createTokenStore, isApiError } from "./index";
import { defaultHandlers, mockHandler, mockOperations } from "./mocks";

const BASE = "http://api.test";
const ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const client = createApiClient({ baseUrl: BASE, tokenStore: createTokenStore() });
const getResidential = () =>
  client.GET("/api/v1/residentials/{residential_id}", { params: { path: { residential_id: ID } } });

const server = setupServer(...defaultHandlers);
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => undefined,
    (error: unknown) => error,
  );
}

describe("mocks MSW generados del contrato", () => {
  it("cubren GET del residencial con 200, 403 y 404", () => {
    const get = mockOperations["get_residential"];
    expect(get.method).toBe("get");
    expect(get.path).toBe("/api/v1/residentials/{residential_id}");
    expect(Object.keys(get.responses)).toEqual(expect.arrayContaining(["200", "403", "404"]));
  });

  it("hay un mock por cada operación y estado que declara openapi.json (ni más ni menos)", () => {
    const contract = JSON.parse(readFileSync("openapi/openapi.json", "utf-8")) as {
      paths: Record<
        string,
        Record<string, { operationId: string; responses: Record<string, unknown> }>
      >;
    };
    const fromContract: Record<string, string[]> = {};
    for (const item of Object.values(contract.paths)) {
      for (const op of Object.values(item))
        fromContract[op.operationId] = Object.keys(op.responses).sort();
    }
    const fromMocks = Object.fromEntries(
      Object.entries(mockOperations).map(([id, op]) => [id, Object.keys(op.responses).sort()]),
    );
    expect(fromMocks).toEqual(fromContract);
  });

  it("los errores 403 y 404 traen el código estable de su estado", () => {
    const { responses } = mockOperations["get_residential"];
    expect(responses[403].body.error.code).toBe("FORBIDDEN");
    expect(responses[404].body.error.code).toBe("NOT_FOUND");
  });

  it("el camino feliz: GET del residencial devuelve el cuerpo generado del contrato", async () => {
    const { data, error } = await getResidential();
    expect(error).toBeUndefined();
    expect(data).toEqual(mockOperations["get_residential"].responses[200].body);
    expect(data?.id).toBe(ID);
  });

  it("un test usa los mocks con datos propios (patch sobre el cuerpo generado)", async () => {
    server.use(
      mockHandler("get_residential", 200, { name: "Los Olivos", timezone: "America/Guatemala" }),
    );
    const { data } = await getResidential();
    expect(data).toMatchObject({
      name: "Los Olivos",
      timezone: "America/Guatemala",
      slug: "string",
    });
  });
});

describe("el cliente convierte los errores en ApiError", () => {
  it("404 → NOT_FOUND con su clave i18n", async () => {
    server.use(mockHandler("get_residential", 404));
    const error = await rejection(getResidential());
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      code: "NOT_FOUND",
      status: 404,
      i18nKey: "api.error.NOT_FOUND",
      requestId: "mock-request-id",
    });
  });

  it("403 → FORBIDDEN", async () => {
    server.use(mockHandler("get_residential", 403));
    expect(await rejection(getResidential())).toMatchObject({
      code: "FORBIDDEN",
      status: 403,
      i18nKey: "api.error.FORBIDDEN",
    });
  });

  it("403 con MEMBERSHIP_NOT_ACTIVE se distingue de FORBIDDEN por el código", async () => {
    server.use(
      mockHandler("get_residential", 403, {
        error: { code: "MEMBERSHIP_NOT_ACTIVE", message: "x", details: {}, request_id: "r1" },
      }),
    );
    expect(await rejection(getResidential())).toMatchObject({
      code: "MEMBERSHIP_NOT_ACTIVE",
      i18nKey: "api.error.MEMBERSHIP_NOT_ACTIVE",
      requestId: "r1",
    });
  });

  it("422 con el cuerpo { detail } del contrato → VALIDATION_ERROR por estado", async () => {
    server.use(mockHandler("get_residential", 422));
    expect(await rejection(getResidential())).toMatchObject({
      code: "VALIDATION_ERROR",
      i18nKey: "api.error.VALIDATION_ERROR",
    });
  });

  it("PATCH: 412 y 428 de la concurrencia optimista (API-07)", async () => {
    const patch = () =>
      client.PATCH("/api/v1/residentials/{residential_id}", {
        params: { path: { residential_id: ID }, header: { "if-match": '"v1"' } },
        body: { name: "Nuevo nombre" },
      });
    server.use(mockHandler("update_residential", 412));
    expect(await rejection(patch())).toMatchObject({ code: "PRECONDITION_FAILED", status: 412 });
    server.use(mockHandler("update_residential", 428));
    expect(await rejection(patch())).toMatchObject({ code: "PRECONDITION_REQUIRED", status: 428 });
  });

  it("503 de /readyz → SERVICE_UNAVAILABLE aunque no traiga cuerpo", async () => {
    server.use(mockHandler("readyz", 503));
    expect(await rejection(client.GET("/readyz"))).toMatchObject({
      code: "SERVICE_UNAVAILABLE",
      i18nKey: "api.error.SERVICE_UNAVAILABLE",
    });
  });

  it("el éxito no lanza nada y no pasa por el mapeo de errores", async () => {
    const result = await getResidential();
    expect(isApiError(result.error)).toBe(false);
    expect(result.response.status).toBe(200);
  });

  it("una falla de red → NETWORK_ERROR (status 0)", async () => {
    server.use(http.get(`${BASE}/api/v1/residentials/:id`, () => HttpResponse.error()));
    expect(await rejection(getResidential())).toMatchObject({
      code: "NETWORK_ERROR",
      status: 0,
      i18nKey: "api.error.NETWORK_ERROR",
    });
  });

  it("cancelar la petición no se disfraza de falla de red", async () => {
    const controller = new AbortController();
    controller.abort();
    const error = await rejection(
      client.GET("/api/v1/residentials/{residential_id}", {
        params: { path: { residential_id: ID } },
        signal: controller.signal,
      }),
    );
    expect(isApiError(error)).toBe(false);
    expect((error as Error).name).toBe("AbortError");
  });

  it("un código nuevo del backend no rompe nada: conserva el código y usa el mensaje del estado", async () => {
    server.use(
      mockHandler("get_residential", 403, {
        error: { code: "ALGO_NUEVO", message: "x", details: {}, request_id: "r" },
      }),
    );
    expect(await rejection(getResidential())).toMatchObject({
      code: "ALGO_NUEVO",
      i18nKey: "api.error.FORBIDDEN",
    });
  });
});

describe("red de seguridad de las pruebas", () => {
  it("una petición sin manejador falla en vez de salir a la red de verdad", async () => {
    const error = await rejection(fetch(`${BASE}/ruta-que-no-existe-en-el-contrato`));
    expect(error).toBeInstanceOf(TypeError);
  });
});

describe("fetch del cliente", () => {
  it("usa el `fetch` global que se instale DESPUÉS de crear el cliente (p. ej. MSW)", async () => {
    // Este cliente se creó al cargar el módulo, antes de `server.listen()`: si guardara el
    // `fetch` original, la petición saldría de verdad a `api.test` y fallaría por red.
    const { response } = await getResidential();
    expect(response.status).toBe(200);
  });

  it("un `fetch` explícito tiene prioridad sobre el global", async () => {
    const calls: string[] = [];
    const custom = createApiClient({
      baseUrl: BASE,
      tokenStore: createTokenStore(),
      fetch: async (request) => {
        calls.push(request.url);
        return Response.json(mockOperations["get_residential"].responses[200].body);
      },
    });
    await custom.GET("/api/v1/residentials/{residential_id}", {
      params: { path: { residential_id: ID } },
    });
    expect(calls).toEqual([`${BASE}/api/v1/residentials/${ID}`]);
  });
});

describe("mockHandler", () => {
  it("rechaza un estado que el contrato no declara", () => {
    // @ts-expect-error 418 no existe en el contrato: ni compila ni se acepta en ejecución.
    expect(() => mockHandler("get_residential", 418)).toThrow(/no declara 418/);
  });
});
