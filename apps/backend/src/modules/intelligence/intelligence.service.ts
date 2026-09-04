import { eq, and, gte, sql,asc } from "drizzle-orm";
import { db } from "../../db/client";
import { sales, saleItems, purchaseOrders } from "../../db/schema";
import { calculateDemandVelocity, type DemandVelocityResult } from "./demandVelocity";
import { inventory, products, supplierProducts } from "../../db/schema";
import { calculateSafetyStock } from "./safetyStock";
import { calculateReorderPoint } from "./reorderPoint";
import { calculateReorderQuantity } from "./reorderQuantity";
import { estimateStockout } from "./stockoutEstimate";


const DEFAULT_LOOKBACK_DAYS = 30;

export interface InventoryIntelligenceResult {
  productId: string;
  productName: string;
  currentStock: number;
  incomingStock: number;
  averageDailyDemand: number;
  demandStdDev: number;
  daysOfDataAvailable: number;
  isLowConfidenceDemand: boolean;
  leadTimeDays: number | null;
  moq: number | null;
  safetyStock: number;
  reorderPoint: number | null;
  shouldReorder: boolean;
  recommendedQuantity: number;
  daysUntilStockout: number | null;
  estimatedStockoutDate: string | null;
  isAlreadyOutOfStock: boolean;
  reasonCodes: string[];
}

