import { describe, it, expect } from "vitest";
import { generateInventoryHypotheses } from "./inventoryHypothesisGenerator";

describe("generateInventoryHypotheses", () => {
  it("returns spike-specific hypotheses for an unusually large movement", () => {
    const hypotheses = generateInventoryHypotheses("spike");
    expect(hypotheses.length).toBeGreaterThan(0);
    expect(hypotheses.some((h) => h.toLowerCase().includes("bulk") || h.toLowerCase().includes("large"))).toBe(true);
  });

  it("returns drop-specific hypotheses for an unusually small movement", () => {
    const hypotheses = generateInventoryHypotheses("drop");
    expect(hypotheses.length).toBeGreaterThan(0);
    expect(hypotheses.some((h) => h.toLowerCase().includes("partial") || h.toLowerCase().includes("smaller"))).toBe(true);
  });

  it("never returns the same list for both directions", () => {
    expect(generateInventoryHypotheses("spike")).not.toEqual(generateInventoryHypotheses("drop"));
  });
});