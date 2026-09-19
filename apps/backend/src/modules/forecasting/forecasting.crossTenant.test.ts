import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { stores, users, forecastRuns } from "../../db/schema";
import { hashPassword } from "../auth/password";
import { createProduct } from "../products/products.service";
import { getLatestForecast, getForecastHistory } from "./forecasting.service";

let storeAId: string;
let storeBId: string;
let productAId: string;

beforeAll(async () => {
  const [storeA] = await db.insert(stores).values({ name: "CT Test Store A - Forecast" }).returning();
  const [storeB] = await db.insert(stores).values({ name: "CT Test Store B - Forecast" }).returning();
  storeAId = storeA.id;
  storeBId = storeB.id;
  await db.insert(users).values({
    storeId: storeAId,
    email: `fc-a-${Date.now()}@crosstenanttest.local`,
    passwordHash: await hashPassword("irrelevant"),
  });

  const productA = await createProduct(storeAId, { name: "Forecast CT Product", sku: `FC-CT-${Date.now()}`, costPrice: 5, sellingPrice: 10 });
  productAId = productA.id;

  await db.insert(forecastRuns).values({
    storeId: storeAId,
    productId: productAId,
    horizonDays: 7,
    forecastedDailyDemand: "5.000",
    forecastedTotalDemand: "35.000",
    modelUsed: "moving_average",
    confidence: "low",
    daysOfHistoryUsed: 5,
    modelScoresSnapshot: "[]",
  });
});

afterAll(async () => {
  await db.delete(stores).where(eq(stores.id, storeAId));
  await db.delete(stores).where(eq(stores.id, storeBId));
});

describe("Cross-tenant isolation: forecasting", () => {
  it("Store B cannot retrieve Store A's latest forecast for Store A's product", async () => {
    const result = await getLatestForecast(storeBId, productAId, 7);
    expect(result).toBeUndefined();
  });

  it("Store B's forecast history for Store A's product is empty", async () => {
    const result = await getForecastHistory(storeBId, productAId);
    expect(result.length).toBe(0);
  });
});
