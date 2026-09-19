import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { stores, users } from "../../db/schema";
import { hashPassword } from "../auth/password";
import { createProduct } from "../products/products.service";
import { createPurchaseOrder, listPurchaseOrders, receivePurchaseOrder, cancelPurchaseOrder } from "./purchaseOrders.service";

let storeAId: string;
let storeBId: string;
let poAId: string;

beforeAll(async () => {
  const [storeA] = await db.insert(stores).values({ name: "CT Test Store A - PO" }).returning();
  const [storeB] = await db.insert(stores).values({ name: "CT Test Store B - PO" }).returning();
  storeAId = storeA.id;
  storeBId = storeB.id;
  await db.insert(users).values({
    storeId: storeAId,
    email: `po-a-${Date.now()}@crosstenanttest.local`,
    passwordHash: await hashPassword("irrelevant"),
  });

  const productA = await createProduct(storeAId, { name: "PO CT Product", sku: `PO-CT-${Date.now()}`, costPrice: 5, sellingPrice: 10 });
  const po = await createPurchaseOrder(storeAId, { productId: productA.id, quantity: 10, expectedArrivalDate: "2026-12-01" });
  poAId = po.id;
});

afterAll(async () => {
  await db.delete(stores).where(eq(stores.id, storeAId));
  await db.delete(stores).where(eq(stores.id, storeBId));
});

describe("Cross-tenant isolation: purchase orders", () => {
  it("Store B's PO list never includes Store A's PO", async () => {
    const result = await listPurchaseOrders(storeBId);
    expect(result.find((p) => p.id === poAId)).toBeUndefined();
  });

  it("Store B cannot receive Store A's PO", async () => {
    await expect(receivePurchaseOrder(storeBId, poAId)).rejects.toThrow();
  });

  it("Store B cannot cancel Store A's PO", async () => {
    await expect(cancelPurchaseOrder(storeBId, poAId)).rejects.toThrow();
  });
});
