import { Request, Response } from "express";
import { createProductSchema, updateProductSchema, listProductsQuerySchema } from "./products.schema";
import {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  ProductError,
} from "./products.service";

export async function getProducts(req: Request, res: Response) {
  const parsed = listProductsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
    });
  }
  const result = await listProducts(req.auth!.storeId, parsed.data);
  return res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
}

export async function getProduct(req: Request, res: Response) {
  const product = await getProductById(req.auth!.storeId, req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, error: { code: "PRODUCT_NOT_FOUND", message: "Product not found." } });
  }
  return res.status(200).json({ success: true, data: product });
}

export async function postProduct(req: Request, res: Response) {
  const parsed = createProductSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
    });
  }
  try {
    const product = await createProduct(req.auth!.storeId, parsed.data);
    return res.status(201).json({ success: true, data: product });
  } catch (err) {
    if (err instanceof ProductError) {
      return res.status(409).json({ success: false, error: { code: err.code, message: err.message } });
    }
    console.error("Create product error:", err);
    return res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong." } });
  }
}

export async function patchProduct(req: Request, res: Response) {
  const parsed = updateProductSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
    });
  }
  try {
    const product = await updateProduct(req.auth!.storeId, req.params.id, parsed.data);
    if (!product) {
      return res.status(404).json({ success: false, error: { code: "PRODUCT_NOT_FOUND", message: "Product not found." } });
    }
    return res.status(200).json({ success: true, data: product });
  } catch (err) {
    if (err instanceof ProductError) {
      return res.status(409).json({ success: false, error: { code: err.code, message: err.message } });
    }
    console.error("Update product error:", err);
    return res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong." } });
  }
}

export async function removeProduct(req: Request, res: Response) {
  const deleted = await deleteProduct(req.auth!.storeId, req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: { code: "PRODUCT_NOT_FOUND", message: "Product not found." } });
  }
  return res.status(200).json({ success: true, data: { id: deleted.id } });
}