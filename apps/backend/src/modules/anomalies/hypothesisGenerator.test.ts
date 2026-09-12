import { describe, it, expect } from "vitest";
import { generateHypotheses } from "./hypothesisGenerator";

describe("generateHypotheses", () => {
  it("returns spike-specific hypotheses for a spike", () => {
    const hypotheses = generateHypotheses("spike");
    expect(hypotheses.length).toBeGreaterThan(0);
    expect(hypotheses.some((h) => h.toLowerCase().includes("increas"))).toBe(true);
  });

  it("returns drop-specific hypotheses for a drop", () => {
    const hypotheses = generateHypotheses("drop");
    expect(hypotheses.length).toBeGreaterThan(0);
    expect(hypotheses.some((h) => h.toLowerCase().includes("declin") || h.toLowerCase().includes("reduc"))).toBe(true);
  });

  it("never returns the exact same list for both directions", () => {
    const spikeHypotheses = generateHypotheses("spike");
    const dropHypotheses = generateHypotheses("drop");
    expect(spikeHypotheses).not.toEqual(dropHypotheses);
  });
});