import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { products, inventory, sales, saleItems, deadStockScores } from "../../db/schema";
import { calculateDeadStockScore } from "./deadStockScoring";
import { getDemandVelocityForProduct } from "../intelligence/intelligence.service";
import { createNotification } from "../notifications/notifications.service";

export async function generateDeadStockScores(storeId: string) {
  const activeProducts = await db.query.products.findMany({
    where: and(eq(products.storeId, storeId), eq(products.isActive, true)),
  });

  const results: (typeof deadStockScores.$inferSelect)[] = [];

  for (const product of activeProducts) {
    const inventoryRow = await db.query.inventory.findFirst({
      where: and(eq(inventory.storeId, storeId), eq(inventory.productId, product.id)),
    });
    const currentStock = inventoryRow?.currentStock ?? 0;

    const [lastSaleResult] = await db
      .select({ lastSaleDate: sql<string | null>`MAX(${sales.saleDate})` })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(and(eq(sales.storeId, storeId), eq(saleItems.productId, product.id)));

    const daysSinceLastSale = lastSaleResult.lastSaleDate
      ? Math.floor((Date.now() - new Date(lastSaleResult.lastSaleDate).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const productAgeDays = Math.floor(
      (Date.now() - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24),
    );

    const velocity = await getDemandVelocityForProduct(storeId, product.id);

    const { score, reasonCodes } = calculateDeadStockScore({
      daysSinceLastSale,
      averageDailyDemand: velocity.averageDailyDemand,
      currentStock,
      productAgeDays,
    });

    const inventoryValue = currentStock * Number(product.costPrice);

    if (score >= 70) {
      await createNotification(
        storeId,
        "DEAD_STOCK",
        `${product.name} — high dead stock score`,
        `Score: ${score}/100. ₹${inventoryValue.toFixed(2)} in capital may be tied up in slow-moving stock.`,
        product.id,
      );
    }

    // Replace any existing score for this product with a fresh
    // snapshot — dead stock scores represent "current state," not a
    // history log the way recommendations do.
    await db.delete(deadStockScores).where(
      and(eq(deadStockScores.storeId, storeId), eq(deadStockScores.productId, product.id)),
    );

    const [saved] = await db
      .insert(deadStockScores)
      .values({
        storeId,
        productId: product.id,
        score,
        daysSinceLastSale,
        currentStock,
        inventoryValue: inventoryValue.toString(),
        averageDailyDemand: velocity.averageDailyDemand.toString(),
        reasonCodes: JSON.stringify(reasonCodes),
      })
      .returning();

    results.push(saved);
  }

  return results;
}

export async function listDeadStockScores(storeId: string, minScore: number = 30) {
  const rows = await db
    .select({
      id: deadStockScores.id,
      productId: deadStockScores.productId,
      productName: products.name,
      score: deadStockScores.score,
      daysSinceLastSale: deadStockScores.daysSinceLastSale,
      currentStock: deadStockScores.currentStock,
      inventoryValue: deadStockScores.inventoryValue,
      averageDailyDemand: deadStockScores.averageDailyDemand,
      reasonCodes: deadStockScores.reasonCodes,
      calculatedAt: deadStockScores.calculatedAt,
    })
    .from(deadStockScores)
    .innerJoin(products, eq(deadStockScores.productId, products.id))
    .where(eq(deadStockScores.storeId, storeId))
    .orderBy(desc(deadStockScores.score));

  return rows
    .filter((r) => r.score >= minScore)
    .map((r) => ({ ...r, reasonCodes: JSON.parse(r.reasonCodes) as string[] }));
}