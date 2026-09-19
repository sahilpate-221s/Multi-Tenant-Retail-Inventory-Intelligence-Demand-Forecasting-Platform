import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { stores, users, anomalies } from "../../db/schema";
import { hashPassword } from "../auth/password";
import { createProduct } from "../products/products.service";
import { listAnomalies } from "./anomalies.service";

let storeAId: string;
let storeBId: string;
let anomalyAId: string;

beforeAll(async () => {
  const [storeA] = await db.insert(stores).values({ name: "CT Test Store A - Anomaly" }).returning();
  const [storeB] = await db.insert(stores).values({ name: "CT Test Store B - Anomaly" }).returning();
  storeAId = storeA.id;
  storeBId = storeB.id;
  await db.insert(users).values({
    storeId: storeAId,
    email: `an-a-${Date.now()}@crosstenanttest.local`,
    passwordHash: await hashPassword("irrelevant"),
  });

  const productA = await createProduct(storeAId, { name: "Anomaly CT Product", sku: `AN-CT-${Date.now()}`, costPrice: 5, sellingPrice: 10 });

  const [anomaly] = await db
    .insert(anomalies)
    .values({
      storeId: storeAId,
      productId: productA.id,
      anomalyType: "demand",
      direction: "spike",
      severity: "significant",
      observedValue: "50.000",
      baselineMean: "10.000",
      zScore: "3.500",
      possibleCauses: "[]",
    })
    .returning();
  anomalyAId = anomaly.id;
});

afterAll(async () => {
  await db.delete(stores).where(eq(stores.id, storeAId));
  await db.delete(stores).where(eq(stores.id, storeBId));
});

describe("Cross-tenant isolation: anomalies", () => {
  it("Store B's anomaly list never includes Store A's anomaly", async () => {
    const result = await listAnomalies(storeBId);
    expect(result.find((a) => a.id === anomalyAId)).toBeUndefined();
  });
});
