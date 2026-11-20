import createClient from "openapi-fetch";
import type { Client, ClientOptions, Middleware } from "openapi-fetch";
import { networkError, readApiError } from "./errors";
import type { paths } from "./generated/schema";
import { sessionMiddleware } from "./session";
import type { SessionOptions } from "./session";

export const PACKAGE_NAME = "@atrio/api-client";

export type { components, operations, paths } from "./generated/schema";
export type ApiClient = Client<paths>;

export {
  ApiError,
  KNOWN_ERROR_CODES,
  NETWORK_ERROR,
  codeForStatus,
  isApiError,
  messageIdFor,
  readApiError,
} from "./errors";
export { createTokenStore } from "./session";
export type {
  SessionOptions,
  TokenStore,
  UnauthorizedContext,
  UnauthorizedHandler,
} from "./session";
export type { ErrorCode, ErrorMessageId, KnownErrorCode } from "./errors";

// Toda respuesta que no es 2xx se lanza como `ApiError` (código estable + clave i18n), y una
// falla de red como `ApiError` con código `NETWORK_ERROR`. Una cancelación (`AbortError`) y
// cualquier otro error de programación pasan sin tocar.
const errorMiddleware: Middleware = {
  async onResponse({ response }) {
    if (!response.ok) throw await readApiError(response);
  },
  onError({ error }) {
    // `fetch` rechaza con `TypeError` cuando no logra conectar.
    if (error instanceof TypeError) return networkError();
    return undefined;
  },
};

/** Cliente tipado por `openapi/openapi.json`: un endpoint o campo que no existe no compila (REP-03). */
export function createApiClient(options: ClientOptions & SessionOptions): ApiClient {
  const { tokenStore, onUnauthorized, ...clientOptions } = options;
  // `fetch` se resuelve en cada petición, no al crear el cliente: así toma el que instale MSW u
  // otro polyfill después de crearlo (openapi-fetch guarda el `fetch` global al crearse).
  const client = createClient<paths>({
    fetch: (request: Request) => globalThis.fetch(request),
    ...clientOptions,
  });
  // openapi-fetch recorre `onResponse` en orden inverso: la sesión se registra al final para ver el
  // 401 antes de que el middleware de errores lo lance.
  client.use(errorMiddleware, sessionMiddleware(tokenStore, onUnauthorized));
  return client;
}
