import { Router } from "express";
import { requireAuth, requireOwner } from "../auth/auth.middleware";
import { postGenerate, getScores } from "./deadStock.controller";

const router = Router();
router.use(requireAuth);
router.use(requireOwner);
router.post("/generate", postGenerate);
router.get("/", getScores);

export default router;