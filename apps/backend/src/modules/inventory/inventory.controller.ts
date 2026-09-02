import { Request, Response } from "express";
import { adjustStockSchema, updateInventorySettingsSchema } from "./inventory.schema";
import {
  listInventory,
  adjustStock,
  getMovementHistory,
  updateInventorySettings,
  InventoryError,
} from "./inventory.service";

export async function getInventory(req: Request, res: Response) {
  const data = await listInventory(req.auth!.storeId);
  return res.status(200).json({ success: true, data });
}

export async function postAdjustment(req: Request, res: Response) {
  const parsed = adjustStockSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } });
  }
  try {
    const result = await adjustStock(req.auth!.storeId, parsed.data);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    if (err instanceof InventoryError) {
      const status = err.code === "PRODUCT_NOT_FOUND" ? 404 : 409;
      return res.status(status).json({ success: false, error: { code: err.code, message: err.message } });
    }
    console.error("Stock adjustment error:", err);
    return res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong." } });
  }
}

export async function getHistory(req: Request, res: Response) {
  const history = await getMovementHistory(req.auth!.storeId, req.params.productId as string);
  return res.status(200).json({ success: true, data: history });
}

export async function patchSettings(req: Request, res: Response) {
  const parsed = updateInventorySettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } });
  }
  const updated = await updateInventorySettings(req.auth!.storeId, req.params.productId as string, parsed.data);
  return res.status(200).json({ success: true, data: updated });
}