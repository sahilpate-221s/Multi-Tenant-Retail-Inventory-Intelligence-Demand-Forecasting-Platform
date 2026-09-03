import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { getDashboard } from "./analytics.controller";

const router = Router();
router.use(requireAuth);
router.get("/dashboard", getDashboard);

export default router;