import { eq, and, lte, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { forecastRuns, sales, saleItems, products } from "../../db/schema";

export interface ForecastPerformanceEntry {
  forecastId: string;
  productName: string;
  horizonDays: number;
  forecastedTotalDemand: number;
  actualTotalDemand: number;
  absoluteError: number;
  generatedAt: string;
}

export interface ForecastPerformanceSummary {
  scoreableForecastCount: number;
  totalForecastCount: number;
  meanAbsoluteError: number | null;
  wape: number | null;
  entries: ForecastPerformanceEntry[];
}

export async function getForecastPerformance(storeId: string): Promise<ForecastPerformanceSummary> {
  const allForecasts = await db
    .select({ forecast: forecastRuns, productName: products.name })
    .from(forecastRuns)
    .innerJoin(products, eq(forecastRuns.productId, products.id))
    .where(eq(forecastRuns.storeId, storeId));

  const entries: ForecastPerformanceEntry[] = [];
  const now = new Date();

  for (const { forecast, productName } of allForecasts) {
    const horizonEndDate = new Date(forecast.generatedAt);
    horizonEndDate.setDate(horizonEndDate.getDate() + forecast.horizonDays);

    // A forecast can only be scored once its FULL horizon has genuinely
    // elapsed - scoring it early would compare a 7-day prediction
    // against, say, 2 real days of data, which isn't a fair or honest
    // comparison. This is the actual mechanism preventing a premature
    // or misleading score.
    if (horizonEndDate > now) continue;

    const periodStartStr = forecast.generatedAt.toISOString().split("T")[0];
    const periodEndStr = horizonEndDate.toISOString().split("T")[0];

    const [actualResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${saleItems.quantity}), 0)` })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(
        and(
          eq(sales.storeId, storeId),
          eq(saleItems.productId, forecast.productId),
          sql`${sales.saleDate} >= ${periodStartStr} AND ${sales.saleDate} < ${periodEndStr}`,
        ),
      );

    const actualTotalDemand = Number(actualResult.total);
    const forecastedTotalDemand = Number(forecast.forecastedTotalDemand);

    entries.push({
      forecastId: forecast.id,
      productName,
      horizonDays: forecast.horizonDays,
      forecastedTotalDemand,
      actualTotalDemand,
      absoluteError: Math.round(Math.abs(forecastedTotalDemand - actualTotalDemand) * 100) / 100,
      generatedAt: forecast.generatedAt.toISOString(),
    });
  }

  const meanAbsoluteError =
    entries.length > 0 ? Math.round((entries.reduce((sum, e) => sum + e.absoluteError, 0) / entries.length) * 100) / 100 : null;

  const totalActual = entries.reduce((sum, e) => sum + e.actualTotalDemand, 0);
  const wape =
    totalActual > 0
      ? Math.round((entries.reduce((sum, e) => sum + e.absoluteError, 0) / totalActual) * 1000) / 10
      : null;

  return {
    scoreableForecastCount: entries.length,
    totalForecastCount: allForecasts.length,
    meanAbsoluteError,
    wape,
    entries,
  };
}