import { describe, it, expect } from "vitest";
import { calculateDeadStockScore } from "./deadStockScoring";

describe("calculateDeadStockScore", () => {
  it("scores a genuinely dead product highly (matches spec's example scale)", () => {
    // Analogous to spec's Bluetooth Speaker example: long unsold, low velocity
    const result = calculateDeadStockScore({
      daysSinceLastSale: 74, averageDailyDemand: 0, currentStock: 87, productAgeDays: 200,
    });
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it("scores a fast-moving, recently-sold product near zero", () => {
    const result = calculateDeadStockScore({
      daysSinceLastSale: 1, averageDailyDemand: 5, currentStock: 50, productAgeDays: 200,
    });
    expect(result.score).toBeLessThan(20);
  });

  it("does NOT flag a brand new product with no sales yet as dead stock", () => {
    const result = calculateDeadStockScore({
      daysSinceLastSale: null, averageDailyDemand: 0, currentStock: 20, productAgeDays: 5,
    });
    expect(result.score).toBe(0);
    expect(result.reasonCodes[0]).toContain("TOO_NEW");
  });

  it("DOES flag an old product that has genuinely never sold", () => {
    const result = calculateDeadStockScore({
      daysSinceLastSale: null, averageDailyDemand: 0, currentStock: 20, productAgeDays: 200,
    });
    expect(result.score).toBeGreaterThan(50);
  });

  it("returns zero score for a product with zero current stock", () => {
    const result = calculateDeadStockScore({
      daysSinceLastSale: 300, averageDailyDemand: 0, currentStock: 0, productAgeDays: 400,
    });
    expect(result.score).toBe(0);
    expect(result.reasonCodes[0]).toContain("ZERO_CURRENT_STOCK");
  });

  it("caps the score at 100 even for extremely old, zero-velocity stock", () => {
    const result = calculateDeadStockScore({
      daysSinceLastSale: 5000, averageDailyDemand: 0, currentStock: 10, productAgeDays: 5000,
    });
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("throws on negative inputs", () => {
    expect(() => calculateDeadStockScore({ daysSinceLastSale: 10, averageDailyDemand: 0, currentStock: -5, productAgeDays: 100 })).toThrow();
    expect(() => calculateDeadStockScore({ daysSinceLastSale: 10, averageDailyDemand: -1, currentStock: 5, productAgeDays: 100 })).toThrow();
  });

  it("score increases monotonically with days since last sale, all else equal", () => {
    const shorter = calculateDeadStockScore({ daysSinceLastSale: 10, averageDailyDemand: 0, currentStock: 10, productAgeDays: 100 });
    const longer = calculateDeadStockScore({ daysSinceLastSale: 90, averageDailyDemand: 0, currentStock: 10, productAgeDays: 100 });
    expect(longer.score).toBeGreaterThan(shorter.score);
  });
});