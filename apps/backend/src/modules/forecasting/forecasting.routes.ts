import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { getForecast, postGenerateForecast, getLatest, getHistory } from "./forecasting.controller";

const router = Router();
router.use(requireAuth);

router.get("/:productId", getForecast); // raw, live (Phase 10 - kept as-is)
router.post("/:productId/generate", postGenerateForecast);
router.get("/:productId/latest", getLatest);
router.get("/:productId/history", getHistory);

export default router;