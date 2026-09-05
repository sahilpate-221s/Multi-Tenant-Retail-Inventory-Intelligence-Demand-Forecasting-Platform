export interface DeadStockScoreInput {
  daysSinceLastSale: number | null; // null = never sold
  averageDailyDemand: number;
  currentStock: number;
  productAgeDays: number; // days since the product was created
}

export interface DeadStockScoreResult {
  score: number;
  reasonCodes: string[];
}

const NEW_PRODUCT_GRACE_PERIOD_DAYS = 30;

export function calculateDeadStockScore(input: DeadStockScoreInput): DeadStockScoreResult {
  const { daysSinceLastSale, averageDailyDemand, currentStock, productAgeDays } = input;

  if (productAgeDays < 0) throw new Error("productAgeDays cannot be negative.");
  if (currentStock < 0) throw new Error("currentStock cannot be negative.");
  if (averageDailyDemand < 0) throw new Error("averageDailyDemand cannot be negative.");

  const reasonCodes: string[] = [];

  // Guard: a genuinely new product (within its grace period) with no
  // sales yet is NOT dead stock — it just hasn't had a chance to sell.
  // Without this, "brand new" and "truly dead" would score identically.
  if (productAgeDays < NEW_PRODUCT_GRACE_PERIOD_DAYS && daysSinceLastSale === null) {
    reasonCodes.push(`PRODUCT_TOO_NEW_${productAgeDays}_DAYS_OLD_WITHIN_GRACE_PERIOD`);
    return { score: 0, reasonCodes };
  }

  // A product with zero current stock can't meaningfully be "dead
  // stock" — there's no capital tied up in it right now.
  if (currentStock === 0) {
    reasonCodes.push("ZERO_CURRENT_STOCK_NOT_APPLICABLE");
    return { score: 0, reasonCodes };
  }

  const effectiveDaysSinceLastSale = daysSinceLastSale ?? productAgeDays;
  const daysSinceLastSaleComponent = Math.min(70, effectiveDaysSinceLastSale * 0.7);

  const lowVelocityComponent =
    averageDailyDemand === 0 ? 30 : Math.max(0, 30 - averageDailyDemand * 10);

  const score = Math.round(Math.min(100, daysSinceLastSaleComponent + lowVelocityComponent));

  if (daysSinceLastSale === null) {
    reasonCodes.push(`NEVER_SOLD_TREATED_AS_${productAgeDays}_DAYS_SINCE_CREATION`);
  } else {
    reasonCodes.push(`NO_SALE_IN_${daysSinceLastSale}_DAYS`);
  }
  if (averageDailyDemand === 0) {
    reasonCodes.push("ZERO_AVERAGE_DAILY_DEMAND_IN_LOOKBACK_WINDOW");
  } else {
    reasonCodes.push(`LOW_AVERAGE_DAILY_DEMAND_OF_${averageDailyDemand.toFixed(2)}`);
  }

  return { score, reasonCodes };
}