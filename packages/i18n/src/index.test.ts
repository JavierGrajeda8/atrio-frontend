import { describe, expect, it } from "vitest";
import { PACKAGE_NAME } from "./index";

describe("@atrio/i18n", () => {
  it("expone el nombre del paquete", () => {
    expect(PACKAGE_NAME).toBe("@atrio/i18n");
  });
});
