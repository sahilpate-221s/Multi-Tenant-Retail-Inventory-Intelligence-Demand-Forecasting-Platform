export interface StockoutEstimateResult {
  daysUntilStockout: number | null; // null means "not expected within a reasonable horizon"
  estimatedStockoutDate: string | null; // YYYY-MM-DD
  isAlreadyOutOfStock: boolean;
}

export function estimateStockout(
  currentStock: number,
  averageDailyDemand: number,
): StockoutEstimateResult {
  if (currentStock < 0) throw new Error("currentStock cannot be negative.");
  if (averageDailyDemand < 0) throw new Error("averageDailyDemand cannot be negative.");

  if (currentStock === 0) {
    return { daysUntilStockout: 0, estimatedStockoutDate: new Date().toISOString().split("T")[0], isAlreadyOutOfStock: true };
  }

  if (averageDailyDemand === 0) {
    // No measurable demand — stockout isn't estimable, not "never" (a
    // false certainty spec section 22 explicitly warns against).
    return { daysUntilStockout: null, estimatedStockoutDate: null, isAlreadyOutOfStock: false };
  }

  const daysUntilStockout = currentStock / averageDailyDemand;
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(daysUntilStockout));

  return {
    daysUntilStockout: Math.round(daysUntilStockout * 10) / 10,
    estimatedStockoutDate: date.toISOString().split("T")[0],
    isAlreadyOutOfStock: false,
  };
}