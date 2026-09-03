import { eq, and, gte, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { sales, saleItems, purchaseOrders } from "../../db/schema";
import { calculateDemandVelocity, type DemandVelocityResult } from "./demandVelocity";

const DEFAULT_LOOKBACK_DAYS = 30;

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