import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { stores, users, products } from "../../db/schema";
import { hashPassword } from "../auth/password";
import { createProduct } from "../products/products.service";
import { adjustStock, listInventory, getMovementHistory } from "./inventory.service";

let storeAId: string;
let storeBId: string;
let productAId: string;

beforeAll(async () => {
  const [storeA] = await db.insert(stores).values({ name: "CT Test Store A - Inventory" }).returning();
  const [storeB] = await db.insert(stores).values({ name: "CT Test Store B - Inventory" }).returning();
  storeAId = storeA.id;
  storeBId = storeB.id;

  await db.insert(users).values({
    storeId: storeAId,
    email: `inv-a-${Date.now()}@crosstenanttest.local`,
    passwordHash: await hashPassword("irrelevant"),
  });

  const productA = await createProduct(storeAId, {
    name: "Store A Secret Product",
    sku: `INV-CT-${Date.now()}`,
    costPrice: 10,
    sellingPrice: 20,
  });
  productAId = productA.id;

  // Give Store A's product real stock via a real adjustment
  await adjustStock(storeAId, { productId: productAId, quantityChange: 50, reason: "restock" });
});

afterAll(async () => {
  await db.delete(stores).where(eq(stores.id, storeAId));
  await db.delete(stores).where(eq(stores.id, storeBId));
});

describe("Cross-tenant isolation: inventory", () => {
  it("Store B's inventory list never includes Store A's product", async () => {
    const result = await listInventory(storeBId);
    expect(result.find((i) => i.productId === productAId)).toBeUndefined();
  });

  it("Store B cannot adjust stock for Store A's product", async () => {
    await expect(adjustStock(storeBId, { productId: productAId, quantityChange: 10, reason: "manual_adjustment" })).rejects.toThrow();

    // Confirm Store A's real stock is untouched
    const stillReal = await listInventory(storeAId);
    expect(stillReal.find((i) => i.productId === productAId)?.currentStock).toBe(50);
  });

  it("Store B cannot view Store A's product's movement history", async () => {
    const result = await getMovementHistory(storeBId, productAId);
    expect(result.length).toBe(0);
  });
});