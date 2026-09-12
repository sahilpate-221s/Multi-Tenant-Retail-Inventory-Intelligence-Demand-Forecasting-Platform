import { describe, it, expect } from "vitest";
import { classifyStockoutRisk } from "./riskClassification";

describe("classifyStockoutRisk", () => {
  it("classifies as critical when stockout occurs at or before lead time", () => {
    expect(classifyStockoutRisk(3, 3)).toBe("critical");
    expect(classifyStockoutRisk(2, 5)).toBe("critical");
  });

  it("classifies as high when stockout is within 1.5x lead time", () => {
    expect(classifyStockoutRisk(4, 3)).toBe("high"); // 4 <= 3*1.5=4.5
  });

  it("classifies as moderate when stockout is within 3x lead time", () => {
    expect(classifyStockoutRisk(8, 3)).toBe("moderate"); // 8 <= 3*3=9
  });

  it("classifies as low when stockout is well beyond lead time", () => {
    expect(classifyStockoutRisk(100, 3)).toBe("low");
  });

  it("returns unknown when daysUntilStockout is null (no computable estimate) — distinct from low risk", () => {
    expect(classifyStockoutRisk(null, 3)).toBe("unknown");
  });

  it("returns low when leadTimeDays is null (no supplier linked)", () => {
    expect(classifyStockoutRisk(5, null)).toBe("low");
  });

  it("returns low for zero or negative lead time (invalid data, don't fabricate urgency)", () => {
    expect(classifyStockoutRisk(5, 0)).toBe("low");
    expect(classifyStockoutRisk(5, -1)).toBe("low");
  });

    it("a LONGER lead time makes the SAME stockout timeline more urgent, not less", () => {
    // Same 10-day stockout runway: a 2-day lead time leaves plenty of
    // buffer (low risk), but a 20-day lead time means you'd run out
    // before a fresh order could even arrive (critical risk).
    const shortLeadTimeRisk = classifyStockoutRisk(10, 2);
    const longLeadTimeRisk = classifyStockoutRisk(10, 20);
    const riskOrder: Record<string, number> = { low: 0, moderate: 1, high: 2, critical: 3 };
    expect(riskOrder[longLeadTimeRisk]).toBeGreaterThan(riskOrder[shortLeadTimeRisk]);
  });
});