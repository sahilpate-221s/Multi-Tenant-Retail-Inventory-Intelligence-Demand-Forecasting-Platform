import { Router } from "express";
import { requireAuth, requireOwner } from "../auth/auth.middleware";
import { getIntelligence } from "./intelligence.controller";

const router = Router();
router.use(requireAuth);
router.use(requireOwner);
router.get("/:productId", getIntelligence);

export default router;