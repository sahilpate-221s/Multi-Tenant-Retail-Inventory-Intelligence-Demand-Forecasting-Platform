import { describe, it, expect } from "vitest";
import { calculateReorderPoint } from "./reorderPoint";

describe("calculateReorderPoint", () => {
  it("computes the expected value for a known case", () => {
    // avgDemand=5/day, leadTime=3 days = 15, + safetyStock 10 = 25
    expect(calculateReorderPoint(5, 3, 10)).toBe(25);
  });

  it("returns just the safety stock when demand is zero", () => {
    expect(calculateReorderPoint(0, 5, 8)).toBe(8);
  });

  it("returns just the safety stock when lead time is zero", () => {
    expect(calculateReorderPoint(10, 0, 8)).toBe(8);
  });

  it("handles a new product with zero demand and zero safety stock", () => {
    expect(calculateReorderPoint(0, 5, 0)).toBe(0);
  });

  it("throws on negative inputs", () => {
    expect(() => calculateReorderPoint(-1, 5, 0)).toThrow();
    expect(() => calculateReorderPoint(5, -1, 0)).toThrow();
    expect(() => calculateReorderPoint(5, 5, -1)).toThrow();
  });

  it("rounds up fractional results (never under-order)", () => {
    // 3.3 * 2 = 6.6 + 5 = 11.6 → should round up to 12
    expect(calculateReorderPoint(3.3, 2, 5)).toBe(12);
  });
});