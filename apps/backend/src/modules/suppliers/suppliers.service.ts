import { eq, and } from "drizzle-orm";
import { db } from "../../db/client";
import { suppliers } from "../../db/schema";
import type { CreateSupplierInput, UpdateSupplierInput } from "./suppliers.schema";

export async function listSuppliers(storeId: string) {
  return db.query.suppliers.findMany({
    where: eq(suppliers.storeId, storeId),
    orderBy: (suppliers, { asc }) => [asc(suppliers.name)],
  });
}

export async function createSupplier(storeId: string, input: CreateSupplierInput) {
  const [supplier] = await db.insert(suppliers).values({ storeId, ...input }).returning();
  return supplier;
}

export async function updateSupplier(storeId: string, supplierId: string, input: UpdateSupplierInput) {
  const [supplier] = await db
    .update(suppliers)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(suppliers.id, supplierId), eq(suppliers.storeId, storeId)))
    .returning();
  return supplier ?? null;
}

export async function deleteSupplier(storeId: string, supplierId: string) {
  const [deleted] = await db
    .delete(suppliers)
    .where(and(eq(suppliers.id, supplierId), eq(suppliers.storeId, storeId)))
    .returning();
  return deleted ?? null;
}