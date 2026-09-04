import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { postPurchaseOrder, getPurchaseOrders, postReceive, postCancel } from "./purchaseOrders.controller";

const router = Router();
router.use(requireAuth);

router.post("/", postPurchaseOrder);
router.get("/", getPurchaseOrders);
router.post("/:id/receive", postReceive);
router.post("/:id/cancel", postCancel);

export default router;