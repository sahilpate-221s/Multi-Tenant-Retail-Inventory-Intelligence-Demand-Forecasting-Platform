import { eq, and, ilike, asc, desc, sql, SQL } from "drizzle-orm";
import { db } from "../../db/client";
import { products, categories } from "../../db/schema";
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
    where: and(eq(categories.id, categoryId), eq(categories.storeId, storeId)),
  });
  if (!category) {
    throw new ProductError("Category not found for this store.", "INVALID_CATEGORY");
  }
}

export async function listProducts(storeId: string, query: ListProductsQuery) {
  const conditions: SQL[] = [eq(products.storeId, storeId)];

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

export async function getProductById(storeId: string, productId: string) {
  return db.query.products.findFirst({
    where: and(eq(products.id, productId), eq(products.storeId, storeId)),
  });
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
        isActive: input.isActive ?? true,
      })
      .returning();
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
    .delete(products)
    .where(and(eq(products.id, productId), eq(products.storeId, storeId)))
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