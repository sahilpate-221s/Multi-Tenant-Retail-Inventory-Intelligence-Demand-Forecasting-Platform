import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { stores, users, stockoutPredictions } from "../../db/schema";
import { hashPassword } from "../auth/password";
import { createProduct } from "../products/products.service";
import { listStockoutPredictions } from "./stockout.service";

let storeAId: string;
let storeBId: string;
let predictionAId: string;

beforeAll(async () => {
  const [storeA] = await db.insert(stores).values({ name: "CT Test Store A - Stockout" }).returning();
  const [storeB] = await db.insert(stores).values({ name: "CT Test Store B - Stockout" }).returning();
  storeAId = storeA.id;
  storeBId = storeB.id;
  await db.insert(users).values({
    storeId: storeAId,
    email: `so-a-${Date.now()}@crosstenanttest.local`,
    passwordHash: await hashPassword("irrelevant"),
  });

  const productA = await createProduct(storeAId, { name: "Stockout CT Product", sku: `SO-CT-${Date.now()}`, costPrice: 5, sellingPrice: 10 });

  const [pred] = await db
    .insert(stockoutPredictions)
    .values({
      storeId: storeAId,
      productId: productA.id,
      currentStock: 3,
      incomingStock: 0,
      forecastedDailyDemand: "2.000",
      demandSource: "historical_average",
      leadTimeDays: 3,
      daysUntilStockout: "1.5",
      riskLevel: "critical",
    })
    .returning();
  predictionAId = pred.id;
});

afterAll(async () => {
  await db.delete(stores).where(eq(stores.id, storeAId));
  await db.delete(stores).where(eq(stores.id, storeBId));
});

describe("Cross-tenant isolation: stockout risks", () => {
  it("Store B's stockout risk list never includes Store A's prediction", async () => {
    const result = await listStockoutPredictions(storeBId, false); // include all risk levels
    expect(result.find((p) => p.id === predictionAId)).toBeUndefined();
  });
});
