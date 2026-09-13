import { Request, Response } from "express";
import { createPurchaseOrderSchema } from "./purchaseOrders.schema";
import { createPurchaseOrder, listPurchaseOrders, receivePurchaseOrder, cancelPurchaseOrder, PurchaseOrderError } from "./purchaseOrders.service";
import { logAuditEvent } from "../audit/audit.service";

export async function postPurchaseOrder(req: Request, res: Response) {
  const parsed = createPurchaseOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } });
  }
  try {
    const po = await createPurchaseOrder(req.auth!.storeId, parsed.data);
    return res.status(201).json({ success: true, data: po });
  } catch (err) {
    if (err instanceof PurchaseOrderError) {
      return res.status(404).json({ success: false, error: { code: err.code, message: err.message } });
    }
    console.error("Create PO error:", err);
    return res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong." } });
  }
}

export async function getPurchaseOrders(req: Request, res: Response) {
  const data = await listPurchaseOrders(req.auth!.storeId);
  return res.status(200).json({ success: true, data });
}

export async function postReceive(req: Request, res: Response) {
  try {
    const result = await receivePurchaseOrder(req.auth!.storeId, req.params.id as string);

    await logAuditEvent({
      storeId: req.auth!.storeId,
      userId: req.auth!.userId,
      action: "PURCHASE_ORDER_RECEIVED",
      entityType: "purchase_order",
      entityId: req.params.id as string,
      details: { newStock: result.newStock },
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    if (err instanceof PurchaseOrderError) {
      const status = err.code === "PO_NOT_FOUND" ? 404 : 409;
      return res.status(status).json({ success: false, error: { code: err.code, message: err.message } });
    }
    console.error("Receive PO error:", err);
    return res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong." } });
  }
}

export async function postCancel(req: Request, res: Response) {
  try {
    const po = await cancelPurchaseOrder(req.auth!.storeId, req.params.id as string);
    return res.status(200).json({ success: true, data: po });
  } catch (err) {
    if (err instanceof PurchaseOrderError) {
      const status = err.code === "PO_NOT_FOUND" ? 404 : 409;
      return res.status(status).json({ success: false, error: { code: err.code, message: err.message } });
    }
    console.error("Cancel PO error:", err);
    return res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong." } });
  }
}