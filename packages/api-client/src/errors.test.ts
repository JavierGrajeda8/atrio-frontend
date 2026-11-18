import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import en from "../../i18n/src/locales/en-US.json";
import es from "../../i18n/src/locales/es-GT.json";
import {
  ApiError,
  KNOWN_ERROR_CODES,
  NETWORK_ERROR,
  codeForStatus,
  isApiError,
  messageIdFor,
  readApiError,
} from "./index";

const json = (body: unknown, status: number, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

const api03 = (code: string, extra: Record<string, unknown> = {}) => ({
  error: { code, message: "Texto del servidor", details: {}, request_id: "01JREQ", ...extra },
});

describe("mapeo de errores API-03", () => {
  it("una respuesta de error con `code` produce un ApiError con ese código y su clave i18n", async () => {
    const error = await readApiError(json(api03("MEMBERSHIP_NOT_ACTIVE"), 403));
    expect(error).toBeInstanceOf(ApiError);
    expect(isApiError(error)).toBe(true);
    expect(error.code).toBe("MEMBERSHIP_NOT_ACTIVE");
    expect(error.status).toBe(403);
    expect(error.i18nKey).toBe("api.error.MEMBERSHIP_NOT_ACTIVE");
  });

  it("conserva el id de petición, los detalles y el mensaje del servidor", async () => {
    const error = await readApiError(
      json(
        api03("VALIDATION_ERROR", { details: { errors: [{ field: "name", type: "missing" }] } }),
        422,
      ),
    );
    expect(error.requestId).toBe("01JREQ");
    expect(error.details).toEqual({ errors: [{ field: "name", type: "missing" }] });
    expect(error.serverMessage).toBe("Texto del servidor");
  });

  it.each(KNOWN_ERROR_CODES)("%s tiene su clave y su mensaje en es-GT y en-US", async (code) => {
    const error = await readApiError(json(api03(code), 400));
    const key = error.i18nKey;
    expect(key).toBe(`api.error.${code}`);
    expect((es as Record<string, string>)[key], `es-GT ${key}`).toBeTruthy();
    expect((en as Record<string, string>)[key], `en-US ${key}`).toBeTruthy();
  });

  it("se decide por `code`, nunca por el texto del mensaje", async () => {
    const a = await readApiError(json(api03("FORBIDDEN", { message: "No tienes permiso" }), 403));
    const b = await readApiError(
      json(api03("FORBIDDEN", { message: "Mensaje totalmente distinto" }), 403),
    );
    const c = await readApiError(json(api03("NOT_FOUND", { message: "No tienes permiso" }), 403));
    expect([a.code, a.i18nKey]).toEqual([b.code, b.i18nKey]);
    expect(c.i18nKey).toBe("api.error.NOT_FOUND"); // gana el código, aunque el texto diga otra cosa
  });

  it("el mensaje de Error es solo el código (seguro para registrar)", async () => {
    const error = await readApiError(
      json(api03("FORBIDDEN", { message: "dato sensible 5555-1234" }), 403),
    );
    expect(error.message).toBe("FORBIDDEN");
    expect(error.name).toBe("ApiError");
    expect(String(error.stack)).not.toContain("5555-1234");
  });

  it("un código nuevo del backend (desconocido) usa el mensaje de su estado HTTP", async () => {
    const error = await readApiError(json(api03("VISIT_EXPIRED"), 403));
    expect(error.code).toBe("VISIT_EXPIRED"); // el código real se conserva para quien lo maneje
    expect(error.i18nKey).toBe("api.error.FORBIDDEN"); // pero el mensaje es el de 403
    expect((await readApiError(json(api03("AREA_FULL"), 409))).i18nKey).toBe(
      "api.error.HTTP_ERROR",
    );
    expect((await readApiError(json(api03("OTRO"), 502))).i18nKey).toBe("api.error.INTERNAL_ERROR");
  });

  it.each([
    ["cuerpo vacío", new Response(null, { status: 404 }), "NOT_FOUND"],
    ["no es JSON", new Response("<html>oops</html>", { status: 503 }), "SERVICE_UNAVAILABLE"],
    ["el { detail } de FastAPI", json({ detail: [{ msg: "x" }] }, 422), "VALIDATION_ERROR"],
    ["error sin código", json({ error: { message: "x" } }, 401), "UNAUTHENTICATED"],
    ["código con formato inválido", json(api03("no es un código"), 403), "FORBIDDEN"],
    ["código que no es texto", json({ error: { code: 42 } }, 412), "PRECONDITION_FAILED"],
    ["un arreglo", json([1, 2], 428), "PRECONDITION_REQUIRED"],
  ])("%s: cae al código de su estado HTTP", async (_label, response, expected) => {
    const error = await readApiError(response);
    expect(error.code).toBe(expected);
    expect(error.serverMessage).toBeUndefined();
    expect(error.i18nKey).toBe(`api.error.${expected}`);
  });

  it("toma el id de petición de la cabecera si el cuerpo no lo trae", async () => {
    const error = await readApiError(
      new Response(null, { status: 500, headers: { "X-Request-ID": "abc" } }),
    );
    expect(error.requestId).toBe("abc");
    expect(error.code).toBe("INTERNAL_ERROR");
  });

  it("no consume la respuesta original", async () => {
    const response = json(api03("FORBIDDEN"), 403);
    await readApiError(response);
    expect(response.bodyUsed).toBe(false);
  });

  it("el estado → código es el mismo que usa el backend", () => {
    expect(codeForStatus(401)).toBe("UNAUTHENTICATED");
    expect(codeForStatus(403)).toBe("FORBIDDEN");
    expect(codeForStatus(404)).toBe("NOT_FOUND");
    expect(codeForStatus(405)).toBe("METHOD_NOT_ALLOWED");
    expect(codeForStatus(412)).toBe("PRECONDITION_FAILED");
    expect(codeForStatus(422)).toBe("VALIDATION_ERROR");
    expect(codeForStatus(428)).toBe("PRECONDITION_REQUIRED");
    expect(codeForStatus(500)).toBe("INTERNAL_ERROR");
    expect(codeForStatus(503)).toBe("SERVICE_UNAVAILABLE");
    expect(codeForStatus(418)).toBe("HTTP_ERROR");
    expect(codeForStatus(504)).toBe("INTERNAL_ERROR");
  });

  it("la falla de red tiene su propia clave", () => {
    expect(messageIdFor(NETWORK_ERROR, 0)).toBe("api.error.NETWORK_ERROR");
    expect((es as Record<string, string>)["api.error.NETWORK_ERROR"]).toBeTruthy();
    expect((en as Record<string, string>)["api.error.NETWORK_ERROR"]).toBeTruthy();
  });
});

describe("catálogo de errores", () => {
  it("cada código conocido de la plataforma está en es-GT y en en-US (y no sobran claves)", () => {
    const expected = [...KNOWN_ERROR_CODES, NETWORK_ERROR]
      .map((code) => `api.error.${code}`)
      .sort();
    for (const catalog of [es, en] as Array<Record<string, string>>) {
      expect(
        Object.keys(catalog)
          .filter((key) => key.startsWith("api.error."))
          .sort(),
      ).toEqual(expected);
    }
  });

  it("los mensajes no tienen marcadores sin resolver ni valores vacíos", () => {
    for (const code of [...KNOWN_ERROR_CODES, NETWORK_ERROR]) {
      for (const catalog of [es, en] as Array<Record<string, string>>) {
        expect(catalog[`api.error.${code}`], code).not.toMatch(/[{}]|undefined/);
      }
    }
  });

  it("la lista de códigos conocidos coincide con la del backend cuando está disponible", () => {
    const path = "../backend/src/atrio/platform/errors.py";
    let source: string;
    try {
      source = readFileSync(path, "utf-8");
    } catch {
      return; // sin el repositorio del backend al lado (p. ej. en CI) no se puede comparar
    }
    const backend = [...source.matchAll(/^([A-Z][A-Z_]+) = "\1"$/gm)]
      .map((match) => match[1])
      .sort();
    expect([...KNOWN_ERROR_CODES].sort()).toEqual(backend);
  });
});
