import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { stores, users, reorderRecommendations } from "../../db/schema";
import { hashPassword } from "../auth/password";
import { createProduct } from "../products/products.service";
import { listRecommendations, updateRecommendationStatus } from "./recommendations.service";

let storeAId: string;
let storeBId: string;
let recAId: string;

beforeAll(async () => {
  const [storeA] = await db.insert(stores).values({ name: "CT Test Store A - Rec" }).returning();
  const [storeB] = await db.insert(stores).values({ name: "CT Test Store B - Rec" }).returning();
  storeAId = storeA.id;
  storeBId = storeB.id;
  await db.insert(users).values({
    storeId: storeAId,
    email: `rec-a-${Date.now()}@crosstenanttest.local`,
    passwordHash: await hashPassword("irrelevant"),
  });

  const productA = await createProduct(storeAId, { name: "Rec CT Product", sku: `REC-CT-${Date.now()}`, costPrice: 5, sellingPrice: 10 });

  // Insert a recommendation directly - bypasses the generation service,
  // which is fine here since we're testing data-access isolation, not
  // the generation logic itself (already covered by Phase 8's manual tests).
  const [rec] = await db
    .insert(reorderRecommendations)
    .values({
      storeId: storeAId,
      productId: productA.id,
      currentStock: 5,
      incomingStock: 0,
      averageDailyDemand: "1.000",
      safetyStock: 2,
      recommendedQuantity: 20,
      reasonCodes: "[]",
    })
    .returning();
  recAId = rec.id;
});

afterAll(async () => {
  await db.delete(stores).where(eq(stores.id, storeAId));
  await db.delete(stores).where(eq(stores.id, storeBId));
});

describe("Cross-tenant isolation: recommendations", () => {
  it("Store B's recommendation list never includes Store A's recommendation", async () => {
    const result = await listRecommendations(storeBId);
    expect(result.find((r) => r.id === recAId)).toBeUndefined();
  });

  it("Store B cannot update the status of Store A's recommendation", async () => {
    const result = await updateRecommendationStatus(storeBId, recAId, "dismissed");
    expect(result).toBeNull();

    const stillReal = await listRecommendations(storeAId);
    expect(stillReal.find((r) => r.id === recAId)?.status).toBe("pending");
  });
});
