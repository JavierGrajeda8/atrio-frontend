import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ApiError, createApiClient, createTokenStore } from "./index";
import { defaultHandlers } from "./mocks";

const BASE = "http://api.test";
const ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const PATH = `${BASE}/api/v1/residentials/${ID}`;
const TOKEN = "token-de-prueba";

const getResidential = (client: ReturnType<typeof createApiClient>) =>
  client.GET("/api/v1/residentials/{residential_id}", { params: { path: { residential_id: ID } } });

const server = setupServer(...defaultHandlers);
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

function captureRequests(): Request[] {
  const seen: Request[] = [];
  server.events.on("request:start", ({ request }) => seen.push(request.clone()));
  return seen;
}

function respond401(): void {
  server.use(
    http.get(PATH, () =>
      HttpResponse.json(
        { code: "UNAUTHENTICATED", message: "x" },
        { status: 401, headers: { "X-Request-ID": "req-401" } },
      ),
    ),
  );
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => undefined,
    (error: unknown) => error,
  );
}

describe("token en memoria y cabecera Authorization (FE-02)", () => {
  it("envía Authorization: Bearer <token> cuando hay token", async () => {
    const store = createTokenStore();
    const client = createApiClient({ baseUrl: BASE, tokenStore: store });
    const seen = captureRequests();
    store.set(TOKEN);
    await getResidential(client);
    expect(seen).toHaveLength(1);
    expect(seen[0]?.headers.get("Authorization")).toBe(`Bearer ${TOKEN}`);
  });

  it("sin token no envía Authorization", async () => {
    const client = createApiClient({ baseUrl: BASE, tokenStore: createTokenStore() });
    const seen = captureRequests();
    await getResidential(client);
    expect(seen[0]?.headers.has("Authorization")).toBe(false);
  });

  it("lee el token en cada petición: cambiarlo o limpiarlo surte efecto de inmediato", async () => {
    const store = createTokenStore();
    const client = createApiClient({ baseUrl: BASE, tokenStore: store });
    const seen = captureRequests();
    store.set("uno");
    await getResidential(client);
    store.set("dos");
    await getResidential(client);
    store.clear();
    await getResidential(client);
    expect(seen.map((r) => r.headers.get("Authorization"))).toEqual([
      "Bearer uno",
      "Bearer dos",
      null,
    ]);
  });

  it("no pisa una cabecera Authorization que la petición ya trae", async () => {
    const store = createTokenStore();
    store.set(TOKEN);
    const client = createApiClient({ baseUrl: BASE, tokenStore: store });
    const seen = captureRequests();
    await client.GET("/api/v1/residentials/{residential_id}", {
      params: { path: { residential_id: ID } },
      headers: { Authorization: "Bearer otro" },
    });
    expect(seen[0]?.headers.get("Authorization")).toBe("Bearer otro");
  });

  it("el token nunca va en la URL ni en el cuerpo", async () => {
    const store = createTokenStore();
    store.set(TOKEN);
    const client = createApiClient({ baseUrl: BASE, tokenStore: store });
    const seen = captureRequests();
    await getResidential(client);
    expect(seen[0]?.url).not.toContain(TOKEN);
    expect(await seen[0]?.text()).not.toContain(TOKEN);
  });

  it("rechaza un token vacío", () => {
    expect(() => createTokenStore().set("  ")).toThrow(TypeError);
  });

  it("no usa localStorage, sessionStorage, IndexedDB ni cookies al asignarlo y usarlo", async () => {
    const trap = (name: string) =>
      new Proxy(
        {},
        {
          get: () => () => {
            throw new Error(`${name} no debe usarse para el token`);
          },
        },
      );
    vi.stubGlobal("localStorage", trap("localStorage"));
    vi.stubGlobal("sessionStorage", trap("sessionStorage"));
    vi.stubGlobal("indexedDB", trap("indexedDB"));
    const cookieWrites = vi.fn();
    vi.stubGlobal("document", {
      get cookie() {
        return "";
      },
      set cookie(value: string) {
        cookieWrites(value);
      },
    });
    const store = createTokenStore();
    const client = createApiClient({ baseUrl: BASE, tokenStore: store });
    store.set(TOKEN);
    await getResidential(client);
    respond401();
    await rejection(getResidential(client));
    expect(cookieWrites).not.toHaveBeenCalled();
  });

  it("el token no es una propiedad enumerable del almacén ni sale en JSON ni en log", () => {
    const store = createTokenStore();
    store.set(TOKEN);
    expect(JSON.stringify(store)).not.toContain(TOKEN);
    expect(Object.values(store).map(String).join()).not.toContain(TOKEN);
  });

  it("el código que se envía no toca storage, cookies ni consola", () => {
    const dir = join(process.cwd(), "packages/api-client/src");
    const shipped = readdirSync(dir).filter(
      (f) => /\.ts$/.test(f) && !/\.test\.ts$|^mocks\.ts$|^contract\.fixture\.ts$/.test(f),
    );
    expect(shipped).toContain("session.ts");
    for (const file of shipped) {
      expect(readFileSync(join(dir, file), "utf-8"), file).not.toMatch(
        /\b(localStorage|sessionStorage|indexedDB|console)\b|document\.cookie/,
      );
    }
  });
});

