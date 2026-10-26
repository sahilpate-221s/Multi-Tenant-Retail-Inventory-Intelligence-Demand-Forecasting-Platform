import { Router } from "express";
import { requireAuth, requireOwner } from "../auth/auth.middleware";
import { postSimulate, getSimulations } from "./simulator.controller";

const router = Router();
router.use(requireAuth);
router.use(requireOwner);
router.post("/", postSimulate);
router.get("/", getSimulations);

export default router;