export async function getDemandVelocityForProduct(
  storeId: string,
  productId: string,
  windowDays: number = DEFAULT_LOOKBACK_DAYS,
): Promise<DemandVelocityResult> {
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - windowDays);
  const periodStartStr = periodStart.toISOString().split("T")[0];

  const dailyTotals = await db
    .select({
      date: sales.saleDate,
      quantity: sql<string>`SUM(${saleItems.quantity})`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(
      and(
        eq(sales.storeId, storeId),
        eq(saleItems.productId, productId),
        gte(sales.saleDate, periodStartStr),
      ),
    )
    .groupBy(sales.saleDate);

  const dailyDemand = dailyTotals.map((d) => ({ date: d.date, quantity: Number(d.quantity) }));
  return calculateDemandVelocity(dailyDemand, windowDays);
}

export async function getIncomingStock(storeId: string, productId: string): Promise<number> {
  const pending = await db.query.purchaseOrders.findMany({
    where: and(
      eq(purchaseOrders.storeId, storeId),
      eq(purchaseOrders.productId, productId),
      eq(purchaseOrders.status, "pending"),
    ),
  });
  return pending.reduce((sum, po) => sum + po.quantity, 0);
}

export async function getInventoryIntelligence(
  storeId: string,
  productId: string,
): Promise<InventoryIntelligenceResult> {
  const product = await db.query.products.findFirst({
    where: and(eq(products.id, productId), eq(products.storeId, storeId)),
  });
  if (!product) {
    throw new Error("Product not found for this store.");
  }

  const reasonCodes: string[] = [];

  const inventoryRow = await db.query.inventory.findFirst({
    where: and(eq(inventory.storeId, storeId), eq(inventory.productId, productId)),
  });
  const currentStock = inventoryRow?.currentStock ?? 0;
  const manualMinStock = inventoryRow?.minStock ?? 0;
  if (!inventoryRow) reasonCodes.push("NO_INVENTORY_RECORD_ASSUMING_ZERO_STOCK");

  const incomingStock = await getIncomingStock(storeId, productId);
  if (incomingStock > 0) reasonCodes.push(`INCOMING_STOCK_OF_${incomingStock}_UNITS_ALREADY_ON_ORDER`);

  const velocity = await getDemandVelocityForProduct(storeId, productId);
  if (velocity.isLowConfidence) {
    reasonCodes.push(`LOW_CONFIDENCE_ONLY_${velocity.daysOfDataAvailable}_DAYS_OF_SALES_HISTORY`);
  }

  const cheapestSupplierLink = await db
    .select({ leadTimeDays: supplierProducts.leadTimeDays, moq: supplierProducts.moq, cost: supplierProducts.cost })
    .from(supplierProducts)
    .where(eq(supplierProducts.productId, productId))
    .orderBy(asc(supplierProducts.cost))
    .limit(1);

  const stockoutResult = estimateStockout(currentStock, velocity.averageDailyDemand);

  // Manual floor check applies regardless of whether a supplier is
  // linked or demand data exists — this is the safety net for exactly
  // the cold-start case: zero demand history should never silently
  // read as "everything is fine" when stock is critically low.
  const belowManualFloor = manualMinStock > 0 && currentStock <= manualMinStock;
  if (belowManualFloor) {
    reasonCodes.push(`AT_OR_BELOW_MANUALLY_SET_MINIMUM_STOCK_LEVEL_OF_${manualMinStock}`);
  }

  if (cheapestSupplierLink.length === 0) {
    reasonCodes.push("NO_SUPPLIER_LINKED_CANNOT_CALCULATE_REORDER_POINT");
    return {
      productId, productName: product.name, currentStock, incomingStock,
      averageDailyDemand: velocity.averageDailyDemand, demandStdDev: velocity.standardDeviation,
      daysOfDataAvailable: velocity.daysOfDataAvailable, isLowConfidenceDemand: velocity.isLowConfidence,
      leadTimeDays: null, moq: null, safetyStock: 0, reorderPoint: null,
      shouldReorder: belowManualFloor, recommendedQuantity: 0,
      daysUntilStockout: stockoutResult.daysUntilStockout, estimatedStockoutDate: stockoutResult.estimatedStockoutDate,
      isAlreadyOutOfStock: stockoutResult.isAlreadyOutOfStock, reasonCodes,
    };
  }

  const { leadTimeDays, moq } = cheapestSupplierLink[0];
  const safetyStock = calculateSafetyStock(velocity.standardDeviation, leadTimeDays);
  const calculatedReorderPoint = calculateReorderPoint(velocity.averageDailyDemand, leadTimeDays, safetyStock);
  // Effective reorder point is whichever is HIGHER — the algorithm's
  // calculation, or the store owner's own manual floor. Never let a
  // manually-set safety threshold be silently overridden downward.
  const effectiveReorderPoint = Math.max(calculatedReorderPoint, manualMinStock);

  const reorderResult = calculateReorderQuantity({
    currentStock, incomingStock, reorderPoint: effectiveReorderPoint,
    averageDailyDemand: velocity.averageDailyDemand, moq,
  });

  if (reorderResult.shouldReorder) {
    reasonCodes.push(
      effectiveReorderPoint === manualMinStock && manualMinStock > calculatedReorderPoint
        ? "TRIGGERED_BY_MANUAL_MINIMUM_STOCK_SETTING_NOT_ALGORITHM"
        : "CURRENT_POSITION_AT_OR_BELOW_CALCULATED_REORDER_POINT",
    );
  } else {
    reasonCodes.push("STOCK_POSITION_ABOVE_REORDER_POINT_NO_ACTION_NEEDED");
  }

  return {
    productId, productName: product.name, currentStock, incomingStock,
    averageDailyDemand: velocity.averageDailyDemand, demandStdDev: velocity.standardDeviation,
    daysOfDataAvailable: velocity.daysOfDataAvailable, isLowConfidenceDemand: velocity.isLowConfidence,
    leadTimeDays, moq, safetyStock, reorderPoint: effectiveReorderPoint,
    shouldReorder: reorderResult.shouldReorder, recommendedQuantity: reorderResult.recommendedQuantity,
    daysUntilStockout: stockoutResult.daysUntilStockout, estimatedStockoutDate: stockoutResult.estimatedStockoutDate,
    isAlreadyOutOfStock: stockoutResult.isAlreadyOutOfStock, reasonCodes,
  };
}