import { describe, expect, it, vi } from "vitest";
import { POLICY_NAME, installTrustedTypes, isOwnServiceWorker } from "./trustedTypes";

const BASE = "https://garita.example.test/";

function install() {
  const createPolicy = vi.fn();
  installTrustedTypes({ createPolicy }, BASE);
  const [name, rules] = createPolicy.mock.calls[0] as [
    string,
    { createScriptURL?: (url: string) => string; createHTML?: unknown; createScript?: unknown },
  ];
  return { createPolicy, name, rules };
}

describe("política Trusted Types de guard (SEC-65)", () => {
  it("crea la política `default` una sola vez", () => {
    const { createPolicy, name } = install();
    expect(createPolicy).toHaveBeenCalledTimes(1);
    expect(name).toBe(POLICY_NAME);
    expect(name).toBe("default");
  });

  it.each(["/sw.js", "sw.js", "https://garita.example.test/sw.js"])("deja pasar %s", (url) => {
    expect(install().rules.createScriptURL?.(url)).toBe(url);
  });

  it.each([
    "/other.js",
    "/assets/index.js",
    "/sw.js?x=1",
    "/sw.js#x",
    "/sw.js/..%2f",
    "https://evil.example.test/sw.js",
    "//evil.example.test/sw.js",
    "javascript:alert(1)",
    "data:text/javascript,1",
    "",
  ])("bloquea %j", (url) => {
    expect(() => install().rules.createScriptURL?.(url)).toThrow(TypeError);
  });

  it("no define createHTML ni createScript: el HTML y el script en cadena siguen bloqueados", () => {
    const { rules } = install();
    expect(rules.createHTML).toBeUndefined();
    expect(rules.createScript).toBeUndefined();
  });

  it("sin soporte de Trusted Types no hace nada ni falla", () => {
    expect(() => installTrustedTypes(undefined, BASE)).not.toThrow();
  });

  it("isOwnServiceWorker ignora una base inválida en vez de lanzar", () => {
    expect(isOwnServiceWorker("/sw.js", "no es una url")).toBe(false);
  });
});
