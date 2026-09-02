import { Request, Response } from "express";
import { createCategorySchema, updateCategorySchema } from "./categories.schema";
import { listCategories, createCategory, updateCategory, deleteCategory } from "./categories.service";

export async function getCategories(req: Request, res: Response) {
  const data = await listCategories(req.auth!.storeId);
  return res.status(200).json({ success: true, data });
}

export async function postCategory(req: Request, res: Response) {
  const parsed = createCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
    });
  }
  const category = await createCategory(req.auth!.storeId, parsed.data);
  return res.status(201).json({ success: true, data: category });
}

export async function patchCategory(req: Request, res: Response) {
  const parsed = updateCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
    });
  }
  const category = await updateCategory(req.auth!.storeId, req.params.id, parsed.data);
  if (!category) {
    return res.status(404).json({
      success: false,
      error: { code: "CATEGORY_NOT_FOUND", message: "Category not found." },
    });
  }
  return res.status(200).json({ success: true, data: category });
}

export async function removeCategory(req: Request, res: Response) {
  const deleted = await deleteCategory(req.auth!.storeId, req.params.id);
  if (!deleted) {
    return res.status(404).json({
      success: false,
      error: { code: "CATEGORY_NOT_FOUND", message: "Category not found." },
    });
  }
  return res.status(200).json({ success: true, data: { id: deleted.id } });
}