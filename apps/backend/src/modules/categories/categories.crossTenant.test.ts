import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { stores, users } from "../../db/schema";
import { hashPassword } from "../auth/password";
import { createCategory, updateCategory, deleteCategory, listCategories } from "./categories.service";

let storeAId: string;
let storeBId: string;
let categoryAId: string;

beforeAll(async () => {
  const [storeA] = await db.insert(stores).values({ name: "CT Test Store A - Categories" }).returning();
  const [storeB] = await db.insert(stores).values({ name: "CT Test Store B - Categories" }).returning();
  storeAId = storeA.id;
  storeBId = storeB.id;

  await db.insert(users).values({
    storeId: storeAId,
    email: `cat-a-${Date.now()}@crosstenanttest.local`,
    passwordHash: await hashPassword("irrelevant"),
  });

  const categoryA = await createCategory(storeAId, { name: "Store A Secret Category" });
  categoryAId = categoryA.id;
});

afterAll(async () => {
  await db.delete(stores).where(eq(stores.id, storeAId));
  await db.delete(stores).where(eq(stores.id, storeBId));
});

describe("Cross-tenant isolation: categories", () => {
  it("Store B's category list never includes Store A's category", async () => {
    const result = await listCategories(storeBId);
    expect(result.find((c) => c.id === categoryAId)).toBeUndefined();
  });

  it("Store B cannot update Store A's category", async () => {
    const result = await updateCategory(storeBId, categoryAId, { name: "Hacked Name" });
    expect(result).toBeNull();

    const stillReal = await listCategories(storeAId);
    expect(stillReal.find((c) => c.id === categoryAId)?.name).toBe("Store A Secret Category");
  });

  it("Store B cannot delete Store A's category", async () => {
    const result = await deleteCategory(storeBId, categoryAId);
    expect(result).toBeNull();

    const stillExists = await listCategories(storeAId);
    expect(stillExists.find((c) => c.id === categoryAId)).toBeDefined();
  });
});