describe("gancho onUnauthorized ante un 401", () => {
  it("lo invoca una sola vez y sin llamar a ningún otro endpoint", async () => {
    respond401();
    const onUnauthorized = vi.fn();
    const store = createTokenStore();
    store.set(TOKEN);
    const client = createApiClient({ baseUrl: BASE, tokenStore: store, onUnauthorized });
    const seen = captureRequests();
    const error = await rejection(getResidential(client));
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledWith({ requestId: "req-401" });
    expect(seen).toHaveLength(1); // ni refresh ni reintento: el contrato no tiene ese endpoint (REP-03)
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
    expect((error as ApiError).code).toBe("UNAUTHENTICATED");
  });

  it("descarta el token vencido para no reenviarlo", async () => {
    respond401();
    const store = createTokenStore();
    store.set(TOKEN);
    const client = createApiClient({ baseUrl: BASE, tokenStore: store });
    await rejection(getResidential(client));
    expect(store.get()).toBeNull();
  });

  it("no borra un token nuevo asignado mientras la petición vieja estaba en vuelo", async () => {
    const store = createTokenStore();
    store.set("viejo");
    server.use(
      http.get(PATH, () => {
        store.set("nuevo");
        return HttpResponse.json({ code: "UNAUTHENTICATED", message: "x" }, { status: 401 });
      }),
    );
    const client = createApiClient({ baseUrl: BASE, tokenStore: store });
    await rejection(getResidential(client));
    expect(store.get()).toBe("nuevo");
  });

  it("el contexto del gancho no incluye el token", async () => {
    respond401();
    const onUnauthorized = vi.fn();
    const store = createTokenStore();
    store.set(TOKEN);
    await rejection(
      getResidential(createApiClient({ baseUrl: BASE, tokenStore: store, onUnauthorized })),
    );
    expect(JSON.stringify(onUnauthorized.mock.calls)).not.toContain(TOKEN);
  });

  it("espera al gancho asíncrono, y si falla igual lanza el ApiError original", async () => {
    respond401();
    const order: string[] = [];
    const onUnauthorized = vi.fn(async () => {
      await Promise.resolve();
      order.push("gancho");
      throw new Error("falla del gancho");
    });
    const client = createApiClient({
      baseUrl: BASE,
      tokenStore: createTokenStore(),
      onUnauthorized,
    });
    const error = await rejection(getResidential(client));
    order.push("rechazo");
    expect(order).toEqual(["gancho", "rechazo"]);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
  });

  it("funciona sin gancho configurado", async () => {
    respond401();
    const error = await rejection(
      getResidential(createApiClient({ baseUrl: BASE, tokenStore: createTokenStore() })),
    );
    expect(error).toBeInstanceOf(ApiError);
  });

  it.each([403, 404, 500])("no se invoca con un %i, ni con éxito", async (status) => {
    const onUnauthorized = vi.fn();
    const store = createTokenStore();
    store.set(TOKEN);
    const client = createApiClient({ baseUrl: BASE, tokenStore: store, onUnauthorized });
    server.use(
      http.get(PATH, () => HttpResponse.json({ code: "HTTP_ERROR", message: "x" }, { status })),
    );
    await rejection(getResidential(client));
    server.resetHandlers();
    await getResidential(client);
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(store.get()).toBe(TOKEN);
  });

  it("no se invoca ante una falla de red", async () => {
    server.use(http.get(PATH, () => HttpResponse.error()));
    const onUnauthorized = vi.fn();
    const error = await rejection(
      getResidential(
        createApiClient({ baseUrl: BASE, tokenStore: createTokenStore(), onUnauthorized }),
      ),
    );
    expect((error as ApiError).code).toBe("NETWORK_ERROR");
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
