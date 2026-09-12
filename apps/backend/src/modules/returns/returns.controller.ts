import { Request, Response } from "express";
import { createReturnSchema } from "./returns.schema";
import { createReturn, listReturnsForProduct, ReturnError } from "./returns.service";

export async function postReturn(req: Request, res: Response) {
  const parsed = createReturnSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } });
  }
  try {
    const result = await createReturn(req.auth!.storeId, parsed.data);
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    if (err instanceof ReturnError) {
      const status = err.code === "SALE_ITEM_NOT_FOUND" ? 404 : 409;
      return res.status(status).json({ success: false, error: { code: err.code, message: err.message } });
    }
    console.error("Create return error:", err);
    return res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong." } });
  }
}

export async function getProductReturns(req: Request, res: Response) {
  const data = await listReturnsForProduct(req.auth!.storeId, req.params.productId as string);
  return res.status(200).json({ success: true, data });
}