import { generateKeyPairSync, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { ApiError, createApiClient, createTokenStore } from "@atrio/api-client";
import { claimsFor, signToken, unsignedToken } from "../support/jwt";
import { LAS_FLORES, LOS_PINOS, UNKNOWN_RESIDENTIAL, USERS } from "../support/seed";

// FR-10b: `GET /api/v1/residentials/{id}` con el cliente generado (@atrio/api-client) contra la
// imagen real del backend. No hay login (M1): los tokens los firma `support/jwt.ts` con el par de
// claves efímero de esta corrida, cuya pública está configurada en el backend.

function clientFor(baseUrl: string, token?: string) {
  const tokenStore = createTokenStore();
  if (token !== undefined) tokenStore.set(token);
  return { tokenStore, client: createApiClient({ baseUrl, tokenStore }) };
}

const getResidential = (client: ReturnType<typeof clientFor>["client"], id: string) =>
  client.GET("/api/v1/residentials/{residential_id}", { params: { path: { residential_id: id } } });

/** El `ApiError` que lanza el cliente ante una respuesta que no es 2xx. */
async function failure(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(error, "se esperaba un ApiError").toBeInstanceOf(ApiError);
  return error as ApiError;
}

test.describe("FR-10b — GET /residentials/{id} con el cliente generado", () => {
  test("camino feliz: el admin del seed lee los datos de su residencial (200)", async ({
    baseURL,
  }) => {
    const { client } = clientFor(baseURL as string, signToken(claimsFor(USERS.adminFlores)));
    const { data, response } = await getResidential(client, LAS_FLORES.id);
    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      id: LAS_FLORES.id,
      slug: LAS_FLORES.slug,
      name: LAS_FLORES.name,
      timezone: "America/Guatemala",
      locale: "es-GT",
    });
    expect(response.headers.get("etag")).toBeTruthy();
  });

  test("cada admin lee su propio residencial", async ({ baseURL }) => {
    const { client } = clientFor(baseURL as string, signToken(claimsFor(USERS.adminPinos)));
    const { data } = await getResidential(client, LOS_PINOS.id);
    expect(data).toMatchObject({ id: LOS_PINOS.id, name: LOS_PINOS.name });
  });

  test("sin token responde 401 UNAUTHENTICATED y se invoca onUnauthorized", async ({ baseURL }) => {
    const unauthorized: unknown[] = [];
    const client = createApiClient({
      baseUrl: baseURL as string,
      tokenStore: createTokenStore(),
      onUnauthorized: (context) => void unauthorized.push(context),
    });
    const error = await failure(getResidential(client, LAS_FLORES.id));
    expect(error.status).toBe(401);
    expect(error.code).toBe("UNAUTHENTICATED");
    expect(error.i18nKey).toBe("api.error.UNAUTHENTICATED");
    expect(unauthorized).toHaveLength(1);
  });

  test("un 401 real descarta el token en memoria (FR-05b contra la API real)", async ({
    baseURL,
  }) => {
    const { client, tokenStore } = clientFor(baseURL as string, "no.es.un.token");
    expect((await failure(getResidential(client, LAS_FLORES.id))).status).toBe(401);
    expect(tokenStore.get()).toBeNull();
  });

  const invalidTokens: Array<[string, () => string]> = [
    ["texto que no es un JWT", () => "no-es-un-jwt"],
    [
      "firmado con otra clave (no la configurada en el backend)",
      () => signToken(claimsFor(USERS.adminFlores), generateKeyPairSync("ed25519").privateKey),
    ],
    ["con alg none y sin firma", () => unsignedToken(claimsFor(USERS.adminFlores))],
    [
      "con el payload alterado después de firmar",
      () => {
        const [header, , signature] = signToken(claimsFor(USERS.residentFlores2Pending)).split(".");
        const forged = Buffer.from(JSON.stringify(claimsFor(USERS.adminFlores))).toString(
          "base64url",
        );
        return `${header}.${forged}.${signature}`;
      },
    ],
    [
      "vencido",
      () =>
        signToken(
          claimsFor(USERS.adminFlores, {
            iat: Math.floor(Date.now() / 1000) - 1200,
            exp: Math.floor(Date.now() / 1000) - 600,
          }),
        ),
    ],
    [
      "con vida mayor a 10 minutos",
      () => signToken(claimsFor(USERS.adminFlores, { exp: Math.floor(Date.now() / 1000) + 3600 })),
    ],
    ["sin el claim sid", () => signToken(claimsFor(USERS.adminFlores, { sid: undefined }))],
    [
      "ligado a la clave de un dispositivo (cnf), que no se acepta como bearer",
      () => signToken(claimsFor(USERS.adminFlores, { cnf: { jkt: "x" } })),
    ],
  ];

  for (const [name, token] of invalidTokens) {
    test(`token inválido (${name}) responde 401`, async ({ baseURL }) => {
      const { client } = clientFor(baseURL as string, token());
      const error = await failure(getResidential(client, LAS_FLORES.id));
      expect(error.status).toBe(401);
      expect(error.code).toBe("UNAUTHENTICATED");
    });
  }

  test("residencial ajeno: el admin de Las Flores pide Los Pinos y recibe 404 (no 403)", async ({
    baseURL,
  }) => {
    const { client } = clientFor(baseURL as string, signToken(claimsFor(USERS.adminFlores)));
    const error = await failure(getResidential(client, LOS_PINOS.id));
    expect(error.status).toBe(404);
    expect(error.code).toBe("NOT_FOUND");
  });

  test("un residencial ajeno es indistinguible de uno que no existe", async ({ baseURL }) => {
    const { client } = clientFor(baseURL as string, signToken(claimsFor(USERS.adminFlores)));
    const foreign = await failure(getResidential(client, LOS_PINOS.id));
    const unknown = await failure(getResidential(client, UNKNOWN_RESIDENTIAL));
    expect(unknown.status).toBe(foreign.status);
    expect(unknown.code).toBe(foreign.code);
    expect(unknown.serverMessage).toBe(foreign.serverMessage);
  });

  test("un usuario sin membresía en ningún residencial recibe 404", async ({ baseURL }) => {
    const { client } = clientFor(baseURL as string, signToken(claimsFor(randomUUID())));
    expect((await failure(getResidential(client, LAS_FLORES.id))).status).toBe(404);
  });

  test("una membresía no activa recibe 403 MEMBERSHIP_NOT_ACTIVE", async ({ baseURL }) => {
    for (const user of [USERS.residentFlores2Pending, USERS.residentFlores3Suspended]) {
      const { client } = clientFor(baseURL as string, signToken(claimsFor(user)));
      const error = await failure(getResidential(client, LAS_FLORES.id));
      expect(error.status).toBe(403);
      expect(error.code).toBe("MEMBERSHIP_NOT_ACTIVE");
    }
  });
});
