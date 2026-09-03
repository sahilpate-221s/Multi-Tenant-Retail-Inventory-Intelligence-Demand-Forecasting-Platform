import { describe, it, expect } from "vitest";
import { calculateSafetyStock } from "./safetyStock";

describe("calculateSafetyStock", () => {
  it("returns zero safety stock for zero demand variability", () => {
    expect(calculateSafetyStock(0, 5)).toBe(0);
  });

  it("increases with lead time (longer lead time = more buffer needed)", () => {
    const shortLeadTime = calculateSafetyStock(3, 2);
    const longLeadTime = calculateSafetyStock(3, 10);
    expect(longLeadTime).toBeGreaterThan(shortLeadTime);
  });

  it("increases with demand variability", () => {
    const lowVariability = calculateSafetyStock(1, 5);
    const highVariability = calculateSafetyStock(10, 5);
    expect(highVariability).toBeGreaterThan(lowVariability);
  });

  it("computes the expected value for a known case", () => {
    // Z=1.65, σ=2, leadTime=9 → sqrt(9)=3 → 1.65*2*3 = 9.9 → ceil = 10
    expect(calculateSafetyStock(2, 9, 1.65)).toBe(10);
  });

  it("throws on negative lead time", () => {
    expect(() => calculateSafetyStock(2, -1)).toThrow();
  });

  it("throws on negative std dev", () => {
    expect(() => calculateSafetyStock(-2, 5)).toThrow();
  });

  it("handles zero lead time (theoretical instant restock)", () => {
    expect(calculateSafetyStock(5, 0)).toBe(0); // sqrt(0) = 0
  });
});