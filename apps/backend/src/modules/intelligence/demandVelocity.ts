export interface DailyDemand {
  date: string; // YYYY-MM-DD
  quantity: number;
}

export interface DemandVelocityResult {
  averageDailyDemand: number;
  standardDeviation: number;
  daysOfDataAvailable: number;
  isLowConfidence: boolean;
}

const MIN_DAYS_FOR_CONFIDENCE = 14;

/**
 * Computes average daily demand and its variability from a set of daily
 * sales totals. Days with zero sales must be explicitly included as
 * zero-quantity entries by the caller — omitting them would inflate the
 * average (e.g. a product that sold 10 units on 1 day out of a 30-day
 * window has an average of 10/30 ≈ 0.33/day, NOT 10/day).
 */
export function calculateDemandVelocity(
  dailyDemand: DailyDemand[],
  windowDays: number,
): DemandVelocityResult {
  if (windowDays <= 0) {
    throw new Error("windowDays must be positive.");
  }

  // Build a complete day-by-day series for the window, defaulting missing
  // days to zero. This is what makes "zero historical sales" and "sparse
  // sales" handled correctly rather than silently skewing the average.
  const demandMap = new Map(dailyDemand.map((d) => [d.date, d.quantity]));
  const quantities: number[] = [];
  const today = new Date();
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    quantities.push(demandMap.get(dateStr) ?? 0);
  }

  const daysOfDataAvailable = dailyDemand.length;

  if (quantities.length === 0) {
    return { averageDailyDemand: 0, standardDeviation: 0, daysOfDataAvailable: 0, isLowConfidence: true };
  }

  const sum = quantities.reduce((acc, q) => acc + q, 0);
  const averageDailyDemand = sum / quantities.length;

  const squaredDiffs = quantities.map((q) => (q - averageDailyDemand) ** 2);
  const variance = squaredDiffs.reduce((acc, d) => acc + d, 0) / quantities.length;
  const standardDeviation = Math.sqrt(variance);

  return {
    averageDailyDemand: Math.round(averageDailyDemand * 1000) / 1000,
    standardDeviation: Math.round(standardDeviation * 1000) / 1000,
    daysOfDataAvailable,
    isLowConfidence: daysOfDataAvailable < MIN_DAYS_FOR_CONFIDENCE,
  };
}