import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { getInventory, postAdjustment, getHistory, patchSettings } from "./inventory.controller";

const router = Router();
router.use(requireAuth);

router.get("/", getInventory);
router.post("/adjust", postAdjustment);
router.get("/:productId/history", getHistory);
router.patch("/:productId/settings", patchSettings);

export default router;