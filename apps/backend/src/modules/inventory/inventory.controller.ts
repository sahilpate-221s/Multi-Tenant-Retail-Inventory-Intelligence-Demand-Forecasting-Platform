import { Request, Response } from "express";
import { adjustStockSchema, updateInventorySettingsSchema } from "./inventory.schema";
import {
  listInventory,
  adjustStock,
  getMovementHistory,
  updateInventorySettings,
  bulkAdjustStock,
  InventoryError,
} from "./inventory.service";
import { processRestockCsv } from "./restockProcessor";

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

export async function postBulkRestockPreview(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ success: false, error: { code: "NO_FILE", message: "No file was uploaded." } });
  }

  try {
    const result = await processRestockCsv(req.auth!.storeId, req.file.buffer);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("Restock preview error:", err);
    return res.status(400).json({
      success: false,
      error: { code: "PARSE_ERROR", message: "Could not parse this file. Please check it's a valid CSV with 'product' (or 'sku') and 'quantity' columns." },
    });
  }
}

export async function postBulkRestockCommit(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ success: false, error: { code: "NO_FILE", message: "No file was uploaded." } });
  }

  try {
    // Re-process the CSV to get the validated rows (same file the user previewed)
    const preview = await processRestockCsv(req.auth!.storeId, req.file.buffer);

    // Combine validRows + warnings (fuzzy matches the user accepted by clicking Commit)
    const allAccepted = [...preview.validRows, ...preview.warnings];

    if (allAccepted.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: "NO_VALID_ROWS", message: "No valid rows to process. Check the CSV and try again." },
      });
    }

    const items = allAccepted.map((row) => ({
      productId: row.productId,
      quantity: row.quantity,
    }));

    const results = await bulkAdjustStock(req.auth!.storeId, items);

    return res.status(200).json({
      success: true,
      data: {
        updatedCount: results.length,
        skippedCount: preview.errors.length,
        results,
      },
    });
  } catch (err) {
    if (err instanceof InventoryError) {
      return res.status(409).json({ success: false, error: { code: err.code, message: err.message } });
    }
    console.error("Bulk restock commit error:", err);
    return res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong during bulk restock." } });
  }
}