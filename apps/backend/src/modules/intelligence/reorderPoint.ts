export function calculateReorderPoint(
  averageDailyDemand: number,
  leadTimeDays: number,
  safetyStock: number,
): number {
  if (averageDailyDemand < 0) throw new Error("averageDailyDemand cannot be negative.");
  if (leadTimeDays < 0) throw new Error("leadTimeDays cannot be negative.");
  if (safetyStock < 0) throw new Error("safetyStock cannot be negative.");

  const leadTimeDemand = averageDailyDemand * leadTimeDays;
  return Math.ceil(leadTimeDemand + safetyStock);
}