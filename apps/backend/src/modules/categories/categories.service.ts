import { eq, and } from "drizzle-orm";
import { db } from "../../db/client";
import { categories } from "../../db/schema";
import type { CreateCategoryInput, UpdateCategoryInput } from "./categories.schema";

export async function listCategories(storeId: string) {
  return db.query.categories.findMany({
    where: eq(categories.storeId, storeId),
    orderBy: (categories, { asc }) => [asc(categories.name)],
  });
}

export async function createCategory(storeId: string, input: CreateCategoryInput) {
  const [category] = await db
    .insert(categories)
    .values({ storeId, name: input.name })
    .returning();
  return category;
}

export async function updateCategory(
  storeId: string,
  categoryId: string,
  input: UpdateCategoryInput,
) {
  const [category] = await db
    .update(categories)
    .set({ ...input, updatedAt: new Date() })
    // The 'and(storeId, id)' here is doing the real security work:
    // even if categoryId belongs to another store, this WHERE clause
    // ensures zero rows match, so nothing gets updated. This pattern —
    // ALWAYS filtering by storeId alongside the resource id — is the
    // one that repeats in every single tenant-scoped query from here on.
    .where(and(eq(categories.id, categoryId), eq(categories.storeId, storeId)))
    .returning();
  return category ?? null;
}

export async function deleteCategory(storeId: string, categoryId: string) {
  const [deleted] = await db
    .delete(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.storeId, storeId)))
    .returning();
  return deleted ?? null;
}