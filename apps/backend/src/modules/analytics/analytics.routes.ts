import { Router } from "express";
import { requireAuth, requireOwner } from "../auth/auth.middleware";
import { getDashboard } from "./analytics.controller";
import { getAdvancedAnalytics } from "./advancedAnalytics.controller";

const router = Router();
router.use(requireAuth);
router.use(requireOwner);
router.get("/dashboard", getDashboard);
router.get("/advanced", getAdvancedAnalytics);

export default router;