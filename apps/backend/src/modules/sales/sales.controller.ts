import { Request, Response } from "express";
import { listSalesQuerySchema, createSaleSchema } from "./sales.schema";
import { listSales, getSaleById, createSale, SalesError } from "./sales.service";

export async function getSales(req: Request, res: Response) {
  const parsed = listSalesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
    });
  }

  try {
    const result = await listSales(req.auth!.storeId, parsed.data);
    return res.status(200).json({
      success: true,
      data: {
        items: result.items,
        pagination: result.pagination,
        metrics: result.metrics,
      },
    });
  } catch (err) {
    console.error("List sales error:", err);
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to retrieve sales records." },
    });
  }
}

export async function getSale(req: Request, res: Response) {
  const saleId = req.params.id as string;
  try {
    const sale = await getSaleById(req.auth!.storeId, saleId);
    if (!sale) {
      return res.status(404).json({
        success: false,
        error: { code: "SALE_NOT_FOUND", message: "Sale transaction not found." },
      });
    }
    return res.status(200).json({ success: true, data: sale });
  } catch (err) {
    console.error("Get sale error:", err);
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to retrieve sale details." },
    });
  }
}

export async function postSale(req: Request, res: Response) {
  const parsed = createSaleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
    });
  }

  try {
    const sale = await createSale(req.auth!.storeId, req.auth!.userId, parsed.data);
    return res.status(201).json({ success: true, data: sale });
  } catch (err) {
    if (err instanceof SalesError) {
      return res.status(400).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    console.error("Create sale error:", err);
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to record sale transaction." },
    });
  }
}
