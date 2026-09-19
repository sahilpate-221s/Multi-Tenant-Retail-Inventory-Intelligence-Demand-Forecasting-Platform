import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { getSales, getSale, postSale } from "./sales.controller";

const router = Router();

router.use(requireAuth);

router.get("/", getSales);
router.get("/:id", getSale);
router.post("/", postSale);

export default router;
