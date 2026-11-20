// Tope de longitud: un fragmento enorme no es un token y no debe procesarse.
const MAX_TOKEN_LENGTH = 512;

/**
 * Lee el token del pase del fragmento de la URL (`#<token>`, SEC-35). El fragmento no se envía al
 * servidor ni viaja en `Referer`. Aquí solo se descarta lo que claramente no es un token; el
 * formato y la vigencia los valida el backend al canjearlo.
 */
export function readShareToken(hash: string): string | null {
  const token = (hash.startsWith("#") ? hash.slice(1) : hash).trim();
  if (token === "" || token.length > MAX_TOKEN_LENGTH || /\s/.test(token)) return null;
  return token;
}
