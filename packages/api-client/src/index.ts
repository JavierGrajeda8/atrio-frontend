import createClient from "openapi-fetch";
import type { Client, ClientOptions } from "openapi-fetch";
import type { paths } from "./generated/schema";

export const PACKAGE_NAME = "@atrio/api-client";

export type { components, operations, paths } from "./generated/schema";
export type ApiClient = Client<paths>;

/** Cliente tipado por `openapi/openapi.json`: un endpoint o campo que no existe no compila (REP-03). */
export function createApiClient(options: ClientOptions): ApiClient {
  return createClient<paths>(options);
}
