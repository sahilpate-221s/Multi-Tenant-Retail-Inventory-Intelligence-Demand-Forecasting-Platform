import { describe, it, expect } from "vitest";
import { calculateReorderQuantity } from "./reorderQuantity";

describe("calculateReorderQuantity", () => {
  it("recommends no reorder when stock is well above reorder point", () => {
    const result = calculateReorderQuantity({
      currentStock: 100, incomingStock: 0, reorderPoint: 20, averageDailyDemand: 5, moq: 10,
    });
    expect(result.shouldReorder).toBe(false);
    expect(result.recommendedQuantity).toBe(0);
  });

  it("recommends a reorder when stock is at or below reorder point", () => {
    const result = calculateReorderQuantity({
      currentStock: 15, incomingStock: 0, reorderPoint: 20, averageDailyDemand: 5, moq: 10,
    });
    expect(result.shouldReorder).toBe(true);
    expect(result.recommendedQuantity).toBeGreaterThan(0);
  });

  it("accounts for incoming stock already on the way", () => {
    // currentStock=15 alone would trigger reorder (below reorderPoint=20),
    // but 20 incoming brings total position to 35, well above — no reorder.
    const result = calculateReorderQuantity({
      currentStock: 15, incomingStock: 20, reorderPoint: 20, averageDailyDemand: 5, moq: 10,
    });
    expect(result.shouldReorder).toBe(false);
  });

  it("rounds the final quantity UP to the nearest MOQ multiple", () => {
    const result = calculateReorderQuantity({
      currentStock: 0, incomingStock: 0, reorderPoint: 10, averageDailyDemand: 2, moq: 24, targetDaysOfSupply: 7,
    });
    // rawQuantity = 10 + 2*7 - 0 = 24 exactly → still must be a clean MOQ multiple
    expect(result.recommendedQuantity % 24).toBe(0);
    expect(result.recommendedQuantity).toBeGreaterThanOrEqual(result.rawQuantity);
  });

  it("handles a product with zero current stock and zero incoming (urgent case)", () => {
    const result = calculateReorderQuantity({
      currentStock: 0, incomingStock: 0, reorderPoint: 15, averageDailyDemand: 3, moq: 5,
    });
    expect(result.shouldReorder).toBe(true);
    expect(result.recommendedQuantity).toBeGreaterThan(0);
  });

  it("handles very high current stock (should never suggest ordering more)", () => {
    const result = calculateReorderQuantity({
      currentStock: 100000, incomingStock: 0, reorderPoint: 20, averageDailyDemand: 5, moq: 10,
    });
    expect(result.shouldReorder).toBe(false);
  });

  it("throws on invalid MOQ", () => {
    expect(() =>
      calculateReorderQuantity({ currentStock: 10, incomingStock: 0, reorderPoint: 20, averageDailyDemand: 5, moq: 0 }),
    ).toThrow();
  });

  it("throws on negative current stock", () => {
    expect(() =>
      calculateReorderQuantity({ currentStock: -5, incomingStock: 0, reorderPoint: 20, averageDailyDemand: 5, moq: 10 }),
    ).toThrow();
  });
});