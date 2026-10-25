import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { getProducts, getProduct, getProductByBarcodeHandler, postProduct, patchProduct, removeProduct } from "./products.controller";

const router = Router();

router.use(requireAuth);

router.get("/", getProducts);
router.get("/barcode/:barcode", getProductByBarcodeHandler);
router.get("/:id", getProduct);
router.post("/", postProduct);
router.patch("/:id", patchProduct);
router.delete("/:id", removeProduct);

export default router;