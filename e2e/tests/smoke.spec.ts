import { expect, test } from "@playwright/test";

// Id determinista de «Las Flores» en el seed (atrio-backend `make seed`, uuid5).
const LAS_FLORES = "dc8bef5c-f9f8-5090-b62a-19ab640a8112";

test.describe("FR-10a — entorno E2E con la imagen real del backend", () => {
  test("/healthz responde 200", async ({ request }) => {
    const response = await request.get("/healthz");
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  test("/readyz responde 200: la API ve PostgreSQL con las migraciones aplicadas", async ({
    request,
  }) => {
    const response = await request.get("/readyz");
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  test("un recurso del residencial sembrado exige autenticación (401 UNAUTHENTICATED)", async ({
    request,
  }) => {
    const response = await request.get(`/api/v1/residentials/${LAS_FLORES}`);
    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: "UNAUTHENTICATED" } });
  });
});
