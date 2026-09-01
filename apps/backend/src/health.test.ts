import { describe, it, expect } from "vitest";

function isHealthy(status: string): boolean {
  return status === "ok";
}

describe("health check logic", () => {
  it("returns true for status ok", () => {
    expect(isHealthy("ok")).toBe(true);
  });

  it("returns false for any other status", () => {
    expect(isHealthy("down")).toBe(false);
  });
});