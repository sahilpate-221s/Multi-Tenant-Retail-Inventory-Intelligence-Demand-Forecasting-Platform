import { Router } from "express";
import { requireAuth, requireOwner } from "../auth/auth.middleware";
import { postGenerate, getPredictions } from "./stockout.controller";

const router = Router();
router.use(requireAuth);
router.use(requireOwner);
router.post("/generate", postGenerate);
router.get("/", getPredictions);

export default router;