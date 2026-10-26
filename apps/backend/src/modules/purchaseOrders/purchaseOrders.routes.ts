import { Router } from "express";
import { requireAuth, requireOwner } from "../auth/auth.middleware";
import { postPurchaseOrder, getPurchaseOrders, postReceive, postCancel } from "./purchaseOrders.controller";

const router = Router();
router.use(requireAuth);
router.use(requireOwner);

router.post("/", postPurchaseOrder);
router.get("/", getPurchaseOrders);
router.post("/:id/receive", postReceive);
router.post("/:id/cancel", postCancel);

export default router;