import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { createApiClient } from "./index";
import { residentialName } from "./contract.fixture";

const pkgDir = "packages/api-client";
const contractPath = "openapi/openapi.json";
const workDir = join(pkgDir, ".contract-check");
const residentialPath = "/api/v1/residentials/{residential_id}";

type Contract = {
  paths: Record<string, Record<string, unknown>>;
  components: { schemas: Record<string, { properties: Record<string, unknown> }> };
};

// Genera el cliente desde `contract` en un directorio aparte y compila el consumidor contra él.
function compileAgainst(contract: Contract): { status: number | null; output: string } {
  rmSync(workDir, { recursive: true, force: true });
  mkdirSync(join(workDir, "src", "generated"), { recursive: true });
  for (const file of ["index.ts", "contract.fixture.ts"]) {
    cpSync(join(pkgDir, "src", file), join(workDir, "src", file));
  }
  writeFileSync(join(workDir, "contract.json"), JSON.stringify(contract));
  writeFileSync(
    join(workDir, "tsconfig.json"),
    JSON.stringify({ extends: "@atrio/config/tsconfig.base.json", include: ["src"] }),
  );

  const generated = spawnSync(
    "pnpm",
    [
      "exec",
      "openapi-typescript",
      resolve(workDir, "contract.json"),
      "-o",
      resolve(workDir, "src/generated/schema.d.ts"),
    ],
    { cwd: pkgDir, encoding: "utf-8" },
  );
  expect(generated.status, generated.stdout + generated.stderr).toBe(0);

  const tsc = spawnSync("pnpm", ["exec", "tsc", "--noEmit", "-p", resolve(workDir)], {
    cwd: pkgDir,
    encoding: "utf-8",
  });
  return { status: tsc.status, output: tsc.stdout + tsc.stderr };
}

function currentContract(): Contract {
  return JSON.parse(readFileSync(contractPath, "utf-8")) as Contract;
}

afterAll(() => rmSync(workDir, { recursive: true, force: true }));

describe("cliente generado desde openapi/openapi.json", () => {
  it("se genera al instalar y no está versionado", () => {
    expect(existsSync(join(pkgDir, "src/generated/schema.d.ts"))).toBe(true);
    const ignored = spawnSync("git", [
      "check-ignore",
      "-q",
      join(pkgDir, "src/generated/schema.d.ts"),
    ]);
    expect(ignored.status).toBe(0);
    const tracked = spawnSync("git", ["ls-files", join(pkgDir, "src/generated")], {
      encoding: "utf-8",
    });
    expect(tracked.stdout.trim()).toBe("");
  });

  it("hace la petición al path del contrato con el parámetro sustituido", async () => {
    const urls: string[] = [];
    const client = createApiClient({
      baseUrl: "http://api.test",
      fetch: async (request) => {
        urls.push(`${request.method} ${new URL(request.url).pathname}`);
        return Response.json({ name: "Residencial Los Olivos" });
      },
    });
    const id = "6f1c1a52-6a0e-4d3b-9a43-0c3a9a1b2c3d";
    expect(await residentialName(client, id)).toBe("Residencial Los Olivos");
    expect(urls).toEqual([`GET /api/v1/residentials/${id}`]);
  });
});

describe("cambios del contrato rompen tsc en el consumidor (REP-07)", () => {
  it("control: el contrato actual compila", () => {
    const result = compileAgainst(currentContract());
    expect(result.output).toBe("");
    expect(result.status).toBe(0);
  }, 60_000);

  it("falla si se elimina el endpoint", () => {
    const contract = currentContract();
    const paths = Object.fromEntries(
      Object.entries(contract.paths).filter(([path]) => path !== residentialPath),
    );
    const result = compileAgainst({ ...contract, paths });
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("contract.fixture.ts");
    expect(result.output).toContain("is not assignable to parameter of type 'PathsWithMethod");
  }, 60_000);

  it("falla si se elimina o renombra un campo de la respuesta", () => {
    const contract = currentContract();
    const schema = contract.components.schemas["ResidentialResponse"];
    expect(schema).toBeDefined();
    if (!schema) return;
    const { name, ...rest } = schema.properties;
    schema.properties = { ...rest, title: name };
    const result = compileAgainst(contract);
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("Property 'name' does not exist");
  }, 60_000);
});
