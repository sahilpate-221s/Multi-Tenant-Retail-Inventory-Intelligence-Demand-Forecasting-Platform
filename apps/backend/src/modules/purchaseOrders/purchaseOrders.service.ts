import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db/client";
import { purchaseOrders, products, inventory, inventoryMovements } from "../../db/schema";
import type { CreatePurchaseOrderInput } from "./purchaseOrders.schema";

export class PurchaseOrderError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

export async function createPurchaseOrder(storeId: string, input: CreatePurchaseOrderInput) {
  const product = await db.query.products.findFirst({
    where: and(eq(products.id, input.productId), eq(products.storeId, storeId)),
  });
  if (!product) throw new PurchaseOrderError("Product not found for this store.", "PRODUCT_NOT_FOUND");

  const [po] = await db
    .insert(purchaseOrders)
    .values({
      storeId,
      productId: input.productId,
      supplierId: input.supplierId,
      quantity: input.quantity,
      expectedArrivalDate: input.expectedArrivalDate,
      status: "pending",
    })
    .returning();
  return po;
}

export async function listPurchaseOrders(storeId: string) {
  return db
    .select({
      id: purchaseOrders.id,
      productId: purchaseOrders.productId,
      productName: products.name,
      quantity: purchaseOrders.quantity,
      expectedArrivalDate: purchaseOrders.expectedArrivalDate,
      status: purchaseOrders.status,
      createdAt: purchaseOrders.createdAt,
    })
    .from(purchaseOrders)
    .innerJoin(products, eq(purchaseOrders.productId, products.id))
    .where(eq(purchaseOrders.storeId, storeId))
    .orderBy(desc(purchaseOrders.createdAt));
}

export async function receivePurchaseOrder(storeId: string, poId: string) {
  const po = await db.query.purchaseOrders.findFirst({
    where: and(eq(purchaseOrders.id, poId), eq(purchaseOrders.storeId, storeId)),
  });
  if (!po) throw new PurchaseOrderError("Purchase order not found.", "PO_NOT_FOUND");
  if (po.status !== "pending") throw new PurchaseOrderError("This order has already been received or cancelled.", "INVALID_STATUS");

  // Same transactional pattern as Phase 4's stock adjustment: the PO
  // status change and the resulting inventory movement must succeed or
  // fail together, or we'd have "received" stock with no ledger entry
  // (or vice versa) — exactly the drift problem transactions prevent.
  return db.transaction(async (tx) => {
    await tx.update(purchaseOrders).set({ status: "received", receivedAt: new Date() }).where(eq(purchaseOrders.id, poId));

    const currentRow = await tx.query.inventory.findFirst({
      where: and(eq(inventory.storeId, storeId), eq(inventory.productId, po.productId)),
    });
    const newStock = (currentRow?.currentStock ?? 0) + po.quantity;

    if (currentRow) {
      await tx.update(inventory).set({ currentStock: newStock, updatedAt: new Date() }).where(eq(inventory.id, currentRow.id));
    } else {
      await tx.insert(inventory).values({ storeId, productId: po.productId, currentStock: newStock, minStock: 0, safetyStock: 0 });
    }

    await tx.insert(inventoryMovements).values({
      storeId,
      productId: po.productId,
      quantityChange: po.quantity,
      reason: "restock",
      note: `Received purchase order ${poId}`,
    });

    return { newStock, poId };
  });
}

export async function cancelPurchaseOrder(storeId: string, poId: string) {
  const po = await db.query.purchaseOrders.findFirst({
    where: and(eq(purchaseOrders.id, poId), eq(purchaseOrders.storeId, storeId)),
  });
  if (!po) throw new PurchaseOrderError("Purchase order not found.", "PO_NOT_FOUND");
  if (po.status !== "pending") throw new PurchaseOrderError("Only pending orders can be cancelled.", "INVALID_STATUS");

  const [updated] = await db
    .update(purchaseOrders)
    .set({ status: "cancelled" })
    .where(eq(purchaseOrders.id, poId))
    .returning();
  return updated;
}