export interface ReorderQuantityInput {
  currentStock: number;
  incomingStock: number;
  reorderPoint: number;
  averageDailyDemand: number;
  moq: number;
  targetDaysOfSupply?: number;
}

export interface ReorderQuantityResult {
  shouldReorder: boolean;
  rawQuantity: number; // before MOQ rounding
  recommendedQuantity: number; // after MOQ rounding, final answer
}

const DEFAULT_TARGET_DAYS_OF_SUPPLY = 14;

export function calculateReorderQuantity(input: ReorderQuantityInput): ReorderQuantityResult {
  const {
    currentStock,
    incomingStock,
    reorderPoint,
    averageDailyDemand,
    moq,
    targetDaysOfSupply = DEFAULT_TARGET_DAYS_OF_SUPPLY,
  } = input;

  if (moq <= 0) throw new Error("moq must be positive.");
  if (currentStock < 0) throw new Error("currentStock cannot be negative.");

  const positionAfterIncoming = currentStock + incomingStock;
  const shouldReorder = positionAfterIncoming <= reorderPoint;

  if (!shouldReorder) {
    return { shouldReorder: false, rawQuantity: 0, recommendedQuantity: 0 };
  }

  // Target stock level: enough to cover the reorder point PLUS an
  // additional buffer of target-days-of-supply, so we're not ordering
  // the absolute bare minimum every single cycle.
  const targetLevel = reorderPoint + averageDailyDemand * targetDaysOfSupply;
  const rawQuantity = Math.max(0, targetLevel - positionAfterIncoming);

  // Round UP to the nearest multiple of MOQ — you can't order a
  // fractional MOQ, and rounding down could leave you under target.
  const recommendedQuantity = Math.ceil(rawQuantity / moq) * moq;

  return {
    shouldReorder: true,
    rawQuantity: Math.round(rawQuantity * 100) / 100,
    recommendedQuantity,
  };
}