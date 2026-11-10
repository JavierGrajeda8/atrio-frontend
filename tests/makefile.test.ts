import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const pending = [
  { target: "api-client", issue: "#12" },
  { target: "e2e", issue: "#23" },
];

describe("targets pendientes del Makefile", () => {
  it.each(pending)("make $target falla indicando el issue $issue", ({ target, issue }) => {
    const result = spawnSync("make", [target], { encoding: "utf-8" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("todavía no está implementado");
    expect(result.stderr).toContain(issue);
  });
});
