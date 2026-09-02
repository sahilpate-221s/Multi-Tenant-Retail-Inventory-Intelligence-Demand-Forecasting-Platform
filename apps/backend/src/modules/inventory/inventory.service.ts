import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db/client";
import { inventory, inventoryMovements, products } from "../../db/schema";
import type { AdjustStockInput, UpdateInventorySettingsInput } from "./inventory.schema";

export class InventoryError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

export async function listInventory(storeId: string) {
  return db
    .select({
      id: inventory.id,
      productId: inventory.productId,
      productName: products.name,
      sku: products.sku,
      currentStock: inventory.currentStock,
      minStock: inventory.minStock,
      safetyStock: inventory.safetyStock,
      updatedAt: inventory.updatedAt,
    })
    .from(inventory)
    .innerJoin(products, eq(inventory.productId, products.id))
    .where(eq(inventory.storeId, storeId));
}

async function getOrCreateInventoryRow(storeId: string, productId: string) {
  const existing = await db.query.inventory.findFirst({
    where: and(eq(inventory.storeId, storeId), eq(inventory.productId, productId)),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(inventory)
    .values({ storeId, productId, currentStock: 0, minStock: 0, safetyStock: 0 })
    .returning();
  return created;
}

export async function adjustStock(storeId: string, input: AdjustStockInput) {
  // Confirm the product genuinely belongs to this store before touching
  // inventory for it — same cross-tenant discipline as every other module.
  const product = await db.query.products.findFirst({
    where: and(eq(products.id, input.productId), eq(products.storeId, storeId)),
  });
  if (!product) {
    throw new InventoryError("Product not found for this store.", "PRODUCT_NOT_FOUND");
  }

  // The transaction: movement + snapshot update happen together or not at all.
  return db.transaction(async (tx) => {
    const currentRow = await tx.query.inventory.findFirst({
      where: and(eq(inventory.storeId, storeId), eq(inventory.productId, input.productId)),
    });

    const currentStock = currentRow?.currentStock ?? 0;
    const newStock = currentStock + input.quantityChange;

    if (newStock < 0) {
      throw new InventoryError(
        `Adjustment would result in negative stock (${currentStock} → ${newStock}).`,
        "NEGATIVE_STOCK",
      );
    }

    if (currentRow) {
      await tx
        .update(inventory)
        .set({ currentStock: newStock, updatedAt: new Date() })
        .where(eq(inventory.id, currentRow.id));
    } else {
      await tx.insert(inventory).values({
        storeId,
        productId: input.productId,
        currentStock: newStock,
        minStock: 0,
        safetyStock: 0,
      });
    }

    const [movement] = await tx
      .insert(inventoryMovements)
      .values({
        storeId,
        productId: input.productId,
        quantityChange: input.quantityChange,
        reason: input.reason,
        note: input.note,
      })
      .returning();

    return { newStock, movement };
  });
}

export async function getMovementHistory(storeId: string, productId: string) {
  return db.query.inventoryMovements.findMany({
    where: and(eq(inventoryMovements.storeId, storeId), eq(inventoryMovements.productId, productId)),
    orderBy: desc(inventoryMovements.createdAt),
  });
}

export async function updateInventorySettings(
  storeId: string,
  productId: string,
  input: UpdateInventorySettingsInput,
) {
  await getOrCreateInventoryRow(storeId, productId);
  const [updated] = await db
    .update(inventory)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(inventory.storeId, storeId), eq(inventory.productId, productId)))
    .returning();
  return updated;
}