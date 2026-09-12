export type AnomalyDirection = "spike" | "drop";

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  direction: AnomalyDirection | null;
  zScore: number | null;
  severity: "moderate" | "significant" | "extreme" | null;
}

const DEFAULT_Z_THRESHOLD = 2;

/**
 * Detects whether an observed value is statistically anomalous relative
 * to a historical baseline (mean + standard deviation). Uses a z-score —
 * a standard, explainable measure — rather than a fitted model, per the
 * "start with strong baselines" principle.
 */
export function detectAnomaly(
  observedValue: number,
  baselineMean: number,
  baselineStdDev: number,
  zThreshold: number = DEFAULT_Z_THRESHOLD,
): AnomalyDetectionResult {
  if (observedValue < 0) throw new Error("observedValue cannot be negative.");
  if (baselineStdDev < 0) throw new Error("baselineStdDev cannot be negative.");
  if (zThreshold <= 0) throw new Error("zThreshold must be positive.");

  // Zero variance in the baseline (perfectly constant historical demand)
  // means ANY deviation is meaningful, but a z-score is mathematically
  // undefined (division by zero) — handle this explicitly rather than
  // producing NaN or Infinity silently.
  if (baselineStdDev === 0) {
    if (observedValue === baselineMean) {
      return { isAnomaly: false, direction: null, zScore: null, severity: null };
    }
    const direction: AnomalyDirection = observedValue > baselineMean ? "spike" : "drop";
    return { isAnomaly: true, direction, zScore: null, severity: "significant" };
  }

  const zScore = (observedValue - baselineMean) / baselineStdDev;
  const absZ = Math.abs(zScore);

  if (absZ < zThreshold) {
    return { isAnomaly: false, direction: null, zScore: Math.round(zScore * 100) / 100, severity: null };
  }

  const severity = absZ >= 4 ? "extreme" : absZ >= 3 ? "significant" : "moderate";
  const direction: AnomalyDirection = zScore > 0 ? "spike" : "drop";

  return {
    isAnomaly: true,
    direction,
    zScore: Math.round(zScore * 100) / 100,
    severity,
  };
}