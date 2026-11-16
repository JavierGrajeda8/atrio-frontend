import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

// Usa la config raíz, la misma que corre `make lint`: así se prueba también el cableado.
const eslint = new ESLint({ cwd: process.cwd() });
const RULE = "atrio/no-literal-jsx-text";

async function violations(code: string, filePath = "apps/web/src/Fixture.tsx") {
  const [result] = await eslint.lintText(code, { filePath });
  const messages = result?.messages ?? [];
  expect(
    messages.filter((message) => message.fatal),
    "error de parseo",
  ).toEqual([]);
  return messages.filter((message) => message.ruleId === RULE);
}

describe("regla de i18n: texto literal prohibido en JSX (I18N-01)", () => {
  it("falla con texto literal como hijo", async () => {
    expect(await violations("export const A = () => <p>Hola</p>;")).toHaveLength(1);
  });

  it("falla con una cadena literal o plantilla estática dentro de { }", async () => {
    expect(await violations('export const A = () => <p>{"Hola"}</p>;')).toHaveLength(1);
    expect(await violations("export const A = () => <p>{`Hola`}</p>;")).toHaveLength(1);
  });

  it.each([
    '<img src="/a.png" alt="Logo" />',
    '<input placeholder="Nombre" />',
    '<button aria-label="Cerrar" />',
    '<a title="Ayuda" href="#a" />',
    '<Field label="Nombre" />',
    '<Field description="Como en su documento" />',
    '<Field error="Teléfono inválido" />',
    '<input placeholder={"Nombre"} />',
  ])("falla con texto literal en atributos: %s", async (element) => {
    expect(await violations(`export const A = () => ${element};`)).toHaveLength(1);
  });

  it("aplica también a packages/ui y a las otras apps", async () => {
    const code = "export const A = () => <p>Hola</p>;";
    expect(await violations(code, "packages/ui/src/components/A.tsx")).toHaveLength(1);
    expect(await violations(code, "apps/guard/src/A.tsx")).toHaveLength(1);
  });

  it("permite mensajes del catálogo y valores que no son texto", async () => {
    const code = `
      import { FormattedMessage, useIntl } from "@atrio/i18n";
      export function A({ name }: { name: string }) {
        const intl = useIntl();
        return (
          <main className="p-4" data-app="web">
            <h1><FormattedMessage id="ui.title" /></h1>
            <input aria-label={intl.formatMessage({ id: "ui.theme.label" })} name="visitor" />
            <Field label={intl.formatMessage({ id: "ui.field.unit.label" })} />
            <a href="#button" type="button">{name}</a>
            <span aria-hidden="true"> *</span>
            <p>—</p>
            <p>{"/"}</p>
          </main>
        );
      }`;
    expect(await violations(code)).toEqual([]);
  });

  it("no exige catálogo en las pruebas (*.test.tsx)", async () => {
    const code = "export const A = () => <p>Hola</p>;";
    expect(await violations(code, "apps/web/src/Fixture.test.tsx")).toEqual([]);
  });

  it("cada violación indica cómo corregirla", async () => {
    const [violation] = await violations("export const A = () => <p>Hola</p>;");
    expect(violation?.message).toContain("packages/i18n");
    expect(violation?.severity).toBe(2);
  });
});
