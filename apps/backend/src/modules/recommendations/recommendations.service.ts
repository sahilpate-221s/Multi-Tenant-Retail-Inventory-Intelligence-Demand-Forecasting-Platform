import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db/client";
import { products, reorderRecommendations, purchaseOrders, supplierProducts } from "../../db/schema";
import { getInventoryIntelligence } from "../intelligence/intelligence.service";

export async function generateRecommendations(storeId: string) {
  const activeProducts = await db.query.products.findMany({
    where: and(eq(products.storeId, storeId), eq(products.isActive, true)),
  });

  const created: (typeof reorderRecommendations.$inferSelect)[] = [];

  for (const product of activeProducts) {
    const intelligence = await getInventoryIntelligence(storeId, product.id);

    if (!intelligence.shouldReorder) continue;

    // Avoid duplicate pending recommendations for the same product —
    // if one's already pending, don't spam a new one every generation run.
    const existingPending = await db.query.reorderRecommendations.findFirst({
      where: and(
        eq(reorderRecommendations.storeId, storeId),
        eq(reorderRecommendations.productId, product.id),
        eq(reorderRecommendations.status, "pending"),
      ),
    });
    if (existingPending) continue;

    const [rec] = await db
      .insert(reorderRecommendations)
      .values({
        storeId,
        productId: product.id,
        currentStock: intelligence.currentStock,
        incomingStock: intelligence.incomingStock,
        averageDailyDemand: intelligence.averageDailyDemand.toString(),
        leadTimeDays: intelligence.leadTimeDays,
        safetyStock: intelligence.safetyStock,
        reorderPoint: intelligence.reorderPoint,
        recommendedQuantity: intelligence.recommendedQuantity,
        daysUntilStockout: intelligence.daysUntilStockout?.toString(),
        reasonCodes: JSON.stringify(intelligence.reasonCodes),
      })
      .returning();

    created.push(rec);
  }

  return created;
}

export async function listRecommendations(storeId: string, status?: string) {
  const conditions = [eq(reorderRecommendations.storeId, storeId)];
  if (status) conditions.push(eq(reorderRecommendations.status, status));

  const rows = await db
    .select({
      id: reorderRecommendations.id,
      productId: reorderRecommendations.productId,
      productName: products.name,
      currentStock: reorderRecommendations.currentStock,
      incomingStock: reorderRecommendations.incomingStock,
      averageDailyDemand: reorderRecommendations.averageDailyDemand,
      leadTimeDays: reorderRecommendations.leadTimeDays,
      safetyStock: reorderRecommendations.safetyStock,
      reorderPoint: reorderRecommendations.reorderPoint,
      recommendedQuantity: reorderRecommendations.recommendedQuantity,
      daysUntilStockout: reorderRecommendations.daysUntilStockout,
      reasonCodes: reorderRecommendations.reasonCodes,
      status: reorderRecommendations.status,
      createdAt: reorderRecommendations.createdAt,
    })
    .from(reorderRecommendations)
    .innerJoin(products, eq(reorderRecommendations.productId, products.id))
    .where(and(...conditions));

  // Priority ranking: most urgent (lowest days-until-stockout) first.
  // Recommendations with no computable stockout estimate (null) rank last —
  // they're not urgent by definition, since we can't even estimate a timeline.
  return rows
    .map((r) => ({ ...r, reasonCodes: JSON.parse(r.reasonCodes) as string[] }))
    .sort((a, b) => {
      const aDays = a.daysUntilStockout !== null ? Number(a.daysUntilStockout) : Infinity;
      const bDays = b.daysUntilStockout !== null ? Number(b.daysUntilStockout) : Infinity;
      return aDays - bDays;
    });
}

export async function updateRecommendationStatus(
  storeId: string,
  recommendationId: string,
  status: "ordered" | "dismissed",
) {
  const existingRec = await db.query.reorderRecommendations.findFirst({
    where: and(
      eq(reorderRecommendations.id, recommendationId),
      eq(reorderRecommendations.storeId, storeId),
    ),
  });
  if (!existingRec) return null;

  const [updated] = await db
    .update(reorderRecommendations)
    .set({ status, resolvedAt: new Date() })
    .where(and(eq(reorderRecommendations.id, recommendationId), eq(reorderRecommendations.storeId, storeId)))
    .returning();

  let createdPo = null;
  if (status === "ordered" && existingRec) {
    const supplierLink = await db
      .select({ supplierId: supplierProducts.supplierId, leadTimeDays: supplierProducts.leadTimeDays })
      .from(supplierProducts)
      .where(eq(supplierProducts.productId, existingRec.productId))
      .limit(1);

    const leadTime = existingRec.leadTimeDays ?? supplierLink[0]?.leadTimeDays ?? 3;
    const expectedArrival = new Date();
    expectedArrival.setDate(expectedArrival.getDate() + leadTime);
    const expectedArrivalStr = expectedArrival.toISOString().split("T")[0];

    const [po] = await db
      .insert(purchaseOrders)
      .values({
        storeId,
        productId: existingRec.productId,
        supplierId: supplierLink[0]?.supplierId ?? null,
        quantity: existingRec.recommendedQuantity,
        expectedArrivalDate: expectedArrivalStr,
        status: "pending",
      })
      .returning();

    createdPo = po;
  }

  return updated ? { ...updated, purchaseOrder: createdPo } : null;
}