// Genera el par de claves EFÍMERO de una corrida E2E (Ed25519, SEC-13) en el directorio que se
// pasa como argumento. Nada de esto se versiona: `scripts/e2e.sh` lo crea en un directorio
// temporal que borra al terminar. La clave pública va al backend (`ATRIO_JWT_PUBLIC_KEY`); la
// privada solo la leen las pruebas para firmar sus tokens.
import { generateKeyPairSync } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const dir = process.argv[2];
if (!dir) {
  process.stderr.write("uso: node gen-keys.mjs <directorio>\n");
  process.exit(2);
}

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
mkdirSync(dir, { recursive: true, mode: 0o700 });
writeFileSync(join(dir, "private.pem"), privateKey.export({ type: "pkcs8", format: "pem" }), {
  mode: 0o600,
});
writeFileSync(join(dir, "public.pem"), publicKey.export({ type: "spki", format: "pem" }));
