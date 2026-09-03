const DEFAULT_SERVICE_LEVEL_Z = 1.65; // ~95% service level

export function calculateSafetyStock(
  demandStdDev: number,
  leadTimeDays: number,
  serviceLevelZ: number = DEFAULT_SERVICE_LEVEL_Z,
): number {
  if (leadTimeDays < 0) throw new Error("leadTimeDays cannot be negative.");
  if (demandStdDev < 0) throw new Error("demandStdDev cannot be negative.");

  const safetyStock = serviceLevelZ * demandStdDev * Math.sqrt(leadTimeDays);
  return Math.ceil(safetyStock); // round up — never under-buffer
}