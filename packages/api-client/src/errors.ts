import type { MessageId } from "@atrio/i18n";
import statusCodes from "./status-codes.json";

/**
 * Códigos estables de la plataforma (API-03). El contrato publica `code` solo como `string`, así
 * que esta lista se mantiene a mano contra `platform/errors.py` del backend; un código nuevo que
 * llegue sin estar aquí se muestra con el mensaje de su estado HTTP (ver `messageIdFor`).
 */
export const KNOWN_ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "METHOD_NOT_ALLOWED",
  "HTTP_ERROR",
  "INTERNAL_ERROR",
  "MEMBERSHIP_NOT_ACTIVE",
  "STEP_UP_REQUIRED",
  "PRECONDITION_REQUIRED",
  "PRECONDITION_FAILED",
  "SERVICE_UNAVAILABLE",
] as const;

export type KnownErrorCode = (typeof KNOWN_ERROR_CODES)[number];

/** Falla de red del cliente (sin respuesta del servidor): no es un código del backend. */
export const NETWORK_ERROR = "NETWORK_ERROR";

/** Cualquier código del backend, conocido o no (`string` conserva el autocompletado). */
export type ErrorCode = KnownErrorCode | typeof NETWORK_ERROR | (string & Record<never, never>);

/** Clave del catálogo `@atrio/i18n` con el mensaje localizado de un error. */
export type ErrorMessageId = Extract<MessageId, `api.error.${string}`>;

// Tipado contra el catálogo real: si falta una traducción, `tsc` falla aquí.
function keyFor(code: KnownErrorCode | typeof NETWORK_ERROR): ErrorMessageId {
  return `api.error.${code}`;
}

const isKnown = (code: string): code is KnownErrorCode =>
  (KNOWN_ERROR_CODES as readonly string[]).includes(code);

const SCREAMING_SNAKE_CASE = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/;

/** Código por estado HTTP cuando la respuesta no trae uno válido (igual que el backend). */
export function codeForStatus(status: number): KnownErrorCode {
  const mapped = (statusCodes as Record<string, string>)[String(status)];
  if (mapped && isKnown(mapped)) return mapped;
  return status >= 500 ? "INTERNAL_ERROR" : "HTTP_ERROR";
}

/**
 * Clave i18n de un error. Un código desconocido (p. ej. uno nuevo del backend) cae al mensaje
 * de su estado HTTP: nunca se muestra texto del servidor como si fuera del catálogo.
 */
export function messageIdFor(code: string, status: number): ErrorMessageId {
  if (code === NETWORK_ERROR) return keyFor(NETWORK_ERROR);
  return keyFor(isKnown(code) ? code : codeForStatus(status));
}

export interface ApiErrorInit {
  code: ErrorCode;
  status: number;
  requestId?: string | undefined;
  details?: Record<string, unknown> | undefined;
  /** Mensaje del servidor (localizado por `Accept-Language`). No se usa para decidir nada. */
  serverMessage?: string | undefined;
}

/**
 * Error tipado de la API (API-03). Decide siempre por `code` y muestra `i18nKey` con
 * `intl.formatMessage`; el `message` de `Error` es solo el código, seguro para registrar.
 */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly requestId: string | undefined;
  readonly details: Record<string, unknown>;
  readonly serverMessage: string | undefined;
  readonly i18nKey: ErrorMessageId;

  constructor({ code, status, requestId, details, serverMessage }: ApiErrorInit) {
    super(code);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
    this.details = details ?? {};
    this.serverMessage = serverMessage;
    this.i18nKey = messageIdFor(code, status);
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Convierte una respuesta HTTP de error en un `ApiError`. Acepta el cuerpo estándar
 * `{ error: { code, message, details, request_id } }`; con cualquier otra cosa (cuerpo vacío,
 * no JSON, el `{ detail: [...] }` de FastAPI o un código con formato inválido) usa el estado.
 */
export async function readApiError(response: Response): Promise<ApiError> {
  let body: unknown;
  try {
    body = await response.clone().json();
  } catch {
    body = undefined;
  }

  const error = isRecord(body) && isRecord(body["error"]) ? body["error"] : undefined;
  const code = error?.["code"];
  const validCode = typeof code === "string" && SCREAMING_SNAKE_CASE.test(code);

  return new ApiError({
    code: validCode ? code : codeForStatus(response.status),
    status: response.status,
    requestId:
      typeof error?.["request_id"] === "string"
        ? error["request_id"]
        : (response.headers.get("x-request-id") ?? undefined),
    details: isRecord(error?.["details"]) ? error["details"] : undefined,
    serverMessage:
      validCode && typeof error?.["message"] === "string" ? error["message"] : undefined,
  });
}

export function networkError(): ApiError {
  return new ApiError({ code: NETWORK_ERROR, status: 0 });
}
