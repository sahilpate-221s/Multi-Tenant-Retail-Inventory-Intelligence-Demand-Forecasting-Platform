import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { postSimulate, getSimulations } from "./simulator.controller";

const router = Router();
router.use(requireAuth);
router.post("/", postSimulate);
router.get("/", getSimulations);

export default router;