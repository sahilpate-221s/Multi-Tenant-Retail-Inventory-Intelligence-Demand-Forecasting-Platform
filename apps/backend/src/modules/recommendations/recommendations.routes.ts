import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { postGenerate, getRecommendations, patchStatus } from "./recommendations.controller";

const router = Router();
router.use(requireAuth);

router.post("/generate", postGenerate);
router.get("/", getRecommendations);
router.patch("/:id/status", patchStatus);

export default router;