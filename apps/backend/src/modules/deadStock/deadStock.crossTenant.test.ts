import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { stores, users, deadStockScores } from "../../db/schema";
import { hashPassword } from "../auth/password";
import { createProduct } from "../products/products.service";
import { listDeadStockScores } from "./deadStock.service";

let storeAId: string;
let storeBId: string;
let scoreAId: string;

beforeAll(async () => {
  const [storeA] = await db.insert(stores).values({ name: "CT Test Store A - DeadStock" }).returning();
  const [storeB] = await db.insert(stores).values({ name: "CT Test Store B - DeadStock" }).returning();
  storeAId = storeA.id;
  storeBId = storeB.id;
  await db.insert(users).values({
    storeId: storeAId,
    email: `ds-a-${Date.now()}@crosstenanttest.local`,
    passwordHash: await hashPassword("irrelevant"),
  });

  const productA = await createProduct(storeAId, { name: "DeadStock CT Product", sku: `DS-CT-${Date.now()}`, costPrice: 5, sellingPrice: 10 });

  const [score] = await db
    .insert(deadStockScores)
    .values({
      storeId: storeAId,
      productId: productA.id,
      score: 90,
      daysSinceLastSale: 100,
      currentStock: 20,
      inventoryValue: "100.00",
      averageDailyDemand: "0.000",
      reasonCodes: "[]",
    })
    .returning();
  scoreAId = score.id;
});

afterAll(async () => {
  await db.delete(stores).where(eq(stores.id, storeAId));
  await db.delete(stores).where(eq(stores.id, storeBId));
});

describe("Cross-tenant isolation: dead stock", () => {
  it("Store B's dead stock list never includes Store A's score", async () => {
    const result = await listDeadStockScores(storeBId, 0); // minScore 0 to catch everything
    expect(result.find((s) => s.id === scoreAId)).toBeUndefined();
  });
});
