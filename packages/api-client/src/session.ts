import type { Middleware } from "openapi-fetch";

/** Almacén del access token. Vive solo en una variable de cierre: nunca toca storage ni cookies (FE-02). */
export interface TokenStore {
  get(): string | null;
  set(token: string): void;
  clear(): void;
}

export interface UnauthorizedContext {
  /** Cabecera `X-Request-ID` de la respuesta 401, útil para soporte. No incluye el token. */
  requestId: string | null;
}

/** Gancho ante una respuesta 401. No debe llamar a endpoints inexistentes (REP-03: no hay refresh aún). */
export type UnauthorizedHandler = (context: UnauthorizedContext) => void | Promise<void>;

export interface SessionOptions {
  /** Se crea con `createTokenStore()` y es la única forma de asignar o borrar el token del cliente. */
  tokenStore: TokenStore;
  onUnauthorized?: UnauthorizedHandler;
}

export function createTokenStore(): TokenStore {
  let token: string | null = null;
  return {
    get: () => token,
    set(next) {
      if (next.trim() === "") throw new TypeError("El access token no puede estar vacío");
      token = next;
    },
    clear() {
      token = null;
    },
  };
}

const AUTHORIZATION = "Authorization";

/**
 * Agrega `Authorization: Bearer <token>` y reacciona a un 401. Si la petición ya trae su propia
 * cabecera `Authorization` no la pisa. Ante un 401 descarta el token que se envió (si sigue siendo
 * el vigente: otro login concurrente no se borra) y avisa al gancho; un fallo del gancho nunca
 * oculta el `ApiError`.
 */
export function sessionMiddleware(
  store: TokenStore,
  onUnauthorized?: UnauthorizedHandler,
): Middleware {
  const sent = new WeakMap<Request, string>();
  return {
    onRequest({ request }) {
      const token = store.get();
      if (token === null || request.headers.has(AUTHORIZATION)) return undefined;
      request.headers.set(AUTHORIZATION, `Bearer ${token}`);
      sent.set(request, token);
      return request;
    },
    async onResponse({ request, response }) {
      if (response.status !== 401) return undefined;
      const token = sent.get(request);
      if (token !== undefined && store.get() === token) store.clear();
      try {
        await onUnauthorized?.({ requestId: response.headers.get("X-Request-ID") });
      } catch {
        // El gancho es de la app; su error no debe reemplazar el 401 original.
      }
      return undefined;
    },
  };
}
