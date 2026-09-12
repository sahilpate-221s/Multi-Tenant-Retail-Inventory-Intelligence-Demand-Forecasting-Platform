import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { postGenerate, getPredictions } from "./stockout.controller";

const router = Router();
router.use(requireAuth);
router.post("/generate", postGenerate);
router.get("/", getPredictions);

export default router;