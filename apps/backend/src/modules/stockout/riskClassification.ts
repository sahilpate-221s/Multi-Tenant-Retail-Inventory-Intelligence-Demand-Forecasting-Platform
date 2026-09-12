export type RiskLevel = "critical" | "high" | "moderate" | "low" | "unknown";

export function classifyStockoutRisk(
  daysUntilStockout: number | null,
  leadTimeDays: number | null,
): RiskLevel {
  if (daysUntilStockout === null) {
    // No computable timeline (e.g. zero measurable demand) — genuinely
    // different from "low risk." We don't know, and shouldn't imply
    // otherwise; the caller (service layer) decides whether other
    // signals like low stock still warrant surfacing this.
    return "unknown";
  }
  if (leadTimeDays === null || leadTimeDays <= 0) {
    return "low";
  }

  if (daysUntilStockout <= leadTimeDays) return "critical";
  if (daysUntilStockout <= leadTimeDays * 1.5) return "high";
  if (daysUntilStockout <= leadTimeDays * 3) return "moderate";
  return "low";
}