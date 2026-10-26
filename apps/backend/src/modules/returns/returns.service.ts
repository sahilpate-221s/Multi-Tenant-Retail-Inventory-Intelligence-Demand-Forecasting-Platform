import { eq, and, sql, inArray } from "drizzle-orm";
import { db } from "../../db/client";
import { returns, saleItems, sales, inventory, inventoryMovements, products } from "../../db/schema";
import type { CreateReturnInput, ProcessReturnInput } from "./returns.schema";

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
      unitPrice: saleItems.unitPrice,
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

  const refundAmt =
    input.refundAmount !== undefined
      ? input.refundAmount
      : Math.round(input.quantity * Number(saleItem.unitPrice) * 100) / 100;

  return db.transaction(async (tx) => {
    const [returnRecord] = await tx
      .insert(returns)
      .values({
        storeId,
        saleItemId: input.saleItemId,
        quantity: input.quantity,
        reason: input.reason,
        refundAmount: refundAmt.toString(),
        refundMode: input.refundMode || "cash",
      })
      .returning();

    const currentRow = await tx.query.inventory.findFirst({
      where: and(eq(inventory.storeId, storeId), eq(inventory.productId, saleItem.productId)),
    });
    const newStock = (currentRow?.currentStock ?? 0) + input.quantity;

    if (currentRow) {
      await tx
        .update(inventory)
        .set({ currentStock: newStock, updatedAt: new Date() })
        .where(eq(inventory.id, currentRow.id));
    } else {
      await tx.insert(inventory).values({
        storeId,
        productId: saleItem.productId,
        currentStock: newStock,
        minStock: 0,
        safetyStock: 0,
      });
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

export async function processReturn(storeId: string, input: ProcessReturnInput) {
  // 1. Verify sale exists and belongs to this store
  const [sale] = await db
    .select()
    .from(sales)
    .where(and(eq(sales.id, input.saleId), eq(sales.storeId, storeId)))
    .limit(1);

  if (!sale) {
    throw new ReturnError("Sale not found for this store.", "SALE_NOT_FOUND");
  }

  // 2. Fetch all sale items with product details
  const requestedItemIds = input.items.map((i) => i.saleItemId);
  const itemsInSale = await db
    .select({
      id: saleItems.id,
      productId: saleItems.productId,
      quantity: saleItems.quantity,
      unitPrice: saleItems.unitPrice,
      productName: products.name,
    })
    .from(saleItems)
    .innerJoin(products, eq(saleItems.productId, products.id))
    .where(and(eq(saleItems.saleId, sale.id), inArray(saleItems.id, requestedItemIds)));

  const saleItemMap = new Map(itemsInSale.map((item) => [item.id, item]));

  // Check already returned quantities
  const existingReturns = await db
    .select({
      saleItemId: returns.saleItemId,
      totalReturned: sql<number>`COALESCE(SUM(${returns.quantity}), 0)::int`,
    })
    .from(returns)
    .where(inArray(returns.saleItemId, requestedItemIds))
    .groupBy(returns.saleItemId);

  const returnedMap = new Map(existingReturns.map((r) => [r.saleItemId, r.totalReturned]));

  let totalRefundAmount = 0;
  const validatedItems: Array<{
    saleItemId: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    refundAmount: number;
    reason?: string;
  }> = [];

  for (const reqItem of input.items) {
    const saleItem = saleItemMap.get(reqItem.saleItemId);
    if (!saleItem) {
      throw new ReturnError(`Sale item ${reqItem.saleItemId} does not belong to this sale.`, "INVALID_SALE_ITEM");
    }

    const alreadyReturned = returnedMap.get(reqItem.saleItemId) || 0;
    const remaining = saleItem.quantity - alreadyReturned;

    if (reqItem.quantity > remaining) {
      throw new ReturnError(
        `Cannot return ${reqItem.quantity} unit(s) of "${saleItem.productName}". Only ${remaining} returnable.`,
        "RETURN_EXCEEDS_SOLD_QUANTITY"
      );
    }

    const unitPrice = Number(saleItem.unitPrice);
    const refundAmount = Math.round(reqItem.quantity * unitPrice * 100) / 100;
    totalRefundAmount += refundAmount;

    validatedItems.push({
      saleItemId: reqItem.saleItemId,
      productId: saleItem.productId,
      productName: saleItem.productName,
      quantity: reqItem.quantity,
      unitPrice,
      refundAmount,
      reason: reqItem.reason,
    });
  }

  totalRefundAmount = Math.round(totalRefundAmount * 100) / 100;

  // 3. Perform atomic return insertion and inventory restock
  return db.transaction(async (tx) => {
    const returnRecords = [];

    for (const vItem of validatedItems) {
      const [rec] = await tx
        .insert(returns)
        .values({
          storeId,
          saleItemId: vItem.saleItemId,
          quantity: vItem.quantity,
          reason: vItem.reason,
          refundAmount: vItem.refundAmount.toString(),
          refundMode: input.refundMode,
        })
        .returning();

      returnRecords.push(rec);

      // Atomic inventory restock
      const [restocked] = await tx
        .update(inventory)
        .set({
          currentStock: sql`${inventory.currentStock} + ${vItem.quantity}`,
          updatedAt: new Date(),
        })
        .where(and(eq(inventory.storeId, storeId), eq(inventory.productId, vItem.productId)))
        .returning();

      if (!restocked) {
        await tx.insert(inventory).values({
          storeId,
          productId: vItem.productId,
          currentStock: vItem.quantity,
          minStock: 0,
          safetyStock: 0,
        });
      }

      // Record movement ledger
      await tx.insert(inventoryMovements).values({
        storeId,
        productId: vItem.productId,
        quantityChange: vItem.quantity,
        reason: "return",
        note: `POS ${input.refundMode === "exchange_credit" ? "Exchange" : "Return"} for Sale #${sale.id.slice(0, 8)} (${vItem.productName} x${vItem.quantity})`,
      });
    }

    return {
      saleId: sale.id,
      refundMode: input.refundMode,
      totalRefundAmount,
      items: validatedItems,
      returnRecords,
    };
  });
}

export async function listReturnsForProduct(storeId: string, productId: string) {
  return db
    .select({
      id: returns.id,
      quantity: returns.quantity,
      refundAmount: returns.refundAmount,
      refundMode: returns.refundMode,
      reason: returns.reason,
      createdAt: returns.createdAt,
    })
    .from(returns)
    .innerJoin(saleItems, eq(returns.saleItemId, saleItems.id))
    .where(and(eq(returns.storeId, storeId), eq(saleItems.productId, productId)));
}