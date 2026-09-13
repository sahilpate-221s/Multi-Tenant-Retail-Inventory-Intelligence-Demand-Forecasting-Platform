import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { stores, users, suppliers } from "../../db/schema";
import { hashPassword } from "../auth/password";
import { createSupplier, updateSupplier, deleteSupplier, listSuppliers } from "./suppliers.service";

let storeAId: string;
let storeBId: string;
let supplierAId: string;

beforeAll(async () => {
  const [storeA] = await db.insert(stores).values({ name: "CT Test Store A - Suppliers" }).returning();
  const [storeB] = await db.insert(stores).values({ name: "CT Test Store B - Suppliers" }).returning();
  storeAId = storeA.id;
  storeBId = storeB.id;

  await db.insert(users).values({
    storeId: storeAId,
    email: `sup-a-${Date.now()}@crosstenanttest.local`,
    passwordHash: await hashPassword("irrelevant"),
  });

  const supplierA = await createSupplier(storeAId, { name: "Store A Secret Supplier" });
  supplierAId = supplierA.id;
});

afterAll(async () => {
  await db.delete(stores).where(eq(stores.id, storeAId));
  await db.delete(stores).where(eq(stores.id, storeBId));
});

describe("Cross-tenant isolation: suppliers", () => {
  it("Store B's supplier list never includes Store A's supplier", async () => {
    const result = await listSuppliers(storeBId);
    expect(result.find((s) => s.id === supplierAId)).toBeUndefined();
  });

  it("Store B cannot update Store A's supplier", async () => {
    const result = await updateSupplier(storeBId, supplierAId, { name: "Hacked Name" });
    expect(result).toBeNull();

    const stillReal = await listSuppliers(storeAId);
    expect(stillReal.find((s) => s.id === supplierAId)?.name).toBe("Store A Secret Supplier");
  });

  it("Store B cannot delete Store A's supplier", async () => {
    const result = await deleteSupplier(storeBId, supplierAId);
    expect(result).toBeNull();

    const stillExists = await listSuppliers(storeAId);
    expect(stillExists.find((s) => s.id === supplierAId)).toBeDefined();
  });
});