import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { stores, users } from "../../db/schema";
import { hashPassword } from "../auth/password";
import { createProduct } from "../products/products.service";
import { runSimulation, listSimulations } from "./simulator.service";

let storeAId: string;
let storeBId: string;
let productAId: string;

beforeAll(async () => {
  const [storeA] = await db.insert(stores).values({ name: "CT Test Store A - Sim" }).returning();
  const [storeB] = await db.insert(stores).values({ name: "CT Test Store B - Sim" }).returning();
  storeAId = storeA.id;
  storeBId = storeB.id;
  await db.insert(users).values({
    storeId: storeAId,
    email: `sim-a-${Date.now()}@crosstenanttest.local`,
    passwordHash: await hashPassword("irrelevant"),
  });

  const productA = await createProduct(storeAId, { name: "Sim CT Product", sku: `SIM-CT-${Date.now()}`, costPrice: 5, sellingPrice: 10 });
  productAId = productA.id;
});

afterAll(async () => {
  await db.delete(stores).where(eq(stores.id, storeAId));
  await db.delete(stores).where(eq(stores.id, storeBId));
});

describe("Cross-tenant isolation: simulations", () => {
  it("Store B cannot run a simulation against Store A's product", async () => {
    await expect(runSimulation(storeBId, { productId: productAId })).rejects.toThrow();
  });

  it("Store B's simulation list never includes any simulation for Store A's product", async () => {
    // Run a legitimate simulation as Store A first
    await runSimulation(storeAId, { productId: productAId });
    const result = await listSimulations(storeBId, productAId);
    expect(result.length).toBe(0);
  });
});
