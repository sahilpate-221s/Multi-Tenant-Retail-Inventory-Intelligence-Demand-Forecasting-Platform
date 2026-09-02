import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { getSuppliers, postSupplier, patchSupplier, removeSupplier } from "./suppliers.controller";
import { postSupplierProductLink, getProductSuppliers, deleteSupplierProductLink } from "./suppliers.controller";

const router = Router();
router.use(requireAuth);

router.get("/", getSuppliers);
router.post("/", postSupplier);
router.patch("/:id", patchSupplier);
router.delete("/:id", removeSupplier);

// Supplier-product links
router.post("/product-links", postSupplierProductLink);
router.get("/product-links/:productId", getProductSuppliers);
router.delete("/product-links/:linkId", deleteSupplierProductLink);

export default router;