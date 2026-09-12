import { eq, and, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { returns, saleItems, sales, inventory, inventoryMovements } from "../../db/schema";
import type { CreateReturnInput } from "./returns.schema";

export class ReturnError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

export async function createReturn(storeId: string, input: CreateReturnInput) {
  const saleItemRow = await db
    .select({
      id: saleItems.id,
      productId: saleItems.productId,
      quantity: saleItems.quantity,
      storeId: sales.storeId,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(and(eq(saleItems.id, input.saleItemId), eq(sales.storeId, storeId)))
    .limit(1);

  if (saleItemRow.length === 0) {
    throw new ReturnError("Sale item not found for this store.", "SALE_ITEM_NOT_FOUND");
  }
  const saleItem = saleItemRow[0];

  // Can't return more than was sold, and can't return more than what's
  // already been returned against the same sale item.
  const [alreadyReturned] = await db
    .select({ total: sql<string>`COALESCE(SUM(${returns.quantity}), 0)` })
    .from(returns)
    .where(eq(returns.saleItemId, input.saleItemId));

  const remainingReturnable = saleItem.quantity - Number(alreadyReturned.total);
  if (input.quantity > remainingReturnable) {
    throw new ReturnError(
      `Cannot return ${input.quantity} units — only ${remainingReturnable} remaining returnable from this sale.`,
      "RETURN_EXCEEDS_SOLD_QUANTITY",
    );
  }

  return db.transaction(async (tx) => {
    const [returnRecord] = await tx
      .insert(returns)
      .values({ storeId, saleItemId: input.saleItemId, quantity: input.quantity, reason: input.reason })
      .returning();

    const currentRow = await tx.query.inventory.findFirst({
      where: and(eq(inventory.storeId, storeId), eq(inventory.productId, saleItem.productId)),
    });
    const newStock = (currentRow?.currentStock ?? 0) + input.quantity;

    if (currentRow) {
      await tx.update(inventory).set({ currentStock: newStock, updatedAt: new Date() }).where(eq(inventory.id, currentRow.id));
    } else {
      await tx.insert(inventory).values({ storeId, productId: saleItem.productId, currentStock: newStock, minStock: 0, safetyStock: 0 });
    }

    await tx.insert(inventoryMovements).values({
      storeId,
      productId: saleItem.productId,
      quantityChange: input.quantity,
      reason: "return",
      note: input.reason || `Return against sale item ${input.saleItemId}`,
    });

    return returnRecord;
  });
}

export async function listReturnsForProduct(storeId: string, productId: string) {
  return db
    .select({
      id: returns.id,
      quantity: returns.quantity,
      reason: returns.reason,
      createdAt: returns.createdAt,
    })
    .from(returns)
    .innerJoin(saleItems, eq(returns.saleItemId, saleItems.id))
    .where(and(eq(returns.storeId, storeId), eq(saleItems.productId, productId)));
}