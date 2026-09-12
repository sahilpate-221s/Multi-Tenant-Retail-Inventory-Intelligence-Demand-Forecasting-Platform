import { describe, it, expect } from "vitest";
import { detectAnomaly } from "./anomalyDetection";

describe("detectAnomaly", () => {
  it("does not flag a value close to the mean", () => {
    const result = detectAnomaly(31, 30, 5);
    expect(result.isAnomaly).toBe(false);
  });

  it("flags a genuine spike above the z-threshold", () => {
    const result = detectAnomaly(50, 30, 5); // z = 4
    expect(result.isAnomaly).toBe(true);
    expect(result.direction).toBe("spike");
  });

  it("flags a genuine drop below the z-threshold", () => {
    const result = detectAnomaly(5, 30, 5); // z = -5
    expect(result.isAnomaly).toBe(true);
    expect(result.direction).toBe("drop");
  });

  it("classifies severity correctly across the three bands", () => {
    expect(detectAnomaly(40.1, 30, 5).severity).toBe("moderate"); // z ≈ 2.02
    expect(detectAnomaly(45, 30, 5).severity).toBe("significant"); // z = 3
    expect(detectAnomaly(50, 30, 5).severity).toBe("extreme"); // z = 4
  });

  it("handles zero standard deviation (perfectly constant history) without crashing", () => {
    const noChange = detectAnomaly(10, 10, 0);
    expect(noChange.isAnomaly).toBe(false);
    expect(noChange.zScore).toBeNull();

    const changed = detectAnomaly(15, 10, 0);
    expect(changed.isAnomaly).toBe(true);
    expect(changed.direction).toBe("spike");
    expect(changed.zScore).toBeNull(); // z-score genuinely undefined here, not fabricated
  });

  it("respects a custom z-threshold", () => {
    const strict = detectAnomaly(40, 30, 5, 3); // z=2, below threshold of 3
    expect(strict.isAnomaly).toBe(false);

    const lenient = detectAnomaly(40, 30, 5, 1); // z=2, above threshold of 1
    expect(lenient.isAnomaly).toBe(true);
  });

  it("throws on negative observed value", () => {
    expect(() => detectAnomaly(-5, 30, 5)).toThrow();
  });

  it("throws on negative standard deviation", () => {
    expect(() => detectAnomaly(30, 30, -5)).toThrow();
  });

  it("throws on non-positive z-threshold", () => {
    expect(() => detectAnomaly(30, 30, 5, 0)).toThrow();
  });
});