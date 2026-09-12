import { eq, and, desc, sql,asc } from "drizzle-orm";
import { db } from "../../db/client";
import { products, sales, saleItems, returns, anomalies } from "../../db/schema";
import { detectAnomaly } from "./anomalyDetection";
import { generateHypotheses } from "./hypothesisGenerator";
import { inventoryMovements } from "../../db/schema";
import { generateInventoryHypotheses } from "./inventoryHypothesisGenerator";



const LOOKBACK_DAYS = 30;

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[], avg: number): number {
  if (values.length === 0) return 0;
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export async function generateAnomalies(storeId: string) {
  const activeProducts = await db.query.products.findMany({
    where: and(eq(products.storeId, storeId), eq(products.isActive, true)),
  });

  const results: (typeof anomalies.$inferSelect)[] = [];

  for (const product of activeProducts) {
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - LOOKBACK_DAYS);
    const periodStartStr = periodStart.toISOString().split("T")[0];

    const dailyTotals = await db
      .select({ date: sales.saleDate, quantity: sql<string>`SUM(${saleItems.quantity})` })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(and(eq(sales.storeId, storeId), eq(saleItems.productId, product.id), sql`${sales.saleDate} >= ${periodStartStr}`))
      .groupBy(sales.saleDate)
      .orderBy(sales.saleDate);

    if (dailyTotals.length < 8) continue; // not enough data for a meaningful baseline

    const series = dailyTotals.map((d) => Number(d.quantity));
    const mostRecentValue = series[series.length - 1];
    const baselineSeries = series.slice(0, -1); // exclude the value being tested

    const baselineMean = mean(baselineSeries);
    const baselineStdDev = stdDev(baselineSeries, baselineMean);

    const detection = detectAnomaly(mostRecentValue, baselineMean, baselineStdDev);
    if (!detection.isAnomaly || !detection.direction) continue;

    const hypotheses = generateHypotheses(detection.direction);

    const [saved] = await db
      .insert(anomalies)
      .values({
        storeId,
        productId: product.id,
        anomalyType: "demand",
        direction: detection.direction,
        severity: detection.severity!,
        observedValue: mostRecentValue.toString(),
        baselineMean: baselineMean.toString(),
        zScore: detection.zScore?.toString(),
        possibleCauses: JSON.stringify(hypotheses),
      })
      .returning();

    results.push(saved);
  }

  return results;
}

export async function listAnomalies(storeId: string) {
  const rows = await db
    .select({
      id: anomalies.id,
      productId: anomalies.productId,
      productName: products.name,
      anomalyType: anomalies.anomalyType,
      direction: anomalies.direction,
      severity: anomalies.severity,
      observedValue: anomalies.observedValue,
      baselineMean: anomalies.baselineMean,
      zScore: anomalies.zScore,
      possibleCauses: anomalies.possibleCauses,
      detectedAt: anomalies.detectedAt,
    })
    .from(anomalies)
    .innerJoin(products, eq(anomalies.productId, products.id))
    .where(eq(anomalies.storeId, storeId))
    .orderBy(desc(anomalies.detectedAt));

  return rows.map((r) => ({ ...r, possibleCauses: JSON.parse(r.possibleCauses) as string[] }));
}

export async function generateInventoryAnomalies(storeId: string) {
  const activeProducts = await db.query.products.findMany({
    where: and(eq(products.storeId, storeId), eq(products.isActive, true)),
  });

  const results: (typeof anomalies.$inferSelect)[] = [];

  for (const product of activeProducts) {
    const movements = await db.query.inventoryMovements.findMany({
      where: and(eq(inventoryMovements.storeId, storeId), eq(inventoryMovements.productId, product.id)),
      orderBy: asc(inventoryMovements.createdAt),
    });

    if (movements.length < 8) continue; // same honest minimum-data discipline as demand anomalies

    const magnitudes = movements.map((m) => Math.abs(m.quantityChange));
    const mostRecent = magnitudes[magnitudes.length - 1];
    const baseline = magnitudes.slice(0, -1);

    const baselineMean = mean(baseline);
    const baselineStdDev = stdDev(baseline, baselineMean);

    const detection = detectAnomaly(mostRecent, baselineMean, baselineStdDev);
    if (!detection.isAnomaly || !detection.direction) continue;

    const [saved] = await db
      .insert(anomalies)
      .values({
        storeId,
        productId: product.id,
        anomalyType: "inventory",
        direction: detection.direction,
        severity: detection.severity!,
        observedValue: mostRecent.toString(),
        baselineMean: baselineMean.toString(),
        zScore: detection.zScore?.toString(),
        possibleCauses: JSON.stringify(generateInventoryHypotheses(detection.direction)),
      })
      .returning();

    results.push(saved);
  }

  return results;
}

export async function generateReturnAnomalies(storeId: string) {
  const activeProducts = await db.query.products.findMany({
    where: and(eq(products.storeId, storeId), eq(products.isActive, true)),
  });

  const results: (typeof anomalies.$inferSelect)[] = [];

  for (const product of activeProducts) {
    const returnRows = await db
      .select({ quantity: returns.quantity, createdAt: returns.createdAt })
      .from(returns)
      .innerJoin(saleItems, eq(returns.saleItemId, saleItems.id))
      .where(and(eq(returns.storeId, storeId), eq(saleItems.productId, product.id)))
      .orderBy(asc(returns.createdAt));

    if (returnRows.length < 8) continue; // same honest minimum, real returns data will take time to accumulate

    const quantities = returnRows.map((r) => r.quantity);
    const mostRecent = quantities[quantities.length - 1];
    const baseline = quantities.slice(0, -1);
    const baselineMean = mean(baseline);
    const baselineStdDev = stdDev(baseline, baselineMean);

    const detection = detectAnomaly(mostRecent, baselineMean, baselineStdDev);
    if (!detection.isAnomaly || detection.direction !== "spike") continue; // only unusually LARGE returns are the meaningful signal here

    const [saved] = await db
      .insert(anomalies)
      .values({
        storeId,
        productId: product.id,
        anomalyType: "return",
        direction: "spike",
        severity: detection.severity!,
        observedValue: mostRecent.toString(),
        baselineMean: baselineMean.toString(),
        zScore: detection.zScore?.toString(),
        possibleCauses: JSON.stringify([
          "This could indicate a product quality or defect issue.",
          "This could reflect a pricing or description mismatch causing buyer's remorse.",
          "This could be a data entry error — worth confirming the return quantity.",
        ]),
      })
      .returning();

    results.push(saved);
  }

  return results;
}