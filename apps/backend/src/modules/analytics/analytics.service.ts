import { sql, gte, eq, and } from "drizzle-orm";
import { db } from "../../db/client";
import { sales, saleItems, products, categories, inventory } from "../../db/schema";
import { redisConnection } from "../../queue/redisConnection";

const CACHE_TTL_SECONDS = 60;

export interface DashboardData {
  periodDays: number;
  totalRevenue: number;
  unitsSold: number;
  inventoryValue: number;
  turnoverRatio: number | null;
  fastMovers: { productId: string; productName: string; unitsSold: number }[];
  slowMovers: { productId: string; productName: string; unitsSold: number; daysSinceLastSale: number | null }[];
  categoryPerformance: { categoryName: string; revenue: number }[];
}

export async function getDashboardData(storeId: string, periodDays: number): Promise<DashboardData> {
  const cacheKey = `dashboard:${storeId}:${periodDays}`;
  const cached = await redisConnection.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - periodDays);
  const periodStartStr = periodStart.toISOString().split("T")[0];

  // Total revenue + units sold in the period
  const [revenueResult] = await db
    .select({
      totalRevenue: sql<string>`COALESCE(SUM(${saleItems.lineTotal}), 0)`,
      unitsSold: sql<string>`COALESCE(SUM(${saleItems.quantity}), 0)`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(and(eq(sales.storeId, storeId), gte(sales.saleDate, periodStartStr)));

  const totalRevenue = Number(revenueResult.totalRevenue);
  const unitsSold = Number(revenueResult.unitsSold);

  // Cost of goods sold in the period (for turnover calculation)
  const [cogsResult] = await db
    .select({
      cogs: sql<string>`COALESCE(SUM(${saleItems.quantity} * ${products.costPrice}), 0)`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .innerJoin(products, eq(saleItems.productId, products.id))
    .where(and(eq(sales.storeId, storeId), gte(sales.saleDate, periodStartStr)));

  const cogs = Number(cogsResult.cogs);

  // Current inventory value: sum(currentStock * costPrice) across all products
  const [inventoryValueResult] = await db
    .select({
      value: sql<string>`COALESCE(SUM(${inventory.currentStock} * ${products.costPrice}), 0)`,
    })
    .from(inventory)
    .innerJoin(products, eq(inventory.productId, products.id))
    .where(eq(inventory.storeId, storeId));

  const inventoryValue = Number(inventoryValueResult.value);
  const turnoverRatio = inventoryValue > 0 ? Math.round((cogs / inventoryValue) * 100) / 100 : null;

  // Fast movers: top 5 products by units sold in the period
  const fastMovers = await db
    .select({
      productId: products.id,
      productName: products.name,
      unitsSold: sql<string>`SUM(${saleItems.quantity})`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .innerJoin(products, eq(saleItems.productId, products.id))
    .where(and(eq(sales.storeId, storeId), gte(sales.saleDate, periodStartStr)))
    .groupBy(products.id, products.name)
    .orderBy(sql`SUM(${saleItems.quantity}) DESC`)
    .limit(5);

  // Slow movers: active products with the LOWEST units sold in the period
  // (including zero). The date condition must live on the saleItems join
  // itself, not only on the sales join — otherwise sale_items rows outside
  // the period still get summed, since they're joined unconditionally.
  const slowMovers = await db
    .select({
      productId: products.id,
      productName: products.name,
      unitsSold: sql<string>`COALESCE(SUM(${saleItems.quantity}), 0)`,
      lastSaleDate: sql<string | null>`MAX(${sales.saleDate})`,
    })
    .from(products)
    .leftJoin(sales, and(eq(sales.storeId, storeId), gte(sales.saleDate, periodStartStr)))
    .leftJoin(
      saleItems,
      and(eq(saleItems.productId, products.id), eq(saleItems.saleId, sales.id)),
    )
    .where(and(eq(products.storeId, storeId), eq(products.isActive, true)))
    .groupBy(products.id, products.name)
    .orderBy(sql`COALESCE(SUM(${saleItems.quantity}), 0) ASC`)
    .limit(5);

  // Category performance: revenue by category in the period
  const categoryPerformance = await db
    .select({
      categoryName: sql<string>`COALESCE(${categories.name}, 'Uncategorized')`,
      revenue: sql<string>`SUM(${saleItems.lineTotal})`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .innerJoin(products, eq(saleItems.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(sales.storeId, storeId), gte(sales.saleDate, periodStartStr)))
    .groupBy(categories.name)
    .orderBy(sql`SUM(${saleItems.lineTotal}) DESC`);

  const result: DashboardData = {
    periodDays,
    totalRevenue,
    unitsSold,
    inventoryValue,
    turnoverRatio,
    fastMovers: fastMovers.map((f) => ({ ...f, unitsSold: Number(f.unitsSold) })),
    slowMovers: slowMovers.map((s) => ({
      productId: s.productId,
      productName: s.productName,
      unitsSold: Number(s.unitsSold),
      daysSinceLastSale: s.lastSaleDate
        ? Math.floor((Date.now() - new Date(s.lastSaleDate).getTime()) / (1000 * 60 * 60 * 24))
        : null,
    })),
    categoryPerformance: categoryPerformance.map((c) => ({ ...c, revenue: Number(c.revenue) })),
  };

  await redisConnection.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL_SECONDS);

  return result;
}