import { eq, and, ilike, asc, desc, sql, SQL, isNull } from "drizzle-orm";
import { db } from "../../db/client";
import { products, categories, inventory, inventoryMovements, supplierProducts, suppliers } from "../../db/schema";
import type { CreateProductInput, UpdateProductInput, ListProductsQuery } from "./products.schema";

export class ProductError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

async function assertCategoryBelongsToStore(storeId: string, categoryId: string) {
  const category = await db.query.categories.findFirst({
    where: and(eq(categories.id, categoryId), eq(categories.storeId, storeId), isNull(categories.deletedAt)),
  });
  if (!category) {
    throw new ProductError("Category not found for this store.", "INVALID_CATEGORY");
  }
}

export async function listProducts(storeId: string, query: ListProductsQuery) {
  const conditions: SQL[] = [eq(products.storeId, storeId), isNull(products.deletedAt)];

  if (query.search) {
    conditions.push(ilike(products.name, `%${query.search}%`));
  }
  if (query.categoryId) {
    conditions.push(eq(products.categoryId, query.categoryId));
  }
  if (query.isActive !== undefined) {
    conditions.push(eq(products.isActive, query.isActive === "true"));
  }

  const sortColumn = products[query.sortBy];
  const orderFn = query.sortOrder === "desc" ? desc : asc;
  const offset = (query.page - 1) * query.pageSize;

  const [rows, totalResult] = await Promise.all([
    db
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn))
      .limit(query.pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(and(...conditions)),
  ]);

  return {
    items: rows,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total: totalResult[0].count,
      totalPages: Math.ceil(totalResult[0].count / query.pageSize),
    },
  };
}

export async function getProductById(storeId: string, productId: string, includeDeleted = false) {
  const conditions = [eq(products.id, productId), eq(products.storeId, storeId)];
  if (!includeDeleted) {
    conditions.push(isNull(products.deletedAt));
  }
  return db.query.products.findFirst({
    where: and(...conditions),
  });
}

export async function getProductByBarcode(storeId: string, code: string) {
  const trimmed = code.trim();
  // Try exact barcode match first
  let product = await db.query.products.findFirst({
    where: and(eq(products.barcode, trimmed), eq(products.storeId, storeId), isNull(products.deletedAt)),
  });

  // If not found by barcode, try SKU (case-insensitive)
  if (!product) {
    product = await db.query.products.findFirst({
      where: and(ilike(products.sku, trimmed), eq(products.storeId, storeId), isNull(products.deletedAt)),
    });
  }

  return product;
}

export async function createProduct(storeId: string, input: CreateProductInput) {
  if (input.categoryId) {
    await assertCategoryBelongsToStore(storeId, input.categoryId);
  }

  try {
    const [product] = await db
      .insert(products)
      .values({
        storeId,
        name: input.name,
        sku: input.sku,
        barcode: input.barcode,
        categoryId: input.categoryId ?? null,
        costPrice: input.costPrice.toString(),
        sellingPrice: input.sellingPrice.toString(),
        hsnCode: input.hsnCode ?? null,
        gstRate: input.gstRate !== undefined && input.gstRate !== null ? input.gstRate.toString() : "0.00",
        isActive: input.isActive ?? true,
      })
      .returning();

    const initialStock = input.initialStock ?? 0;
    const minStock = input.minStock ?? 0;

    await db.insert(inventory).values({
      storeId,
      productId: product.id,
      currentStock: initialStock,
      minStock: minStock,
      safetyStock: 0,
    });

    if (initialStock > 0) {
      await db.insert(inventoryMovements).values({
        storeId,
        productId: product.id,
        quantityChange: initialStock,
        reason: "initial_count",
        note: "Initial physical stock registered at product creation",
      });
    }

    if (input.supplierId) {
      const sup = await db.query.suppliers.findFirst({
        where: and(eq(suppliers.id, input.supplierId), eq(suppliers.storeId, storeId)),
      });
      if (sup) {
        await db.insert(supplierProducts).values({
          supplierId: input.supplierId,
          productId: product.id,
          leadTimeDays: 3,
          moq: 1,
          cost: input.costPrice.toString(),
        });
      }
    }

    return product;
  } catch (err: unknown) {
    if (isUniqueConstraintError(err, "products_store_id_sku_unique")) {
      throw new ProductError("A product with this SKU already exists.", "DUPLICATE_SKU");
    }
    throw err;
  }
}

export async function updateProduct(
  storeId: string,
  productId: string,
  input: UpdateProductInput,
) {
  if (input.categoryId) {
    await assertCategoryBelongsToStore(storeId, input.categoryId);
  }

  const updateValues: Record<string, unknown> = { ...input, updatedAt: new Date() };
  if (input.costPrice !== undefined) updateValues.costPrice = input.costPrice.toString();
  if (input.sellingPrice !== undefined) updateValues.sellingPrice = input.sellingPrice.toString();
  if (input.gstRate !== undefined) updateValues.gstRate = input.gstRate !== null ? input.gstRate.toString() : "0.00";
  if (input.hsnCode !== undefined) updateValues.hsnCode = input.hsnCode ?? null;

  try {
    const [product] = await db
      .update(products)
      .set(updateValues)
      .where(and(eq(products.id, productId), eq(products.storeId, storeId)))
      .returning();
    return product ?? null;
  } catch (err: unknown) {
    if (isUniqueConstraintError(err, "products_store_id_sku_unique")) {
      throw new ProductError("A product with this SKU already exists.", "DUPLICATE_SKU");
    }
    throw err;
  }
}

export async function deleteProduct(storeId: string, productId: string) {
  const [deleted] = await db
    .update(products)
    .set({
      deletedAt: new Date(),
      isActive: false,
      updatedAt: new Date(),
    })
    .where(and(eq(products.id, productId), eq(products.storeId, storeId), isNull(products.deletedAt)))
    .returning();
  return deleted ?? null;
}

function isUniqueConstraintError(err: unknown, constraintName: string): boolean {
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