import { createPrivateKey, randomUUID, sign } from "node:crypto";
import type { KeyObject } from "node:crypto";
import { readFileSync } from "node:fs";

// Emisor de tokens SOLO para pruebas E2E: el login real llega en M1. Firma con el par de claves
// efímero que `scripts/e2e.sh` genera en cada corrida; no hay ninguna clave privada versionada.

export interface Claims {
  sub: string;
  sid: string;
  amr: string[];
  auth_time: number;
  iat: number;
  exp: number;
  [claim: string]: unknown;
}

const encode = (value: object | Buffer): string =>
  (Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value))).toString("base64url");

export function signingKey(): KeyObject {
  const file = process.env["E2E_JWT_PRIVATE_KEY_FILE"];
  if (!file) {
    throw new Error("Falta E2E_JWT_PRIVATE_KEY_FILE: corre las pruebas con `make e2e`.");
  }
  return createPrivateKey(readFileSync(file));
}

/** Claims válidos (SEC-13: TTL de 10 min). `undefined` en `overrides` elimina el claim. */
export function claimsFor(sub: string, overrides: Record<string, unknown> = {}): Claims {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    sub,
    sid: randomUUID(),
    amr: ["otp"],
    auth_time: now,
    iat: now,
    exp: now + 600,
    ...overrides,
  };
  return Object.fromEntries(
    Object.entries(claims).filter(([, value]) => value !== undefined),
  ) as Claims;
}

/** Access token firmado con Ed25519 (`EdDSA`, el nombre de SPEC SEC-13). */
export function signToken(claims: object, key: KeyObject = signingKey()): string {
  const signingInput = `${encode({ alg: "EdDSA", typ: "JWT" })}.${encode(claims)}`;
  return `${signingInput}.${encode(sign(null, Buffer.from(signingInput), key))}`;
}

/** Token con `alg: none` y sin firma: el verificador no debe aceptarlo nunca. */
export function unsignedToken(claims: object): string {
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(claims)}.`;
}
