import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { getSuppliers, postSupplier, patchSupplier, removeSupplier } from "./suppliers.controller";

const router = Router();
router.use(requireAuth);

router.get("/", getSuppliers);
router.post("/", postSupplier);
router.patch("/:id", patchSupplier);
router.delete("/:id", removeSupplier);

export default router;