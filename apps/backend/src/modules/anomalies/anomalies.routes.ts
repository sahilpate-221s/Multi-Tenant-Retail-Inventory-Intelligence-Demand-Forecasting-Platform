import { Router } from "express";
import { requireAuth, requireOwner } from "../auth/auth.middleware";
import { postGenerate, getAnomalies } from "./anomalies.controller";

const router = Router();
router.use(requireAuth);
router.use(requireOwner);
router.post("/generate", postGenerate);
router.get("/", getAnomalies);

export default router;