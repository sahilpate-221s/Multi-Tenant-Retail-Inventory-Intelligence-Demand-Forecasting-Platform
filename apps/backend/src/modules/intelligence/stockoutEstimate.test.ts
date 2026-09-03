import { describe, it, expect } from "vitest";
import { estimateStockout } from "./stockoutEstimate";

describe("estimateStockout", () => {
  it("computes the expected days for a known case", () => {
    // 100 units / 10 per day = 10 days
    const result = estimateStockout(100, 10);
    expect(result.daysUntilStockout).toBe(10);
    expect(result.isAlreadyOutOfStock).toBe(false);
  });

  it("correctly identifies stock already at zero", () => {
    const result = estimateStockout(0, 5);
    expect(result.isAlreadyOutOfStock).toBe(true);
    expect(result.daysUntilStockout).toBe(0);
  });

  it("does NOT crash on zero demand, and does NOT claim certainty", () => {
    const result = estimateStockout(50, 0);
    expect(result.daysUntilStockout).toBeNull();
    expect(result.estimatedStockoutDate).toBeNull();
    expect(result.isAlreadyOutOfStock).toBe(false);
  });

  it("handles very high stock with normal demand (long runway)", () => {
    const result = estimateStockout(100000, 5);
    expect(result.daysUntilStockout).toBe(20000);
  });

  it("handles very low but nonzero demand", () => {
    const result = estimateStockout(10, 0.1);
    expect(result.daysUntilStockout).toBe(100);
  });

  it("throws on negative current stock", () => {
    expect(() => estimateStockout(-5, 10)).toThrow();
  });

  it("throws on negative demand", () => {
    expect(() => estimateStockout(10, -5)).toThrow();
  });

  it("estimatedStockoutDate is a real future date, not garbage", () => {
    const result = estimateStockout(10, 2); // 5 days
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + 5);
    expect(result.estimatedStockoutDate).toBe(expectedDate.toISOString().split("T")[0]);
  });
});