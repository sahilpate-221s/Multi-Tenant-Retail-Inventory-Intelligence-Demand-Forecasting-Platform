import { eq, and, asc, desc } from "drizzle-orm";
import { db } from "../../db/client";
import { products, inventory, supplierProducts, simulations } from "../../db/schema";
import { getIncomingStock, getDemandVelocityForProduct } from "../intelligence/intelligence.service";
import { calculateSafetyStock } from "../intelligence/safetyStock";
import { calculateReorderPoint } from "../intelligence/reorderPoint";
import { calculateReorderQuantity } from "../intelligence/reorderQuantity";
import { estimateStockout } from "../intelligence/stockoutEstimate";

export interface SimulationInput {
  productId: string;
  demandChangePercent?: number; // e.g. 20 for +20%, -15 for -15%
  supplierDelayDays?: number; // additional days added to real lead time
  budgetLimit?: number;
}

export class SimulationError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

export async function runSimulation(storeId: string, input: SimulationInput) {
  const product = await db.query.products.findFirst({
    where: and(eq(products.id, input.productId), eq(products.storeId, storeId)),
  });
  if (!product) throw new SimulationError("Product not found for this store.", "PRODUCT_NOT_FOUND");

  // --- Fetch REAL baseline data, exactly like Phase 7 does ---
  const inventoryRow = await db.query.inventory.findFirst({
    where: and(eq(inventory.storeId, storeId), eq(inventory.productId, input.productId)),
  });
  const currentStock = inventoryRow?.currentStock ?? 0;
  const incomingStock = await getIncomingStock(storeId, input.productId);
  const velocity = await getDemandVelocityForProduct(storeId, input.productId);

  const cheapestSupplierLink = await db
    .select({ leadTimeDays: supplierProducts.leadTimeDays, moq: supplierProducts.moq, cost: supplierProducts.cost })
    .from(supplierProducts)
    .where(eq(supplierProducts.productId, input.productId))
    .orderBy(asc(supplierProducts.cost))
    .limit(1);

  const baselineLeadTimeDays = cheapestSupplierLink[0]?.leadTimeDays ?? null;
  const moq = cheapestSupplierLink[0]?.moq ?? 1;
  const costPerUnit = cheapestSupplierLink[0] ? Number(cheapestSupplierLink[0].cost) : Number(product.costPrice);

  // --- Apply the HYPOTHETICAL adjustments — in memory only, nothing
  // written to any real table at this point or ever in this function ---
  const demandChangePercent = input.demandChangePercent ?? 0;
  const supplierDelayDays = input.supplierDelayDays ?? 0;

  const simulatedAverageDailyDemand = Math.max(0, velocity.averageDailyDemand * (1 + demandChangePercent / 100));
  const simulatedLeadTimeDays = baselineLeadTimeDays !== null ? baselineLeadTimeDays + supplierDelayDays : null;

  let simulatedSafetyStock = 0;
  let simulatedReorderPoint: number | null = null;
  let simulatedRecommendedQuantity = 0;
  let estimatedCost: number | null = null;
  let budgetExceeded = false;

  if (simulatedLeadTimeDays !== null) {
    simulatedSafetyStock = calculateSafetyStock(velocity.standardDeviation, simulatedLeadTimeDays);
    simulatedReorderPoint = calculateReorderPoint(simulatedAverageDailyDemand, simulatedLeadTimeDays, simulatedSafetyStock);
    const reorderResult = calculateReorderQuantity({
      currentStock,
      incomingStock,
      reorderPoint: simulatedReorderPoint,
      averageDailyDemand: simulatedAverageDailyDemand,
      moq,
    });
    simulatedRecommendedQuantity = reorderResult.recommendedQuantity;
    estimatedCost = simulatedRecommendedQuantity * costPerUnit;

    if (input.budgetLimit !== undefined && estimatedCost > input.budgetLimit) {
      budgetExceeded = true;
    }
  }

  const stockoutResult = estimateStockout(currentStock + incomingStock, simulatedAverageDailyDemand);

  // --- Persist ONLY the simulation result. No writes to inventory,
  // products, or any operational table anywhere in this function. ---
  const [saved] = await db
    .insert(simulations)
    .values({
      storeId,
      productId: input.productId,
      demandChangePercent: demandChangePercent.toString(),
      supplierDelayDays,
      budgetLimit: input.budgetLimit?.toString(),
      baselineCurrentStock: currentStock,
      baselineAverageDailyDemand: velocity.averageDailyDemand.toString(),
      baselineLeadTimeDays,
      simulatedAverageDailyDemand: simulatedAverageDailyDemand.toString(),
      simulatedLeadTimeDays,
      simulatedSafetyStock,
      simulatedReorderPoint,
      simulatedRecommendedQuantity,
      simulatedDaysUntilStockout: stockoutResult.daysUntilStockout?.toString(),
      estimatedCost: estimatedCost?.toString(),
      budgetExceeded,
    })
    .returning();

  return saved;
}

export async function listSimulations(storeId: string, productId?: string) {
  const conditions = [eq(simulations.storeId, storeId)];
  if (productId) conditions.push(eq(simulations.productId, productId));

  return db.query.simulations.findMany({
    where: and(...conditions),
    orderBy: desc(simulations.createdAt),
    limit: 20,
  });
}