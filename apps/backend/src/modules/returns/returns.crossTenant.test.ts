import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { stores, users, sales, saleItems, returns } from "../../db/schema";
import { hashPassword } from "../auth/password";
import { createProduct } from "../products/products.service";
import { createReturn, listReturnsForProduct } from "./returns.service";

let storeAId: string;
let storeBId: string;
let saleItemAId: string;
let productAId: string;

beforeAll(async () => {
  const [storeA] = await db.insert(stores).values({ name: "CT Test Store A - Returns" }).returning();
  const [storeB] = await db.insert(stores).values({ name: "CT Test Store B - Returns" }).returning();
  storeAId = storeA.id;
  storeBId = storeB.id;
  await db.insert(users).values({
    storeId: storeAId,
    email: `ret-a-${Date.now()}@crosstenanttest.local`,
    passwordHash: await hashPassword("irrelevant"),
  });

  const productA = await createProduct(storeAId, { name: "Returns CT Product", sku: `RET-CT-${Date.now()}`, costPrice: 5, sellingPrice: 10 });
  productAId = productA.id;

  const [sale] = await db.insert(sales).values({ storeId: storeAId, saleDate: "2026-09-01", totalAmount: "10.00" }).returning();
  const [saleItem] = await db
    .insert(saleItems)
    .values({ saleId: sale.id, productId: productAId, quantity: 5, unitPrice: "10.00", lineTotal: "50.00" })
    .returning();
  saleItemAId = saleItem.id;
});

afterAll(async () => {
  await db.delete(returns).where(eq(returns.storeId, storeAId));
  await db.delete(sales).where(eq(sales.storeId, storeAId));
  await db.delete(stores).where(eq(stores.id, storeAId));
  await db.delete(stores).where(eq(stores.id, storeBId));
});

describe("Cross-tenant isolation: returns", () => {
  it("Store B cannot create a return against Store A's sale item", async () => {
    await expect(createReturn(storeBId, { saleItemId: saleItemAId, quantity: 1 })).rejects.toThrow();
  });

  it("Store B's returns list for Store A's product is empty", async () => {
    const result = await listReturnsForProduct(storeBId, productAId);
    expect(result.length).toBe(0);
  });
});
