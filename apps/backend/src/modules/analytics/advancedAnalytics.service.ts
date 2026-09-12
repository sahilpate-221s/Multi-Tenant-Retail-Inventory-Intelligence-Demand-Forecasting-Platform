import { eq, and, sql, inArray } from "drizzle-orm";
import { db } from "../../db/client";
import { reorderRecommendations, deadStockScores, inventory, products, categories } from "../../db/schema";

export interface RecommendationMetrics {
  totalResolved: number;
  ordered: number;
  dismissed: number;
  pending: number;
  acceptanceRate: number | null; // null if nothing resolved yet - never fake a 0% or 100%
}

export async function getRecommendationMetrics(storeId: string): Promise<RecommendationMetrics> {
  const rows = await db
    .select({ status: reorderRecommendations.status, count: sql<string>`count(*)` })
    .from(reorderRecommendations)
    .where(eq(reorderRecommendations.storeId, storeId))
    .groupBy(reorderRecommendations.status);

  const counts: Record<string, number> = { pending: 0, ordered: 0, dismissed: 0 };
  for (const row of rows) counts[row.status] = Number(row.count);

  const totalResolved = counts.ordered + counts.dismissed;
  const acceptanceRate = totalResolved > 0 ? Math.round((counts.ordered / totalResolved) * 1000) / 10 : null;

  return { totalResolved, ordered: counts.ordered, dismissed: counts.dismissed, pending: counts.pending, acceptanceRate };
}

export interface CapitalEfficiency {
  totalInventoryValue: number;
  deadStockValue: number;
  healthyStockValue: number;
  efficiencyPercent: number | null;
}

export async function getCapitalEfficiency(storeId: string): Promise<CapitalEfficiency> {
  const [inventoryValueResult] = await db
    .select({ value: sql<string>`COALESCE(SUM(${inventory.currentStock} * ${products.costPrice}), 0)` })
    .from(inventory)
    .innerJoin(products, eq(inventory.productId, products.id))
    .where(eq(inventory.storeId, storeId));

  const totalInventoryValue = Number(inventoryValueResult.value);

  // "Dead" here means the LATEST calculated score is >= 30 (the same
  // threshold Phase 9's listing endpoint uses) - reusing that existing,
  // already-tested definition rather than inventing a new one.
  const deadScores = await db.query.deadStockScores.findMany({
    where: and(eq(deadStockScores.storeId, storeId)),
  });
  const deadStockValue = deadScores
    .filter((s) => s.score >= 30)
    .reduce((sum, s) => sum + Number(s.inventoryValue), 0);

  const healthyStockValue = Math.max(0, totalInventoryValue - deadStockValue);
  const efficiencyPercent = totalInventoryValue > 0 ? Math.round((healthyStockValue / totalInventoryValue) * 1000) / 10 : null;

  return { totalInventoryValue, deadStockValue, healthyStockValue, efficiencyPercent };
}

export interface CategoryIntelligence {
  categoryName: string;
  productCount: number;
  totalInventoryValue: number;
  averageDeadStockScore: number | null;
}

export async function getCategoryIntelligence(storeId: string): Promise<CategoryIntelligence[]> {
  const productRows = await db
    .select({
      productId: products.id,
      categoryName: sql<string>`COALESCE(${categories.name}, 'Uncategorized')`,
      costPrice: products.costPrice,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.storeId, storeId), eq(products.isActive, true)));

  const inventoryRows = await db.query.inventory.findMany({ where: eq(inventory.storeId, storeId) });
  const stockByProduct = new Map(inventoryRows.map((i) => [i.productId, i.currentStock]));

  const deadScoreRows = await db.query.deadStockScores.findMany({ where: eq(deadStockScores.storeId, storeId) });
  const scoreByProduct = new Map(deadScoreRows.map((s) => [s.productId, s.score]));

  const categoryMap = new Map<string, { productCount: number; value: number; scores: number[] }>();

  for (const p of productRows) {
    const stock = stockByProduct.get(p.productId) ?? 0;
    const value = stock * Number(p.costPrice);
    const score = scoreByProduct.get(p.productId);

    const entry = categoryMap.get(p.categoryName) ?? { productCount: 0, value: 0, scores: [] };
    entry.productCount += 1;
    entry.value += value;
    if (score !== undefined) entry.scores.push(score);
    categoryMap.set(p.categoryName, entry);
  }

  return Array.from(categoryMap.entries()).map(([categoryName, data]) => ({
    categoryName,
    productCount: data.productCount,
    totalInventoryValue: Math.round(data.value * 100) / 100,
    averageDeadStockScore: data.scores.length > 0 ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) : null,
  }));
}