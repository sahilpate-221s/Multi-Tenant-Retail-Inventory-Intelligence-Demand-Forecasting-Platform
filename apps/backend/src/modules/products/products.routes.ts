import { Router } from "express";
import { requireAuth, requireOwner } from "../auth/auth.middleware";
import { getProducts, getProduct, getProductByBarcodeHandler, postProduct, patchProduct, removeProduct } from "./products.controller";

const router = Router();

router.use(requireAuth);

router.get("/", getProducts);
router.get("/barcode/:barcode", getProductByBarcodeHandler);
router.get("/:id", getProduct);
router.post("/", requireOwner, postProduct);
router.patch("/:id", requireOwner, patchProduct);
router.delete("/:id", requireOwner, removeProduct);

export default router;