import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { getDashboard } from "./analytics.controller";
import { getAdvancedAnalytics } from "./advancedAnalytics.controller";


const router = Router();
router.use(requireAuth);
router.get("/dashboard", getDashboard);
router.get("/advanced", getAdvancedAnalytics);

export default router;