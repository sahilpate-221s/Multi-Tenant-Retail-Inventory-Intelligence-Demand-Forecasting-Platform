import { Router } from "express";
import { requireAuth, requireOwner } from "../auth/auth.middleware";
import { postGenerate, getRecommendations, patchStatus } from "./recommendations.controller";

const router = Router();
router.use(requireAuth);
router.use(requireOwner);

router.post("/generate", postGenerate);
router.get("/", getRecommendations);
router.patch("/:id/status", patchStatus);

export default router;