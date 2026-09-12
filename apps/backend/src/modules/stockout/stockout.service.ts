import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db/client";
import { products, inventory, supplierProducts, stockoutPredictions, forecastRuns } from "../../db/schema";
import { getIncomingStock, getDemandVelocityForProduct } from "../intelligence/intelligence.service";
import { estimateStockout } from "../intelligence/stockoutEstimate";
import { classifyStockoutRisk } from "./riskClassification";
import { createNotification } from "../notifications/notifications.service";

export async function generateStockoutPredictions(storeId: string) {
  const activeProducts = await db.query.products.findMany({
    where: and(eq(products.storeId, storeId), eq(products.isActive, true)),
  });

  const results: (typeof stockoutPredictions.$inferSelect)[] = [];

  for (const product of activeProducts) {
    const inventoryRow = await db.query.inventory.findFirst({
      where: and(eq(inventory.storeId, storeId), eq(inventory.productId, product.id)),
    });
    const currentStock = inventoryRow?.currentStock ?? 0;
    const incomingStock = await getIncomingStock(storeId, product.id);

    // Prefer the latest real forecast; fall back to historical average
    // if none exists. Always record which source was actually used.
    const latestForecast = await db.query.forecastRuns.findFirst({
      where: and(
        eq(forecastRuns.storeId, storeId),
        eq(forecastRuns.productId, product.id),
        eq(forecastRuns.horizonDays, 7),
      ),
      orderBy: desc(forecastRuns.generatedAt),
    });

    let forecastedDailyDemand: number;
    let demandSource: "forecast" | "historical_average";

    if (latestForecast) {
      forecastedDailyDemand = Number(latestForecast.forecastedDailyDemand);
      demandSource = "forecast";
    } else {
      const velocity = await getDemandVelocityForProduct(storeId, product.id);
      forecastedDailyDemand = velocity.averageDailyDemand;
      demandSource = "historical_average";
    }

    const cheapestSupplierLink = await db
      .select({ leadTimeDays: supplierProducts.leadTimeDays })
      .from(supplierProducts)
      .where(eq(supplierProducts.productId, product.id))
      .orderBy(supplierProducts.cost)
      .limit(1);
    const leadTimeDays = cheapestSupplierLink[0]?.leadTimeDays ?? null;

    const stockoutResult = estimateStockout(currentStock + incomingStock, forecastedDailyDemand);
    const riskLevel = classifyStockoutRisk(stockoutResult.daysUntilStockout, leadTimeDays);

    if (riskLevel === "critical" || riskLevel === "high" || riskLevel === "unknown") {
      await createNotification(
        storeId,
        "STOCKOUT_RISK",
        `${product.name} — ${riskLevel === "unknown" ? "stock risk unclear, needs attention" : `${riskLevel} stockout risk`}`,
        stockoutResult.daysUntilStockout !== null
          ? `Estimated stockout in approximately ${stockoutResult.daysUntilStockout.toFixed(1)} days.`
          : `Stock is critically low relative to your minimum threshold, but demand is too low to estimate a timeline.`,
        product.id,
      );
    }

    // Replace-on-regenerate, same pattern as dead-stock scores.
    await db.delete(stockoutPredictions).where(
      and(eq(stockoutPredictions.storeId, storeId), eq(stockoutPredictions.productId, product.id)),
    );

    const [saved] = await db
      .insert(stockoutPredictions)
      .values({
        storeId,
        productId: product.id,
        currentStock,
        incomingStock,
        forecastedDailyDemand: forecastedDailyDemand.toString(),
        demandSource,
        leadTimeDays,
        daysUntilStockout: stockoutResult.daysUntilStockout?.toString(),
        riskLevel,
      })
      .returning();

    results.push(saved);
  }

  return results;
}

const RISK_ORDER: Record<string, number> = { critical: 0, high: 1, moderate: 2, unknown: 3, low: 4 };

export async function listStockoutPredictions(storeId: string, excludeLow: boolean = true) {
  const rows = await db
    .select({
      id: stockoutPredictions.id,
      productId: stockoutPredictions.productId,
      productName: products.name,
      currentStock: stockoutPredictions.currentStock,
      incomingStock: stockoutPredictions.incomingStock,
      forecastedDailyDemand: stockoutPredictions.forecastedDailyDemand,
      demandSource: stockoutPredictions.demandSource,
      leadTimeDays: stockoutPredictions.leadTimeDays,
      daysUntilStockout: stockoutPredictions.daysUntilStockout,
      riskLevel: stockoutPredictions.riskLevel,
      calculatedAt: stockoutPredictions.calculatedAt,
    })
    .from(stockoutPredictions)
    .innerJoin(products, eq(stockoutPredictions.productId, products.id))
    .where(eq(stockoutPredictions.storeId, storeId));

  const filtered = excludeLow ? rows.filter((r) => r.riskLevel !== "low") : rows;
  return filtered.sort((a, b) => RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel]);
}