import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { postGenerate, getAnomalies } from "./anomalies.controller";

const router = Router();
router.use(requireAuth);
router.post("/generate", postGenerate);
router.get("/", getAnomalies);

export default router;