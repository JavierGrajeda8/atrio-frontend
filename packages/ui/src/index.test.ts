import { describe, expect, it } from "vitest";
import { PACKAGE_NAME } from "./index";

describe("@atrio/ui", () => {
  it("expone el nombre del paquete", () => {
    expect(PACKAGE_NAME).toBe("@atrio/ui");
  });
});
