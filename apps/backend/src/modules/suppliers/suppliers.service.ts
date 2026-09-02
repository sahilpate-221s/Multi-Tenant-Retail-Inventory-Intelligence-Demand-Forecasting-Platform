import { eq, and } from "drizzle-orm";
import { db } from "../../db/client";
import { suppliers } from "../../db/schema";
import type { CreateSupplierInput, UpdateSupplierInput } from "./suppliers.schema";
import { supplierProducts, products } from "../../db/schema";
import type { LinkSupplierProductInput } from "./supplierProducts.schema";


export class SupplierError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

export async function linkSupplierToProduct(storeId: string, input: LinkSupplierProductInput) {
  // Both the supplier AND the product must belong to this exact store —
  // otherwise a request could link across tenant boundaries.
  const [supplier, product] = await Promise.all([
    db.query.suppliers.findFirst({ where: and(eq(suppliers.id, input.supplierId), eq(suppliers.storeId, storeId)) }),
    db.query.products.findFirst({ where: and(eq(products.id, input.productId), eq(products.storeId, storeId)) }),
  ]);

  if (!supplier) throw new SupplierError("Supplier not found for this store.", "SUPPLIER_NOT_FOUND");
  if (!product) throw new SupplierError("Product not found for this store.", "PRODUCT_NOT_FOUND");

  try {
    const [link] = await db
      .insert(supplierProducts)
      .values({
        supplierId: input.supplierId,
        productId: input.productId,
        leadTimeDays: input.leadTimeDays,
        moq: input.moq,
        cost: input.cost.toString(),
      })
      .returning();
    return link;
  } catch (err: unknown) {
    if (isUniqueConstraintErrorSP(err, "supplier_products_supplier_product_unique")) {
      throw new SupplierError("This supplier is already linked to this product.", "DUPLICATE_LINK");
    }
    throw err;
  }
}

export async function listProductSuppliers(storeId: string, productId: string) {
  return db
    .select({
      id: supplierProducts.id,
      supplierId: supplierProducts.supplierId,
      supplierName: suppliers.name,
      leadTimeDays: supplierProducts.leadTimeDays,
      moq: supplierProducts.moq,
      cost: supplierProducts.cost,
    })
    .from(supplierProducts)
    .innerJoin(suppliers, eq(supplierProducts.supplierId, suppliers.id))
    .where(and(eq(supplierProducts.productId, productId), eq(suppliers.storeId, storeId)));
}

export async function unlinkSupplierProduct(storeId: string, linkId: string) {
  // Delete only if the link's supplier genuinely belongs to this store.
  const link = await db.query.supplierProducts.findFirst({ where: eq(supplierProducts.id, linkId) });
  if (!link) return null;
  const supplier = await db.query.suppliers.findFirst({
    where: and(eq(suppliers.id, link.supplierId), eq(suppliers.storeId, storeId)),
  });
  if (!supplier) return null;

  const [deleted] = await db.delete(supplierProducts).where(eq(supplierProducts.id, linkId)).returning();
  return deleted ?? null;
}

function isUniqueConstraintErrorSP(err: unknown, constraintName: string): boolean {
  if (typeof err !== "object" || err === null) return false;
  const cause = "cause" in err ? (err as { cause?: unknown }).cause : undefined;
  const target = cause && typeof cause === "object" ? cause : err;
  return (
    typeof target === "object" &&
    target !== null &&
    "constraint_name" in target &&
    (target as { constraint_name?: string }).constraint_name === constraintName
  );
}

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