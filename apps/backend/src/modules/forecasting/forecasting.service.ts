import { eq, and, sql,desc } from "drizzle-orm";
import { db } from "../../db/client";
import { sales, saleItems, products } from "../../db/schema";
import { forecastRuns } from "../../db/schema";
import { createNotification } from "../notifications/notifications.service";


const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
const HISTORY_LOOKBACK_DAYS = 60;

interface ModelScore {
  model: string;
  mae: number;
  rmse: number;
  wape: number | null;
}

interface ForecastResponse {
  forecast: number;
  bestModel: string;
  modelScores: ModelScore[];
  daysOfHistory: number;
}

async function getDailyDemandSeries(storeId: string, productId: string): Promise<number[]> {
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - HISTORY_LOOKBACK_DAYS);
  const periodStartStr = periodStart.toISOString().split("T")[0];

  const dailyTotals = await db
    .select({ date: sales.saleDate, quantity: sql<string>`SUM(${saleItems.quantity})` })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(and(eq(sales.storeId, storeId), eq(saleItems.productId, productId)))
    .groupBy(sales.saleDate);

  const demandMap = new Map(dailyTotals.map((d) => [d.date, Number(d.quantity)]));

  // Build a complete, gap-filled series (zeros for no-sale days) —
  // same principle as Phase 7's demand velocity: missing days are real
  // zero-demand days, not gaps to skip.
  const series: number[] = [];
  const today = new Date();
  for (let i = HISTORY_LOOKBACK_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    series.push(demandMap.get(dateStr) ?? 0);
  }
  return series;
}

export async function getForecastForProduct(storeId: string, productId: string): Promise<ForecastResponse> {
  const product = await db.query.products.findFirst({
    where: and(eq(products.id, productId), eq(products.storeId, storeId)),
  });
  if (!product) throw new Error("Product not found for this store.");

  const history = await getDailyDemandSeries(storeId, productId);

  let response: Response;
  try {
    response = await fetch(`${ML_SERVICE_URL}/api/forecast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history }),
    });
  } catch {
    // Spec section 52: external services can fail, core app must degrade
    // gracefully. If the ML service is unreachable, we say so explicitly
    // rather than crashing the whole request or fabricating a number.
    throw new Error("ML_SERVICE_UNAVAILABLE");
  }

  if (!response.ok) {
    throw new Error("ML_SERVICE_ERROR");
  }

  return response.json();
}


function getConfidenceLabel(daysOfHistory: number): "low" | "medium" | "high" {
  if (daysOfHistory < 14) return "low";
  if (daysOfHistory < 45) return "medium";
  return "high";
}

export async function generateAndStoreForecast(
  storeId: string,
  productId: string,
  horizonDays: 7 | 30,
) {
  const rawForecast = await getForecastForProduct(storeId, productId);

  const forecastedTotalDemand = rawForecast.forecast * horizonDays;
  const confidence = getConfidenceLabel(rawForecast.daysOfHistory);

  const [run] = await db
    .insert(forecastRuns)
    .values({
      storeId,
      productId,
      horizonDays,
      forecastedDailyDemand: rawForecast.forecast.toString(),
      forecastedTotalDemand: forecastedTotalDemand.toString(),
      modelUsed: rawForecast.bestModel,
      confidence,
      daysOfHistoryUsed: rawForecast.daysOfHistory,
      modelScoresSnapshot: JSON.stringify(rawForecast.modelScores),
    })
    .returning();

  await createNotification(
    storeId,
    "FORECAST_READY",
    "New forecast available",
    `A ${horizonDays}-day demand forecast has been generated (${confidence} confidence).`,
    productId,
  );

  return run;
}

export async function getLatestForecast(storeId: string, productId: string, horizonDays: number) {
  return db.query.forecastRuns.findFirst({
    where: and(
      eq(forecastRuns.storeId, storeId),
      eq(forecastRuns.productId, productId),
      eq(forecastRuns.horizonDays, horizonDays),
    ),
    orderBy: desc(forecastRuns.generatedAt),
  });
}

export async function getForecastHistory(storeId: string, productId: string) {
  return db.query.forecastRuns.findMany({
    where: and(eq(forecastRuns.storeId, storeId), eq(forecastRuns.productId, productId)),
    orderBy: desc(forecastRuns.generatedAt),
    limit: 20,
  });
}

