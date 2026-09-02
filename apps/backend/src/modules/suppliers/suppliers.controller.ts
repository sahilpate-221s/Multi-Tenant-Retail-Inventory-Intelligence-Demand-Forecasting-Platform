import { Request, Response } from "express";
import { createSupplierSchema, updateSupplierSchema } from "./suppliers.schema";
import { listSuppliers, createSupplier, updateSupplier, deleteSupplier } from "./suppliers.service";
import { linkSupplierProductSchema } from "./supplierProducts.schema";
import { linkSupplierToProduct, listProductSuppliers, unlinkSupplierProduct, SupplierError } from "./suppliers.service";


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
  const supplier = await updateSupplier(req.auth!.storeId, req.params.id as string, parsed.data);
  if (!supplier) {
    return res.status(404).json({ success: false, error: { code: "SUPPLIER_NOT_FOUND", message: "Supplier not found." } });
  }
  return res.status(200).json({ success: true, data: supplier });
}

export async function removeSupplier(req: Request, res: Response) {
  const deleted = await deleteSupplier(req.auth!.storeId, req.params.id as string);
  if (!deleted) {
    return res.status(404).json({ success: false, error: { code: "SUPPLIER_NOT_FOUND", message: "Supplier not found." } });
  }
  return res.status(200).json({ success: true, data: { id: deleted.id } });
}

export async function postSupplierProductLink(req: Request, res: Response) {
  const parsed = linkSupplierProductSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } });
  }
  try {
    const link = await linkSupplierToProduct(req.auth!.storeId, parsed.data);
    return res.status(201).json({ success: true, data: link });
  } catch (err) {
    if (err instanceof SupplierError) {
      const status = err.code === "DUPLICATE_LINK" ? 409 : 404;
      return res.status(status).json({ success: false, error: { code: err.code, message: err.message } });
    }
    console.error("Link supplier-product error:", err);
    return res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong." } });
  }
}

export async function getProductSuppliers(req: Request, res: Response) {
  const data = await listProductSuppliers(req.auth!.storeId, req.params.productId as string);
  return res.status(200).json({ success: true, data });
}

export async function deleteSupplierProductLink(req: Request, res: Response) {
  const deleted = await unlinkSupplierProduct(req.auth!.storeId, req.params.linkId as string);
  if (!deleted) {
    return res.status(404).json({ success: false, error: { code: "LINK_NOT_FOUND", message: "Link not found." } });
  }
  return res.status(200).json({ success: true, data: { id: deleted.id } });
}