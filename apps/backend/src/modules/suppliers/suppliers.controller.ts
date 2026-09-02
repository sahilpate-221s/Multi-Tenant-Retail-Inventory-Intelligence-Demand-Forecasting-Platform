import { Request, Response } from "express";
import { createSupplierSchema, updateSupplierSchema } from "./suppliers.schema";
import { listSuppliers, createSupplier, updateSupplier, deleteSupplier } from "./suppliers.service";

export async function getSuppliers(req: Request, res: Response) {
  const data = await listSuppliers(req.auth!.storeId);
  return res.status(200).json({ success: true, data });
}

export async function postSupplier(req: Request, res: Response) {
  const parsed = createSupplierSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } });
  }
  const supplier = await createSupplier(req.auth!.storeId, parsed.data);
  return res.status(201).json({ success: true, data: supplier });
}

export async function patchSupplier(req: Request, res: Response) {
  const parsed = updateSupplierSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } });
  }
  const supplier = await updateSupplier(req.auth!.storeId, req.params.id, parsed.data);
  if (!supplier) {
    return res.status(404).json({ success: false, error: { code: "SUPPLIER_NOT_FOUND", message: "Supplier not found." } });
  }
  return res.status(200).json({ success: true, data: supplier });
}

export async function removeSupplier(req: Request, res: Response) {
  const deleted = await deleteSupplier(req.auth!.storeId, req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: { code: "SUPPLIER_NOT_FOUND", message: "Supplier not found." } });
  }
  return res.status(200).json({ success: true, data: { id: deleted.id } });
}