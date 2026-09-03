import { describe, it, expect } from "vitest";
import { calculateDemandVelocity } from "./demandVelocity";

function dateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

describe("calculateDemandVelocity", () => {
  it("computes correct average for steady daily demand", () => {
    const daily = [0, 1, 2, 3, 4, 5, 6].map((n) => ({ date: dateNDaysAgo(n), quantity: 10 }));
    const result = calculateDemandVelocity(daily, 7);
    expect(result.averageDailyDemand).toBe(10);
    expect(result.standardDeviation).toBe(0); // perfectly steady demand has zero variance
  });

  it("treats missing days as zero demand, not as missing data", () => {
    // Only 1 day of sales (10 units) in a 30-day window — average must be
    // 10/30, NOT 10/1. This is the exact bug the code comment warns about.
    const daily = [{ date: dateNDaysAgo(0), quantity: 10 }];
    const result = calculateDemandVelocity(daily, 30);
    expect(result.averageDailyDemand).toBeCloseTo(10 / 30, 3);
  });

  it("handles a product with ZERO historical sales", () => {
    const result = calculateDemandVelocity([], 30);
    expect(result.averageDailyDemand).toBe(0);
    expect(result.standardDeviation).toBe(0);
    expect(result.isLowConfidence).toBe(true);
  });

  it("flags low confidence when data available is under the threshold", () => {
    const daily = [dateNDaysAgo(0), dateNDaysAgo(1)].map((date) => ({ date, quantity: 5 }));
    const result = calculateDemandVelocity(daily, 30);
    expect(result.daysOfDataAvailable).toBe(2);
    expect(result.isLowConfidence).toBe(true);
  });

  it("does NOT flag low confidence with sufficient data", () => {
    const daily = Array.from({ length: 20 }, (_, i) => ({ date: dateNDaysAgo(i), quantity: 5 }));
    const result = calculateDemandVelocity(daily, 30);
    expect(result.daysOfDataAvailable).toBe(20);
    expect(result.isLowConfidence).toBe(false);
  });

  it("correctly computes standard deviation for variable demand", () => {
    // Demand: 0, 10, 0, 10 → mean = 5, variance = ((5)^2*4)/4 = 25, stddev = 5
    const daily = [
      { date: dateNDaysAgo(0), quantity: 0 },
      { date: dateNDaysAgo(1), quantity: 10 },
      { date: dateNDaysAgo(2), quantity: 0 },
      { date: dateNDaysAgo(3), quantity: 10 },
    ];
    const result = calculateDemandVelocity(daily, 4);
    expect(result.averageDailyDemand).toBe(5);
    expect(result.standardDeviation).toBe(5);
  });

  it("throws on invalid windowDays", () => {
    expect(() => calculateDemandVelocity([], 0)).toThrow();
    expect(() => calculateDemandVelocity([], -5)).toThrow();
  });

  it("ignores sales data outside the window (caller's responsibility, but confirms function only uses what's passed)", () => {
    // Only pass 3 days of data for a 3-day window — function should not
    // reach outside what it's given.
    const daily = [0, 1, 2].map((n) => ({ date: dateNDaysAgo(n), quantity: 6 }));
    const result = calculateDemandVelocity(daily, 3);
    expect(result.averageDailyDemand).toBe(6);
  });
});