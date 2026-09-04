import { Request, Response } from "express";
import { getInventoryIntelligence } from "./intelligence.service";

export async function getIntelligence(req: Request, res: Response) {
  try {
    const result = await getInventoryIntelligence(req.auth!.storeId, req.params.productId as string);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("Intelligence calculation error:", err);
    return res.status(404).json({ success: false, error: { code: "PRODUCT_NOT_FOUND", message: "Product not found or calculation failed." } });
  }
}