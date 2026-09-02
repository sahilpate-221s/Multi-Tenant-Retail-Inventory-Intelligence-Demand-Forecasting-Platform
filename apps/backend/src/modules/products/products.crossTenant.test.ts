import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { stores, users, products } from "../../db/schema";
import { hashPassword } from "../auth/password";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById,
  listProducts,
} from "./products.service";

// These are real rows created in the actual dev database for this test run,
// and cleaned up afterward. This deliberately exercises the real database,
// not a mock — the whole point is proving the SQL filtering itself works.

let storeAId: string;
let storeBId: string;
let productAId: string;

beforeAll(async () => {
  const [storeA] = await db.insert(stores).values({ name: "Test Store A" }).returning();
  const [storeB] = await db.insert(stores).values({ name: "Test Store B" }).returning();
  storeAId = storeA.id;
  storeBId = storeB.id;

  await db.insert(users).values({
    storeId: storeAId,
    email: `store-a-${Date.now()}@crosstenanttest.local`,
    passwordHash: await hashPassword("irrelevant"),
  });
  await db.insert(users).values({
    storeId: storeBId,
    email: `store-b-${Date.now()}@crosstenanttest.local`,
    passwordHash: await hashPassword("irrelevant"),
  });

  const productA = await createProduct(storeAId, {
    name: "Store A Secret Product",
    sku: `A-SKU-${Date.now()}`,
    costPrice: 10,
    sellingPrice: 20,
  });
  productAId = productA.id;
});

afterAll(async () => {
  // Cascade delete via stores cleans up users and products automatically —
  // this itself is relying on the FK cascade behavior we set up in Phase 2/3.
  await db.delete(stores).where(eq(stores.id, storeAId));
  await db.delete(stores).where(eq(stores.id, storeBId));
});

describe("Cross-tenant isolation: products", () => {
  it("Store B cannot fetch Store A's product by ID", async () => {
    const result = await getProductById(storeBId, productAId);
    expect(result).toBeUndefined();
  });

  it("Store B's product list never includes Store A's product", async () => {
    const result = await listProducts(storeBId, {
      sortBy: "name",
      sortOrder: "asc",
      page: 1,
      pageSize: 100,
    });
    const leakedProduct = result.items.find((p) => p.id === productAId);
    expect(leakedProduct).toBeUndefined();
  });

  it("Store B cannot update Store A's product", async () => {
    const result = await updateProduct(storeBId, productAId, { name: "Hacked Name" });
    expect(result).toBeNull();

    // Confirm the product genuinely wasn't touched, from Store A's own perspective
    const stillOriginal = await getProductById(storeAId, productAId);
    expect(stillOriginal?.name).toBe("Store A Secret Product");
  });

  it("Store B cannot delete Store A's product", async () => {
    const result = await deleteProduct(storeBId, productAId);
    expect(result).toBeNull();

    // Confirm it still exists from Store A's own perspective
    const stillExists = await getProductById(storeAId, productAId);
    expect(stillExists).toBeDefined();
  });

  it("Store A can still fully access its own product (sanity check)", async () => {
    const result = await getProductById(storeAId, productAId);
    expect(result).toBeDefined();
    expect(result?.name).toBe("Store A Secret Product");
  });
});