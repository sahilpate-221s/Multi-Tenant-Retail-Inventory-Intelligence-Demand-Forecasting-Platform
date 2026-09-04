import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { getIntelligence } from "./intelligence.controller";

const router = Router();
router.use(requireAuth);
router.get("/:productId", getIntelligence);

export default router;