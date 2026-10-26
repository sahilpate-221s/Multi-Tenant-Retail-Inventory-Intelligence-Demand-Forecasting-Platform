import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { postReturn, postProcessReturn, getProductReturns } from "./returns.controller";

const router = Router();
router.use(requireAuth);
router.post("/", postReturn);
router.post("/process", postProcessReturn);
router.get("/product/:productId", getProductReturns);

export default router;