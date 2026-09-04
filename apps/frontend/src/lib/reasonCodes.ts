export function formatReasonCode(code: string): string {
  if (code.startsWith("LOW_CONFIDENCE_ONLY_")) {
    const days = code.match(/ONLY_(\d+)_DAYS/)?.[1] ?? "few";
    return `Limited sales history available — only ${days} day(s) of data, so this estimate has lower confidence.`;
  }
  if (code.startsWith("INCOMING_STOCK_OF_")) {
    const units = code.match(/OF_(\d+)_UNITS/)?.[1] ?? "some";
    return `${units} units are already on order and factored into this recommendation.`;
  }
  if (code.startsWith("AT_OR_BELOW_MANUALLY_SET_MINIMUM_STOCK_LEVEL_OF_")) {
    const level = code.match(/LEVEL_OF_(\d+)/)?.[1] ?? "the set minimum";
    return `Current stock is at or below your manually set minimum of ${level} units.`;
  }
  if (code === "TRIGGERED_BY_MANUAL_MINIMUM_STOCK_SETTING_NOT_ALGORITHM") {
    return "This recommendation is based on your manual minimum stock setting, not the demand forecast (demand data is currently too limited to calculate a reorder point on its own).";
  }
  if (code === "CURRENT_POSITION_AT_OR_BELOW_CALCULATED_REORDER_POINT") {
    return "Current stock plus anything incoming is at or below the calculated reorder point.";
  }
  if (code === "NO_SUPPLIER_LINKED_CANNOT_CALCULATE_REORDER_POINT") {
    return "No supplier is linked to this product, so a reorder point could not be calculated.";
  }
  if (code === "NO_INVENTORY_RECORD_ASSUMING_ZERO_STOCK") {
    return "No inventory record exists yet for this product — treated as zero stock.";
  }
  if (code.startsWith("NO_SALE_IN_")) {
    const days = code.match(/NO_SALE_IN_(\d+)_DAYS/)?.[1];
    return `No sale recorded in the last ${days} days.`;
  }
  if (code.startsWith("NEVER_SOLD_TREATED_AS_")) {
    const days = code.match(/AS_(\d+)_DAYS/)?.[1];
    return `This product has never sold — treated as ${days} days since it was added.`;
  }
  if (code === "ZERO_AVERAGE_DAILY_DEMAND_IN_LOOKBACK_WINDOW") {
    return "No measurable sales velocity in the recent period.";
  }
  if (code.startsWith("LOW_AVERAGE_DAILY_DEMAND_OF_")) {
    const value = code.match(/OF_([\d.]+)/)?.[1];
    return `Low average daily demand (${value} units/day).`;
  }
  return code.replaceAll("_", " ").toLowerCase();
}